import { useRef, useState } from "react";

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
