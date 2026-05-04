const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, ipcMain, shell, Menu, MenuItem, session, webContents } = require("electron");

if (process.platform === "linux") {
  app.commandLine.appendSwitch("class", "pagecow-browser");
}

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
  getHostname,
  looksLikeSearchTerm,
  findBestWhitelistMatch
} = require("./src/main/whitelistEngine");
const { createMainWindow, setMainWindow, getMainWindow } = require("./src/main/window");
const { initializeAdBlocker } = require("./src/main/adBlocker");
const faviconCache = require("./src/main/faviconCache");

const activeDownloads = new Map();
let nextDownloadId = 1;

let settings = {
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
let preApprovedDomains = [];

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

function sendToRenderer(channel, payload) {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function notifyStateChanged() {
  sendToRenderer("pagecow:state-changed", {
    settings: getPublicSettings(),
    whitelist: getWhitelistSnapshot()
  });
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
      return { action: "allow" };
    }
    sendToRenderer("pagecow:blocked-navigation", { url });
    return { action: "deny" };
  });

  wc.on("will-navigate", (event, url) => {
    if (DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL)) return;
    if (url.startsWith("file://")) return;

    if (!allowOrBlockNavigation(url)) {
      event.preventDefault();
      sendToRenderer("pagecow:blocked-navigation", { url });
    }
  });
}

function installGuestNavigationGuards(mainWindow) {
  mainWindow.webContents.on("did-attach-webview", (_event, guestContents) => {
    guestContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("devtools://")) return { action: "allow" };
      if (!allowOrBlockNavigation(url)) {
        sendToRenderer("pagecow:blocked-navigation", {
          url,
          sourceWebContentsId: guestContents.id
        });
        return { action: "deny" };
      }

      sendToRenderer("pagecow:open-url-in-new-tab", {
        url,
        sourceWebContentsId: guestContents.id
      });
      return { action: "deny" };
    });

    const preventBlockedNavigation = (event, url) => {
      if (!allowOrBlockNavigation(url)) {
        event.preventDefault();
        sendToRenderer("pagecow:blocked-navigation", {
          url,
          sourceWebContentsId: guestContents.id
        });
      }
    };

    // Server-side redirects (e.g., download CDNs, OAuth callbacks) often go to
    // hosts that aren't on the whitelist. If the user already navigated to a
    // whitelisted page, trust the redirect chain so downloads and sign-ins work.
    const allowRedirectFromWhitelistedSource = (event, url) => {
      const sourceUrl = guestContents.getURL();
      if (sourceUrl && allowOrBlockNavigation(sourceUrl)) {
        return;
      }
      preventBlockedNavigation(event, url);
    };

    guestContents.on("will-navigate", preventBlockedNavigation);
    guestContents.on("will-redirect", allowRedirectFromWhitelistedSource);

    guestContents.on("context-menu", (_e, params) => {
      if (guestContents.getURL().startsWith("devtools://")) return;

      const menu = new Menu();

      const isImage = params.mediaType === "image" && params.srcURL;
      if (isImage) {
        menu.append(new MenuItem({
          label: "Save Image As\u2026",
          click: () => {
            try {
              guestContents.downloadURL(params.srcURL);
            } catch (_e) {}
          }
        }));
        menu.append(new MenuItem({ type: "separator" }));
      }

      menu.append(new MenuItem({
        label: "Preview on Other Devices",
        click: () => sendToRenderer("pagecow:toggle-device-toolbar")
      }));
      menu.append(new MenuItem({ type: "separator" }));
      menu.append(new MenuItem({
        label: "Inspect Element",
        click: () => {
          guestContents.inspectElement(params.x, params.y);
        }
      }));
      menu.popup();
    });
  });
}

