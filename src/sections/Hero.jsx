import { CFG } from "../lib/config.js";
import { wa, Icon, P } from "../components/ui.jsx";

export function Hero({ t }) {
  return (
    <section className="hero" id="home">
      <video className="hero-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"><source src="/hero.mp4" type="video/mp4" /></video>
      <div className="hero-shade" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{t.heroEyebrow}</p>
          <h1>{t.heroTitle[0]}<br />{t.heroTitle[1]}</h1>
          <p className="lead">{t.heroLead}</p>
          <div className="hero-cta">
            <a className="btn primary" href="#complaint">{t.ctaRaise}</a>
            <a className="btn ghost" href="#track">{t.ctaTrack}</a>
          </div>
          <p className="hero-tag">{t.heroTag}</p>
        </div>
      </div>
      <i className="tri" />
    </section>
  );
}

export function Quick({ t, onVoice }) {
  return (
    <section className="quick"><div className="wrap quick-in">
      <a className="tile" href="#complaint"><Icon d={P.plus} /><div><b>{t.qComplaint}</b><small>{t.qComplaintSub}</small></div></a>
      <a className="tile" href="#complaint" onClick={onVoice}><Icon d={P.mic} /><div><b>{t.qVoice}</b><small>{t.qVoiceSub}</small></div></a>
      <a className="tile" href={wa()} target="_blank" rel="noopener"><Icon d={P.chat} /><div><b>WhatsApp</b><small>{t.qWaSub}</small></div></a>
      <a className="tile" href={`tel:+${CFG.phone}`}><Icon d={P.phone} /><div><b>{t.qCall}</b><small>{t.qCallSub}</small></div></a>
    </div></section>
  );
}
