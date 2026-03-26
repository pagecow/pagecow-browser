import { useEffect, useState } from "react";

const BackIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);

const ForwardIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z" />
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

function Toolbar({
  value,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onRefresh,
  onNavigate,
  onSettings,
  onHome,
  statusText
}) {
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  function handleSubmit(event) {
    event.preventDefault();
    onNavigate(inputValue);
  }

  const isBlocked = statusText && statusText.toLowerCase().includes("blocked");

  return (
    <header className="toolbar">
      <div className="toolbar-nav">
        <button
          type="button"
          className="toolbar-button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Back"
          title="Back"
        >
          <BackIcon />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label="Forward"
          title="Forward"
        >
          <ForwardIcon />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onRefresh}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>

      <button
        type="button"
        className="toolbar-button"
        onClick={onHome}
        aria-label="Home"
        title="Home"
      >
        <HomeIcon />
      </button>

      <form className="toolbar-address" onSubmit={handleSubmit}>
        <input
          className="omnibox"
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Search or enter a work site URL"
          aria-label="Address bar"
        />
      </form>

      <span className={`status-pill${isBlocked ? " blocked" : ""}`}>
        {statusText || "Focus mode"}
      </span>

      <button
        type="button"
        className="toolbar-button"
        onClick={onSettings}
        aria-label="Settings"
        title="Settings"
      >
        <SettingsIcon />
      </button>
    </header>
  );
}

export default Toolbar;
