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
            <a href="https://x.com/TVKVijayHQ" target="_blank" rel="noopener" aria-label="X: TVK Vijay"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg></a>
            <a href="https://x.com/TVKPartyHQ" target="_blank" rel="noopener" aria-label="X: TVK Party HQ"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg></a>
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
