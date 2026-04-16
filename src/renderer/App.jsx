import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import TabStrip from "./components/TabStrip";
import BookmarksBar from "./components/BookmarksBar";
import BlockedPage from "./components/BlockedPage";
import SettingsPage from "./components/SettingsPage";
import FindBar from "./components/FindBar";

let nextTabId = 1;

function createTab(overrides = {}) {
  return {
    id: `tab-${nextTabId++}`,
    type: "browser",
    title: "PageCow",
    address: "https://pagecow.com",
    faviconUrl: null,
    canGoBack: false,
    canGoForward: false,
    browserViewKey: 0,
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

const DEVICE_PRESETS = [
  { name: "Responsive", width: 0, height: 0 },
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14 Pro", width: 393, height: 852 },
  { name: "iPad Mini", width: 768, height: 1024 },
  { name: "iPad Pro 12.9\"", width: 1024, height: 1366 },
];

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
      bookmarks: [
        "https://pcloud.com",
        "https://wikipedia.org",
        "https://dictionary.com",
        "https://thesaurus.com",
        "https://gotquestions.org",
        "https://www.bible.com/bible/114/JHN.1.NKJV"
      ]
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
  const [focusOmniboxKey, setFocusOmniboxKey] = useState(0);
  const [devToolsState, setDevToolsState] = useState(null);
  const [devToolsHeight, setDevToolsHeight] = useState(300);
  const [devToolsKey, setDevToolsKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState(null);
  const devToolsStateRef = useRef(null);
  const devToolsAttached = useRef(false);
  const webviewRefs = useRef(new Map());
  const attachedWebviews = useRef(new Set());
  const webContentsToTabId = useRef(new Map());
  const activeTabIdRef = useRef(activeTabId);
  const initialSrcs = useRef(new Map());

  if (!initialSrcs.current.has(initialTabRef.current.id)) {
    initialSrcs.current.set(initialTabRef.current.id, initialTabRef.current.address);
  }

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

  const replaceBrowserView = useCallback((tabId, url) => {
    initialSrcs.current.set(tabId, url);
    updateTab(tabId, (tab) => ({
      type: "browser",
      address: url,
      title: getTabTitleFromUrl(url),
      faviconUrl: null,
      canGoBack: false,
      canGoForward: false,
      browserViewKey: (tab.browserViewKey || 0) + 1
    }));
  }, [updateTab]);

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
        initialSrcs.current.set(replacementTab.id, replacementTab.address);
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
    setFocusOmniboxKey((k) => k + 1);
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

    let unsubShortcut = null;
    if (window.pagecow.onKeyboardShortcut) {
      unsubShortcut = window.pagecow.onKeyboardShortcut((action) => {
        if (action === "find") {
          setShowFindBar(true);
        } else if (action === "new-tab") {
          createNewTab();
        } else if (action === "close-tab") {
          closeTab(activeTabIdRef.current);
        }
      });
    }

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
          title: getTabTitleFromUrl(payload.url),
          faviconUrl: null
        },
        { afterTabId: sourceTabId }
      );
    });

    return () => {
      if (typeof unsubBlocked === "function") unsubBlocked();
      if (typeof unsubState === "function") unsubState();
      if (typeof unsubShortcut === "function") unsubShortcut();
      if (typeof unsubOpenInNewTab === "function") unsubOpenInNewTab();
    };
  }, [openTab]);

  useEffect(() => {
    function handleKeyDown(event) {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed || event.altKey) return;

      // Other global shortcuts can be handled here if they aren't handled by main process
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    devToolsStateRef.current = devToolsState;
  }, [devToolsState]);

  const closeDevTools = useCallback(() => {
    const state = devToolsStateRef.current;
    if (state?.guestId) {
      window.pagecow?.closeDevTools?.({ guestWebContentsId: state.guestId });
    }
    setDevToolsState(null);
  }, []);

  useEffect(() => {
    if (!window.pagecow?.onInspectElement) return;
    return window.pagecow.onInspectElement(({ guestWebContentsId, x, y }) => {
      const tabId = webContentsToTabId.current.get(guestWebContentsId);
      setDevToolsKey((k) => k + 1);
      setDevToolsState({ guestId: guestWebContentsId, x, y, tabId });
    });
  }, []);

  useEffect(() => {
    if (!window.pagecow?.onDevToolsClosed) return;
    return window.pagecow.onDevToolsClosed(() => {
      setDevToolsState(null);
    });
  }, []);

  useEffect(() => {
    if (!window.pagecow?.onToggleDeviceToolbar) return;
    return window.pagecow.onToggleDeviceToolbar(() => {
      setDeviceMode((prev) =>
        prev ? null : { width: 375, height: 667, presetIndex: 1 }
      );
    });
  }, []);

  useEffect(() => {
    if (!devToolsState?.tabId) return;
    if (!tabs.some((t) => t.id === devToolsState.tabId)) {
      closeDevTools();
    }
  }, [tabs, devToolsState, closeDevTools]);

  const handleDevToolsRef = useCallback((node) => {
    devToolsAttached.current = false;
    if (!node) return;

    const tryAttach = () => {
      if (devToolsAttached.current) return;
      const state = devToolsStateRef.current;
      if (!state) return;

      const devtoolsId =
        typeof node.getWebContentsId === "function"
          ? node.getWebContentsId()
          : null;
      if (!devtoolsId) return;

      devToolsAttached.current = true;
      window.pagecow.attachDevTools({
        guestWebContentsId: state.guestId,
        devtoolsWebContentsId: devtoolsId,
        x: state.x,
        y: state.y
      });
    };

    node.addEventListener("dom-ready", tryAttach);
  }, []);

  const handleDevToolsResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = devToolsHeight;

      const onMove = (ev) => {
        const delta = startY - ev.clientY;
        const newHeight = Math.max(
          100,
          Math.min(window.innerHeight - 200, startHeight + delta)
        );
        setDevToolsHeight(newHeight);
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [devToolsHeight]
  );

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
      let finalUrl = result.url;
      if (finalUrl === "about:newtab") {
        finalUrl = "https://pagecow.com";
      }

      const existingNode = webviewRefs.current.get(targetTabId);
      if (existingNode) {
        existingNode.src = finalUrl;
        updateTab(targetTabId, (tab) => ({
          type: "browser",
          address: finalUrl,
          title: getTabTitleFromUrl(finalUrl),
          faviconUrl: null
        }));
      } else {
        initialSrcs.current.set(targetTabId, finalUrl);
        updateTab(targetTabId, (tab) => ({
          type: "browser",
          address: finalUrl,
          title: getTabTitleFromUrl(finalUrl),
          faviconUrl: null,
          canGoBack: false,
          canGoForward: false
        }));
      }

      setActiveTabId(targetTabId);
      setPanelView("tab");
      setBlockedUrl("");
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

      let finalUrl = result.url;
      if (finalUrl === "about:newtab") {
        finalUrl = "https://pagecow.com";
      }

      openTab(
        {
          type: "browser",
          address: finalUrl,
          title: getTabTitleFromUrl(finalUrl),
          faviconUrl: null
        },
        { afterTabId: activeTabIdRef.current }
      );
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
    if (panelView === "blocked") {
      setPanelView("tab");
      setBlockedUrl("");
      return;
    }

    if (panelView !== "tab") {
      return;
    }

    const activeNode = webviewRefs.current.get(activeTabId);
    if (activeTab?.type === "browser" && activeNode?.canGoBack()) {
      activeNode.goBack();
    }
  }

  function handleGoForward() {
    if (panelView !== "tab") {
      return;
    }

    const activeNode = webviewRefs.current.get(activeTabId);
    if (activeTab?.type === "browser" && activeNode?.canGoForward()) {
      activeNode.goForward();
    }
  }

  function handleOpenSettings() {
    setPanelView("settings");
  }

  function handleHome() {
    if (panelView === "blocked") {
      setPanelView("tab");
      setBlockedUrl("");
    }
    handleNavigateRef.current("https://pagecow.com", activeTabIdRef.current);
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
    const { bookmarks, showBookmarksBar } = state.settings;
    const isAdding = !bookmarks.includes(url);
    const nextBookmarks = isAdding
      ? [...bookmarks, url]
      : bookmarks.filter((b) => b !== url);

    const patch = { bookmarks: nextBookmarks };
    if (isAdding && !showBookmarksBar) {
      patch.showBookmarksBar = true;
    }

    await window.pagecow.updateSettings(patch);
  }

  const syncTabWithWebview = useCallback((tabId, node) => {
    if (!node) return;

    const guestId = typeof node.getWebContentsId === "function" ? node.getWebContentsId() : null;
    if (guestId) {
      webContentsToTabId.current.set(guestId, tabId);
    }

    const nextAddress = node.getURL() || "";
    const nextTitle = node.getTitle?.()?.trim() || getTabTitleFromUrl(nextAddress);

    updateTab(tabId, (tab) => {
      const resolvedAddress = nextAddress || tab.address;
      const addressChanged = Boolean(nextAddress && nextAddress !== tab.address);
      return {
        type: "browser",
        address: resolvedAddress,
        title: nextTitle || tab.title,
        faviconUrl: addressChanged ? null : tab.faviconUrl,
        canGoBack: node.canGoBack(),
        canGoForward: node.canGoForward()
      };
    });
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

    function onFaviconUpdated(event) {
      const urls = event.favicons || [];
      const first = urls.find((u) => typeof u === "string" && u.trim());
      if (!first) return;
      const u = first.trim().toLowerCase();
      if (!u.startsWith("http:") && !u.startsWith("https:") && !u.startsWith("data:")) {
        return;
      }
      updateTab(tabId, { faviconUrl: first.trim() });
    }

    node.addEventListener("dom-ready", sync);
    node.addEventListener("did-finish-load", sync);
    node.addEventListener("did-navigate", sync);
    node.addEventListener("did-navigate-in-page", sync);
    node.addEventListener("page-title-updated", sync);
    node.addEventListener("page-favicon-updated", onFaviconUpdated);

    queueMicrotask(sync);
  }, [syncTabWithWebview]);

  const toolbarAddress =
    panelView === "blocked"
      ? blockedUrl
      : activeTab?.type === "browser"
        ? activeTab.address
        : "";

  const toolbarCanGoBack =
    panelView === "blocked"
      ? true
      : panelView !== "tab"
        ? false
      : activeTab?.type === "browser"
        && activeTab.canGoBack;
        
  const toolbarCanGoForward =
    panelView === "tab"
      && activeTab?.type === "browser"
      && activeTab.canGoForward;
      
  const showBookmarksBar =
    (state.settings.showBookmarksBar || state.settings.bookmarks.length > 0) && panelView === "tab";

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
          closeDevTools();
        }}
        onCloseTab={closeTab}
        onNewTab={createNewTab}
        onReorder={(reordered) => setTabs(reordered)}
      />
      <Toolbar
        value={toolbarAddress}
        focusOmniboxKey={focusOmniboxKey}
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
        {deviceMode && (
          <div className="device-toolbar">
            <svg className="device-toolbar-icon" viewBox="0 0 24 24" width="16" height="16">
              <path d="M15.5 1h-8A2.5 2.5 0 005 3.5v17A2.5 2.5 0 007.5 23h8a2.5 2.5 0 002.5-2.5v-17A2.5 2.5 0 0015.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z"/>
            </svg>
            <select
              className="device-toolbar-select"
              value={deviceMode.presetIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                const preset = DEVICE_PRESETS[idx];
                if (preset.width === 0) {
                  setDeviceMode({ width: deviceMode.width || 375, height: deviceMode.height || 667, presetIndex: idx });
                } else {
                  setDeviceMode({ width: preset.width, height: preset.height, presetIndex: idx });
                }
              }}
            >
              {DEVICE_PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.name}</option>
              ))}
            </select>
            <input
              className="device-toolbar-input"
              type="number"
              value={deviceMode.width}
              onChange={(e) => setDeviceMode((prev) => ({ ...prev, width: Number(e.target.value) || 0, presetIndex: 0 }))}
              min="200" max="3000"
            />
            <span className="device-toolbar-x">&times;</span>
            <input
              className="device-toolbar-input"
              type="number"
              value={deviceMode.height}
              onChange={(e) => setDeviceMode((prev) => ({ ...prev, height: Number(e.target.value) || 0, presetIndex: 0 }))}
              min="200" max="3000"
            />
            <button
              className="device-toolbar-btn"
              title="Rotate"
              onClick={() => setDeviceMode((prev) => ({ ...prev, width: prev.height, height: prev.width }))}
            >
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7.34 6.41L.86 12.9l6.49 6.48 6.49-6.48-6.5-6.49zM3.69 12.9l3.66-3.66L11 12.9l-3.66 3.66-3.65-3.66zm15.67-6.26A8.95 8.95 0 0013 4V.76L8.76 5 13 9.24V6c1.67 0 3.22.55 4.47 1.48l1.41-1.41A8.95 8.95 0 0019.36 6.64zM17.34 14.54l-1.41 1.41A6.98 6.98 0 0113 18v3.24L17.24 17 13 12.76V15c-1.67 0-3.22-.55-4.47-1.48l-1.41 1.41A8.95 8.95 0 0013 20v3.24L17.24 19l-4.24-4.24V18a6.98 6.98 0 004.47-1.48l1.41-1.41a8.94 8.94 0 01-1.54-.57z"/></svg>
            </button>
            <button
              className="device-toolbar-close"
              title="Close device toolbar"
              onClick={() => setDeviceMode(null)}
            >
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        )}
        <div className={`content-main${deviceMode ? " device-mode" : ""}`}>
          {showFindBar && panelView === "tab" && activeTab?.type === "browser" && (
            <FindBar
              webviewRef={activeWebviewRef}
              onClose={() => setShowFindBar(false)}
            />
          )}
          <div
            className="tab-stage"
            style={deviceMode ? {
              width: `${deviceMode.width}px`,
              height: `${deviceMode.height}px`,
              flexShrink: 0,
              borderRadius: "2px",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.12)"
            } : undefined}
          >
            {tabs.map((tab) =>
              tab.type === "browser" ? (
                <TabView
                  key={`${tab.id}:${tab.browserViewKey || 0}`}
                  tabId={tab.id}
                  initialSrc={initialSrcs.current.get(tab.id) || tab.address}
                  isActive={tab.id === activeTabId && panelView === "tab"}
                  onWebviewRef={handleWebviewRef}
                />
              ) : null
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
        </div>
        {devToolsState && (
          <>
            <div
              className="devtools-resize-handle"
              onMouseDown={handleDevToolsResizeStart}
            />
            <div className="devtools-panel" style={{ height: devToolsHeight }}>
              <div className="devtools-panel-header">
                <div className="devtools-panel-actions">
                  <button
                    className={`devtools-panel-btn${deviceMode ? " active" : ""}`}
                    title="Toggle Device Toolbar"
                    onClick={() => setDeviceMode((prev) => prev ? null : { width: 375, height: 667, presetIndex: 1 })}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <path d="M15.5 1h-8A2.5 2.5 0 005 3.5v17A2.5 2.5 0 007.5 23h8a2.5 2.5 0 002.5-2.5v-17A2.5 2.5 0 0015.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z"/>
                    </svg>
                  </button>
                </div>
                <button className="devtools-panel-close" onClick={closeDevTools}>&times;</button>
              </div>
              <webview
                key={devToolsKey}
                ref={handleDevToolsRef}
                src="about:blank"
                className="devtools-webview"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;