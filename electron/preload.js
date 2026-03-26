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

  onBlockedNavigation: (callback) => subscribe("pagecow:blocked-navigation", callback),
  onStateChanged: (callback) => subscribe("pagecow:state-changed", callback)
});
