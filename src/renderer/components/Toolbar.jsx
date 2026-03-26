import { useEffect, useState } from "react";

function Toolbar({
  value,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onRefresh,
  onNavigate,
  onSettings,
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
      <button
        type="button"
        className="toolbar-button"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Back"
        title="Back"
      >
        ←
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onForward}
        disabled={!canGoForward}
        aria-label="Forward"
        title="Forward"
      >
        →
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onRefresh}
        aria-label="Refresh"
        title="Refresh"
      >
        ↻
      </button>

      <form className="toolbar-address" onSubmit={handleSubmit}>
        <input
          className="url-input"
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Enter a work site URL..."
          aria-label="Address bar"
        />
        <button type="submit" className="go-button">Go</button>
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
        ⚙
      </button>
    </header>
  );
}

export default Toolbar;
