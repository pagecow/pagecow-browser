import { useMemo } from "react";

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);

const FolderIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M10 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const precision = value < 10 && unit > 0 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unit]}`;
}

function getStatusLabel(download) {
  if (download.status === "in_progress") {
    if (download.isPaused) return "Paused";
    if (download.totalBytes > 0) {
      return `${formatBytes(download.receivedBytes)} of ${formatBytes(download.totalBytes)}`;
    }
    return formatBytes(download.receivedBytes) || "Starting…";
  }
  if (download.status === "completed") return "Done";
  if (download.status === "cancelled") return "Cancelled";
  if (download.status === "interrupted") return "Failed";
  return "";
}

function DownloadRow({ download, onOpen, onReveal, onCancel, onDismiss }) {
  const progress = useMemo(() => {
    if (download.status !== "in_progress") return 100;
    if (!download.totalBytes || download.totalBytes <= 0) return null;
    return Math.max(
      0,
      Math.min(100, Math.round((download.receivedBytes / download.totalBytes) * 100))
    );
  }, [download.status, download.receivedBytes, download.totalBytes]);

  const status = getStatusLabel(download);
  const statusClass = `download-row-status download-row-status-${download.status}`;

  return (
    <div className="download-row">
      <div className="download-row-icon">
        <DownloadIcon />
      </div>
      <div className="download-row-body">
        <div className="download-row-title" title={download.filename}>
          {download.filename}
        </div>
        <div className={statusClass}>{status}</div>
        {download.status === "in_progress" && (
          <div
            className={`download-row-progress${
              progress === null ? " download-row-progress-indeterminate" : ""
            }`}
          >
            <div
              className="download-row-progress-fill"
              style={progress === null ? undefined : { width: `${progress}%` }}
            />
          </div>
        )}
        {download.status !== "in_progress" && (
          <div className="download-row-actions">
            {download.status === "completed" && (
              <>
                <button
                  type="button"
                  className="download-row-link"
                  onClick={() => onOpen(download)}
                >
                  Open
                </button>
                <span className="download-row-sep">·</span>
                <button
                  type="button"
                  className="download-row-link"
                  onClick={() => onReveal(download)}
                >
                  <FolderIcon />
                  Show in folder
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {download.status === "in_progress" ? (
        <button
          type="button"
          className="download-row-close"
          onClick={() => onCancel(download)}
          aria-label="Cancel download"
          title="Cancel"
        >
          <CloseIcon />
        </button>
      ) : (
        <button
          type="button"
          className="download-row-close"
          onClick={() => onDismiss(download)}
          aria-label="Dismiss"
          title="Dismiss"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

function DownloadsTray({ downloads, onOpen, onReveal, onCancel, onDismiss, onClearAll }) {
  if (!downloads || downloads.length === 0) return null;

  const hasFinished = downloads.some((d) => d.status !== "in_progress");

  return (
    <div className="downloads-tray" role="region" aria-label="Downloads">
      <div className="downloads-tray-header">
        <span className="downloads-tray-title">Downloads</span>
        {hasFinished && (
          <button type="button" className="downloads-tray-clear" onClick={onClearAll}>
            Clear
          </button>
        )}
      </div>
      <div className="downloads-tray-list">
        {downloads.map((download) => (
          <DownloadRow
            key={download.id}
            download={download}
            onOpen={onOpen}
            onReveal={onReveal}
            onCancel={onCancel}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
}

export default DownloadsTray;
