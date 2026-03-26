const QUOTES = [
  "Write with focus. Edit with courage.",
  "A page a day keeps the doubt away.",
  "Your draft does not need to be perfect, only present.",
  "Small writing sessions become finished books.",
  "The best writing routine is the one you keep.",
  "Silence the noise and trust the sentence."
];

function getDailyQuote() {
  const now = new Date();
  const daySeed = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
      86400000
  );
  return QUOTES[daySeed % QUOTES.length];
}

module.exports = {
  getDailyQuote
};
