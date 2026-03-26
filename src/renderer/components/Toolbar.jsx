import { useEffect, useState } from "react";

function Toolbar({
  value,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onRefresh,
  onNavigate,
  onSettings
}) {
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  function handleSubmit(event) {
    event.preventDefault();
    onNavigate(inputValue);
  }

  return (
    <header className="toolbar">
      <button
        type="button"
        className="icon-button"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Back"
        title="Back"
      >
        ←
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={onForward}
        disabled={!canGoForward}
        aria-label="Forward"
        title="Forward"
      >
        →
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={onRefresh}
        aria-label="Refresh"
        title="Refresh"
      >
        ↻
      </button>

      <form className="url-form" onSubmit={handleSubmit}>
        <input
          className="url-input"
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Enter a work site URL..."
          aria-label="Address bar"
        />
      </form>

      <div className="toolbar-status">Focus mode</div>

      <button
        type="button"
        className="icon-button"
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
