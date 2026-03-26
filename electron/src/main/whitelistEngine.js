const { normalizeDomain } = require("./settingsStore");

const BLOCKED_BY_DEFAULT = new Set([
  "google.com",
  "chatgpt.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "snapchat.com",
  "linkedin.com",
  "reddit.com",
  "cnn.com",
  "foxnews.com",
  "nytimes.com",
  "bbc.com",
  "huffpost.com",
  "buzzfeed.com",
  "youtube.com",
  "netflix.com",
  "hulu.com",
  "twitch.tv",
  "vimeo.com",
  "amazon.com",
  "ebay.com",
  "etsy.com"
]);

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isAlwaysAllowedLocalhost(hostname) {
  if (!hostname) return false;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
  );
}

function isDomainMatch(hostname, allowedDomain) {
  return hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`);
}

function parseHostname(urlValue) {
  try {
    const parsed = new URL(urlValue);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return { allowedProtocol: false, hostname: "" };
    }
    return { allowedProtocol: true, hostname: normalizeDomain(parsed.hostname) };
  } catch (error) {
    return { allowedProtocol: false, hostname: "" };
  }
}

function getEffectiveWhitelist(preApproved, personal) {
  const normalizedPre = (preApproved || []).map(normalizeDomain).filter(Boolean);
  const normalizedPersonal = (personal || []).map(normalizeDomain).filter(Boolean);
  const unique = new Set([...normalizedPre, ...normalizedPersonal]);
  return [...unique].sort();
}

function isExplicitlyBlocked(hostname) {
  return [...BLOCKED_BY_DEFAULT].some((blocked) => isDomainMatch(hostname, blocked));
}

function isUrlAllowed(urlValue, preApprovedDomains, personalDomains) {
  const { allowedProtocol, hostname } = parseHostname(urlValue);
  if (!allowedProtocol || !hostname) {
    return false;
  }

  if (isAlwaysAllowedLocalhost(hostname)) {
    return true;
  }

  const whitelist = getEffectiveWhitelist(preApprovedDomains, personalDomains);
  const inWhitelist = whitelist.some((domain) => isDomainMatch(hostname, domain));
  if (inWhitelist) {
    return true;
  }

  if (isExplicitlyBlocked(hostname)) {
    return false;
  }

  return false;
}

function toCanonicalUrl(input) {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed === "about:newtab") return "about:newtab";

  let value = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    value = `https://${value}`;
  }

  try {
    const parsed = new URL(value);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch (error) {
    return "";
  }
}

function getWhitelistModel(preApprovedDomains, personalDomains) {
  const preApproved = [...new Set((preApprovedDomains || []).map(normalizeDomain).filter(Boolean))].sort();
  const personal = [...new Set((personalDomains || []).map(normalizeDomain).filter(Boolean))].sort();

  return {
    preApproved,
    personal,
    merged: [...new Set([...preApproved, ...personal])].sort()
  };
}

function getHostname(urlValue) {
  const parsed = parseHostname(urlValue);
  return parsed.hostname || "";
}

function looksLikeSearchTerm(input) {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return !trimmed.includes(".");
}

function findBestWhitelistMatch(searchTerm, preApprovedDomains, personalDomains) {
  if (!searchTerm || typeof searchTerm !== "string") return null;
  const term = searchTerm.toLowerCase().trim();
  if (!term) return null;

  const whitelist = getEffectiveWhitelist(preApprovedDomains, personalDomains);

  const scored = whitelist
    .map((domain) => {
      const lower = domain.toLowerCase();
      const namePart = lower.split(".")[0];
      let score = 0;
      if (namePart === term) score = 100;
      else if (lower.startsWith(term)) score = 80;
      else if (namePart.includes(term)) score = 60;
      else if (lower.includes(term)) score = 40;
      return { domain, score };
    })
    .filter((s) => s.score > 0);

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].domain;
}

module.exports = {
  BLOCKED_BY_DEFAULT,
  isAlwaysAllowedLocalhost,
  isUrlAllowed,
  getEffectiveWhitelist,
  getWhitelistModel,
  toCanonicalUrl,
  parseHostname,
  isDomainMatch,
  getHostname,
  looksLikeSearchTerm,
  findBestWhitelistMatch
};
