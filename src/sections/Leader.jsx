import { CFG } from "../lib/config.js";
import { wa, Icon, P } from "../components/ui.jsx";

export function Leader({ t, lang }) {
  return (
    <section className="sec leader" id="leader"><div className="wrap leader-in">
      <figure className="leader-art rv">
        <img src="/tvk/hero-team-1400.jpg" srcSet="/tvk/hero-team-800.jpg 800w, /tvk/hero-team-1400.jpg 1400w" sizes="(min-width:860px) 46vw, 100vw" alt={CFG.leaderName[lang]} loading="lazy" />
      </figure>
      <div className="leader-copy rv">
        <p className="eyebrow">{t.lEyebrow}</p>
        <h2>{CFG.leaderName[lang]}<span className="deg">{CFG.leaderDegree}</span></h2>
        <p className="role-line"><b>{t.lRole}</b></p>
        <p className="role-line sub">{t.lRole2}</p>
        <p className="body">{t.lText}</p>
        <ul className="ticks">{[t.lP1, t.lP2, t.lP3].map(x => <li key={x}><Icon d={P.tick} size={18} />{x}</li>)}</ul>
        <div className="leader-cta"><a className="btn dark" href={wa()} target="_blank" rel="noopener"><Icon d={P.chat} size={18} />{t.lCta}</a></div>
      </div>
    </div></section>
  );
}
