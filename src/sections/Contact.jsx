import { CFG } from "../lib/config.js";
import { wa, Icon, Head } from "../components/ui.jsx";

export function Contact({ t }) {
  return (
    <section className="sec contact" id="contact"><div className="wrap narrow">
      <Head eyebrow={t.kEyebrow} title={t.kTitle} />
      <div className="contact-grid rv">
        <a className="c-card" href={wa()} target="_blank" rel="noopener"><Icon n="wa" size={26} /><span>{t.kWa}</span><b>{CFG.phoneShow}</b></a>
        <a className="c-card" href={`tel:+${CFG.phone}`}><Icon n="phone" size={26} /><span>{t.kCall}</span><b>{CFG.phoneShow}</b></a>
      </div>
      <p className="note">{t.kNote}</p>
    </div></section>
  );
}
