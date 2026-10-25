import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { admin, api, getToken, setToken } from "./api.js";
import { subscribePush, pushSupported } from "./push.js";
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
  x: "M6 6l12 12M18 6 6 18", out: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9", dl: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14", re: "M20 11a8 8 0 1 0-2.3 5.700M20 5v6h-6", cam: "M3 7h4l2-2h6l2 2h4v12H3zM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", bell: "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21a2 2 0 0 0 4 0", share: "M12 4v11M8 8l4-4 4 4M5 14v6h14v-6", link: "M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"
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

/* ---------- before / after image ---------- */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function fileToJpeg(file, max = 1000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    let q = 0.82, out = c.toDataURL("image/jpeg", q);
    while (out.length > 560000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

function cover(ctx, img, x, y, w, h, r = 18) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}
function chip(ctx, text, x, y) {
  ctx.font = '700 26px "neythal","Noto Sans Tamil",Arial,sans-serif';
  const w = ctx.measureText(text).width + 36;
  ctx.fillStyle = "#f5c400"; ctx.beginPath(); ctx.roundRect(x, y, w, 46, 23); ctx.fill();
  ctx.fillStyle = "#3d060c"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 18, y + 24);
}

/** Joins the citizen's first photo (before) and the admin's photo (after) into one 1200x760 picture. */
async function composeBeforeAfter({ beforeUrl, afterData, id, at }) {
  try { await Promise.all([document.fonts.load('700 26px neythal'), document.fonts.load('400 24px tamil010')]); } catch { /* fall back to system fonts */ }
  const [after, before, flag] = await Promise.all([loadImg(afterData), beforeUrl ? loadImg(beforeUrl).catch(() => null) : null, loadImg("/flag.jpg").catch(() => null)]);
  const c = document.createElement("canvas"); c.width = 1200; c.height = 760;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#5c0a12"; ctx.fillRect(0, 0, 1200, 760);
  ctx.fillStyle = "#8a0f1b"; ctx.fillRect(0, 0, 1200, 92);
  ctx.fillStyle = "#f5c400"; ctx.fillRect(0, 92, 1200, 6);
  if (flag) cover(ctx, flag, 22, 18, 96, 56, 8);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f5c400"; ctx.font = '700 34px "neythal","Noto Sans Tamil",Arial,sans-serif'; ctx.fillText("தமிழக வெற்றிக் கழகம்", 134, 34);
  ctx.fillStyle = "#ffffffd9"; ctx.font = '400 24px "tamil010","Noto Sans Tamil",Arial,sans-serif'; ctx.fillText("வார்டு 38 · காட்டூர் · பார்த்திபன்", 134, 68);
  ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = '700 28px Arial,sans-serif'; ctx.fillText(id, 1178, 46); ctx.textAlign = "left";

  const y = 122, h = 560;
  if (before) {
    cover(ctx, before, 22, y, 568, h); cover(ctx, after, 610, y, 568, h);
    chip(ctx, "முன் · BEFORE", 40, y + h - 66); chip(ctx, "பின் · AFTER", 628, y + h - 66);
  } else {
    cover(ctx, after, 22, y, 1156, h); chip(ctx, "பின் · AFTER", 40, y + h - 66);
  }
  ctx.fillStyle = "#ffffffcc"; ctx.font = '400 24px "tamil010","Noto Sans Tamil",Arial,sans-serif';
  ctx.fillText("புகார் தீர்க்கப்பட்டது · " + new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), 24, 724);
  ctx.textAlign = "right"; ctx.fillText("tvkparthibankattur.vercel.app", 1178, 724);
  return c.toDataURL("image/jpeg", 0.84);
}

