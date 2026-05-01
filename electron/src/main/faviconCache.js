const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { app } = require("electron");

const PAGECOW_FAVICON_BASE = "https://pagecow.com/api/favicon";

// Cache lifetimes per the pagecow.com/api/favicon contract.
const REAL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days for genuine icons.
const PLACEHOLDER_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours for letter placeholders.
const NEGATIVE_404_TTL_MS = 24 * 60 * 60 * 1000; // 1 day for "not on whitelist" misses.

// Throttle outbound fetches to a small pool so first-load doesn't open a flood.
const MAX_CONCURRENT_FETCHES = 6;

// Backoff schedule for transient pagecow.com failures (network/5xx).
// Past the last entry we stop retrying until the next manual refresh / app launch.
const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000];

let cacheDirPromise = null;

function getCacheDir() {
  if (!cacheDirPromise) {
    const dir = path.join(app.getPath("userData"), "favicons");
    cacheDirPromise = fs.promises
      .mkdir(dir, { recursive: true })
      .then(() => dir)
      .catch((err) => {
        cacheDirPromise = null;
        throw err;
      });
  }
  return cacheDirPromise;
}

function normalizeDomain(input) {
  if (!input || typeof input !== "string") return "";
  let value = input.trim().toLowerCase();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      value = new URL(value).hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  value = value.replace(/^www\./, "").replace(/^\.+/, "").replace(/\.+$/, "");
  if (!value || /\s/.test(value) || value.includes("/")) return "";
  return value;
}

function hashKey(domain) {
  return crypto.createHash("sha256").update(domain).digest("hex");
}

async function getFilePaths(domain) {
  const dir = await getCacheDir();
  const key = hashKey(domain);
  return {
    bin: path.join(dir, `${key}.bin`),
    meta: path.join(dir, `${key}.meta.json`)
  };
}

