const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULT_SETTINGS = {
  personalWhitelist: [],
  showBookmarksBar: false,
  bookmarks: []
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

function readWhitelistSeed() {
  const candidatePaths = [
    path.join(process.resourcesPath, "config", "whitelist.json"),
    path.join(app.getAppPath(), "whitelist.json"),
    path.join(__dirname, "../../../whitelist.json")
  ];

  for (const whitelistPath of candidatePaths) {
    const parsed = readJson(whitelistPath);
    if (!parsed || !Array.isArray(parsed.preApprovedDomains)) {
      continue;
    }
    return dedupeDomains(parsed.preApprovedDomains);
  }
  return [];
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
