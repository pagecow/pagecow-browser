import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { letterPlaceholderPalette, useFavicon } from "../utils/favicon";

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

const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24">
    {filled ? (
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    ) : (
      <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" />
    )}
  </svg>
);

function SuggestionFavicon({ domain }) {
  const { dataUrl } = useFavicon(domain);
  if (dataUrl) {
    return (
      <img
        className="omnibox-suggestion-icon"
        src={dataUrl}
        alt=""
        width="16"
        height="16"
        loading="lazy"
      />
    );
  }
  return (
    <span
      className="omnibox-suggestion-icon omnibox-suggestion-icon-letter"
      style={letterPlaceholderPalette(domain)}
      aria-hidden="true"
    >
      {(domain?.[0] || "?").toUpperCase()}
    </span>
  );
}

function Toolbar({
  value,
  focusOmniboxKey = 0,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onRefresh,
  onNavigate,
  onSettings,
  onHome,
  statusText,
  isBookmarked,
  onToggleBookmark,
  approvedDomains
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const pendingSelectAll = useRef(false);

  useEffect(() => {
    if (focusOmniboxKey <= 0) return;
    pendingSelectAll.current = true;
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  }, [focusOmniboxKey]);

  useLayoutEffect(() => {
    if (!pendingSelectAll.current) return;
    const input = inputRef.current;
    if (!input || document.activeElement !== input) return;
    input.select();
  });

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const suggestions = useMemo(() => {
    if (!showSuggestions || !inputValue.trim()) return [];
    const term = inputValue.toLowerCase().trim();
    if (term.startsWith("http://") || term.startsWith("https://")) return [];
    const domains = approvedDomains || [];
    return domains
      .map((domain) => {
        const lower = domain.toLowerCase();
        const name = lower.split(".")[0];
        let score = 0;
        if (name === term) score = 100;
        else if (lower === term) score = 95;
        else if (name.startsWith(term)) score = 80;
        else if (lower.startsWith(term)) score = 75;
        else if (name.includes(term)) score = 60;
        else if (lower.includes(term)) score = 40;
        return { domain, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.domain);
  }, [inputValue, showSuggestions, approvedDomains]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateTo(domain) {
    setShowSuggestions(false);
    setInputValue(domain);
    onNavigate(domain);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      navigateTo(suggestions[selectedIndex]);
      return;
    }
    if (suggestions.length > 0) {
      navigateTo(suggestions[0]);
      return;
    }
    setShowSuggestions(false);
    onNavigate(inputValue);
  }

  function handleKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
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
        <div className="omnibox-wrap" ref={wrapRef}>
          <input
            ref={inputRef}
            className="omnibox"
            type="text"
            value={inputValue}
            onChange={(event) => {
              pendingSelectAll.current = false;
              setInputValue(event.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setShowSuggestions(true);
            }}
            onBlur={() => {
              pendingSelectAll.current = false;
              requestAnimationFrame(() => {
                if (wrapRef.current?.contains(document.activeElement)) return;
                setShowSuggestions(false);
                setInputValue(value || "");
              });
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search or enter a work site URL"
            aria-label="Address bar"
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              className={`star-button${isBookmarked ? " bookmarked" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                onToggleBookmark();
              }}
              title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              <StarIcon filled={isBookmarked} />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="omnibox-dropdown">
              {suggestions.map((domain, index) => (
                <button
                  key={domain}
                  type="button"
                  className={`omnibox-suggestion${index === selectedIndex ? " selected" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigateTo(domain);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <SuggestionFavicon domain={domain} />
                  <span className="omnibox-suggestion-domain">{domain}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {statusText ? (
        <span className={`status-pill${isBlocked ? " blocked" : ""}`}>{statusText}</span>
      ) : null}

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
