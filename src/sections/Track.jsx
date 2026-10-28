import { useState } from "react";
import { CFG, CATS } from "../lib/config.js";
import { api } from "../lib/api.js";
import { wa, Icon, Head } from "../components/ui.jsx";

const dayMs = 86400000;

export function TrackCard({ c, t, lang, n, open, onToggle }) {
  const loc = lang === "ta" ? "ta-IN" : "en-IN";
  const date = ms => ms ? new Date(ms).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }) : "";
  const time = ms => ms ? new Date(ms).toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" }) : "";
  const stepAt = [c.createdAt, c.progressAt || (c.status >= 1 ? c.updatedAt : null), c.resolvedAt || (c.status === 2 ? c.updatedAt : null)];
  const done = c.status === 2;
  const days = Math.max(0, Math.round(((done ? stepAt[2] : Date.now()) - c.createdAt) / dayMs));
  const took = done ? (days === 0 ? t.tSameDay : `${days} ${t.tDays}`) : `${days} ${t.tDays}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(c.id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  const cat = CATS.find(x => x.id === c.cat)?.[lang];
  return (
    <article className={"t-card" + (done ? " is-done" : "") + (open ? " open" : "")}>
      <button type="button" className="t-head" onClick={onToggle} aria-expanded={open}>
        <span className="t-num">{n}</span>
        <span className="t-main">
          <span className="t-line1"><b>{c.id}</b><span className={"badge s" + c.status}>{t.st[c.status]}</span></span>
          <span className="t-line2"><strong>{cat}</strong> · {c.snippet}</span>
          <span className="t-mini" aria-hidden="true">{[0, 1, 2].map(k => <i key={k} className={k <= c.status ? "f" : ""} />)}</span>
        </span>
        <span className="t-chev"><Icon n="down" size={18} /></span>
      </button>

      {open && (
        <div className="t-body">
          <ol className="t-steps">
            {[0, 1, 2].map(k => (
              <li key={k} className={(k <= c.status ? "on" : "") + (k === c.status ? " now" : "")}>
                <span className="t-dot">{k <= c.status ? <Icon n="tick" size={13} /> : k + 1}</span>
                <div>
                  <b>{t.st[k]}</b>
                  <small>{stepAt[k] && k <= c.status ? <>{date(stepAt[k])}<br />{time(stepAt[k])}</> : t.tWaiting}</small>
                </div>
              </li>
            ))}
          </ol>

          <dl className="t-facts">
            <div><dt>{t.tRaised}</dt><dd>{date(c.createdAt)}</dd></div>
            <div><dt>{t.tDone}</dt><dd>{done ? date(stepAt[2]) : t.tPending}</dd></div>
            <div><dt>{done ? t.tTaken : t.tOpenFor}</dt><dd>{took}</dd></div>
          </dl>

          {c.street && <p className="t-loc"><Icon n="pin" size={14} />{c.street}</p>}
          {c.note && <p className="t-note"><b>{t.tNote}</b>{c.note}</p>}
          {c.result && (
            <a className="t-result" href={c.result} target="_blank" rel="noopener">
              <img src={c.result} alt={t.beforeAfter} loading="lazy" /><span>{t.beforeAfter}</span>
            </a>
          )}
          <div className="t-contact">
            <button type="button" onClick={copy}><Icon n={copied ? "tick" : "copy"} size={16} />{copied ? t.copied : t.copy}</button>
            <a href={`tel:+${CFG.phone}`}><Icon n="phone" size={16} />{t.qCall}</a>
            <a href={wa(`${c.id}`)} target="_blank" rel="noopener"><Icon n="wa" size={16} />WhatsApp</a>
          </div>
        </div>
      )}
    </article>
  );
}

export function Track({ t, lang }) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [res, setRes] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const search = async e => {
    e.preventDefault(); const s = q.trim(); if (!s || busy) return;
    setBusy(true); setFail(false);
    try {
      const items = (await api.track(s)).items;
      setRes(items); setAsked(s);
      setOpenId(items.length === 1 ? items[0].id : null);   // a single complaint opens by itself, a list stays compact
    } catch { setFail(true); setRes(null); } finally { setBusy(false); }
  };
  const many = !!res && res.length > 1;
  return (
    <section className="sec soft" id="track"><div className="wrap">
      <div className="t-intro">
        <Head eyebrow={t.tEyebrow} title={t.tTitle} />
        <form className="track-form rv" onSubmit={search}>
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder={t.tPh} enterKeyHint="search" />
          <button className="btn dark" type="submit" disabled={busy}>{busy ? "…" : t.tBtn}</button>
        </form>
      </div>
      <div className="track-out">
        {fail && <p className="empty">{t.tFail}</p>}
        {!fail && res === null && <p className="empty">{t.tHint}</p>}
        {res && !res.length && <p className="empty">{t.tNone}</p>}
        {many && <p className="t-count"><b>{asked}</b> · {res.length} {t.tCount}</p>}
        {res && res.length > 0 && (
          <div className={"t-list" + (many ? " multi" : "")}>
            {res.map((c, k) => (
              <TrackCard key={c.id} c={c} t={t} lang={lang} n={k + 1} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} />
            ))}
          </div>
        )}
      </div>
    </div></section>
  );
}
