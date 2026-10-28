import { useState } from "react";
import { CFG } from "../lib/config.js";
import { wa, Flag, WaGlyph } from "../components/ui.jsx";

export function Updates({ t }) {
  const [all, setAll] = useState(false);
  const share = (title, text) => wa(`*${title}*\n${text}\n\n${CFG.phoneShow}`);
  const items = all ? t.updates : t.updates.slice(0, 5);
  return (
    <section className="sec updates" id="updates"><div className="wrap">
      <div className="up-head rv">
        <p className="eyebrow">{t.uEyebrow}</p>
        <h2>{t.uTitle}</h2>
        <p className="sub">{t.uSub}</p>
      </div>

      <div className="wa-channel rv">
        <div className="wa-head">
          <span className="wa-av"><Flag /></span>
          <div><b>{t.uChannel}</b><small>{t.uChannelSub}</small></div>
          <a className="wa-join" href={wa()} target="_blank" rel="noopener" aria-label={t.uJoin}><WaGlyph size={18} /><span>{t.uJoinShort}</span></a>
        </div>
        <div className="wa-feed">
          {(
            <article className="wa-card wa-photo">
              <img src="/event.jpg" alt="" loading="lazy" />
              <div className="wa-photo-cap"><span className="wa-tag">{t.uTag}</span><p>{t.uPhotoCap}</p></div>
            </article>
          )}
          {items.map(([tag, title, body, src]) => (
            <article className="wa-card live" key={title}>
              <header className="wa-top">
                <span className="wa-status live">{t.uLaunched}</span>
                <span className="wa-tag">{tag}</span>
              </header>
              <h3>{title}</h3>
              <p>{body}</p>
              <div className="wa-row">
                <a href={src} target="_blank" rel="noopener">{t.uSrc}</a>
                <a className="wa-share" href={share(title, body)} target="_blank" rel="noopener"><WaGlyph size={16} />{t.uShare}</a>
              </div>
            </article>
          ))}
        </div>
      </div>
      {t.updates.length > 5 && <button type="button" className="wa-more" onClick={() => setAll(v => !v)}>{all ? t.uLess : t.uMore}</button>}
      <p className="up-note">{t.uNote}</p>
    </div></section>
  );
}
