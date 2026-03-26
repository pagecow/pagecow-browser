import { useMemo, useState } from "react";

function SettingsPage({
  settings,
  preApprovedDomains = [],
  personalDomains = [],
  version,
  onAddDomain,
  onRemoveDomain,
  onToggleBookmarksBar,
  onToggleDailyQuote,
  onClose
}) {
  const [newDomain, setNewDomain] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const fullWhitelist = useMemo(() => {
    const list = [
      ...preApprovedDomains.map((domain) => ({ domain, type: "Pre-approved" })),
      ...personalDomains.map((domain) => ({ domain, type: "Personal" }))
    ];
    return list.sort((a, b) => a.domain.localeCompare(b.domain));
  }, [preApprovedDomains, personalDomains]);

  async function handleAddDomain(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    const result = await onAddDomain(newDomain);
    if (!result?.ok) {
      setMessage(result?.message || "Could not add this domain.");
      setIsError(true);
      return;
    }

    setMessage("Site added to your personal whitelist.");
    setNewDomain("");
  }

  async function handleRemoveDomain(domain) {
    setMessage("");
    setIsError(false);
    const result = await onRemoveDomain(domain);
    if (!result?.ok) {
      setMessage(result?.message || "Could not remove this domain.");
      setIsError(true);
      return;
    }
    setMessage("Site removed from your personal whitelist.");
  }

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
          <h3>Add a personal site</h3>
          <p className="settings-section-hint">
            Add work-related domains to your personal whitelist.
          </p>
          <form className="settings-form" onSubmit={handleAddDomain}>
            <input
              className="settings-input"
              type="text"
              value={newDomain}
              onChange={(event) => setNewDomain(event.target.value)}
              placeholder="example.com"
              aria-label="Domain to whitelist"
            />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
          {message && (
            <p
              className={`settings-message ${isError ? "error" : "success"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </section>

        <section className="settings-section">
          <h3>Your personal sites</h3>
          <p className="settings-section-hint">
            Sites you&rsquo;ve added to your whitelist.
          </p>
          <div className="domain-list">
            {personalDomains.length === 0 ? (
              <div className="domain-empty">No personal sites added yet</div>
            ) : (
              personalDomains.map((domain) => (
                <div className="domain-item" key={domain}>
                  <span className="domain-name">{domain}</span>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
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
                  onChange={(event) => onToggleBookmarksBar(event.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="toggle-row">
              <span className="toggle-label">Show daily quote on new tab</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showDailyQuote}
                  onChange={(event) => onToggleDailyQuote(event.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>All approved sites ({fullWhitelist.length})</h3>
          <p className="settings-section-hint">
            Complete list of sites you can access in PageCow.
          </p>
          <div className="domain-list">
            {fullWhitelist.map((entry) => (
              <div className="domain-item" key={`${entry.type}:${entry.domain}`}>
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
                href="mailto:submission@pagecow.com"
                onClick={(event) => {
                  event.preventDefault();
                  window.pagecow?.openExternal("mailto:submission@pagecow.com");
                }}
              >
                submission@pagecow.com
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
