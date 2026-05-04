const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  if (typeof callback !== "function") {
    return () => {};
  }
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("pagecow", {
  appName: "PageCow",
  tagline: "The browser that keeps you writing",

  getState: () => ipcRenderer.invoke("pagecow:get-state"),
  navigate: (url) => ipcRenderer.invoke("pagecow:navigate", url),
  goBack: () => ipcRenderer.invoke("pagecow:go-back"),
  goForward: () => ipcRenderer.invoke("pagecow:go-forward"),
  refresh: () => ipcRenderer.invoke("pagecow:refresh"),
  openSettings: () => ipcRenderer.invoke("pagecow:open-settings"),
  openNewTab: () => ipcRenderer.invoke("pagecow:open-new-tab"),
  addPersonalDomain: (domain) => ipcRenderer.invoke("pagecow:add-personal-domain", domain),
  removePersonalDomain: (domain) => ipcRenderer.invoke("pagecow:remove-personal-domain", domain),
  updateSettings: (patch) => ipcRenderer.invoke("pagecow:update-settings", patch),
  openExternal: (url) => ipcRenderer.invoke("pagecow:open-external", url),

  getFavicon: (domain) => ipcRenderer.invoke("pagecow:get-favicon", domain),
  refreshFavicon: (domain) => ipcRenderer.invoke("pagecow:refresh-favicon", domain),

  onBlockedNavigation: (callback) => subscribe("pagecow:blocked-navigation", callback),
  onStateChanged: (callback) => subscribe("pagecow:state-changed", callback),
  onOpenUrlInNewTab: (callback) => subscribe("pagecow:open-url-in-new-tab", callback),
  onKeyboardShortcut: (callback) => subscribe("pagecow:keyboard-shortcut", callback),
  onFaviconUpdated: (callback) => subscribe("pagecow:favicon-updated", callback),

  onInspectElement: (callback) => subscribe("pagecow:inspect-element", callback),
  onDevToolsClosed: (callback) => subscribe("pagecow:devtools-closed", callback),
  onToggleDeviceToolbar: (callback) => subscribe("pagecow:toggle-device-toolbar", callback),
  attachDevTools: (payload) => ipcRenderer.invoke("pagecow:attach-devtools", payload),
  closeDevTools: (payload) => ipcRenderer.invoke("pagecow:close-devtools", payload),

  onDownloadStarted: (callback) => subscribe("pagecow:download-started", callback),
  onDownloadUpdated: (callback) => subscribe("pagecow:download-updated", callback),
  onDownloadCompleted: (callback) => subscribe("pagecow:download-completed", callback),
  openDownload: (savePath) => ipcRenderer.invoke("pagecow:open-download", savePath),
  revealDownload: (savePath) => ipcRenderer.invoke("pagecow:reveal-download", savePath),
  cancelDownload: (id) => ipcRenderer.invoke("pagecow:cancel-download", id)
});
