import { useMemo, useState } from "react";

function SettingsPage({
  settings,
  preApprovedDomains = [],
  personalDomains = [],
  version,
  onToggleBookmarksBar,
  onClose,
  onUpdateSettings,
  onClearBrowsingData,
}) {
  const [clearStatus, setClearStatus] = useState("idle");

  const fullWhitelist = useMemo(() => {
    const list = [
      ...preApprovedDomains.map((domain) => ({ domain, type: "Pre-approved" })),
      ...personalDomains.map((domain) => ({ domain, type: "Personal" })),
    ];
    return list.sort((a, b) => a.domain.localeCompare(b.domain));
  }, [preApprovedDomains, personalDomains]);

  const handleRemoveBookmark = (domain) => {
    const nextBookmarks = (settings.bookmarks || []).filter(
      (b) => b !== domain,
    );
    onUpdateSettings({ bookmarks: nextBookmarks });
  };

  const handleConfirmClear = async () => {
    setClearStatus("clearing");
    const result = await onClearBrowsingData?.();
    setClearStatus(result?.ok ? "done" : "error");
  };

  return (
    <section className="settings-page">
      <header className="settings-header">
        <h2>Settings</h2>
        <button className="btn" type="button" onClick={onClose}>
          Done
        </button>
      </header>

      <div className="settings-sections">
        <section className="settings-section">
          <p>
            Would you like another site to be added to the approved list of
            sites? Send us an email at support@pagecow.com
          </p>
        </section>

        <section className="settings-section">
          <h3>Preferences</h3>
          <div className="toggle-group">
            <div className="toggle-row">
              <span className="toggle-label">Show bookmarks bar</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showBookmarksBar}
                  onChange={(event) =>
                    onToggleBookmarksBar(event.target.checked)
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Browsing data</h3>
          <p className="settings-section-hint">
            Sign out of sites and clear saved cookies, caches and site data. Use
            this when a site is stuck on stale or broken state.
          </p>
          {clearStatus === "confirm" || clearStatus === "clearing" ? (
            <div className="settings-confirm">
              <p>
                This signs you out of every site and removes cached files and
                stored data. It cannot be undone.
              </p>
              <div className="settings-confirm-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setClearStatus("idle")}
                  disabled={clearStatus === "clearing"}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger clear-data-confirm"
                  onClick={handleConfirmClear}
                  disabled={clearStatus === "clearing"}
                >
                  {clearStatus === "clearing" ? "Clearing…" : "Clear browsing data"}
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-actions-row">
              <button
                type="button"
                className="btn btn-sm btn-danger clear-data"
                onClick={() => setClearStatus("confirm")}
              >
                Clear browsing data
              </button>
              {clearStatus === "done" ? (
                <span className="settings-message success">
                  Browsing data cleared.
                </span>
              ) : null}
              {clearStatus === "error" ? (
                <span className="settings-message error">
                  Could not clear browsing data. Please try again.
                </span>
              ) : null}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Your Bookmarks ({settings.bookmarks?.length || 0})</h3>
          <p className="settings-section-hint">
            Manage your bookmarked sites. They will appear in the bookmarks bar
            if it is enabled.
          </p>
          <div className="domain-list">
            {(settings.bookmarks || []).length === 0 ? (
              <div className="domain-empty">No bookmarked sites yet.</div>
            ) : (
              settings.bookmarks.map((domain) => (
                <div className="domain-item" key={`bookmark:${domain}`}>
                  <span className="domain-name">{domain}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRemoveBookmark(domain)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="settings-section">
          <h3>All approved sites ({fullWhitelist.length})</h3>
          <p className="settings-section-hint">
            Complete list of sites you can access in PageCow.
          </p>
          <div className="domain-list">
            {fullWhitelist.map((entry) => (
              <div
                className="domain-item"
                key={`${entry.type}:${entry.domain}`}
              >
                <span className="domain-name">{entry.domain}</span>
                <span className="domain-meta">{entry.type}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>About PageCow</h3>
          <div className="about-section">
            <p>The distraction-free browser for focused work.</p>
            <p>Version {version}</p>
            <p>
              Need a site approved?{" "}
              <a
                href="mailto:support@pagecow.com"
                onClick={(event) => {
                  event.preventDefault();
                  window.pagecow?.openExternal("mailto:support@pagecow.com");
                }}
              >
                support@pagecow.com
              </a>
            </p>
            <p>
              <a
                href="https://pagecow.com"
                onClick={(event) => {
                  event.preventDefault();
                  window.pagecow?.openExternal("https://pagecow.com");
                }}
              >
                pagecow.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

export default SettingsPage;
