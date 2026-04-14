"use strict";

const fs = require("fs");
const path = require("path");

/**
 * GNOME matches dock icons to .desktop files by StartupWMClass; running the raw
 * binary has no desktop entry, so the shell shows a generic gear. Writes a
 * launcher next to the build output (not inside the AppImage payload) with an
 * absolute Icon= path to resources/icon.png.
 *
 * @param {import("electron-builder").AfterPackContext} context
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "linux") return;

  const appOutDir = context.appOutDir;
  const exeName = "pagecow-browser";
  const exePath = path.join(appOutDir, exeName);
  const iconPath = path.join(appOutDir, "resources", "icon.png");

  if (!fs.existsSync(iconPath) || !fs.existsSync(exePath)) return;

  const releaseDir = path.dirname(appOutDir);
  const desktopPath = path.join(releaseDir, "pagecow-browser-unpacked.desktop");

  const desktop = [
    "[Desktop Entry]",
    "Version=1.0",
    "Type=Application",
    "Name=PageCow",
    `Exec="${exePath}" --no-sandbox %u`,
    `Icon=${iconPath}`,
    "Terminal=false",
    "Categories=Network;WebBrowser;",
    `StartupWMClass=${exeName}`,
    "Comment=PageCow (run this when testing the linux-unpacked build)"
  ].join("\n");

  fs.writeFileSync(desktopPath, `${desktop}\n`, "utf8");
};
