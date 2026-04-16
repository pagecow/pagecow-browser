const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULT_SETTINGS = {
  personalWhitelist: [],
  showBookmarksBar: false,
  bookmarks: [
    "https://pcloud.com",
    "https://wikipedia.org",
    "https://dictionary.com",
    "https://thesaurus.com",
    "https://gotquestions.org",
    "https://www.bible.com/bible/114/JHN.1.NKJV"
  ]
};

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function normalizeDomain(input) {
  if (!input || typeof input !== "string") return "";
  let value = input.trim().toLowerCase();

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      value = new URL(value).hostname.toLowerCase();
    } catch (error) {
      return "";
    }
  }

  value = value.replace(/^\.+/, "").replace(/\.+$/, "");
  if (!value || /\s/.test(value) || value.includes("/")) return "";

  if (value === "localhost") return value;

  const labels = value.split(".");
  if (labels.length < 2 || labels.some((part) => !part || part.length > 63)) {
    return "";
  }
  return value;
}

function dedupeDomains(list) {
  return [...new Set((list || []).map(normalizeDomain).filter(Boolean))];
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

async function readWhitelistSeed() {
  try {
    const response = await fetch("https://pagecow.com/whitelist.json");
    if (!response.ok) {
      console.error("Failed to fetch whitelist.json:", response.status, response.statusText);
      return [];
    }
    const parsed = await response.json();
    
    const sites = Array.isArray(parsed.sites) ? parsed.sites.map(s => s.domain) : [];
    const hidden = Array.isArray(parsed.hiddenDomains) ? parsed.hiddenDomains : [];
    const popular = Array.isArray(parsed.popularDomains) ? parsed.popularDomains : [];
    const legacy = Array.isArray(parsed.preApprovedDomains) ? parsed.preApprovedDomains : [];

    const allDomains = [...sites, ...hidden, ...popular, ...legacy];
    return dedupeDomains(allDomains);
  } catch (error) {
    console.error("Error fetching whitelist.json:", error);
    return [];
  }
}

function loadSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  const parsed = readJson(settingsPath);
  if (!parsed) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    personalWhitelist: dedupeDomains(parsed.personalWhitelist),
    showBookmarksBar:
      typeof parsed.showBookmarksBar === "boolean"
        ? parsed.showBookmarksBar
        : DEFAULT_SETTINGS.showBookmarksBar,
    bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : []
  };
}

function saveSettings(settings) {
  const settingsPath = getSettingsPath();
  const safe = {
    personalWhitelist: dedupeDomains(settings.personalWhitelist),
    showBookmarksBar: !!settings.showBookmarksBar,
    bookmarks: Array.isArray(settings.bookmarks) ? settings.bookmarks : []
  };
  fs.writeFileSync(settingsPath, JSON.stringify(safe, null, 2), "utf8");
  return safe;
}

module.exports = {
  DEFAULT_SETTINGS,
  normalizeDomain,
  dedupeDomains,
  readWhitelistSeed,
  loadSettings,
  saveSettings
};
