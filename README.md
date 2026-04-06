# PageCow Browser

PageCow is a distraction-free, work-only Chromium desktop browser built with Electron + React.

## Features

- Strict domain whitelist enforced at the Electron main-process level
- Friendly blocked page for non-whitelisted sites
- New tab page with:
  - PageCow branding
  - live clock
  - daily rotating writing quote
- Minimal toolbar:
  - back / forward / refresh
  - URL bar
  - settings
- Settings page:
  - view full whitelist (pre-approved + personal)
  - add/remove personal whitelist domains
  - toggle bookmarks bar visibility
  - toggle daily quote on new tab page
  - about section with app version and pagecow.com link
- No extension support

## Project Structure

```
electron/
  main.js
  preload.js
  src/main/
    window.js
    whitelistEngine.js
    settingsStore.js
    quotes.js
src/renderer/
  App.jsx
  components/
  data/
  utils/
  styles.css
whitelist.json
config/whitelist.json
electron-builder.yml
```

## Development

Requirements:

- Node.js 20+
- npm 10+

Install dependencies:

```bash
npm install
```

Run in development mode (Vite + Electron):

```bash
npm run dev
```

## Build

Build renderer assets:

```bash
npm run build
```

Create unpacked app:

```bash
npm run pack
```

Create installable distributions:

```bash
npm run dist
```

Targets configured with `electron-builder`:

- macOS: DMG
- Windows: EXE (NSIS)
- Linux: AppImage

## GitHub releases

Pushing a tag matching `v*` (for example `v1.2.3`) runs [`.github/workflows/release.yml`](.github/workflows/release.yml): installers are built on macOS, Windows, and Linux and attached to a **public** GitHub Release for that tag.

```bash
git tag v1.2.3
git push origin v1.2.3
```

The workflow sets the npm package version from the tag (without the leading `v`) so installer filenames match the release. Code signing and macOS notarization are not configured; users may see platform warnings for unsigned builds.

## Whitelist Configuration

Pre-approved domains are defined in:

- `whitelist.json` (source config)
- `config/whitelist.json` (packaged resource copy)

Personal whitelist domains and user preferences are stored in a local `settings.json` file in the app's user data directory.

### Notes on domain rules

- Subdomains of whitelisted domains are allowed.
- `google.com` root is explicitly blocked.
- Specific Google work subdomains (for example `scholar.google.com`, `docs.google.com`) are allowed if listed.
- Common distracting domains (social, news, video, shopping, etc.) are blocked by default.