function getUniqueSavePath(directory, filename) {
  const safeName = (filename && filename.trim()) || "download";
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  let candidate = path.join(directory, safeName);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${base} (${counter})${ext}`);
    counter += 1;
  }
  return candidate;
}

function getDownloadInitiatorUrl(item, sourceWebContents) {
  try {
    if (sourceWebContents && !sourceWebContents.isDestroyed()) {
      const url = sourceWebContents.getURL();
      if (url) return url;
    }
  } catch (_e) {}
  try {
    return item.getURL();
  } catch (_e) {
    return "";
  }
}

function isDownloadAllowed(item, sourceWebContents) {
  // Allow the download if either the page that triggered it OR the download
  // URL itself is on the whitelist (this covers downloads served from CDN
  // hosts that aren't directly whitelisted but were reached from a
  // whitelisted page like github.com).
  const initiatorUrl = getDownloadInitiatorUrl(item, sourceWebContents);
  if (initiatorUrl && allowOrBlockNavigation(initiatorUrl)) return true;
  try {
    if (allowOrBlockNavigation(item.getURL())) return true;
  } catch (_e) {}
  return false;
}

function broadcastDownloadEvent(channel, payload) {
  sendToRenderer(channel, payload);
}

function handleWillDownload(event, item, sourceWebContents) {
  if (!isDownloadAllowed(item, sourceWebContents)) {
    item.cancel();
    sendToRenderer("pagecow:blocked-navigation", { url: item.getURL() });
    return;
  }

  const id = nextDownloadId++;
  const downloadsDir = app.getPath("downloads");
  try {
    fs.mkdirSync(downloadsDir, { recursive: true });
  } catch (_e) {}

  const savePath = getUniqueSavePath(downloadsDir, item.getFilename());
  item.setSavePath(savePath);

  activeDownloads.set(id, item);

  const baseInfo = {
    id,
    filename: path.basename(savePath),
    url: item.getURL(),
    savePath,
    totalBytes: item.getTotalBytes(),
    startedAt: Date.now()
  };

  broadcastDownloadEvent("pagecow:download-started", baseInfo);

  item.on("updated", (_e, state) => {
    broadcastDownloadEvent("pagecow:download-updated", {
      id,
      state,
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes(),
      isPaused: item.isPaused()
    });
  });

  item.once("done", (_e, state) => {
    activeDownloads.delete(id);
    broadcastDownloadEvent("pagecow:download-completed", {
      id,
      state,
      savePath,
      filename: path.basename(savePath),
      url: item.getURL(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes()
    });
  });
}

function installDownloadHandler() {
  // Webviews share the default session unless a partition is set, so this one
  // listener captures downloads triggered from any tab.
  session.defaultSession.on("will-download", handleWillDownload);
}

async function createAndInitializeWindow() {
  settings = loadSettings();
  preApprovedDomains = await readWhitelistSeed();
  const mainWindow = createMainWindow(resolveRendererUrl());
  setMainWindow(mainWindow);
  installNavigationGuards(mainWindow);
  installGuestNavigationGuards(mainWindow);
  // Warm the favicon cache for current bookmarks so newly-launched windows
  // can render icons on the first paint after the renderer queries them.
  faviconCache.prewarm(settings.bookmarks);
}

faviconCache.watchUpdates((payload) => {
  sendToRenderer("pagecow:favicon-updated", payload);
});

app.on("web-contents-created", (event, contents) => {
  contents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && (input.control || input.meta) && !input.alt) {
      const key = input.key.toLowerCase();
      if (key === "f") {
        sendToRenderer("pagecow:keyboard-shortcut", "find");
        event.preventDefault();
      } else if (key === "t") {
        sendToRenderer("pagecow:keyboard-shortcut", "new-tab");
        event.preventDefault();
      } else if (key === "w") {
        sendToRenderer("pagecow:keyboard-shortcut", "close-tab");
        event.preventDefault();
      }
    }
  });
});

app.whenReady().then(async () => {
  await initializeAdBlocker();
  installDownloadHandler();
  await createAndInitializeWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createAndInitializeWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("pagecow:get-state", () => ({
  settings: getPublicSettings(),
  whitelist: getWhitelistSnapshot(),
  version: app.getVersion()
}));

ipcMain.handle("pagecow:navigate", (_event, rawInput) => {
  const normalized = toCanonicalUrl(rawInput);
  if (!normalized) {
    return { ok: false, reason: "invalid", message: "Please enter a valid URL or domain." };
  }
  if (isUrlAllowed(normalized, preApprovedDomains, settings.personalWhitelist)) {
    return { ok: true, url: normalized };
  }

  if (looksLikeSearchTerm(rawInput)) {
    const match = findBestWhitelistMatch(rawInput, preApprovedDomains, settings.personalWhitelist);
    if (match) {
      const matchUrl = toCanonicalUrl(match);
      if (matchUrl) {
        return { ok: true, url: matchUrl };
      }
    }
  }

  return {
    ok: false,
    reason: "blocked",
    url: normalized,
    host: getHostname(normalized)
  };
});

ipcMain.handle("pagecow:go-back", () => true);
ipcMain.handle("pagecow:go-forward", () => true);
ipcMain.handle("pagecow:refresh", () => true);

ipcMain.handle("pagecow:open-settings", () => true);
ipcMain.handle("pagecow:open-new-tab", () => true);

ipcMain.handle("pagecow:add-personal-domain", (_event, input) => {
  const normalized = normalizeDomain(input);
  if (!normalized) {
    return { ok: false, reason: "invalid_domain", message: "Please enter a valid domain." };
  }
  if (preApprovedDomains.includes(normalized)) {
    return { ok: false, reason: "already_preapproved", message: "This domain is already pre-approved." };
  }
  if (settings.personalWhitelist.includes(normalized)) {
    return { ok: false, reason: "already_exists", message: "This domain is already on your personal whitelist." };
  }

  settings = saveSettings({
    ...settings,
    personalWhitelist: [...settings.personalWhitelist, normalized]
  });
  notifyStateChanged();
  return { ok: true };
});

ipcMain.handle("pagecow:remove-personal-domain", (_event, input) => {
  const normalized = normalizeDomain(input);
  if (!normalized) {
    return { ok: false, reason: "invalid_domain", message: "Invalid domain." };
  }

  const next = settings.personalWhitelist.filter((domain) => domain !== normalized);
  if (next.length === settings.personalWhitelist.length) {
    return { ok: false, reason: "not_found", message: "Domain not found." };
  }

  settings = saveSettings({
    ...settings,
    personalWhitelist: next
  });
  notifyStateChanged();
  return { ok: true };
});

ipcMain.handle("pagecow:update-settings", (_event, patch = {}) => {
  settings = saveSettings({
    ...settings,
    showBookmarksBar:
      typeof patch.showBookmarksBar === "boolean"
        ? patch.showBookmarksBar
        : settings.showBookmarksBar,
    bookmarks: Array.isArray(patch.bookmarks) ? patch.bookmarks : settings.bookmarks
  });
  notifyStateChanged();
  faviconCache.prewarm(settings.bookmarks);
  return { ok: true, settings: getPublicSettings() };
});

ipcMain.handle("pagecow:get-favicon", async (_event, domain) => {
  return faviconCache.getFavicon(domain);
});

ipcMain.handle("pagecow:refresh-favicon", async (_event, domain) => {
  return faviconCache.refreshFavicon(domain);
});

ipcMain.handle("pagecow:open-external", (_event, url) => {
  if (typeof url !== "string" || !url.trim()) return false;
  shell.openExternal(url);
  return true;
});

ipcMain.handle("pagecow:attach-devtools", (_event, { guestWebContentsId, devtoolsWebContentsId, x, y }) => {
  try {
    const guest = webContents.fromId(guestWebContentsId);
    const devtools = webContents.fromId(devtoolsWebContentsId);
    if (!guest || !devtools) return { ok: false };

    guest.setDevToolsWebContents(devtools);
    guest.openDevTools();
    if (typeof x === "number" && typeof y === "number") {
      guest.inspectElement(x, y);
    }

    guest.once("devtools-closed", () => {
      sendToRenderer("pagecow:devtools-closed", { guestWebContentsId });
    });

    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
});

ipcMain.handle("pagecow:close-devtools", (_event, { guestWebContentsId }) => {
  try {
    const guest = webContents.fromId(guestWebContentsId);
    if (guest && guest.isDevToolsOpened()) {
      guest.closeDevTools();
    }
  } catch (e) {}
  return { ok: true };
});

ipcMain.handle("pagecow:open-download", async (_event, savePath) => {
  if (typeof savePath !== "string" || !savePath) return { ok: false };
  if (!fs.existsSync(savePath)) return { ok: false, reason: "missing" };
  const error = await shell.openPath(savePath);
  if (error) return { ok: false, reason: error };
  return { ok: true };
});

ipcMain.handle("pagecow:reveal-download", (_event, savePath) => {
  if (typeof savePath !== "string" || !savePath) return { ok: false };
  if (!fs.existsSync(savePath)) return { ok: false, reason: "missing" };
  shell.showItemInFolder(savePath);
  return { ok: true };
});

ipcMain.handle("pagecow:cancel-download", (_event, id) => {
  const item = activeDownloads.get(id);
  if (!item) return { ok: false, reason: "not_found" };
  try {
    item.cancel();
  } catch (_e) {}
  return { ok: true };
});
