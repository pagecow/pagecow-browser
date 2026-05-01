import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayNameForDomain } from "../data/domainDisplayName";
import {
  letterPlaceholderPalette,
  refreshFavicon,
  useFavicon
} from "../utils/favicon";

function BookmarkLetterIcon({ domain }) {
  const letter = (domain?.[0] || "?").toUpperCase();
  const palette = useMemo(() => letterPlaceholderPalette(domain), [domain]);
  return (
    <span
      className="bookmark-icon bookmark-icon-letter"
      style={palette}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

function BookmarkIcon({ url }) {
  const { dataUrl, domain } = useFavicon(url);
  if (dataUrl) {
    return (
      <img
        className="bookmark-icon"
        src={dataUrl}
        alt=""
        draggable={false}
        loading="lazy"
        width="16"
        height="16"
      />
    );
  }
  // Local letter fallback while loading and for off-whitelist (HTTP 404) or
  // network errors. The pagecow.com placeholder also gets surfaced as a
  // dataUrl above; this branch only fires when we have no bytes at all.
  return <BookmarkLetterIcon domain={domain} />;
}

function BookmarksBar({ domains = [], onNavigate, onNavigateNewTab, onReorder, onRemove }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);
  const dragNode = useRef(null);
  const didDrag = useRef(false);

  const closeMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu, closeMenu]);

  function handleContextMenu(e, url) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, url });
  }

  function handleDragStart(e, index) {
    setDragIndex(index);
    didDrag.current = false;
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    requestAnimationFrame(() => {
      if (dragNode.current) {
        dragNode.current.classList.add("dragging");
      }
    });
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (index !== overIndex) {
      setOverIndex(index);
    }
    if (index !== dragIndex) {
      didDrag.current = true;
    }
  }

  function handleDragEnd() {
    if (dragNode.current) {
      dragNode.current.classList.remove("dragging");
    }

    if (
      dragIndex !== null &&
      overIndex !== null &&
      dragIndex !== overIndex &&
      onReorder
    ) {
      const reordered = [...domains];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      onReorder(reordered);
    }

    setDragIndex(null);
    setOverIndex(null);
    dragNode.current = null;
  }

  function handleClick(e, url) {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    didDrag.current = false;
    if ((e.metaKey || e.ctrlKey) && onNavigateNewTab) {
      e.preventDefault();
      onNavigateNewTab(url);
      return;
    }
    onNavigate(url);
  }

  if (domains.length === 0) {
    return null;
  }

  return (
    <div className="bookmarks-bar" role="toolbar" aria-label="Bookmarks bar">
      <div className="bookmarks-bar-scroll">
        {domains.map((url, index) => (
          <button
            key={url}
            type="button"
            className={`bookmark-item${
              dragIndex !== null && overIndex === index && dragIndex !== index
                ? index < dragIndex
                  ? " drop-before"
                  : " drop-after"
                : ""
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={(e) => handleClick(e, url)}
            onContextMenu={(e) => handleContextMenu(e, url)}
            title={url}
          >
            <BookmarkIcon url={url} />
            <span className="bookmark-label">{displayNameForDomain(url)}</span>
          </button>
        ))}
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="context-menu-item"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (onNavigateNewTab) onNavigateNewTab(contextMenu.url);
              closeMenu();
            }}
          >
            Open in new tab
          </button>
          <button
            type="button"
            className="context-menu-item"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              refreshFavicon(contextMenu.url);
              closeMenu();
            }}
          >
            Refresh icon
          </button>
          <button
            type="button"
            className="context-menu-item context-menu-item-danger"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              onRemove(contextMenu.url);
              closeMenu();
            }}
          >
            Remove bookmark
          </button>
        </div>
      )}
    </div>
  );
}

export default BookmarksBar;