/* ---------- detail drawer ---------- */
function Detail({ id, token, onClose, onChanged, flash }) {
  const [c, setC] = useState(null);
  const [status, setStatus] = useState(0);
  const [note, setNote] = useState("");
  const [afterData, setAfterData] = useState("");
  const [composed, setComposed] = useState("");
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

  const pickAfter = async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    setBusy(true);
    try {
      const data = await fileToJpeg(f);
      setAfterData(data);
      setComposed(await composeBeforeAfter({ beforeUrl: c.photoCount ? admin.photoUrl(token, c.id, 0) : null, afterData: data, id: c.id, at: Date.now() }));
    } catch { flash("Could not read that photo"); }
    finally { setBusy(false); }
  };

  const save = async notify => {
    setBusy(true);
    try {
      const body = { status, note, notify };
      if (status === 2 && afterData && composed) { body.after = afterData; body.result = composed; }
      const r = await admin.patch(token, id, body);
      setC(p => ({ ...p, ...r })); setAfterData(""); setComposed(""); onChanged();
      flash(r.pushed ? "Saved. The citizen's phone was notified" : notify ? "Saved. Send the result from your WhatsApp below" : "Saved");
    } catch (e) { flash(e.status === 400 ? "Photo was rejected, try a smaller one" : "Save failed"); }
    finally { setBusy(false); }
  };

  const link = c?.resultPage;
  const waText = c && (c.lang === "en"
    ? `✅ Your complaint ${c.id} is resolved.\nBefore and after photos: ${link}`
    : `✅ உங்கள் புகார் ${c.id} தீர்க்கப்பட்டது.\nமுன் / பின் படங்கள்: ${link}`);
  const share = async () => {
    try {
      const blob = await (await fetch(c.resultUrl)).blob();
      const file = new File([blob], `${c.id}-before-after.jpg`, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: waText });
      else flash("Sharing files is not supported here. Use Download");
    } catch { /* cancelled */ }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(link); flash("Link copied"); } catch { flash(link); } };

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

            {c.photoCount > 0 && (
              <section>
                <h3>Citizen photos ({c.photoCount})</h3>
                <div className="ad-photos">
                  {Array.from({ length: c.photoCount }, (_, i) => (
                    <a key={i} href={admin.photoUrl(token, c.id, i)} target="_blank" rel="noopener"><img src={admin.photoUrl(token, c.id, i)} alt={`Photo ${i + 1}`} loading="lazy" /></a>
                  ))}
                </div>
                {c.consent && <p className="ad-meta">The citizen allowed showing the photo publicly (without a name).</p>}
              </section>
            )}

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

            <section>
              <h3>Status</h3>
              <div className="ad-seg">
                {ST_EN.map((l, i) => <button key={l} className={status === i ? "on s" + i : ""} onClick={() => setStatus(i)}>{l}</button>)}
              </div>
              <textarea rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="Note for the citizen (optional), e.g. Work scheduled for Monday" />

              {status === 2 && (
                <div className="ad-after">
                  <label className="ad-btn ad-file">
                    <Ico d={I.cam} />{c.hasResult || afterData ? "Change the after photo" : "Add the after photo"}
                    <input type="file" accept="image/*" capture="environment" hidden onChange={pickAfter} />
                  </label>
                  <p className="ad-meta">The after photo is joined with the citizen's first photo into one before/after picture.</p>
                  {composed && <img className="ad-preview" src={composed} alt="Before and after preview" />}
                </div>
              )}

              <p className="ad-meta">{c.canPush ? "This citizen allowed notifications, so Save & notify sends a push to their phone." : "This citizen has no notifications on. Use the WhatsApp button below after saving."}</p>
              <div className="ad-actions">
                <button className="ad-btn primary" disabled={busy} onClick={() => save(true)}>{busy ? "Working…" : "Save & notify"}</button>
                <button className="ad-btn" disabled={busy} onClick={() => save(false)}>Save only</button>
              </div>
            </section>

            {c.hasResult && (
              <section>
                <h3>Before / after result</h3>
                <img className="ad-preview" src={c.resultUrl} alt="Before and after" />
                <div className="ad-actions">
                  <a className="ad-btn wa" href={`https://wa.me/${intl(c.phone)}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener"><Ico d={I.chat} />Send on my WhatsApp</a>
                  {typeof navigator !== "undefined" && navigator.canShare && <button className="ad-btn" onClick={share}><Ico d={I.share} />Share photo</button>}
                  <a className="ad-btn" href={c.resultUrl} download={`${c.id}-before-after.jpg`}><Ico d={I.dl} />Download</a>
                  <button className="ad-btn" onClick={copy}><Ico d={I.link} />Copy link</button>
                </div>
                <p className="ad-meta">"Send on my WhatsApp" opens the citizen's chat with a link. WhatsApp shows the before/after picture as a preview card. "Share photo" sends the picture itself through any app.</p>
              </section>
            )}

            {c.notifications?.length > 0 && (
              <section>
                <h3>WhatsApp delivery log</h3>
                <ul className="ad-log">
                  {c.notifications.map((n, i) => (
                    <li key={i} className={n.ok ? "ok" : n.pending ? "wait" : "bad"}>
                      <b>{n.ok ? "Sent" : n.pending ? "Queued" : "Failed"}</b> · {n.audience} · {n.kind} · {when(n.at)}
                      {!n.ok && n.error && <em>{n.error}</em>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------- alerts on this device ---------- */
function AlertsButton({ token, flash }) {
  const [on, setOn] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted" && (() => { try { return localStorage.getItem("tvk38.adminAlerts") === "1"; } catch { return false; } })());
  if (!pushSupported()) return null;
  const enable = async () => {
    try {
      const { key } = await api.pushKey();
      if (!key) return flash("Push is not configured on the server yet");
      const sub = await subscribePush(key);
      if (!sub) return flash("Notifications were blocked in this browser");
      await admin.savePush(token, sub);
      try { localStorage.setItem("tvk38.adminAlerts", "1"); } catch { /* ignore */ }
      setOn(true); flash("New complaint alerts are on for this device");
    } catch { flash("Could not turn on alerts"); }
  };
  return <button className={"ad-icon" + (on ? " on" : "")} onClick={enable} aria-label="Alerts for new complaints" title="Alerts for new complaints"><Ico d={I.bell} /></button>;
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
          <AlertsButton token={token} flash={flash} />
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
