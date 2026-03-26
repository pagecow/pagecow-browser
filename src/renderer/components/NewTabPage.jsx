import { useMemo, useState } from "react";
import { buildCatalogEntries, availableCategoryFilters } from "../data/siteCatalog";

function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function getDomainInitial(domain) {
  const clean = domain.replace(/^www\./, "");
  return clean.charAt(0).toUpperCase();
}

function getShortName(domain) {
  return domain
    .replace(/^www\./, "")
    .replace(/\.(com|org|net|io|app|dev|ai|co|us|me)$/, "")
    .split(".")
    .pop();
}

function NewTabPage({ approvedDomains = [], onNavigate }) {
  const [activeFilter, setActiveFilter] = useState("Popular");

  const catalogEntries = useMemo(() => {
    return buildCatalogEntries(approvedDomains);
  }, [approvedDomains]);

  const filterOrder = useMemo(() => {
    const categories = availableCategoryFilters(catalogEntries);
    return ["Popular", ...categories];
  }, [catalogEntries]);

  const visibleEntries = useMemo(() => {
    if (activeFilter === "Popular") {
      const popular = catalogEntries.filter((entry) => entry.popular);
      if (popular.length > 0) return popular;
      return catalogEntries.slice(0, 12);
    }
    return catalogEntries.filter((entry) => entry.category === activeFilter);
  }, [activeFilter, catalogEntries]);

  function handleSiteClick(domain) {
    if (onNavigate) {
      onNavigate(domain);
    } else if (window.pagecow?.navigate) {
      window.pagecow.navigate(domain);
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const value = event.target.elements.searchInput?.value?.trim();
    if (value && onNavigate) {
      onNavigate(value);
    }
  }

  return (
    <div className="newtab">
      <div className="newtab-hero">
        <h1 className="newtab-logo">
          Page<span className="newtab-logo-accent">Cow</span>
        </h1>
        <p className="newtab-tagline">No social media. No news. No entertainment. Just focused work.</p>
      </div>

      <form className="newtab-search" onSubmit={handleSearchSubmit}>
        <input
          name="searchInput"
          className="search-box"
          type="text"
          placeholder="Enter a work site URL..."
          aria-label="Navigate to a site"
        />
      </form>

      <section className="shortcuts">
        <div className="shortcuts-header">
          <span className="shortcuts-title">Approved sites</span>
          <span className="shortcuts-count">{catalogEntries.length} sites</span>
        </div>

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

        <div className="shortcuts-grid" role="list">
          {visibleEntries.map((entry) => (
            <button
              key={entry.domain}
              type="button"
              className="shortcut-tile"
              role="listitem"
              onClick={() => handleSiteClick(entry.domain)}
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
              <span className="shortcut-label">{getShortName(entry.domain)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="info-bar">
        Would you like another site to be added to the approved list of sites? Send us an email at submissions@pagecow.com
      </div>
    </div>
  );
}

export default NewTabPage;
