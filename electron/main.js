const path = require("path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const {
  loadSettings,
  saveSettings,
  normalizeDomain,
  readWhitelistSeed
} = require("./src/main/settingsStore");
const {
  isUrlAllowed,
  getWhitelistModel,
  toCanonicalUrl,
  getHostname
} = require("./src/main/whitelistEngine");
const { getQuoteOfTheDay } = require("./src/main/quotes");
const { createMainWindow, setMainWindow, getMainWindow } = require("./src/main/window");

let settings = {
  personalWhitelist: [],
  showBookmarksBar: false,
  showDailyQuote: true
};
let preApprovedDomains = [];
let activeView = "new-tab";
let lastBlockedUrl = "";

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function resolveRendererUrl() {
  if (DEV_SERVER_URL) {
    return DEV_SERVER_URL;
  }
  return `file://${path.join(__dirname, "../dist/index.html")}`;
}

function getWhitelistSnapshot() {
  return getWhitelistModel(preApprovedDomains, settings.personalWhitelist);
}

function getPublicSettings() {
  return {
    ...settings,
    version: app.getVersion()
  };
}

function getNavigationState() {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return {
      url: "",
      canGoBack: false,
      canGoForward: false,
      view: activeView
    };
  }

  const wc = mainWindow.webContents;
  const currentUrl = wc.getURL();
  return {
    url: activeView === "browser" ? currentUrl : "",
    canGoBack: activeView === "browser" ? wc.canGoBack() : false,
    canGoForward: activeView === "browser" ? wc.canGoForward() : false,
    view: activeView
  };
}

function notifyNavigationState() {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("nav:stateChanged", getNavigationState());
}

function notifyWhitelistAndSettings() {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("whitelist:stateChanged", {
    settings: getPublicSettings(),
    whitelist: getWhitelistSnapshot()
  });
}

function notifyViewChanged() {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("view:changed", {
    view: activeView,
    blockedUrl: lastBlockedUrl
  });
  notifyNavigationState();
}

function loadShellView(targetView, query = "") {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  activeView = targetView;
  const url = resolveRendererUrl();
  if (url.startsWith("http")) {
    const separator = url.includes("?") ? "&" : "?";
    mainWindow.loadURL(`${url}${separator}${query}`);
  } else {
    mainWindow.loadURL(url);
  }
}

function openBlockedView(url) {
  lastBlockedUrl = url;
  loadShellView("blocked", `view=blocked&url=${encodeURIComponent(url)}`);
}

function openSettingsView() {
  loadShellView("settings", "view=settings");
}

function openNewTabView() {
  loadShellView("new-tab", "view=new-tab");
}

function allowOrBlockNavigation(url) {
  if (url.startsWith("devtools://")) return true;
  if (DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL)) return true;
  if (url.startsWith("file://")) return true;
  if (url === "about:blank") return true;
  return isUrlAllowed(url, preApprovedDomains, settings.personalWhitelist);
}

function installNavigationGuards(mainWindow) {
  const wc = mainWindow.webContents;

  wc.setWindowOpenHandler(({ url }) => {
    if (allowOrBlockNavigation(url)) {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        activeView = "browser";
        notifyNavigationState();
      }
      return { action: "allow" };
    }
    openBlockedView(url);
    return { action: "deny" };
  });

  wc.on("will-navigate", (event, url) => {
    if (!allowOrBlockNavigation(url)) {
      event.preventDefault();
      openBlockedView(url);
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      activeView = "browser";
      notifyNavigationState();
    }
  });

  wc.on("did-navigate", () => {
    if (activeView === "browser") {
      notifyNavigationState();
    }
  });
}

function createAndInitializeWindow() {
  settings = loadSettings();
  preApprovedDomains = readWhitelistSeed();
  const mainWindow = createMainWindow(resolveRendererUrl());
  setMainWindow(mainWindow);
  activeView = "new-tab";
  installNavigationGuards(mainWindow);

  mainWindow.webContents.once("did-finish-load", () => {
    notifyViewChanged();
    notifyWhitelistAndSettings();
  });
}

app.whenReady().then(() => {
  createAndInitializeWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAndInitializeWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("app:getInfo", () => ({
  name: "PageCow",
  tagline: "The browser that keeps you writing",
  version: app.getVersion()
}));

ipcMain.handle("settings:getInitialState", () => ({
  settings: getPublicSettings(),
  whitelist: getWhitelistSnapshot(),
  navigation: getNavigationState(),
  view: activeView,
  blockedUrl: lastBlockedUrl,
  quote: getQuoteOfTheDay()
}));

ipcMain.handle("nav:navigate", (_event, rawInput) => {
  const normalized = toCanonicalUrl(rawInput);
  if (!normalized) {
    return { status: "invalid", message: "Please enter a valid URL or domain." };
  }
  if (!isUrlAllowed(normalized, preApprovedDomains, settings.personalWhitelist)) {
    openBlockedView(normalized);
    notifyViewChanged();
    return {
      status: "blocked",
      input: rawInput,
      url: normalized,
      host: getHostname(normalized)
    };
  }

  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { status: "error", message: "Browser window is not available." };
  }

  activeView = "browser";
  mainWindow.loadURL(normalized);
  notifyViewChanged();
  return { status: "allowed", url: normalized };
});

ipcMain.handle("nav:back", () => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed() || activeView !== "browser") return false;
  if (mainWindow.webContents.canGoBack()) {
    mainWindow.webContents.goBack();
    notifyNavigationState();
    return true;
  }
  return false;
});

