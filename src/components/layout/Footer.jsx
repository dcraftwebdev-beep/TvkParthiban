import { CFG } from "../../lib/config.js";
import { wa, Icon } from "../ui.jsx";

export function Footer({ t, lang }) {
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap foot-mid">
        <div>
          <p className="foot-brand">{t.fBrand}</p>
          <div className="foot-icons">
            <a href={wa()} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon n="wa" size={22} /></a>
            <a href={`tel:+${CFG.phone}`} aria-label={t.qCall}><Icon n="phone" size={22} /></a>
            <a href="https://www.instagram.com/tvkvijayhq/" target="_blank" rel="noopener" aria-label="Instagram"><Icon n="ig" size={22} /></a>
            <a href="https://www.facebook.com/TVKVijayHQ/" target="_blank" rel="noopener" aria-label="Facebook"><Icon n="fb" size={20} /></a>
          </div>
        </div>
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
      </div>
    </footer>
  );
}
