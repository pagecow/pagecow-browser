import { useRef, useState } from "react";
import { useFavicon } from "../utils/favicon";

function isSafeFaviconSrc(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim().toLowerCase();
  return u.startsWith("http:") || u.startsWith("https:") || u.startsWith("data:");
}

function TabFavicon({ tab }) {
  // The pagecow.com favicon resolver is the only fallback we trust; the
  // browser must not reach out to third-party CDNs (firewall hygiene).
  const { dataUrl: cachedDataUrl } = useFavicon(tab.address);
  const trustedPageFavicon =
    tab.faviconUrl && isSafeFaviconSrc(tab.faviconUrl) ? tab.faviconUrl.trim() : null;

  // Prefer the page's own favicon (already fetched by the webview itself),
  // fall back to the locally cached pagecow.com bytes.
  const primary = trustedPageFavicon || cachedDataUrl;
  if (!primary) return <span className="browser-tab-favicon" aria-hidden="true" />;

  return (
    <img
      className="browser-tab-favicon"
      src={primary}
      alt=""
      draggable={false}
      onError={(e) => {
        const el = e.currentTarget;
        if (cachedDataUrl && el.src !== cachedDataUrl) {
          el.src = cachedDataUrl;
        } else {
          el.style.visibility = "hidden";
        }
      }}
    />
  );
}

function getTabLabel(tab) {
  if (!tab) return "New Tab";
  if (tab.isShowingHome) return "New Tab";
  if (tab.title && tab.title.trim()) return tab.title.trim();
  if (tab.type === "browser" && tab.address) {
    try {
      return new URL(tab.address).hostname.replace(/^www\./, "");
    } catch {
      return tab.address;
    }
  }
  return "New Tab";
}

function TabStrip({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab, onReorder }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const dragNode = useRef(null);
  const didDrag = useRef(false);

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
      const reordered = [...tabs];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      onReorder(reordered);
    }

    setDragIndex(null);
    setOverIndex(null);
    dragNode.current = null;
  }

  function handleClick(e, tabId) {
    if (!didDrag.current) {
      onSelectTab(tabId);
    }
    didDrag.current = false;
  }

  return (
    <div className="tab-strip" role="tablist" aria-label="Browser tabs">
      <div className="tab-strip-list">
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId;
          const label = getTabLabel(tab);
          const dropClass =
            dragIndex !== null && overIndex === index && dragIndex !== index
              ? index < dragIndex
                ? " tab-drop-before"
                : " tab-drop-after"
              : "";

          return (
            <div
              key={tab.id}
              className={`browser-tab${active ? " active" : ""}${dropClass}`}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleClick(e, tab.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTab(tab.id);
                }
              }}
              title={label}
            >
              {tab.type === "browser" && <TabFavicon tab={tab} />}
              <span className="browser-tab-label">{label}</span>
              <button
                type="button"
                className="browser-tab-close"
                aria-label={`Close ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="tab-strip-add"
        onClick={onNewTab}
        aria-label="Open new tab"
        title="New tab"
      >
        +
      </button>
    </div>
  );
}

export default TabStrip;