ipcMain.handle("nav:forward", () => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed() || activeView !== "browser") return false;
  if (mainWindow.webContents.canGoForward()) {
    mainWindow.webContents.goForward();
    notifyNavigationState();
    return true;
  }
  return false;
});

ipcMain.handle("nav:refresh", () => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed() || activeView !== "browser") return false;
  mainWindow.webContents.reload();
  notifyNavigationState();
  return true;
});

ipcMain.handle("settings:open", () => {
  openSettingsView();
  notifyViewChanged();
  return true;
});

ipcMain.handle("settings:savePreferences", (_event, patch = {}) => {
  settings = saveSettings({
    ...settings,
    showBookmarksBar:
      typeof patch.showBookmarksBar === "boolean"
        ? patch.showBookmarksBar
        : settings.showBookmarksBar,
    showDailyQuote:
      typeof patch.showDailyQuote === "boolean"
        ? patch.showDailyQuote
        : settings.showDailyQuote
  });
  notifyWhitelistAndSettings();
  return { ok: true, settings: getPublicSettings() };
});

ipcMain.handle("whitelist:addPersonalDomain", (_event, input) => {
  const normalized = normalizeDomain(input);
  if (!normalized) {
    return { ok: false, success: false, message: "Please enter a valid domain." };
  }
  if (preApprovedDomains.includes(normalized)) {
    return {
      ok: false,
      success: false,
      message: "This domain is already pre-approved."
    };
  }
  if (settings.personalWhitelist.includes(normalized)) {
    return {
      ok: false,
      success: false,
      message: "This domain is already on your personal whitelist."
    };
  }

  settings = saveSettings({
    ...settings,
    personalWhitelist: [...settings.personalWhitelist, normalized]
  });
  notifyWhitelistAndSettings();
  return { ok: true, success: true };
});

ipcMain.handle("whitelist:removePersonalDomain", (_event, input) => {
  const normalized = normalizeDomain(input);
  if (!normalized) {
    return { ok: false, success: false, message: "Invalid domain." };
  }

  const next = settings.personalWhitelist.filter((domain) => domain !== normalized);
  if (next.length === settings.personalWhitelist.length) {
    return { ok: false, success: false, message: "Domain not found." };
  }

  settings = saveSettings({
    ...settings,
    personalWhitelist: next
  });
  notifyWhitelistAndSettings();
  return { ok: true, success: true };
});

ipcMain.handle("settings:openNewTab", () => {
  openNewTabView();
  notifyViewChanged();
  return true;
});

ipcMain.handle("shell:openExternal", (_event, url) => {
  if (typeof url !== "string" || !url.trim()) return false;
  shell.openExternal(url);
  return true;
});

ipcMain.handle("pagecow:get-state", () => ({
  settings: getPublicSettings(),
  whitelist: getWhitelistSnapshot(),
  dailyQuote: getQuoteOfTheDay(),
  version: app.getVersion(),
  view: activeView,
  blockedUrl: lastBlockedUrl
}));

ipcMain.handle("pagecow:get-navigation-state", () => getNavigationState());
ipcMain.handle("pagecow:navigate", (_event, rawInput) => ipcMain.handle("nav:navigate")(_event, rawInput));
ipcMain.handle("pagecow:go-back", () => ipcMain.handle("nav:back")());
ipcMain.handle("pagecow:go-forward", () => ipcMain.handle("nav:forward")());
ipcMain.handle("pagecow:refresh", () => ipcMain.handle("nav:refresh")());
ipcMain.handle("pagecow:open-settings", () => ipcMain.handle("settings:open")());
ipcMain.handle("pagecow:open-new-tab", () => ipcMain.handle("settings:openNewTab")());
ipcMain.handle("pagecow:add-personal-domain", (_event, domain) =>
  ipcMain.handle("whitelist:addPersonalDomain")(_event, domain)
);
ipcMain.handle("pagecow:remove-personal-domain", (_event, domain) =>
  ipcMain.handle("whitelist:removePersonalDomain")(_event, domain)
);
ipcMain.handle("pagecow:update-settings", (_event, patch) =>
  ipcMain.handle("settings:savePreferences")(_event, patch)
);
ipcMain.handle("pagecow:open-external", (_event, url) =>
  ipcMain.handle("shell:openExternal")(_event, url)
);
