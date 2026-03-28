const path = require("path");
const fs = require("fs");
const { app, session } = require("electron");
const { ElectronBlocker } = require("@ghostery/adblocker-electron");
const fetch = require("cross-fetch").default || require("cross-fetch");

const CACHE_FILE = path.join(app.getPath("userData"), "adblocker-engine.bin");

async function initializeAdBlocker() {
  try {
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: CACHE_FILE,
      read: fs.promises.readFile,
      write: fs.promises.writeFile
    });

    blocker.enableBlockingInSession(session.defaultSession);
    console.log("[PageCow] Ad blocker enabled");
    return blocker;
  } catch (err) {
    console.error("[PageCow] Failed to initialize ad blocker:", err.message);
    return null;
  }
}

module.exports = { initializeAdBlocker };
