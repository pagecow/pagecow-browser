const fs = require("fs");
const path = require("path");
const { BrowserWindow, app, nativeImage } = require("electron");

let mainWindow = null;

/**
 * Linux window managers (GTK) often fail to load icons from inside app.asar.
 * Packaged builds ship a copy next to app.asar via electron-builder extraResources.
 */
function getWindowIcon() {
  const candidates = [];
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, "icon.png"));
  }
  candidates.push(path.join(app.getAppPath(), "build", "icon.png"));

  for (const iconPath of candidates) {
    if (!fs.existsSync(iconPath)) continue;
    const image = nativeImage.createFromPath(iconPath);
    if (!image.isEmpty()) return image;
  }
  return undefined;
}

function createMainWindow(startUrl) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#f7f8f4",
    title: "PageCow",
    icon: getWindowIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

  win.loadURL(startUrl);
  return win;
}

function setMainWindow(windowRef) {
  mainWindow = windowRef;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  setMainWindow,
  getMainWindow
};
