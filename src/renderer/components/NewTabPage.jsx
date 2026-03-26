import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayNameForDomain } from "../data/domainDisplayName";
import { buildCatalogEntries, availableCategoryFilters } from "../data/siteCatalog";

function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function getDomainInitial(domain) {
  const clean = domain.replace(/^www\./, "");
  return clean.charAt(0).toUpperCase();
}

function NewTabPage({ approvedDomains = [], onNavigate, onNavigateNewTab }) {
  const [activeFilter, setActiveFilter] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);

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

  const catalogEntries = useMemo(() => {
    return buildCatalogEntries(approvedDomains);
  }, [approvedDomains]);

  const filterOrder = useMemo(() => {
    const categories = availableCategoryFilters(catalogEntries);
    return ["Popular", ...categories];
  }, [catalogEntries]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const term = searchQuery.toLowerCase().trim();
    return catalogEntries.filter((entry) => {
      const domain = entry.domain.toLowerCase();
      const label = displayNameForDomain(entry.domain).toLowerCase();
      const name = domain.split(".")[0];
      return name.includes(term) || domain.includes(term) || label.includes(term);
    });
  }, [searchQuery, catalogEntries]);

  const visibleEntries = useMemo(() => {
    if (searchResults) return searchResults;
    if (activeFilter === "Popular") {
      const popular = catalogEntries.filter((entry) => entry.popular);
      if (popular.length > 0) return popular;
      return catalogEntries.slice(0, 12);
    }
    return catalogEntries.filter((entry) => entry.category === activeFilter);
  }, [activeFilter, catalogEntries, searchResults]);

  function handleSiteClick(event, domain) {
    if ((event.metaKey || event.ctrlKey) && onNavigateNewTab) {
      event.preventDefault();
      onNavigateNewTab(domain);
      return;
    }
    if (onNavigate) {
      onNavigate(domain);
    } else if (window.pagecow?.navigate) {
      window.pagecow.navigate(domain);
    }
  }

  function handleSiteContextMenu(event, domain) {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, domain });
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const value = event.target.elements.searchInput?.value?.trim();
    if (!value) return;
    if (searchResults && searchResults.length === 1) {
      onNavigate(searchResults[0].domain);
      return;
    }
    if (onNavigate) {
      onNavigate(value);
    }
  }

  return (
    <div className="newtab">
      <div className="newtab-hero">
        <h1 className="newtab-logo">
          Page<span className="newtab-logo-accent">Cow</span>
        </h1>
        <p className="newtab-tagline">No distractions. Just focused work.</p>
      </div>

      <form className="newtab-search" onSubmit={handleSearchSubmit}>
        <input
          name="searchInput"
          className="search-box"
          type="text"
          placeholder="Search approved sites..."
          aria-label="Search approved sites"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <section className="shortcuts">
        <div className="shortcuts-header">
          <span className="shortcuts-title">
            {searchResults ? `Results for "${searchQuery.trim()}"` : "Approved sites"}
          </span>
          <span className="shortcuts-count">
            {searchResults ? `${searchResults.length} found` : `${catalogEntries.length} sites`}
          </span>
        </div>

        {!searchResults && (
        <div className="shortcuts-filters">
          {filterOrder.map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              className={`filter-chip${activeFilter === filterKey ? " active" : ""}`}
              onClick={() => setActiveFilter(filterKey)}
            >
              {filterKey}
            </button>
          ))}
        </div>
        )}

        <div className="shortcuts-grid" role="list">
          {visibleEntries.map((entry) => (
            <button
              key={entry.domain}
              type="button"
              className="shortcut-tile"
              role="listitem"
              onClick={(e) => handleSiteClick(e, entry.domain)}
              onContextMenu={(e) => handleSiteContextMenu(e, entry.domain)}
              title={entry.domain}
            >
              <div className="shortcut-icon">
                <img
                  src={getFaviconUrl(entry.domain)}
                  alt=""
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.textContent = getDomainInitial(entry.domain);
                  }}
                />
              </div>
              <span className="shortcut-label">{displayNameForDomain(entry.domain)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="info-bar">
        Would you like another site to be added to the approved list of sites? Send us an email at submissions@pagecow.com
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
              if (onNavigateNewTab) onNavigateNewTab(contextMenu.domain);
              closeMenu();
            }}
          >
            Open in new tab
          </button>
        </div>
      )}
    </div>
  );
}

export default NewTabPage;