async function readMeta(metaPath) {
  try {
    const raw = await fs.promises.readFile(metaPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readBytes(binPath) {
  try {
    return await fs.promises.readFile(binPath);
  } catch {
    return null;
  }
}

function bytesToDataUrl(bytes, contentType) {
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

function isExpired(meta) {
  if (!meta || typeof meta.expiresAt !== "number") return true;
  return Date.now() > meta.expiresAt;
}

// In-flight fetch tracking — we coalesce duplicate requests for the same domain.
const inflight = new Map(); // domain -> Promise<result>

// Bounded fetch pool so a fresh bookmark list doesn't open dozens of sockets.
let activeFetches = 0;
const pendingQueue = [];

function pumpQueue() {
  while (activeFetches < MAX_CONCURRENT_FETCHES && pendingQueue.length > 0) {
    const job = pendingQueue.shift();
    activeFetches++;
    job().finally(() => {
      activeFetches--;
      pumpQueue();
    });
  }
}

function runWithBudget(work) {
  return new Promise((resolve) => {
    pendingQueue.push(async () => {
      try {
        resolve(await work());
      } catch (err) {
        resolve({
          ok: false,
          status: "internal_error",
          message: String(err?.message || err)
        });
      }
    });
    pumpQueue();
  });
}

const retryAttempts = new Map(); // domain -> attempt index
const retryTimers = new Map(); // domain -> Timeout

function clearRetry(domain) {
  retryAttempts.delete(domain);
  const t = retryTimers.get(domain);
  if (t) {
    clearTimeout(t);
    retryTimers.delete(domain);
  }
}

function scheduleRetry(domain) {
  const attempt = retryAttempts.get(domain) || 0;
  if (attempt >= RETRY_DELAYS_MS.length) return;
  const delay = RETRY_DELAYS_MS[attempt];
  retryAttempts.set(domain, attempt + 1);
  const existing = retryTimers.get(domain);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    retryTimers.delete(domain);
    queueRefresh(domain).catch(() => {});
  }, delay);
  if (typeof timer.unref === "function") timer.unref();
  retryTimers.set(domain, timer);
}

const updateListeners = new Set();
function notifyUpdate(domain, payload) {
  for (const cb of updateListeners) {
    try {
      cb({ domain, ...payload });
    } catch {
      // Listeners must not break each other.
    }
  }
}

function watchUpdates(callback) {
  updateListeners.add(callback);
  return () => updateListeners.delete(callback);
}

function isPlaceholderResponse(response) {
  // The placeholder endpoint signals itself with `Cache-Control: public, max-age=300`
  // (5 minutes) versus 24h+ for real icons. That's the most reliable marker.
  const cacheControl = response.headers.get("cache-control") || "";
  const match = cacheControl.match(/max-age=(\d+)/i);
  if (!match) return false;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds <= 600;
}

async function writeNegativeMeta(domain) {
  const { bin, meta } = await getFilePaths(domain);
  // Make sure no stale bytes linger next to a 404 marker.
  try {
    await fs.promises.unlink(bin);
  } catch {
    // Missing is fine.
  }
  const now = Date.now();
  const payload = {
    domain,
    notFound: true,
    fetchedAt: now,
    expiresAt: now + NEGATIVE_404_TTL_MS
  };
  await fs.promises.writeFile(meta, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

async function fetchAndStore(domain) {
  const url = `${PAGECOW_FAVICON_BASE}?domain=${encodeURIComponent(domain)}`;
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    scheduleRetry(domain);
    return { ok: false, status: "network_error", message: String(err?.message || err) };
  }

  if (response.status === 404) {
    clearRetry(domain);
    await writeNegativeMeta(domain).catch(() => {});
    // Likely a bookmark for a domain that was removed from the whitelist.
    console.warn(`[faviconCache] ${domain}: not on whitelist (HTTP 404)`);
    return { ok: false, status: "off_whitelist" };
  }

  if (response.status >= 500) {
    scheduleRetry(domain);
    return { ok: false, status: "server_error", httpStatus: response.status };
  }

  if (!response.ok) {
    return { ok: false, status: "http_error", httpStatus: response.status };
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const placeholder = isPlaceholderResponse(response);
  const buffer = Buffer.from(await response.arrayBuffer());
  const ttl = placeholder ? PLACEHOLDER_TTL_MS : REAL_TTL_MS;
  const now = Date.now();
  const meta = {
    domain,
    contentType,
    fetchedAt: now,
    expiresAt: now + ttl,
    isPlaceholder: placeholder,
    byteLength: buffer.length
  };
  const etag = response.headers.get("etag");
  if (etag) meta.etag = etag;

  const paths = await getFilePaths(domain);
  await fs.promises.writeFile(paths.bin, buffer);
  await fs.promises.writeFile(
    paths.meta,
    JSON.stringify(meta, null, 2),
    "utf8"
  );

  clearRetry(domain);

  return {
    ok: true,
    status: "fresh",
    dataUrl: bytesToDataUrl(buffer, contentType),
    contentType,
    isPlaceholder: placeholder,
    meta
  };
}

function queueRefresh(domain) {
  if (inflight.has(domain)) return inflight.get(domain);
  const promise = runWithBudget(() => fetchAndStore(domain)).then((result) => {
    if (result.ok) {
      notifyUpdate(domain, {
        dataUrl: result.dataUrl,
        contentType: result.contentType,
        isPlaceholder: result.isPlaceholder,
        status: "fresh"
      });
    } else if (result.status === "off_whitelist") {
      notifyUpdate(domain, { offWhitelist: true, status: "off_whitelist" });
    }
    return result;
  });
  inflight.set(domain, promise);
  promise.finally(() => inflight.delete(domain));
  return promise;
}

async function readCache(domain) {
  const paths = await getFilePaths(domain);
  const meta = await readMeta(paths.meta);
  if (!meta) return null;
  if (meta.notFound) return { meta, bytes: null };
  const bytes = await readBytes(paths.bin);
  if (!bytes) return null;
  return { meta, bytes };
}

async function getFavicon(domain) {
  const norm = normalizeDomain(domain);
  if (!norm) return { ok: false, status: "invalid_domain" };

  let cached = null;
  try {
    cached = await readCache(norm);
  } catch {
    cached = null;
  }

  if (cached) {
    const expired = isExpired(cached.meta);

    if (cached.meta.notFound) {
      if (expired) {
        queueRefresh(norm).catch(() => {});
      }
      return {
        ok: false,
        status: "off_whitelist",
        domain: norm,
        cachedAt: cached.meta.fetchedAt
      };
    }

    const dataUrl = bytesToDataUrl(cached.bytes, cached.meta.contentType);
    if (expired) {
      queueRefresh(norm).catch(() => {});
    }
    return {
      ok: true,
      status: expired ? "stale" : "fresh",
      dataUrl,
      contentType: cached.meta.contentType,
      isPlaceholder: !!cached.meta.isPlaceholder,
      domain: norm
    };
  }

  queueRefresh(norm).catch(() => {});
  return { ok: false, status: "missing", domain: norm };
}

async function refreshFavicon(domain) {
  const norm = normalizeDomain(domain);
  if (!norm) return { ok: false, status: "invalid_domain" };

  const paths = await getFilePaths(norm);
  await fs.promises.unlink(paths.bin).catch(() => {});
  await fs.promises.unlink(paths.meta).catch(() => {});
  clearRetry(norm);
  // Drop any in-flight result so callers get fresh bytes, not whatever was queued.
  inflight.delete(norm);
  return queueRefresh(norm);
}

async function prewarm(domains) {
  if (!Array.isArray(domains)) return;
  for (const raw of domains) {
    const norm = normalizeDomain(raw);
    if (!norm) continue;
    // getFavicon is fire-and-forget here; it'll surface results via watchUpdates.
    getFavicon(norm).catch(() => {});
  }
}

module.exports = {
  getFavicon,
  refreshFavicon,
  watchUpdates,
  prewarm,
  normalizeDomain
};
