import { useEffect, useMemo, useState } from "react";
import { formatClock, getDayOfYear } from "../utils/date";
import { WRITING_QUOTES } from "../data/quotes";
import { buildCatalogEntries, availableCategoryFilters } from "../data/siteCatalog";

function NewTabPage({ showQuote, quote: fixedQuote, approvedDomains = [], onNavigate }) {
  const [time, setTime] = useState(formatClock(new Date()));
  const [activeFilter, setActiveFilter] = useState("Popular");

  useEffect(() => {
    const tick = () => {
      setTime(formatClock(new Date()));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const fallbackQuote = useMemo(() => {
    const index = getDayOfYear(new Date()) % WRITING_QUOTES.length;
    return WRITING_QUOTES[index];
  }, []);
  const quote = fixedQuote || fallbackQuote;

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
      return catalogEntries.slice(0, 24);
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

  return (
    <div className="center-screen">
      <div className="brand-card home">
        <div className="home-hero">
          <div className="pagecow-logo" aria-hidden>
            🐄
          </div>
          <h1 className="app-title">PageCow</h1>
          <p className="tagline">The browser that keeps you writing</p>
          <div className="clock">{time}</div>
          <div className="date-row">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </div>
        </div>

        {showQuote && <blockquote className="quote">&ldquo;{quote}&rdquo;</blockquote>}

        <section className="home-explainer">
          <p>
            PageCow is a distraction-free work browser with a curated approved-site list. Every
            website request is checked against that list so social media, entertainment, and other
            off-task destinations stay out of your workflow.
          </p>
          <p className="submission-callout">
            Missing a work site? Email{" "}
            <a
              href="mailto:submission@pagecow.com"
              onClick={(event) => {
                event.preventDefault();
                window.pagecow?.openExternal("mailto:submission@pagecow.com");
              }}
            >
              submission@pagecow.com
            </a>{" "}
            and we can review it for approval.
          </p>
        </section>

        <section className="catalog">
          <div className="catalog-head">
            <h3>Approved Sites</h3>
            <span className="catalog-count">{catalogEntries.length} sites</span>
          </div>
          <div className="catalog-filters">
            {filterOrder.map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                className={`filter-pill${activeFilter === filterKey ? " active" : ""}`}
                onClick={() => setActiveFilter(filterKey)}
              >
                {filterKey}
              </button>
            ))}
          </div>

          <div className="catalog-grid" role="list">
            {visibleEntries.map((entry) => (
              <button
                key={entry.domain}
                type="button"
                className="catalog-site"
                role="listitem"
                onClick={() => handleSiteClick(entry.domain)}
              >
                <div className="catalog-site-domain">{entry.domain}</div>
                <div className="catalog-site-category">{entry.category}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default NewTabPage;
