import { useEffect, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import NewTabPage from "./components/NewTabPage";
import BlockedPage from "./components/BlockedPage";
import SettingsPage from "./components/SettingsPage";

function App() {
  const [view, setView] = useState("new-tab");
  const [address, setAddress] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState("");
  const [state, setState] = useState({
    settings: {
      personalWhitelist: [],
      showBookmarksBar: false,
      showDailyQuote: true
    },
    whitelist: {
      preApprovedDomains: [],
      personalDomains: [],
      combinedDomains: []
    },
    dailyQuote: "Write with focus. Edit with courage.",
    version: "1.0.0"
  });
  const [loading, setLoading] = useState(true);
  const webviewRef = useRef(null);

  useEffect(() => {
    let unsubNavigation;
    let unsubBlocked;
    let unsubState;

    async function bootstrapState() {
      if (!window.pagecow?.getState) {
        setLoading(false);
        return;
      }

      const initialState = await window.pagecow.getState();
      setState(initialState);
      setAddress("pagecow://newtab");
      setView("new-tab");
      setLoading(false);
    }

    bootstrapState();

    if (!window.pagecow) {
      return undefined;
    }

    unsubNavigation = window.pagecow.onNavigationState((payload) => {
      setCanGoBack(!!payload.canGoBack);
      setCanGoForward(!!payload.canGoForward);
      const nextUrl = payload.url || "";
      if (nextUrl) {
        setAddress(nextUrl);
      }
      if (payload.view) setView(payload.view);
    });

    unsubBlocked = window.pagecow.onBlockedNavigation((payload) => {
      setBlockedUrl(payload.url || "");
      setView("blocked");
    });

    unsubState = window.pagecow.onStateChanged((payload) => {
      setState((previous) => ({
        ...previous,
        settings: payload.settings || previous.settings,
        whitelist: payload.whitelist || previous.whitelist
      }));
    });

    return () => {
      if (typeof unsubNavigation === "function") unsubNavigation();
      if (typeof unsubBlocked === "function") unsubBlocked();
      if (typeof unsubState === "function") unsubState();
    };
  }, []);

  async function handleNavigate(rawValue) {
    if (!window.pagecow) return;
    const value = rawValue?.trim();
    if (!value) return;
    const result = await window.pagecow.navigate(value);
    if (!result.ok && result.reason === "blocked") {
      setBlockedUrl(result.url || value);
      setView("blocked");
      return;
    }
    if (result.ok) {
      setAddress(result.url);
      setView("browser");
    }
  }

  async function handleRefresh() {
    if (view === "browser" && webviewRef.current) {
      webviewRef.current.reload();
      return;
    }
    await window.pagecow.refresh();
  }

  async function handleGoBack() {
    if (view === "browser" && webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
      return;
    }
    await window.pagecow.goBack();
  }

  async function handleGoForward() {
    if (view === "browser" && webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
      return;
    }
    await window.pagecow.goForward();
  }

  async function handleOpenSettings() {
    await window.pagecow.openSettings();
    setView("settings");
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
      return { ok: false, message: mapError(result.reason) };
    }
    return { ok: true };
  }

  async function handleRemovePersonalDomain(domain) {
    const result = await window.pagecow.removePersonalDomain(domain);
    if (!result.ok) {
      return { ok: false, message: mapError(result.reason) };
    }
    return { ok: true };
  }

  async function handleToggleBookmarksBar(enabled) {
    await window.pagecow.updateSettings({ showBookmarksBar: enabled });
  }

  async function handleToggleDailyQuote(enabled) {
    await window.pagecow.updateSettings({ showDailyQuote: enabled });
  }
  function handleWebviewAttach(node) {
    webviewRef.current = node;
    if (!node) return;
    node.addEventListener("did-navigate", () => {
      const next = node.getURL();
      setAddress(next);
      setCanGoBack(node.canGoBack());
      setCanGoForward(node.canGoForward());
    });
    node.addEventListener("did-navigate-in-page", () => {
      const next = node.getURL();
      setAddress(next);
      setCanGoBack(node.canGoBack());
      setCanGoForward(node.canGoForward());
    });
    node.addEventListener("did-start-navigation", async (event) => {
      if (!event.isMainFrame) return;
      const result = await window.pagecow.navigate(event.url);
      if (!result.ok && result.reason === "blocked") {
        setBlockedUrl(result.url || event.url);
        setView("blocked");
      }
    });
  }


  async function handleOpenSettingsFromBlocked() {
    await handleOpenSettings();
  }

  if (loading) {
    return (
      <div className="app-shell">
        <main className="content">
          <div className="card">Loading PageCow...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Toolbar
        value={address}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={handleGoBack}
        onForward={handleGoForward}
        onRefresh={handleRefresh}
        onNavigate={handleNavigate}
        onSettings={handleOpenSettings}
        statusText={view === "blocked" ? "Blocked by PageCow policy" : "Focus mode"}
      />
      <main className="content">
        {view === "new-tab" && (
          <NewTabPage showQuote={state.settings.showDailyQuote} />
        )}
        {view === "blocked" && (
          <BlockedPage blockedUrl={blockedUrl} onOpenSettings={handleOpenSettingsFromBlocked} />
        )}
        {view === "settings" && (
          <SettingsPage
            settings={state.settings}
            preApprovedDomains={state.whitelist.preApprovedDomains}
            personalDomains={state.whitelist.personalDomains}
            version={state.version}
            onAddDomain={handleAddPersonalDomain}
            onRemoveDomain={handleRemovePersonalDomain}
            onToggleBookmarksBar={handleToggleBookmarksBar}
            onToggleDailyQuote={handleToggleDailyQuote}
            onClose={async () => {
              await window.pagecow.openNewTab();
              setView("new-tab");
            }}
          />
        )}
        {view === "browser" && (
          <div className="browser-view">
            <webview ref={handleWebviewAttach} src={address} className="browser-webview" />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
