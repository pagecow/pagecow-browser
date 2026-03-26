function extractHost(url) {
  if (!url || typeof url !== "string") return "this site";
  try {
    return new URL(url).hostname || "this site";
  } catch (error) {
    return url;
  }
}

function BlockedPage({ blockedUrl, onOpenSettings }) {
  return (
    <section className="blocked-page">
      <div className="blocked-card">
        <div className="cow-icon" aria-hidden>
          🐄
        </div>
        <h1 className="blocked-title">This site isn't available in PageCow.</h1>
        <p className="blocked-text">
          PageCow keeps you focused on your work.
        </p>
        <p className="blocked-domain">{extractHost(blockedUrl)}</p>
        <button type="button" className="btn primary" onClick={onOpenSettings}>
          Add this site to my whitelist
        </button>
        <p className="about blocked-help">
          Missing a site? Email us at{" "}
          <a
            href="mailto:submission@pagecow.com"
            onClick={(event) => {
              event.preventDefault();
              window.pagecow.openExternal("mailto:submission@pagecow.com");
            }}
          >
            submission@pagecow.com
          </a>
        </p>
      </div>
    </section>
  );
}

export default BlockedPage;
