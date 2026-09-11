const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// Support log: a small, human-readable trail of the events that matter when a
// customer reports "the page just went blank". Support can ask the customer to
// send this file (userData/support.log) so we can see exactly what happened on
// their machine: blocked navigations, renderer crashes and failed page loads.
const LOG_FILENAME = "support.log";
const MAX_LOG_BYTES = 1024 * 1024; // ~1 MB, then rotate to support.log.1

function getLogPath() {
  return path.join(app.getPath("userData"), LOG_FILENAME);
}

function rotateIfNeeded(logPath) {
  try {
    const stats = fs.statSync(logPath);
    if (stats.size < MAX_LOG_BYTES) return;
  } catch (_e) {
    return; // No log file yet (or not readable) — nothing to rotate.
  }

  const backupPath = `${logPath}.1`;
  try {
    fs.rmSync(backupPath, { force: true });
  } catch (_e) {}
  try {
    fs.renameSync(logPath, backupPath);
  } catch (_e) {}
}

function appendSupportLog(message) {
  try {
    const logPath = getLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    rotateIfNeeded(logPath);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8");
  } catch (_e) {
    // Logging must never break browsing.
  }
}

module.exports = {
  getLogPath,
  appendSupportLog
};
