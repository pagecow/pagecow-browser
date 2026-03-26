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
    <section className="blocked-screen">
      <div className="blocked-card">
        <div className="cow-mark" aria-hidden>
          🐄
        </div>
        <h2>This site isn&rsquo;t available in PageCow.</h2>
        <p>PageCow keeps you focused on your work.</p>
        <p className="blocked-domain">{extractHost(blockedUrl)}</p>
        <button type="button" className="btn primary" onClick={onOpenSettings}>
          Open Settings
        </button>
        <p className="about" style={{ marginTop: 14 }}>
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
      </div>
    </section>
  );
}

export default BlockedPage;
