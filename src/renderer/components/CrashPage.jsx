function extractHost(url) {
  if (!url || typeof url !== "string") return "this page";
  try {
    return new URL(url).hostname || "this page";
  } catch {
    return url;
  }
}

const CrashIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32">
    <path
      fill="#80868b"
      d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
    />
  </svg>
);

const COPY = {
  "render-process-gone": {
    title: "This page stopped working",
    body: "The page ran into a problem and had to close. Reload it to get back to what you were doing."
  },
  unresponsive: {
    title: "This page isn't responding",
    body: "The page is taking a long time to answer. You can wait for it, or reload to start fresh."
  },
  "did-fail-load": {
    title: "This page couldn't be loaded",
    body: "PageCow couldn't reach this page. Check your internet connection and try again."
  }
};

const CRASH_REASON_LABELS = {
  "abnormal-exit": "The page closed unexpectedly.",
  crashed: "The page crashed.",
  killed: "The page was closed by the system.",
  oom: "The page ran out of memory.",
  "launch-failed": "The page could not be started.",
  "integrity-failure": "The page failed a security check."
};

function CrashPage({
  kind = "render-process-gone",
  url,
  reason,
  errorCode,
  errorDescription,
  onReload,
  onDismiss
}) {
  const copy = COPY[kind] || COPY["render-process-gone"];

  let detail = "";
  if (kind === "render-process-gone") {
    detail = CRASH_REASON_LABELS[reason] || (reason ? `Reason: ${reason}` : "");
  } else if (kind === "did-fail-load") {
    const code = errorCode ? ` (${errorCode})` : "";
    detail = errorDescription ? `${errorDescription}${code}` : "";
  }

  return (
    <section className="blocked-screen">
      <div className="blocked-card">
        <div className="blocked-icon">
          <CrashIcon />
        </div>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="crash-url">
          <div className="blocked-domain">{extractHost(url)}</div>
          {detail ? <p className="crash-detail">{detail}</p> : null}
        </div>
        <div className="blocked-actions">
          {onDismiss ? (
            <button type="button" className="btn crash-dismiss" onClick={onDismiss}>
              Wait
            </button>
          ) : null}
          <button type="button" className="btn btn-primary crash-reload" onClick={onReload}>
            Reload
          </button>
        </div>
        <p className="blocked-footer">
          If this keeps happening, email{" "}
          <a href="mailto:support@pagecow.com">support@pagecow.com</a>
        </p>
      </div>
    </section>
  );
}

export default CrashPage;
