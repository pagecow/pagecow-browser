function getTabLabel(tab) {
  if (!tab) return "New Tab";
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

function TabStrip({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }) {
  return (
    <div className="tab-strip" role="tablist" aria-label="Browser tabs">
      <div className="tab-strip-list">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const label = getTabLabel(tab);

          return (
            <div
              key={tab.id}
              className={`browser-tab${active ? " active" : ""}`}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              onClick={() => onSelectTab(tab.id)}
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
