#!/bin/sh
set -e

CHROME_SANDBOX="/opt/PageCow/chrome-sandbox"

# Electron on Linux expects the SUID sandbox helper to be owned by root and
# have mode 4755. Without this, the packaged app installs but fails to launch.
if [ -f "$CHROME_SANDBOX" ]; then
  chown root:root "$CHROME_SANDBOX" || true
  chmod 4755 "$CHROME_SANDBOX" || true
fi

# Refresh icon and application caches so GNOME shows the packaged icon instead
# of a generic gear after installation or upgrade.
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f /usr/share/icons/hicolor 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications 2>/dev/null || true
fi
