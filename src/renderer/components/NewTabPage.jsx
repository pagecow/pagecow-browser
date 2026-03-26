import { useEffect, useMemo, useState } from "react";
import { formatClock, getDayOfYear } from "../utils/date";
import { WRITING_QUOTES } from "../data/quotes";

function NewTabPage({ showQuote, quote: fixedQuote }) {
  const [time, setTime] = useState(formatClock(new Date()));

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
      </div>
    </div>
  );
}

export default NewTabPage;
