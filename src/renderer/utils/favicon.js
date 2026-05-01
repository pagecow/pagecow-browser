import { useEffect, useState } from "react";

// Shared per-renderer state so all <BookmarkIcon /> instances for the same
// domain reuse one IPC roundtrip and update together when the main process
// pushes a refresh.
const cache = new Map(); // domain -> { dataUrl, status, isPlaceholder }
const subscribers = new Map(); // domain -> Set<(state) => void>
const pendingRequests = new Map(); // domain -> Promise

let mainListenerAttached = false;

function setCacheEntry(domain, next) {
  const previous = cache.get(domain);
  // Guard against a race where the main-process push arrives before the IPC
  // getFavicon response — don't let a stale `missing`/`loading` overwrite the
  // bytes that already came in. `off_whitelist` is a real terminal state and
  // is allowed to replace anything.
  if (
    previous &&
    previous.dataUrl &&
    !next.dataUrl &&
    next.status !== "off_whitelist"
  ) {
    return;
  }
  cache.set(domain, next);
  const set = subscribers.get(domain);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(next);
    } catch {
      // Subscribers must not break each other.
    }
  }
}

function ensureMainListener() {
  if (mainListenerAttached) return;
  if (!window.pagecow?.onFaviconUpdated) return;
  mainListenerAttached = true;
  window.pagecow.onFaviconUpdated((payload) => {
    if (!payload || !payload.domain) return;
    if (payload.offWhitelist) {
      setCacheEntry(payload.domain, {
        dataUrl: null,
        status: "off_whitelist",
        isPlaceholder: false
      });
      return;
    }
    if (payload.dataUrl) {
      setCacheEntry(payload.domain, {
        dataUrl: payload.dataUrl,
        status: payload.status || "fresh",
        isPlaceholder: !!payload.isPlaceholder
      });
    }
  });
}

// Deterministic per-domain hue used by all letter-placeholder fallbacks so
// the same domain always gets the same color across the bookmarks bar,
// omnibox suggestions, and tab strip.
export function letterPlaceholderPalette(domain) {
  const seed = domain || "?";
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  return {
    background: `hsl(${hue}, 55%, 88%)`,
    color: `hsl(${hue}, 55%, 30%)`
  };
}

export function getDomainFromUrl(input) {
  if (!input || typeof input !== "string") return "";
  const value = input.trim();
  if (!value) return "";
  try {
    const u = new URL(value.startsWith("http") ? value : `https://${value}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function requestFavicon(domain) {
  if (!window.pagecow?.getFavicon) return Promise.resolve(null);
  if (pendingRequests.has(domain)) return pendingRequests.get(domain);
  const promise = window.pagecow
    .getFavicon(domain)
    .then((result) => {
      let next;
      if (result?.ok) {
        next = {
          dataUrl: result.dataUrl,
          status: result.status || "fresh",
          isPlaceholder: !!result.isPlaceholder
        };
      } else if (result?.status === "off_whitelist") {
        next = { dataUrl: null, status: "off_whitelist", isPlaceholder: false };
      } else {
        next = { dataUrl: null, status: "missing", isPlaceholder: false };
      }
      setCacheEntry(domain, next);
      return next;
    })
    .catch(() => {
      const next = { dataUrl: null, status: "missing", isPlaceholder: false };
      setCacheEntry(domain, next);
      return next;
    })
    .finally(() => {
      pendingRequests.delete(domain);
    });
  pendingRequests.set(domain, promise);
  return promise;
}

export function refreshFavicon(domainOrUrl) {
  const domain = getDomainFromUrl(domainOrUrl) || domainOrUrl;
  if (!domain) return Promise.resolve(null);
  cache.delete(domain);
  pendingRequests.delete(domain);
  if (!window.pagecow?.refreshFavicon) return Promise.resolve(null);
  return window.pagecow.refreshFavicon(domain).then((result) => {
    let next;
    if (result?.ok) {
      next = {
        dataUrl: result.dataUrl,
        status: result.status || "fresh",
        isPlaceholder: !!result.isPlaceholder
      };
    } else if (result?.status === "off_whitelist") {
      next = { dataUrl: null, status: "off_whitelist", isPlaceholder: false };
    } else {
      next = { dataUrl: null, status: "missing", isPlaceholder: false };
    }
    setCacheEntry(domain, next);
    return next;
  });
}

const PLACEHOLDER_STATE = { dataUrl: null, status: "loading", isPlaceholder: false };

export function useFavicon(urlOrDomain) {
  const domain = getDomainFromUrl(urlOrDomain);
  const [state, setState] = useState(
    () => (domain && cache.get(domain)) || PLACEHOLDER_STATE
  );

  useEffect(() => {
    if (!domain) {
      setState(PLACEHOLDER_STATE);
      return undefined;
    }

    ensureMainListener();

    let cancelled = false;
    const handler = (next) => {
      if (!cancelled) setState(next);
    };

    let set = subscribers.get(domain);
    if (!set) {
      set = new Set();
      subscribers.set(domain, set);
    }
    set.add(handler);

    const cached = cache.get(domain);
    if (cached) {
      setState(cached);
      // Even with a fresh hit, ask main — it'll noop on hot cache and queue
      // a background refresh on a stale entry, no extra roundtrip cost here.
      requestFavicon(domain);
    } else {
      setState(PLACEHOLDER_STATE);
      requestFavicon(domain);
    }

    return () => {
      cancelled = true;
      const current = subscribers.get(domain);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) subscribers.delete(domain);
    };
  }, [domain]);

  return { ...state, domain };
}
