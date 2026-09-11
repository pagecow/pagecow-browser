# AGENTS.md — PageCow browser

Electron app: main process in `electron/`, renderer (React + Vite) in `src/renderer/`,
installers built with electron-builder (`electron-builder.yml`).

- `npm run dev` — Vite dev server + Electron with hot reload.
- `npm run build` — builds the renderer into `dist/` (required before any packaged run).
- `npx electron .` — run the packaged-style app from source.
- `npm test` — no test suite; the scratch harnesses in `tmp/scratch/` (gitignored) drive
  the real app through `executeJavaScript` — see `tmp/scratch/crash-test-main.js`.
- Durable lessons from past sessions live in `MEMORY.md` (repo root, intentionally untracked).

Commit convention: end agent-written commit messages with a blank line then
`Built with ChatOSS.ai`. Never add a `Co-Authored-By` trailer.

---

## Cutting a release

**One command:**

```bash
npm run release -- patch "fix the thing"     # or minor / major, summary optional
```

`scripts/release.sh` bumps `package.json` + lockfile, commits `Release vX.Y.Z: <summary>`,
pushes `main`, pushes the tag, then watches the workflow and prints the release URL.
It refuses to run on a dirty tree, off `main`, out of sync with `origin/main`, or when a
required GitHub secret is missing.

The tag triggers `.github/workflows/release.yml`, which:

1. builds on `macos-latest`, `windows-latest`, `ubuntu-latest` (`npm ci` → `npm run dist`);
2. on macOS imports the Developer ID certificate from the `MAC_CERT_P12` /
   `MAC_CERT_PASSWORD` secrets into a temporary keychain, then electron-builder signs,
   notarizes and staples automatically because `APPLE_ID` /
   `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` are set;
3. uploads `release/*` as artifacts;
4. publishes them to the GitHub Release (softprops/action-gh-release);
5. **verifies** the exact asset names below and fails the release if one is missing.

`workflow_dispatch` runs the build jobs **without** publishing — use it to test signing
after changing the workflow or the certificate.

### Required GitHub secrets (repo: `pagecow/pagecow-browser`)

| Secret | Value |
| --- | --- |
| `MAC_CERT_P12` | base64 of the Developer ID Application `.p12` (export from Keychain Access, or `security export -t identities -f pkcs12 -k ~/Library/Keychains/login.keychain-db -P <p12-password> -o cert.p12` — macOS will ask for permission the first time) |
| `MAC_CERT_PASSWORD` | password chosen when exporting the `.p12` |
| `APPLE_ID` | Apple ID used for notarization (`~/.zshrc` has it as `APPLE_ID`) |
| `APPLE_APP_SPECIFIC_PASSWORD` | app-specific password (in `~/.zshrc` as `APPLE_PASSWORD` — Tauri-style name; electron-builder only reads `APPLE_APP_SPECIFIC_PASSWORD`) |
| `APPLE_TEAM_ID` | `Q66FQ33N96` |

```bash
base64 -i cert.p12 | gh secret set MAC_CERT_P12 --repo pagecow/pagecow-browser
gh secret set MAC_CERT_PASSWORD --repo pagecow/pagecow-browser   # paste when prompted
```

### Asset-name contract (the site links these)

```
PageCow-<version>-arm64.dmg          macOS Apple Silicon
PageCow-<version>.dmg                macOS Intel
PageCow-<version>-arm64-mac.zip      auto-update payload (arm64)
PageCow-<version>-mac.zip            auto-update payload (Intel)
PageCow-Setup-<version>.exe          Windows
pagecow-browser_<version>_amd64.deb  Linux
PageCow-<version>.AppImage           Linux
```

These names are duplicated in `pagecow-site/lib/latest-release.ts` and in the workflow's
"Verify release assets" step. **Change one, change all three.**

### Gotchas (learned the hard way)

