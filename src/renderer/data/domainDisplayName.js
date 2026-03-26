/**
 * Human-readable labels for shortcut tiles (hostname only, no scheme / no leading www).
 */

const GOOGLE_HOST_LABELS = {
  docs: "Google Docs",
  drive: "Google Drive",
  sheets: "Google Sheets",
  calendar: "Google Calendar",
  meet: "Google Meet",
  scholar: "Google Scholar",
  accounts: "Google Account",
  mail: "Gmail"
};

/** Full hostnames that need an explicit label (long chains, glued words, brands). */
const EXACT_HOST_LABELS = {
  "pubmed.ncbi.nlm.nih.gov": "PubMed",
  "plato.stanford.edu": "Stanford Encyclopedia of Philosophy",
  "iep.utm.edu": "Internet Encyclopedia of Philosophy",
  "gmail.com": "Gmail",
  "kdp.amazon.com": "Amazon KDP",
  "quickbooks.intuit.com": "QuickBooks",
  "kindledirectpublishing.com": "Kindle Direct Publishing",
  "dabblewriter.com": "Dabble Writer",
  "roamresearch.com": "Roam Research",
  "writerduet.com": "WriterDuet",
  "prowritingaid.com": "ProWritingAid",
  "languagetool.org": "LanguageTool",
  "hemingwayapp.com": "Hemingway",
  "wordcounter.net": "Word Counter",
  "charactercounter.com": "Character Counter",
  "editminion.com": "Edit Minion",
  "powerthesaurus.org": "Power Thesaurus",
  "wordhippo.com": "WordHippo",
  "draft2digital.com": "Draft2Digital",
  "bookbaby.com": "BookBaby",
  "publishdrive.com": "PublishDrive",
  "ticktick.com": "TickTick",
  "clickup.com": "ClickUp",
  "surveymonkey.com": "SurveyMonkey",
  "lemonsqueezy.com": "Lemon Squeezy",
  "invoiceninja.com": "Invoice Ninja",
  "godaddy.com": "GoDaddy",
  "fingochat.com": "Fingochat",
  "ingramspark.com": "IngramSpark",
  "loc.gov": "Library of Congress",
  "jstor.org": "JSTOR",
  "worldcat.org": "WorldCat"
};

function titleCaseSegment(segment) {
  if (!segment) return "";
  return segment
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join("-");
}

/**
 * @param {string} domain - hostname or URL-like string (https:// and path tolerated)
 */
export function displayNameForDomain(domain) {
  if (!domain || typeof domain !== "string") return "";

  let host = domain.trim();
  try {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(host)) {
      host = new URL(host).hostname;
    } else if (host.includes("/")) {
      host = new URL(`https://${host}`).hostname;
    }
  } catch {
    host = domain.trim();
  }

  host = host.replace(/^www\./i, "").toLowerCase();
  if (!host) return "";

  if (EXACT_HOST_LABELS[host]) {
    return EXACT_HOST_LABELS[host];
  }

  const googleMatch = /^([a-z0-9-]+)\.google\.com$/.exec(host);
  if (googleMatch) {
    const sub = googleMatch[1];
    return GOOGLE_HOST_LABELS[sub] || `Google ${titleCaseSegment(sub)}`;
  }

  const parts = host.split(".");

  if (parts.length >= 3 && parts[0] === "mail") {
    return `${titleCaseSegment(parts[1])} Mail`;
  }

  if (parts.length === 2) {
    return titleCaseSegment(parts[0]);
  }

  if (parts.length === 3) {
    return `${titleCaseSegment(parts[0])} ${titleCaseSegment(parts[1])}`;
  }

  if (parts.length > 3) {
    return titleCaseSegment(parts[0]);
  }

  return host;
}
