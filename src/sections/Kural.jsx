import { CFG } from "../lib/config.js";

export function Kural({ lang, t }) {
  return (
    <section className="kural" id="kural"><div className="wrap rv">
      <span className="q">“</span>
      <blockquote><p>{CFG.kural.ta[0]}</p><p>{CFG.kural.ta[1]}</p></blockquote>
      <cite>{t.kuralTag}</cite>
      {lang === "en" && <p className="kural-en">{CFG.kural.en}</p>}
    </div></section>
  );
}
