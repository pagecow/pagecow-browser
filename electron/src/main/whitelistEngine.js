const { normalizeDomain } = require("./settingsStore");

const BLOCKED_BY_DEFAULT = new Set([
  "google.com",
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

module.exports = {
  BLOCKED_BY_DEFAULT,
  isUrlAllowed,
  getEffectiveWhitelist,
  getWhitelistModel,
  toCanonicalUrl,
  parseHostname,
  isDomainMatch,
  getHostname
};
