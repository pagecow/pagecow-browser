import { useMemo } from "react";

function getFaviconUrl(url) {
  try {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${url}&sz=32`;
  }
}

function getShortName(url) {
  let hostname = url;
  try {
    hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {}
  
  return hostname
    .replace(/^www\./, "")
    .replace(/\.(com|org|net|io|app|dev|ai|co|us|me)$/, "")
    .split(".")
    .pop();
}

function BookmarksBar({ domains = [], onNavigate }) {
  const bookmarks = useMemo(() => {
    return domains.map((url) => ({
      url,
      popular: false 
    })).sort((left, right) => {
      return left.url.localeCompare(right.url);
    });
  }, [domains]);

  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <div className="bookmarks-bar" role="toolbar" aria-label="Bookmarks bar">
      <div className="bookmarks-bar-scroll">
        {bookmarks.map((bookmark) => (
          <button
            key={bookmark.url}
            type="button"
            className="bookmark-item"
            onClick={() => onNavigate(bookmark.url)}
            title={bookmark.url}
          >
            <img className="bookmark-icon" src={getFaviconUrl(bookmark.url)} alt="" />
            <span className="bookmark-label">{getShortName(bookmark.url)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default BookmarksBar;
