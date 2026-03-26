import { useCallback, useEffect, useRef, useState } from "react";

const ChevronUpIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

function FindBar({ webviewRef, onClose }) {
  const [query, setQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef(null);
  const requestIdRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const stopFind = useCallback(() => {
    const wv = webviewRef?.current;
    if (wv && typeof wv.stopFindInPage === "function") {
      wv.stopFindInPage("clearSelection");
    }
    setActiveMatch(0);
    setTotalMatches(0);
  }, [webviewRef]);

  const findInPage = useCallback(
    (text, opts = {}) => {
      const wv = webviewRef?.current;
      if (!wv || typeof wv.findInPage !== "function") return;
      if (!text) {
        stopFind();
        return;
      }
      requestIdRef.current = wv.findInPage(text, opts);
    },
    [webviewRef, stopFind]
  );

  useEffect(() => {
    const wv = webviewRef?.current;
    if (!wv) return undefined;

    const handler = (_event) => {
      const { result } = _event;
      if (result.requestId === requestIdRef.current) {
        setActiveMatch(result.activeMatchOrdinal || 0);
        setTotalMatches(result.matches || 0);
      }
    };

    wv.addEventListener("found-in-page", handler);
    return () => wv.removeEventListener("found-in-page", handler);
  }, [webviewRef]);

  useEffect(() => {
    return () => stopFind();
  }, [stopFind]);

  function handleChange(e) {
    const text = e.target.value;
    setQuery(text);
    findInPage(text);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      stopFind();
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        findInPage(query, { forward: false, findNext: true });
      } else {
        findInPage(query, { forward: true, findNext: true });
      }
    }
  }

  function handlePrev() {
    findInPage(query, { forward: false, findNext: true });
  }

  function handleNext() {
    findInPage(query, { forward: true, findNext: true });
  }

  function handleClose() {
    stopFind();
    onClose();
  }

  const hasQuery = query.length > 0;

  return (
    <div className="find-bar">
      <input
        ref={inputRef}
        className="find-bar-input"
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Find in page"
        aria-label="Find in page"
      />
      {hasQuery && (
        <span className="find-bar-count">
          {totalMatches > 0 ? `${activeMatch}/${totalMatches}` : "No matches"}
        </span>
      )}
      <button
        type="button"
        className="find-bar-button"
        onClick={handlePrev}
        disabled={!hasQuery || totalMatches === 0}
        aria-label="Previous match"
        title="Previous match (Shift+Enter)"
      >
        <ChevronUpIcon />
      </button>
      <button
        type="button"
        className="find-bar-button"
        onClick={handleNext}
        disabled={!hasQuery || totalMatches === 0}
        aria-label="Next match"
        title="Next match (Enter)"
      >
        <ChevronDownIcon />
      </button>
      <button
        type="button"
        className="find-bar-button"
        onClick={handleClose}
        aria-label="Close find bar"
        title="Close (Esc)"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export default FindBar;
