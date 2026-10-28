import { wa, Icon } from "../components/ui.jsx";

export function Team({ t }) {
  return (
    <section className="sec team" id="team"><div className="wrap team-in">
      <figure className="team-art rv">
        <img src="/tvk/district-leader-912.webp" srcSet="/tvk/district-leader-600.webp 600w, /tvk/district-leader-912.webp 912w" sizes="(min-width:860px) 40vw, 90vw" width="912" height="1084" alt={t.teamAlt} loading="lazy" />
      </figure>
      <div className="team-copy rv">
        <p className="eyebrow">{t.teamEyebrow}</p>
        <h2>{t.teamName}<span className="team-tag">{t.teamTitle}</span></h2>
        <ul className="team-roles">{t.teamRoles.map(r => <li key={r}>{r}</li>)}</ul>
        <p className="team-note">{t.teamNote}</p>
        <div className="leader-cta"><a className="btn dark" href={wa()} target="_blank" rel="noopener"><Icon n="wa" size={18} />{t.lCta}</a></div>
      </div>
    </div></section>
  );
}
