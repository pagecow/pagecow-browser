import { useMemo, useState } from "react";

function SettingsPage({
  settings,
  preApprovedDomains,
  personalDomains,
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
      <div className="card settings-grid">
        <header className="settings-header">
          <div>
            <h2 className="section-title">Settings</h2>
            <p className="about">Control your PageCow focus experience.</p>
          </div>
          <button className="btn" type="button" onClick={onClose}>
            Done
          </button>
        </header>

        <section>
          <h3 className="section-title">Add personal whitelist site</h3>
          <form className="inline-form" onSubmit={handleAddDomain}>
            <input
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
          {message ? (
            <p className={isError ? "error" : "about"} role={isError ? "alert" : "status"}>
              {message}
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="section-title">Your personal sites</h3>
          <div className="domain-list">
            {personalDomains.length === 0 ? (
              <p className="about">No personal sites yet.</p>
            ) : (
              personalDomains.map((domain) => (
                <div className="domain-item" key={domain}>
                  <span>{domain}</span>
                  <button className="btn" type="button" onClick={() => handleRemoveDomain(domain)}>
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="section-title">Display options</h3>
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

        <section>
          <h3 className="section-title">Full whitelist ({fullWhitelist.length})</h3>
          <div className="domain-list">
            {fullWhitelist.map((entry) => (
              <div className="domain-item" key={`${entry.type}:${entry.domain}`}>
                <span>{entry.domain}</span>
                <span className="domain-meta">{entry.type}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about">
          <h3 className="section-title">About PageCow</h3>
          <p>The browser that keeps you writing.</p>
          <p>Version: {version}</p>
          <p>
            Website:{" "}
            <a
              href="https://pagecow.com"
              onClick={(event) => {
                event.preventDefault();
                window.pagecow.openExternal("https://pagecow.com");
              }}
            >
              pagecow.com
            </a>
          </p>
        </section>
      </div>
    </section>
  );
}

export default SettingsPage;