- **Jobs that use `gh` need a checkout or an explicit `--repo`**: the `verify`
  job has no `actions/checkout`, so `gh release view …` failed with
  `fatal: not a git repository` on v1.0.19 (the release itself was fine — only
  the check failed). Always pass `--repo "$GITHUB_REPOSITORY"`.
- **GitHub artifact upload/download rewrites spaces in file names** (spaces → dots).
  CI used to build `PageCow Setup <v>.exe`, the release asset became
  `PageCow.Setup.<v>.exe`, and the site's link 404'd for months. That is why
  `nsis.artifactName` is pinned to `PageCow-Setup-${version}.${ext}` in
  `electron-builder.yml` — keep installer names space-free.
- **Notarization credentials are env-only**: `@electron/notarize` runs automatically
  whenever the three `APPLE_*` vars exist; with none set the build is ad-hoc signed and
  Gatekeeper rejects it for customers (CI log: `skipped macOS notarization`).
- During local notarization the app-specific password is visible in the process list
  (`notarytool submit … --password …`); a `xcrun notarytool store-credentials` keychain
  profile avoids that if it ever matters.
- Gatekeeper shows the publisher as **Native Notify, INC** (the Developer ID certificate
  name), not PageCow.
- **The site updates itself** (see below) — never hardcode a version there again.

### Verifying a release like a customer

```bash
gh release download vX.Y.Z --pattern "PageCow-X.Y.Z-arm64.dmg" --dir /tmp/dl --clobber
hdiutil attach /tmp/dl/PageCow-X.Y.Z-arm64.dmg -nobrowse -mountpoint /tmp/mnt
ditto /tmp/mnt/PageCow.app /tmp/appcopy && hdiutil detach /tmp/mnt
xattr -w com.apple.quarantine "0081;$(printf '%x' $(date +%s));Safari;" /tmp/appcopy
spctl -a -vvv /tmp/appcopy          # must say: accepted, source=Notarized Developer ID
xcrun stapler validate /tmp/appcopy # must say: The validate action worked!
```

### Emergency path: build macOS locally and swap the assets

Only needed if CI signing breaks and a release must ship:

```bash
eval "$(grep -E '^export APPLE_(ID|PASSWORD|TEAM_ID)=' ~/.zshrc)"
export APPLE_APP_SPECIFIC_PASSWORD="$APPLE_PASSWORD"
npm run build
npx electron-builder --config electron-builder.yml --publish never --mac --arm64 --x64
gh release upload vX.Y.Z release/PageCow-X.Y.Z-*.dmg release/*.blockmap release/latest-mac.yml --clobber
```

Then run the "Verifying a release like a customer" steps above.

---

## Auto-update

The app uses `electron-updater` (`installAutoUpdater()` in `electron/main.js`): a few
seconds after launch it checks the latest GitHub release, downloads it in the background
and installs on quit. Every outcome is written to `userData/support.log`
(`update-available` / `update-downloaded` / `update-failed` / `update-check-failed`).

- Works only in packaged builds with `app-update.yml` (generated because
  `electron-builder.yml` has a `publish: github` block) — builds before v1.0.19 have
  none and fail quietly.
- macOS needs the **zip** target (already configured) — the dmg is for manual installs.
- Caveat: customers whose network only allows `pagecow.com` (the reason favicons were
  routed through `pagecow.com/api/favicon`) cannot reach GitHub, so their update check
  fails silently. If that matters, switch the publish provider to `generic` with a
  `pagecow.com` URL and serve the yml/installers from the site.

---

## The website (pagecow-site)

`pagecow.com/download` and the home page read the newest release straight from the
GitHub API (`lib/latest-release.ts`, ISR `revalidate = 600`) and render only the
installers that exist in that release. No version is hardcoded anywhere — do not
reintroduce an `APP_VERSION` constant. Deploys are automatic: push to `main` and
Vercel rebuilds; verify with `curl -s https://pagecow.com/download`.
