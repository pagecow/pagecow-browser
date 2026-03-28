import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayNameForDomain } from "../data/domainDisplayName";
import {
  buildCatalogEntries,
  availableCategoryFilters,
  resolvePopularEntries
} from "../data/siteCatalog";

function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function getDomainInitial(domain) {
  const clean = domain.replace(/^www\./, "");
  return clean.charAt(0).toUpperCase();
}

function NewTabPage({
  approvedDomains = [],
  activeFilter = "Popular",
  searchQuery = "",
  onActiveFilterChange,
  onSearchQueryChange,
  onNavigate,
  onNavigateNewTab
}) {
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
    return ["Popular", "All", ...categories];
  }, [catalogEntries]);

  const effectiveActiveFilter = filterOrder.includes(activeFilter) ? activeFilter : "Popular";

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
    if (effectiveActiveFilter === "Popular") {
      return resolvePopularEntries(catalogEntries);
    }
    if (effectiveActiveFilter === "All") {
      return catalogEntries;
    }
    return catalogEntries.filter((entry) => entry.category === effectiveActiveFilter);
  }, [catalogEntries, effectiveActiveFilter, searchResults]);

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
      <div className="newtab-topbar">
        <div className="newtab-brand">
          <h1 className="newtab-brand-name">
            Page<span className="newtab-brand-accent">Cow</span>
          </h1>
          <p className="newtab-brand-tagline">No social media. No news. No distractions.</p>
        </div>

        <div className="newtab-controls-row">
          <form className="newtab-search" onSubmit={handleSearchSubmit}>
            <svg className="newtab-search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              name="searchInput"
              className="search-box"
              type="text"
              placeholder="Search approved sites..."
              aria-label="Search approved sites"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange?.(e.target.value)}
            />
          </form>

          {!searchResults && (
            <div className="newtab-category">
              <label className="newtab-category-label" htmlFor="newtab-category-select">
                Category
              </label>
              <select
                id="newtab-category-select"
                className="newtab-category-select"
                value={effectiveActiveFilter}
                onChange={(e) => onActiveFilterChange?.(e.target.value)}
              >
                {filterOrder.map((filterKey) => (
                  <option key={filterKey} value={filterKey}>
                    {filterKey}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {searchResults && (
          <div className="newtab-search-status">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery.trim()}&rdquo;
          </div>
        )}
      </div>

      <div className="newtab-grid" role="list">
        {visibleEntries.map((entry) => (
          <button
            key={entry.domain}
            type="button"
            className="app-tile"
            role="listitem"
            onClick={(e) => handleSiteClick(e, entry.domain)}
            onContextMenu={(e) => handleSiteContextMenu(e, entry.domain)}
            title={entry.domain}
          >
            <div className="app-icon">
              <img
                src={getFaviconUrl(entry.domain)}
                alt=""
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.textContent = getDomainInitial(entry.domain);
                }}
              />
            </div>
            <span className="app-label">{displayNameForDomain(entry.domain)}</span>
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
