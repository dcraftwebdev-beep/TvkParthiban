import { Head } from "../components/ui.jsx";

export function How({ t }) {
  return (
    <section className="sec" id="how"><div className="wrap">
      <Head eyebrow={t.hEyebrow} title={t.hTitle} />
      <ol className="steps">
        {t.h.map(([h, p], i) => (
          <li key={h} className="rv" style={{ transitionDelay: `${i * 70}ms` }}><b>0{i + 1}</b><div><h3>{h}</h3><p>{p}</p></div></li>
        ))}
      </ol>
    </div></section>
  );
}
