import { useEffect, useState } from "react";
import { CFG } from "../lib/config.js";
import { wa, Icon, P, WaGlyph } from "../components/ui.jsx";

// the video is for wide screens only; phones get a light photo so they do not download it
const useWide = () => {
  const q = "(min-width: 860px)";
  const [wide, setWide] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q), f = () => setWide(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return wide;
};

export function Hero({ t }) {
  const wide = useWide();
  return (
    <section className="hero" id="home">
      <img className="hero-photo" src="/tvk/hero-mobile.jpg" alt="" fetchpriority="high" />
      {wide && <video className="hero-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"><source src="/hero.mp4" type="video/mp4" /></video>}
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
      <a className="tile" href="#complaint"><span className="ti ti-add"><Icon d={P.plus} /></span><div><b>{t.qComplaint}</b><small>{t.qComplaintSub}</small></div></a>
      <a className="tile" href="#complaint" onClick={onVoice}><span className="ti ti-mic"><Icon d={P.mic} /></span><div><b>{t.qVoice}</b><small>{t.qVoiceSub}</small></div></a>
      <a className="tile" href={wa()} target="_blank" rel="noopener"><span className="ti ti-wa"><WaGlyph size={24} /></span><div><b>WhatsApp</b><small>{t.qWaSub}</small></div></a>
      <a className="tile" href={`tel:+${CFG.phone}`}><span className="ti ti-call"><Icon d={P.phone} /></span><div><b>{t.qCall}</b><small>{t.qCallSub}</small></div></a>
    </div></section>
  );
}
