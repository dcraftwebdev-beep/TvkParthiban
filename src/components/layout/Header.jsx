import { CFG } from "../../lib/config.js";

export function Ticker({ t }) {
  return <div className="ticker"><div className="wrap"><span className="dot" />{t.ticker}<a href={`tel:+${CFG.phone}`}>{CFG.phoneShow}</a></div></div>;
}

export function TopBar({ t, lang, setLang, solid }) {
  return (
    <header className={"top" + (solid ? " solid" : "")}>
      <div className="wrap top-in">
        <a className="brand" href="#home"><img className="brand-flag" src="/flag.jpg" alt="TVK" /><span className="brand-text"><b>{t.brand}</b><small>{t.brandSub}</small></span></a>
        <nav className="desk-nav" aria-label="Primary">
          <a href="#home">{t.navHome}</a><a href="#leader">{t.navLeader}</a><a href="#tvk">{t.navTvk}</a>
          <a href="#complaint">{t.navComplaint}</a><a href="#track">{t.navTrack}</a><a href="#contact">{t.navContact}</a>
        </nav>
        <div className="lang" role="group" aria-label="Language">
          <button className={lang === "ta" ? "on" : ""} onClick={() => setLang("ta")}>த</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
        </div>
        <a className="top-cta" href="#complaint">{t.ctaRaise}</a>
      </div>
    </header>
  );
}
