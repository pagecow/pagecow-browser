"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * GNOME matches dock icons to .desktop files by StartupWMClass; running the raw
 * binary has no desktop entry, so the shell shows a generic gear.
 *
 * This hook:
 * 1. Writes a launcher .desktop file next to the build output for reference.
 * 2. Installs the .desktop file and icon into ~/.local/share/ so GNOME can
 *    match the running window and display the correct icon in the taskbar.
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

  const desktopEntry = [
    "[Desktop Entry]",
    "Version=1.0",
    "Type=Application",
    "Name=PageCow",
    `Exec="${exePath}" %u`,
    `Icon=${exeName}`,
    "Terminal=false",
    "Categories=Network;WebBrowser;",
    `StartupWMClass=${exeName}`,
    "Comment=PageCow - distraction-free work-only browser"
  ].join("\n");

  const releaseDir = path.dirname(appOutDir);
  fs.writeFileSync(
    path.join(releaseDir, "pagecow-browser-unpacked.desktop"),
    `${desktopEntry}\n`,
    "utf8"
  );

  if (process.env.CI) return;

  const home = os.homedir();
  const localAppsDir = path.join(home, ".local", "share", "applications");
  const localIconDir = path.join(
    home, ".local", "share", "icons", "hicolor", "512x512", "apps"
  );

  fs.mkdirSync(localAppsDir, { recursive: true });
  fs.mkdirSync(localIconDir, { recursive: true });

  fs.copyFileSync(iconPath, path.join(localIconDir, `${exeName}.png`));

  const installedDesktop = desktopEntry.replace(
    `Icon=${exeName}`,
    `Icon=${path.join(localIconDir, exeName + ".png")}`
  );
  fs.writeFileSync(
    path.join(localAppsDir, `${exeName}.desktop`),
    `${installedDesktop}\n`,
    "utf8"
  );
};
