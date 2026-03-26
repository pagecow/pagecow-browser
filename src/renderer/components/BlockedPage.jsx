function extractHost(url) {
  if (!url || typeof url !== "string") return "this site";
  try {
    return new URL(url).hostname || "this site";
  } catch {
    return url;
  }
}

const BlockedIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32">
    <path
      fill="#80868b"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 014 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0120 12c0 4.42-3.58 8-8 8z"
    />
  </svg>
);

function BlockedPage({ blockedUrl, onOpenSettings }) {
  return (
    <section className="blocked-screen">
      <div className="blocked-card">
        <div className="blocked-icon">
          <BlockedIcon />
        </div>
        <h2>This site isn&rsquo;t available</h2>
        <p>
          PageCow only allows access to approved work sites to help you stay focused.
        </p>
        <div className="blocked-domain">{extractHost(blockedUrl)}</div>
        <div className="blocked-actions">
          <button type="button" className="btn btn-primary" onClick={onOpenSettings}>
            Open Settings
          </button>
        </div>
        <p className="blocked-footer">
          Need this site for work? Submit a request to add it to the approved list by emailing <a href="mailto:submissions@pagecow.com">submissions@pagecow.com</a>
          
        </p>
      </div>
    </section>
  );
}

export default BlockedPage;
