const fs = require("fs");
const path = require("path");
const { BrowserWindow } = require("electron");

let mainWindow = null;

function getWindowIconPath() {
  if (process.platform !== "linux") return undefined;

  const iconPath = path.join(__dirname, "../../../build/icon.png");
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function createMainWindow(startUrl) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#f7f8f4",
    title: "PageCow",
    icon: getWindowIconPath(),
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
