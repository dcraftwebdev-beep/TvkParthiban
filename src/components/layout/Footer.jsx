import { CFG } from "../../lib/config.js";
import { TVK_SITE } from "../../i18n/tvk.js";
import { wa, Icon, P, WaGlyph } from "../ui.jsx";

export function Footer({ t, lang }) {
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap foot-top">
        <div className="foot-photo"><img src="/portrait.jpg" alt={CFG.leaderName[lang]} loading="lazy" /></div>
        <div className="foot-cta">
          <p className="eyebrow">{t.fEyebrow}</p>
          <h2>{t.fTitle}</h2>
          <p className="foot-text">{t.fText}</p>
          <a className="btn primary" href="#complaint">{t.ctaRaise}<Icon d="M7 17 17 7M8 7h9v9" size={18} /></a>
          <div className="foot-icons">
            <a href={wa()} target="_blank" rel="noopener" aria-label="WhatsApp"><WaGlyph size={22} /></a>
            <a href={`tel:+${CFG.phone}`} aria-label={t.qCall}><Icon d={P.phone} size={22} /></a>
            <a href="https://www.instagram.com/tvkvijayhq/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg></a>
            <a href="https://www.facebook.com/TVKVijayHQ/" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.800v3h2.600V21z" /></svg></a>
          </div>
        </div>
      </div>

      <div className="wrap foot-mid">
        <p className="foot-brand">{t.fBrand}</p>
        <div className="foot-cols">
          <div>
            <h4>{t.fCol1}</h4>
            <a href="#home">{t.navHome}</a><a href="#leader">{t.navLeader}</a><a href="#tvk">{t.navTvk}</a><a href="#/work">{t.wTitle}</a><a href="#updates">{t.uTitle}</a>
          </div>
          <div>
            <h4>{t.fCol2}</h4>
            <a href="#complaint">{t.navComplaint}</a><a href="#track">{t.navTrack}</a><a href="#how">{t.navHow}</a><a href="#contact">{t.navContact}</a>
          </div>
          <div>
            <h4>{t.fCol3}</h4>
            <a href={wa()} target="_blank" rel="noopener">WhatsApp</a>
            <a href={`tel:+${CFG.phone}`}>{CFG.phoneShow}</a>
            <span>{t.kNote}</span>
          </div>
        </div>
      </div>

      <div className="wrap foot-bot">
        <p>© {year} {t.footer}. {t.fRights}</p>
        <a href={TVK_SITE} target="_blank" rel="noopener">tvkvijay.com</a>
      </div>
    </footer>
  );
}
