import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import TabStrip from "./components/TabStrip";
import BookmarksBar from "./components/BookmarksBar";
import NewTabPage from "./components/NewTabPage";
import BlockedPage from "./components/BlockedPage";
import SettingsPage from "./components/SettingsPage";
import FindBar from "./components/FindBar";

let nextTabId = 1;

function createTab(overrides = {}) {
  return {
    id: `tab-${nextTabId++}`,
    type: "new-tab",
    title: "New Tab",
    address: "",
    canGoBack: false,
    canGoForward: false,
    ...overrides
  };
}

function getTabTitleFromUrl(url) {
  if (!url) return "New Tab";
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "New Tab";
  } catch {
    return url;
  }
}

const TabView = React.memo(({ tabId, initialSrc, isActive, onWebviewRef }) => {
  const nodeRef = useRef(null);

  const refCallback = useCallback((node) => {
    nodeRef.current = node;
    onWebviewRef(tabId, node);
  }, [tabId, onWebviewRef]);

  return (
    <div
      className="webview-wrap"
      style={{
        visibility: isActive ? "visible" : "hidden",
        zIndex: isActive ? 1 : 0,
        pointerEvents: isActive ? "auto" : "none"
      }}
    >
      <webview
        ref={refCallback}
        src={initialSrc}
        className="content-webview"
        allowpopups="true"
      />
    </div>
  );
}, (prev, next) => {
  return prev.tabId === next.tabId
    && prev.isActive === next.isActive
    && prev.onWebviewRef === next.onWebviewRef;
});

