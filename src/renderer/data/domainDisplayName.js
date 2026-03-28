/**
 * Human-readable labels for shortcut tiles (hostname only, no scheme / no leading www).
 */

const GOOGLE_HOST_LABELS = {
  docs: "Google Docs",
  drive: "Google Drive",
  calendar: "Google Calendar",
  accounts: "Google Account",
  mail: "Gmail"
};

/** Full hostnames that need an explicit label (long chains, glued words, brands). */
const EXACT_HOST_LABELS = {
  "bible.com": "YouVersion",
  "biblegateway.com": "Bible Gateway",
  "blueletterbible.org": "Blue Letter Bible",
  "crossway.org": "Crossway",
  "desiringgod.org": "Desiring God",
  "enduringword.com": "Enduring Word",
  "esv.org": "ESV Bible",
  "gotquestions.org": "GotQuestions.org",
  "gty.org": "Grace to You",
  "ligonier.org": "Ligonier Ministries",
  "9marks.org": "9Marks",
  "abeka.com": "Abeka",
  "apologia.com": "Apologia",
  "biblestudytools.com": "Bible Study Tools",
  "bjukpress.com": "BJU Press",
  "ccel.org": "Christian Classics",
  "corechristianity.com": "Core Christianity",
  "focusonthefamily.com": "Focus on the Family",
  "hippocampus.org": "HippoCampus",
  "hslda.org": "HSLDA",
  "icr.org": "Institute for Creation Research",
  "k12.com": "K12",
  "logos.com": "Logos",
  "masterbooks.com": "Master Books",
  "monergism.com": "Monergism",
  "olivetree.com": "Olive Tree",
  "sonlight.com": "Sonlight",
  "studylight.org": "StudyLight",
  "thegospelcoalition.org": "The Gospel Coalition",
  "truthforlife.org": "Truth For Life",
  "allinonehomeschool.com": "Easy Peasy All-in-One",
  "amblesideonline.org": "Ambleside Online",
  "christianbook.com": "Christianbook",
  "iew.com": "IEW",
  "mathusee.com": "Math-U-See",
  "memoriapress.com": "Memoria Press",
  "myfathersworld.com": "My Father's World",
  "rainbowresource.com": "Rainbow Resource",
  "setonhome.org": "Seton Home Study",
  "simplycharlottemason.com": "Simply Charlotte Mason",
  "teachingtextbooks.com": "Teaching Textbooks",
  "thegoodandthebeautiful.com": "The Good and the Beautiful",
  "veritaspress.com": "Veritas Press",
  "abcya.com": "ABCya",
  "blockly.games": "Blockly Games",
  "code.org": "Code.org",
  "csfirst.withgoogle.com": "CS First",
  "duolingo.com": "Duolingo",
  "funbrain.com": "Funbrain",
  "kodable.com": "Kodable",
  "nitrotype.com": "Nitro Type",
  "pbskids.org": "PBS KIDS",
  "scratch.mit.edu": "Scratch",
  "splashlearn.com": "SplashLearn",
  "starfall.com": "Starfall",
  "teachyourmonstertoread.org": "Teach Your Monster to Read",
  "typing.com": "Typing.com",
  "typingclub.com": "TypingClub",
  "tynker.com": "Tynker",
  "pcloud.com": "pCloud",
  "britannica.com": "Britannica",
  "dictionary.com": "Dictionary.com",
  "kidsanswers.org": "Kids Answers",
  "creationmoments.com": "Creation Moments",
  "cliffsnotes.com": "CliffsNotes",
  "answersresearchjournal.org": "Answers Research Journal",
  "nationalgeographic.com": "National Geographic",
  "pbslearningmedia.org": "PBS LearningMedia",
  "citationmachine.net": "Citation Machine",
  "commonlit.org": "CommonLit",
  "readworks.org": "ReadWorks",
  "newsela.com": "Newsela",
  "mathisfun.com": "Math Is Fun",
  "wolframalpha.com": "Wolfram Alpha",
  "pubmed.ncbi.nlm.nih.gov": "PubMed",
  "plato.stanford.edu": "Stanford Encyclopedia of Philosophy",
  "iep.utm.edu": "Internet Encyclopedia of Philosophy",
  "gmail.com": "Gmail",
  "accounts.youtube.com": "YouTube Account",
  "kdp.amazon.com": "Amazon KDP",
  "quickbooks.intuit.com": "QuickBooks",
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
