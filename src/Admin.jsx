import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { admin, getToken, setToken } from "./api.js";
import { CATS, CFG } from "./config.js";
import "./admin.css";

const ST = ["புதியது", "நடவடிக்கையில்", "தீர்க்கப்பட்டது"];
const ST_EN = ["New", "In progress", "Resolved"];
const catName = id => { const c = CATS.find(x => x.id === id); return c ? `${c.ta} · ${c.en}` : id; };
const intl = p => (String(p).length === 10 ? "91" + p : p);
const when = ms => new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const ago = ms => {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const Ico = ({ d, s = 20 }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const I = {
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  chat: "M4 20l1.4-4.2A8 8 0 1 1 8.3 18.7L4 20z",
  pin: "M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  x: "M6 6l12 12M18 6 6 18", out: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9", dl: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14", re: "M20 11a8 8 0 1 0-2.3 5.700M20 5v6h-6"
};

/* ---------- login ---------- */
function Login({ onOk }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr("");
    try { const r = await admin.login(pw); setToken(r.token); onOk(r.token); }
    catch (x) { setErr(x.status === 429 ? "Too many attempts. Wait a few minutes." : x.status === 401 ? "Wrong password." : "Cannot reach the server."); }
    finally { setBusy(false); }
  };
  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={go}>
        <img src="/flag.jpg" alt="" className="ad-flag" />
        <h1>Admin panel</h1>
        <p>வார்டு 38 · காட்டூர் · TVK</p>
        <input type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" autoComplete="current-password" />
        {err && <div className="ad-err" role="alert">{err}</div>}
        <button className="ad-btn primary" disabled={!pw || busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <a href="#home" className="ad-link">← Back to website</a>
      </form>
    </div>
  );
}

/* ---------- detail drawer ---------- */
function Detail({ id, token, onClose, onChanged, flash }) {
  const [c, setC] = useState(null);
  const [status, setStatus] = useState(0);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    admin.one(token, id).then(r => { if (live) { setC(r); setStatus(r.status); setNote(r.note || ""); } }).catch(() => flash("Could not load complaint"));
    return () => { live = false; };
  }, [id, token, flash]);

  useEffect(() => {
    const k = e => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [onClose]);

  const save = async notify => {
    setBusy(true);
    try { const r = await admin.patch(token, id, { status, note, notify }); setC(p => ({ ...p, ...r })); onChanged(); flash(notify ? "Saved. User notified on WhatsApp" : "Saved"); }
    catch { flash("Save failed"); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!msg.trim()) return; setBusy(true);
    try { const r = await admin.message(token, id, msg.trim()); flash(r.queued ? "Message queued. The WhatsApp worker sends it shortly" : r.sent ? "Message sent" : "Message could not be sent"); if (r.sent || r.queued) setMsg(""); const fresh = await admin.one(token, id); setC(fresh); }
    catch { flash("Send failed"); } finally { setBusy(false); }
  };

  return (
    <div className="ad-drawer-wrap" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="ad-drawer" role="dialog" aria-modal="true" aria-label="Complaint details">
        <header className="ad-dh">
          <div><small>{c ? catName(c.cat) : ""}</small><h2>{id}</h2></div>
          <button className="ad-icon" onClick={onClose} aria-label="Close"><Ico d={I.x} /></button>
        </header>
        {!c ? <p className="ad-pad">Loading…</p> : (
          <div className="ad-db">
            <section>
              <p className="ad-desc">{c.desc}</p>
              <p className="ad-meta">{when(c.createdAt)} · {ago(c.createdAt)}</p>
            </section>

            <section className="ad-grid2">
              <div><small>Name</small><b>{c.name}</b></div>
              <div><small>Mobile</small><b>{c.phone}</b></div>
              <div className="ad-span"><small>Location</small><b>{c.street || "-"}</b></div>
            </section>

            <div className="ad-actions">
              <a className="ad-btn" href={`tel:+${intl(c.phone)}`}><Ico d={I.phone} />Call</a>
              <a className="ad-btn wa" href={`https://wa.me/${intl(c.phone)}`} target="_blank" rel="noopener"><Ico d={I.chat} />WhatsApp</a>
              {c.lat != null && <a className="ad-btn" href={`https://maps.google.com/?q=${c.lat},${c.lng}`} target="_blank" rel="noopener"><Ico d={I.pin} />Map</a>}
            </div>

            {c.hasPhoto && <img className="ad-photo" src={admin.photoUrl(token, c.id)} alt="Complaint" />}

            <section>
              <h3>Status</h3>
              <div className="ad-seg">
                {ST_EN.map((l, i) => <button key={l} className={status === i ? "on s" + i : ""} onClick={() => setStatus(i)}>{l}</button>)}
              </div>
              <textarea rows={3} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="Note for the user (optional), e.g. Work scheduled for Monday" />
              <div className="ad-actions">
                <button className="ad-btn primary" disabled={busy} onClick={() => save(true)}>Save & notify user</button>
                <button className="ad-btn" disabled={busy} onClick={() => save(false)}>Save only</button>
              </div>
            </section>

            <section>
              <h3>Send a WhatsApp message</h3>
              <textarea rows={2} maxLength={800} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type a message to the user" />
              <button className="ad-btn wa" disabled={busy || !msg.trim()} onClick={send}><Ico d={I.chat} />Send</button>
            </section>

            <section>
              <h3>WhatsApp delivery log</h3>
              {!c.notifications?.length ? <p className="ad-meta">Nothing sent yet.</p> : (
                <ul className="ad-log">
                  {c.notifications.map((n, i) => (
                    <li key={i} className={n.ok ? "ok" : n.pending ? "wait" : "bad"}>
                      <b>{n.ok ? "Sent" : n.pending ? "Queued" : "Failed"}</b> · {n.audience} · {n.kind} · {when(n.at)}
                      {!n.ok && n.error && <em>{n.error}</em>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------- main ---------- */
function Panel({ token, onLogout }) {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const seen = useRef(null);
  const tm = useRef(0);

  const flash = useCallback(m => { setToast(m); clearTimeout(tm.current); tm.current = setTimeout(() => setToast(""), 2600); }, []);

  const load = useCallback(async (quiet) => {
    try {
      const [s, l] = await Promise.all([admin.stats(token), admin.list(token, { status, cat, q: search })]);
      setStats(s); setItems(l.items);
      if (seen.current !== null && s.total > seen.current && quiet) flash(`${s.total - seen.current} new complaint${s.total - seen.current > 1 ? "s" : ""}`);
      seen.current = s.total;
    } catch (e) { if (e.status === 401) onLogout(); else flash("Connection problem"); }
    finally { setLoading(false); }
  }, [token, status, cat, search, flash, onLogout]);

  useEffect(() => { const h = setTimeout(() => load(false), search ? 250 : 0); return () => clearTimeout(h); }, [load, search]);
  useEffect(() => { const h = setInterval(() => load(true), 30000); return () => clearInterval(h); }, [load]);

  const cards = useMemo(() => stats ? [
    ["New", stats.received, "s0", ""], ["In progress", stats.progress, "s1", "1"], ["Resolved", stats.resolved, "s2", "2"], ["Last 7 days", stats.week, "s3", null]
  ] : [], [stats]);

  const tabs = [["", "All"], ["0", "New"], ["1", "In progress"], ["2", "Resolved"]];

  return (
    <div className="ad">
      <header className="ad-top">
        <div className="ad-brand"><img src="/flag.jpg" alt="" /><div><b>Complaints admin</b><small>Ward 38 · Kattur</small></div></div>
        <div className="ad-top-r">
          <button className="ad-icon" onClick={() => { setLoading(true); load(false); }} aria-label="Refresh" title="Refresh"><Ico d={I.re} /></button>
          <a className="ad-icon" href={admin.csvUrl(token)} aria-label="Export CSV" title="Export CSV"><Ico d={I.dl} /></a>
          <button className="ad-icon" onClick={onLogout} aria-label="Sign out" title="Sign out"><Ico d={I.out} /></button>
        </div>
      </header>

      <main className="ad-main">
        {stats && stats.notify.provider === "console" && (
          <div className="ad-banner">WhatsApp is in demo mode. Messages are only printed in the server terminal. Set NOTIFY_PROVIDER=mcp to send real messages.</div>
        )}
        {stats && stats.pending > 0 && (
          <div className="ad-banner">{stats.pending} WhatsApp message{stats.pending > 1 ? "s are" : " is"} waiting to be sent. Make sure the WhatsApp worker (npm run worker) is running and the phone is linked.</div>
        )}

        <section className="ad-stats">
          {cards.map(([l, n, k, f]) => (
            <button key={l} className={"ad-stat " + k + (f !== null && status === f && f !== "" ? " on" : "")} onClick={() => f !== null && setStatus(f)} disabled={f === null}>
              <b>{n}</b><span>{l}</span>
            </button>
          ))}
        </section>

        <section className="ad-filters">
          <div className="ad-seg scroll">
            {tabs.map(([v, l]) => <button key={l} className={status === v ? "on" : ""} onClick={() => setStatus(v)}>{l}</button>)}
          </div>
          <div className="ad-row">
            <input className="ad-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, phone, name, street" />
            <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.en}</option>)}
            </select>
          </div>
        </section>

        <section className="ad-list" aria-busy={loading}>
          {!loading && !items.length && <div className="ad-empty">No complaints found.</div>}
          {items.map(c => (
            <button key={c.id} className="ad-card" onClick={() => setOpen(c.id)}>
              <span className={"ad-dot s" + c.status} aria-hidden="true" />
              <div className="ad-cbody">
                <div className="ad-ctop"><b>{c.id}</b><span className={"ad-pill s" + c.status}>{ST_EN[c.status]}</span></div>
                <p className="ad-clamp">{c.desc}</p>
                <div className="ad-cmeta"><span>{catName(c.cat)}</span><span>{c.name} · {c.phone}</span><span>{ago(c.createdAt)}</span></div>
              </div>
            </button>
          ))}
        </section>
      </main>

      {open && <Detail id={open} token={token} onClose={() => setOpen(null)} onChanged={() => load(false)} flash={flash} />}
      <div className={"ad-toast" + (toast ? " show" : "")} role="status">{toast}</div>
    </div>
  );
}

export default function Admin() {
  const [token, setTok] = useState(getToken);
  const out = useCallback(() => { setToken(""); setTok(""); }, []);
  useEffect(() => { document.title = "Admin | Ward 38 Kattur"; }, []);
  return token ? <Panel token={token} onLogout={out} /> : <Login onOk={setTok} />;
}

export { ST, CFG };
