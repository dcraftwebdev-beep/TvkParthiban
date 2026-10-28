import { TVK_SITE } from "../i18n/tvk.js";
import { wa, Icon, P, Head } from "../components/ui.jsx";

export function Tvk({ t }) {
  return (
    <section className="sec soft tvk" id="tvk"><div className="wrap">
      <Head eyebrow={t.tvkEyebrow} title={t.tvkTitle} sub={t.tvkLead} />

      <figure className="tvk-ribbon rv">
        <img src="/tvk/ribbon-leaders.webp" alt="TVK flag and leaders" loading="lazy" />
        <figcaption>{t.tvkBannerCap}</figcaption>
      </figure>

      <ul className="ideo rv">{t.ideoChips.map(c => <li key={c}>{c}</li>)}</ul>

      <div className="pillars">
        {t.pillars.map(([h, p, img], i) => (
          <article key={h} className="pillar rv" style={{ transitionDelay: `${i * 70}ms` }}>
            <div className="pillar-img"><img src={`/tvk/${img}`} alt="" loading="lazy" /></div>
            <div className="pillar-txt"><span className="num">0{i + 1}</span><h3>{h}</h3><p>{p}</p></div>
          </article>
        ))}
      </div>

    </div></section>
  );
}

export function Journey({ t }) {
  return (
    <section className="sec journey" id="journey">
      <div className="wrap narrow">
        <div className="motto rv">
          <p>{t.motto}</p>
          <span>{t.mottoSub}</span>
        </div>
      </div>
    </section>
  );
}

export function Join({ t }) {
  return (
    <section className="sec join" id="join"><div className="wrap join-in">
      <figure className="join-art rv">
        <video src="/join.mp4" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      </figure>
      <div className="join-copy rv">
        <p className="eyebrow">{t.joinEyebrow}</p>
        <h2>{t.joinTitle}</h2>
        <p className="sub">{t.joinText}</p>
        <div className="join-cta">
          <a className="btn primary" href={TVK_SITE} target="_blank" rel="noopener">{t.joinBtn}</a>
          <a className="btn ghost" href={wa()} target="_blank" rel="noopener"><Icon d={P.chat} size={18} />{t.joinWard}</a>
        </div>
      </div>
    </div></section>
  );
}
