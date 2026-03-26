import { useEffect, useMemo, useState } from "react";
import { formatClock, getDayOfYear } from "../utils/date";
import { WRITING_QUOTES } from "../data/quotes";
import { buildCatalogEntries, availableCategoryFilters } from "../data/siteCatalog";

function NewTabPage({ showQuote, quote: fixedQuote, approvedDomains = [] }) {
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

  return (
    <div className="center-screen">
      <div className="brand-card">
        <div className="pagecow-logo" aria-hidden>
          🐄
        </div>
        <h1>PageCow</h1>
        <p className="tagline">The browser that keeps you writing</p>
        <div className="clock">{time}</div>
        {showQuote ? <blockquote className="quote">"{quote}"</blockquote> : null}

        <section className="home-explainer">
          <h2>What is PageCow?</h2>
          <p>
            PageCow is a distraction-free work browser with a curated approved-site list. Every
            website request is checked against that list so social media, entertainment, and other
            off-task destinations stay out of your workflow.
          </p>
          <p>
            Missing a work site? Email us at{" "}
            <a
              href="mailto:submission@pagecow.com"
              onClick={(event) => {
                event.preventDefault();
                window.pagecow.openExternal("mailto:submission@pagecow.com");
              }}
            >
              submission@pagecow.com
            </a>{" "}
            and we can review it for approval.
          </p>
        </section>

        <section className="site-catalog">
          <h2>Approved Sites Catalog</h2>
          <p className="catalog-helper">
            Browse approved websites by category or open a popular one in one click.
          </p>
          <div className="catalog-filters">
            {filterOrder.map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                className={`catalog-filter ${activeFilter === filterKey ? "active" : ""}`}
                onClick={() => setActiveFilter(filterKey)}
              >
                {filterKey}
              </button>
            ))}
          </div>

          <div className="catalog-list" role="list">
            {visibleEntries.map((entry) => (
              <button
                key={entry.domain}
                type="button"
                className="catalog-domain"
                onClick={() => window.pagecow.navigate(entry.domain)}
              >
                {entry.domain}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default NewTabPage;