function App() {
  const initialTabRef = useRef(null);
  if (!initialTabRef.current) {
    initialTabRef.current = createTab();
  }

  const [tabs, setTabs] = useState([initialTabRef.current]);
  const [activeTabId, setActiveTabId] = useState(initialTabRef.current.id);
  const [panelView, setPanelView] = useState("tab");
  const [blockedUrl, setBlockedUrl] = useState("");
  const [state, setState] = useState({
    settings: {
      personalWhitelist: [],
      showBookmarksBar: false,
      bookmarks: []
    },
    whitelist: {
      preApproved: [],
      personal: [],
      merged: []
    },
    version: "1.0.0"
  });
  const [loading, setLoading] = useState(true);
  const [showFindBar, setShowFindBar] = useState(false);
  const webviewRefs = useRef(new Map());
  const attachedWebviews = useRef(new Set());
  const webContentsToTabId = useRef(new Map());
  const activeTabIdRef = useRef(activeTabId);
  const initialSrcs = useRef(new Map());

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null,
    [tabs, activeTabId]
  );

  const activeWebviewRef = useRef(null);
  useEffect(() => {
    activeWebviewRef.current = webviewRefs.current.get(activeTabId) || null;
  });

  const navigatingNewTabRef = useRef(false);
  const handleNavigateRef = useRef(null);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const updateTab = useCallback((tabId, updater) => {
    setTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== tabId) return tab;
        const patch = typeof updater === "function" ? updater(tab) : updater;
        return { ...tab, ...patch };
      })
    );
  }, []);

  const openTab = useCallback((overrides = {}, options = {}) => {
    const nextTab = createTab(overrides);
    if (nextTab.type === "browser" && nextTab.address) {
      initialSrcs.current.set(nextTab.id, nextTab.address);
    }
    setTabs((previous) => {
      const insertAfterIndex = options.afterTabId
        ? previous.findIndex((tab) => tab.id === options.afterTabId)
        : previous.length - 1;

      if (insertAfterIndex < 0) {
        return [...previous, nextTab];
      }

      const nextTabs = [...previous];
      nextTabs.splice(insertAfterIndex + 1, 0, nextTab);
      return nextTabs;
    });
    setActiveTabId(nextTab.id);
    setPanelView("tab");
    return nextTab.id;
  }, []);

  const closeTab = useCallback((tabId) => {
    webviewRefs.current.delete(tabId);
    attachedWebviews.current.delete(tabId);
    initialSrcs.current.delete(tabId);

    for (const [guestId, mappedTabId] of webContentsToTabId.current.entries()) {
      if (mappedTabId === tabId) {
        webContentsToTabId.current.delete(guestId);
      }
    }

    setTabs((previous) => {
      const tabIndex = previous.findIndex((tab) => tab.id === tabId);
      if (tabIndex === -1) return previous;

      const remainingTabs = previous.filter((tab) => tab.id !== tabId);
      if (remainingTabs.length === 0) {
        const replacementTab = createTab();
        setActiveTabId(replacementTab.id);
        setPanelView("tab");
        return [replacementTab];
      }

      if (tabId === activeTabIdRef.current) {
        const fallbackTab = remainingTabs[tabIndex] || remainingTabs[tabIndex - 1] || remainingTabs[0];
        setActiveTabId(fallbackTab.id);
        setPanelView("tab");
      }

      return remainingTabs;
    });
  }, []);

  const createNewTab = useCallback(() => {
    openTab();
  }, [openTab]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTabId) && tabs[0]) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    let unsubBlocked;
    let unsubState;
    let unsubOpenInNewTab;

    async function bootstrapState() {
      if (!window.pagecow?.getState) {
        setLoading(false);
        return;
      }

      const initialState = await window.pagecow.getState();
      setState(initialState);
      setLoading(false);
    }

    bootstrapState();

    if (!window.pagecow) {
      return undefined;
    }

    unsubBlocked = window.pagecow.onBlockedNavigation((payload) => {
      const sourceTabId = payload?.sourceWebContentsId
        ? webContentsToTabId.current.get(payload.sourceWebContentsId)
        : activeTabIdRef.current;

      if (sourceTabId) {
        setActiveTabId(sourceTabId);
      }

      setBlockedUrl(payload.url || "");
      setPanelView("blocked");
    });

    unsubState = window.pagecow.onStateChanged((payload) => {
      setState((previous) => ({
        ...previous,
        settings: payload.settings || previous.settings,
        whitelist: payload.whitelist || previous.whitelist
      }));
    });

    unsubOpenInNewTab = window.pagecow.onOpenUrlInNewTab((payload) => {
      const sourceTabId = payload?.sourceWebContentsId
        ? webContentsToTabId.current.get(payload.sourceWebContentsId)
        : activeTabIdRef.current;

      if (!payload?.url) {
        openTab({}, { afterTabId: sourceTabId });
        return;
      }

      openTab(
        {
          type: "browser",
          address: payload.url,
          title: getTabTitleFromUrl(payload.url)
        },
        { afterTabId: sourceTabId }
      );
    });

    return () => {
      if (typeof unsubBlocked === "function") unsubBlocked();
      if (typeof unsubState === "function") unsubState();
      if (typeof unsubOpenInNewTab === "function") unsubOpenInNewTab();
    };
  }, [openTab]);

  useEffect(() => {
    function handleKeyDown(event) {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        createNewTab();
        return;
      }

      if (key === "w") {
        event.preventDefault();
        closeTab(activeTabIdRef.current);
        return;
      }

      if (key === "f") {
        event.preventDefault();
        setShowFindBar(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createNewTab, closeTab]);

  async function handleNavigate(rawValue, targetTabId = activeTabIdRef.current) {
    if (!window.pagecow) return;
    const value = rawValue?.trim();
    if (!value) return;

    const result = await window.pagecow.navigate(value);
    if (!result.ok && result.reason === "blocked") {
      if (targetTabId) {
        setActiveTabId(targetTabId);
      }
      setBlockedUrl(result.url || value);
      setPanelView("blocked");
      return;
    }

    if (result.ok) {
      if (result.url === "about:newtab") {
        updateTab(targetTabId, {
          type: "new-tab",
          title: "New Tab",
          address: "",
          canGoBack: false,
          canGoForward: false
        });
      } else {
        const existingNode = webviewRefs.current.get(targetTabId);
        if (existingNode) {
          existingNode.src = result.url;
        } else {
          initialSrcs.current.set(targetTabId, result.url);
          updateTab(targetTabId, {
            type: "browser",
            address: result.url,
            title: getTabTitleFromUrl(result.url)
          });
        }
      }

      setActiveTabId(targetTabId);
      setPanelView("tab");
    }
  }

  handleNavigateRef.current = handleNavigate;

  const handleNavigateInNewTab = useCallback(async (rawValue) => {
    if (navigatingNewTabRef.current) return;
    navigatingNewTabRef.current = true;

    try {
      if (!window.pagecow) return;
      const value = rawValue?.trim();
      if (!value) return;

      const result = await window.pagecow.navigate(value);
      if (!result.ok) {
        if (result.reason === "blocked") {
          setBlockedUrl(result.url || value);
          setPanelView("blocked");
        }
        return;
      }

      if (result.url === "about:newtab") {
        openTab({}, { afterTabId: activeTabIdRef.current });
      } else {
        openTab(
          {
            type: "browser",
            address: result.url,
            title: getTabTitleFromUrl(result.url)
          },
          { afterTabId: activeTabIdRef.current }
        );
      }
    } finally {
      navigatingNewTabRef.current = false;
    }
  }, [openTab]);

  function handleRefresh() {
    const activeNode = webviewRefs.current.get(activeTabId);
    if (panelView === "tab" && activeTab?.type === "browser" && activeNode) {
      activeNode.reload();
    }
  }

  function handleGoBack() {
    const activeNode = webviewRefs.current.get(activeTabId);
    if (panelView === "tab" && activeTab?.type === "browser" && activeNode?.canGoBack()) {
      activeNode.goBack();
    }
  }

  function handleGoForward() {
    const activeNode = webviewRefs.current.get(activeTabId);
    if (panelView === "tab" && activeTab?.type === "browser" && activeNode?.canGoForward()) {
      activeNode.goForward();
    }
  }

  function handleOpenSettings() {
    setPanelView("settings");
  }

  function handleHome() {
    updateTab(activeTabIdRef.current, {
      type: "new-tab",
      title: "New Tab",
      address: "",
      canGoBack: false,
      canGoForward: false
    });
    setPanelView("tab");
  }

  function mapError(reason) {
    if (reason === "invalid_domain") return "Please enter a valid domain like example.com";
    if (reason === "already_preapproved") return "This domain is already in the pre-approved list.";
    if (reason === "already_exists") return "This domain is already in your personal whitelist.";
    if (reason === "not_found") return "That personal domain could not be found.";
    return "Something went wrong. Please try again.";
  }

  async function handleAddPersonalDomain(domain) {
    const result = await window.pagecow.addPersonalDomain(domain);
    if (!result.ok) {
      return { ok: false, message: result.message || mapError(result.reason) };
    }
    return { ok: true };
  }

  async function handleRemovePersonalDomain(domain) {
    const result = await window.pagecow.removePersonalDomain(domain);
    if (!result.ok) {
      return { ok: false, message: result.message || mapError(result.reason) };
    }
    return { ok: true };
  }

  async function handleToggleBookmarksBar(enabled) {
    await window.pagecow.updateSettings({ showBookmarksBar: enabled });
  }
  
  async function handleToggleBookmark(url) {
    if (!url) return;
    const { bookmarks } = state.settings;
    const nextBookmarks = bookmarks.includes(url)
      ? bookmarks.filter((b) => b !== url)
      : [...bookmarks, url];
    await window.pagecow.updateSettings({ bookmarks: nextBookmarks });
  }

  const syncTabWithWebview = useCallback((tabId, node) => {
    if (!node) return;

    const guestId = typeof node.getWebContentsId === "function" ? node.getWebContentsId() : null;
    if (guestId) {
      webContentsToTabId.current.set(guestId, tabId);
    }

    const nextAddress = node.getURL() || "";
    const nextTitle = node.getTitle?.()?.trim() || getTabTitleFromUrl(nextAddress);

    updateTab(tabId, (tab) => ({
      type: "browser",
      address: nextAddress || tab.address,
      title: nextTitle || tab.title,
      canGoBack: node.canGoBack(),
      canGoForward: node.canGoForward()
    }));
  }, [updateTab]);

  const handleWebviewRef = useCallback((tabId, node) => {
    if (!node) {
      webviewRefs.current.delete(tabId);
      attachedWebviews.current.delete(tabId);

      for (const [guestId, mappedTabId] of webContentsToTabId.current.entries()) {
        if (mappedTabId === tabId) {
          webContentsToTabId.current.delete(guestId);
        }
      }
      return;
    }

    webviewRefs.current.set(tabId, node);
    if (attachedWebviews.current.has(tabId)) return;

    attachedWebviews.current.add(tabId);

    const sync = () => syncTabWithWebview(tabId, node);
    node.addEventListener("dom-ready", sync);
    node.addEventListener("did-finish-load", sync);
    node.addEventListener("did-navigate", sync);
    node.addEventListener("did-navigate-in-page", sync);
    node.addEventListener("page-title-updated", sync);

    queueMicrotask(sync);
  }, [syncTabWithWebview]);

  const toolbarAddress =
    panelView === "blocked"
      ? blockedUrl
      : activeTab?.type === "browser"
        ? activeTab.address
        : "";

  const toolbarCanGoBack = panelView === "tab" && activeTab?.type === "browser" && activeTab.canGoBack;
  const toolbarCanGoForward =
    panelView === "tab" && activeTab?.type === "browser" && activeTab.canGoForward;
  const showBookmarksBar = state.settings.showBookmarksBar && panelView === "tab";

  if (loading || !activeTab) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="app-shell">
      <TabStrip
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(tabId) => {
          setActiveTabId(tabId);
          setPanelView("tab");
          setShowFindBar(false);
        }}
        onCloseTab={closeTab}
        onNewTab={createNewTab}
        onReorder={(reordered) => setTabs(reordered)}
      />
      <Toolbar
        value={toolbarAddress}
        canGoBack={toolbarCanGoBack}
        canGoForward={toolbarCanGoForward}
        onBack={handleGoBack}
        onForward={handleGoForward}
        onRefresh={handleRefresh}
        onNavigate={handleNavigate}
        onSettings={handleOpenSettings}
        onHome={handleHome}
        statusText={
          panelView === "settings" ? "Settings" : panelView === "blocked" ? "Blocked" : ""
        }
        isBookmarked={state.settings.bookmarks.includes(toolbarAddress)}
        onToggleBookmark={() => handleToggleBookmark(toolbarAddress)}
        approvedDomains={state.whitelist.merged}
      />
      {showBookmarksBar && state.settings.bookmarks.length > 0 && (
        <BookmarksBar
          domains={state.settings.bookmarks}
          onNavigate={(domain) => {
            setPanelView("tab");
            handleNavigateRef.current(domain, activeTabId);
          }}
          onNavigateNewTab={handleNavigateInNewTab}
          onReorder={(reordered) => {
            window.pagecow.updateSettings({ bookmarks: reordered });
          }}
          onRemove={(url) => {
            const next = state.settings.bookmarks.filter((b) => b !== url);
            window.pagecow.updateSettings({ bookmarks: next });
          }}
        />
      )}
      <main className="content">
        {showFindBar && panelView === "tab" && activeTab?.type === "browser" && (
          <FindBar
            webviewRef={activeWebviewRef}
            onClose={() => setShowFindBar(false)}
          />
        )}
        <div className="tab-stage">
          {tabs.map((tab) =>
            tab.type === "browser" ? (
              <TabView
                key={tab.id}
                tabId={tab.id}
                initialSrc={initialSrcs.current.get(tab.id) || tab.address}
                isActive={tab.id === activeTabId && panelView === "tab"}
                onWebviewRef={handleWebviewRef}
              />
            ) : null
          )}

          {activeTab.type === "new-tab" && (
            <div className={`tab-page${panelView === "tab" ? " active" : ""}`}>
              <NewTabPage
                approvedDomains={state.whitelist.preApproved}
                onNavigate={(value) => handleNavigateRef.current(value, activeTabId)}
                onNavigateNewTab={handleNavigateInNewTab}
              />
            </div>
          )}
        </div>

        {panelView === "blocked" && (
          <div className="content-overlay">
            <BlockedPage blockedUrl={blockedUrl} />
          </div>
        )}

        {panelView === "settings" && (
          <div className="content-overlay content-overlay-scroll">
            <SettingsPage
              settings={state.settings}
              preApprovedDomains={state.whitelist.preApproved}
              personalDomains={state.whitelist.personal}
              version={state.version}
            onAddDomain={handleAddPersonalDomain}
            onRemoveDomain={handleRemovePersonalDomain}
            onToggleBookmarksBar={handleToggleBookmarksBar}
            onUpdateSettings={(patch) => window.pagecow.updateSettings(patch)}
            onClose={() => setPanelView("tab")}
          />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
