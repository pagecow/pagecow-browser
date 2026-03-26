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
      ...preApprovedDomains.map((domain) => ({
        domain,
        type: "Pre-approved"
      })),
      ...personalDomains.map((domain) => ({
        domain,
        type: "Personal"
      }))
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
    <section className="settings-wrap">
      <div className="settings-card">
        <header className="settings-head">
          <h2>Settings</h2>
          <button className="btn" type="button" onClick={onClose}>
            Done
          </button>
        </header>

        <div className="settings-grid">
          <section className="settings-section">
            <h3>Add personal whitelist site</h3>
            <form className="inline-form" onSubmit={handleAddDomain}>
              <input
                className="inline-input"
                type="text"
                value={newDomain}
                onChange={(event) => setNewDomain(event.target.value)}
                placeholder="example.com"
                aria-label="Domain to whitelist"
              />
              <button type="submit" className="btn primary">
                Add site
              </button>
            </form>
            {message && (
              <p className={isError ? "error" : "about"} role={isError ? "alert" : "status"}>
                {message}
              </p>
            )}
          </section>

          <section className="settings-section">
            <h3>Your personal sites</h3>
            <div className="domain-list">
              {personalDomains.length === 0 ? (
                <div className="domain-item">
                  <span className="about">No personal sites yet.</span>
                </div>
              ) : (
                personalDomains.map((domain) => (
                  <div className="domain-item" key={domain}>
                    <span className="domain-name">{domain}</span>
                    <button
                      className="remove-btn"
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
            <h3>Display options</h3>
            <div className="toggles">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.showBookmarksBar}
                  onChange={(event) => onToggleBookmarksBar(event.target.checked)}
                />
                Show bookmarks bar
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.showDailyQuote}
                  onChange={(event) => onToggleDailyQuote(event.target.checked)}
                />
                Show daily writing quote on new tab
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Full whitelist ({fullWhitelist.length})</h3>
            <div className="domain-list">
              {fullWhitelist.map((entry) => (
                <div className="domain-item" key={`${entry.type}:${entry.domain}`}>
                  <span className="domain-name">{entry.domain}</span>
                  <span className="domain-meta">{entry.type}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="about">
            <h3>About PageCow</h3>
            <p>The browser that keeps you writing.</p>
            <p>Version: {version}</p>
            <p>
              Missing a site? Email us at{" "}
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
              Website:{" "}
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
          </section>
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
