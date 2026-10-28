import { useEffect, useState } from "react";
import { CFG, CATS } from "../lib/config.js";
import { api } from "../lib/api.js";
import { wa, Icon, Head, WaGlyph } from "../components/ui.jsx";

export function WorkCard({ w, t, lang, onOpen }) {
  const cat = CATS.find(x => x.id === w.cat)?.[lang];
  return (
    <button type="button" className="work-card" onClick={() => onOpen(w)}>
      <img src={w.image} alt={t.beforeAfter} loading="lazy" />
      <span className="work-meta">
        <b>{cat}</b>
        <small>{w.street ? w.street + " · " : ""}{fmtDate(w.at, lang)} · {w.days === 0 ? t.tSameDay : `${w.days} ${t.tDays}`}</small>
      </span>
    </button>
  );
}

export function Lightbox({ w, t, onClose }) {
  useEffect(() => {
    const k = e => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [onClose]);
  const text = `${t.wTitle} · ${CFG.leaderName.ta}\n${w.page}`;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lb-card">
        <button type="button" className="lb-x" onClick={onClose} aria-label={t.okClose}><Icon d="M6 6l12 12M18 6 6 18" size={18} /></button>
        <img src={w.image} alt={t.beforeAfter} />
        <div className="lb-actions">
          <a className="ok-btn wa" href={wa(text)} target="_blank" rel="noopener"><WaGlyph size={17} />{t.uShare}</a>
          <a className="ok-btn" href={w.image} download><Icon d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" size={17} />{t.download}</a>
        </div>
      </div>
    </div>
  );
}

export function WorkDone({ t, lang }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => { api.work({ limit: 6 }).then(r => setItems(r.items || [])).catch(() => {}); }, []);
  if (!items.length) return null;
  return (
    <section className="sec workdone" id="work"><div className="wrap">
      <Head eyebrow={t.wEyebrow} title={t.wTitle} sub={t.wSub} />
      <div className="work-grid">
        {items.map((w, i) => <WorkCard key={i} w={w} t={t} lang={lang} onOpen={setOpen} />)}
      </div>
      <a className="btn dark work-all" href="#/work">{t.viewAll}<Icon d="M7 17 17 7M8 7h9v9" size={18} /></a>
      {open && <Lightbox w={open} t={t} onClose={() => setOpen(null)} />}
    </div></section>
  );
}

export function WorkPage({ t, lang }) {
  const [cat, setCat] = useState("");
  const [items, setItems] = useState([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(null);
  const PAGE = 12;

  const load = async (reset, from) => {
    setBusy(true);
    try {
      const r = await api.work({ limit: PAGE, offset: reset ? 0 : from, cat });
      setItems(p => (reset ? r.items : [...p, ...r.items])); setMore(!!r.more);
    } catch { /* keep what we have */ }
    finally { setBusy(false); }
  };
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { load(true, 0); }, [cat]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="workpage"><section className="sec"><div className="wrap">
      <a className="wp-back" href="#home"><Icon d="M15 5l-7 7 7 7" size={18} />{t.navHome}</a>
      <Head eyebrow={t.wEyebrow} title={t.wpTitle} sub={t.wpSub} />
      <div className="wp-chips" role="tablist">
        <button type="button" className={cat === "" ? "on" : ""} onClick={() => setCat("")}>{t.all}</button>
        {CATS.map(c => <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>{c[lang]}</button>)}
      </div>
      {!busy && !items.length && <p className="wp-empty">{t.wpEmpty}</p>}
      <div className="work-grid">
        {items.map((w, i) => <WorkCard key={w.image + i} w={w} t={t} lang={lang} onOpen={setOpen} />)}
      </div>
      {more && <button type="button" className="wa-more" disabled={busy} onClick={() => load(false, items.length)}>{busy ? "…" : t.loadMore}</button>}
      {open && <Lightbox w={open} t={t} onClose={() => setOpen(null)} />}
    </div></section></main>
  );
}
