import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { admin, api, getToken, setToken } from "../lib/api.js";
import { subscribePush, pushSupported } from "../lib/push.js";
import { CATS, CFG } from "../lib/config.js";
import { Icon as SiteIcon } from "../components/ui.jsx";
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

/** Two short tones. Browsers allow sound after the admin has tapped anything on the page (the login tap counts). */
function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = new AC(), now = ctx.currentTime;
    [[880, 0], [1175, 0.18], [880, 0.4]].forEach(([f, t0]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now + t0); g.gain.exponentialRampToValueAtTime(0.35, now + t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + 0.28);
      o.start(now + t0); o.stop(now + t0 + 0.3);
    });
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch { /* sound is a bonus */ }
}

const Ico = ({ d, s = 20 }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const I = {
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  chat: "M4 20l1.4-4.2A8 8 0 1 1 8.3 18.7L4 20z",
  pin: "M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  x: "M6 6l12 12M18 6 6 18", out: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9", dl: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14", re: "M20 11a8 8 0 1 0-2.3 5.700M20 5v6h-6", cam: "M3 7h4l2-2h6l2 2h4v12H3zM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", bell: "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21a2 2 0 0 0 4 0", mic: "M9 3h6v12H9zM5 11a7 7 0 0 0 14 0M12 18v3", share: "M12 4v11M8 8l4-4 4 4M5 14v6h14v-6", link: "M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"
};

/* ---------- login ---------- */
function Login({ onOk }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false), [caps, setCaps] = useState(false), [shake, setShake] = useState(0);
  const go = async e => {
    e.preventDefault(); if (busy || !pw) return; setBusy(true); setErr("");
    try { const r = await admin.login(pw); setToken(r.token); onOk(r.token); }
    catch (x) { setErr(x.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : x.status === 401 ? "That password is not correct. Please try again." : "Cannot reach the server. Check your internet connection."); setShake(n => n + 1); }
    finally { setBusy(false); }
  };
  return (
    <div className="ad-login">
      <aside className="ad-login-art" aria-hidden="true">
        <img src="/tvk/admin-login.webp" alt="" />
        <div className="ad-login-over">
          <img className="ad-login-logo" src="/flag.jpg" alt="" />
          <h2>Ward 38 · Kattur</h2>
          <p>Listen to every complaint. Follow it up until it is solved.</p>
        </div>
      </aside>
      <main className="ad-login-side">
        <form className={"ad-login-card" + (shake ? " shake" : "")} key={shake} onSubmit={go}>
          <img src="/flag.jpg" alt="" className="ad-flag" />
          <h1>Welcome back</h1>
          <p>Sign in to manage the ward complaints.</p>
          <label className="ad-field">
            <span>Password</span>
            <div className="ad-pw">
              <span className="ad-pw-lock"><SiteIcon n="lock" size={18} /></span>
              <input type={show ? "text" : "password"} autoFocus value={pw} onChange={e => { setPw(e.target.value); if (err) setErr(""); }}
                onKeyUp={e => setCaps(!!e.getModifierState?.("CapsLock"))} onBlur={() => setCaps(false)}
                placeholder="Enter your password" autoComplete="current-password" aria-invalid={!!err} />
              <button type="button" className="ad-eye" onClick={() => setShow(v => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} data-tip={show ? "Hide password" : "Show password"}>
                <SiteIcon n={show ? "eyeoff" : "eye"} size={19} />
              </button>
            </div>
          </label>
          {caps && <div className="ad-hint" role="status">Caps Lock is on</div>}
          {err && <div className="ad-err" role="alert">{err}</div>}
          <button className="ad-btn primary ad-signin" disabled={!pw || busy}>{busy ? <><i className="ad-spin" />Signing in…</> : "Sign in"}</button>
          <a href="#home" className="ad-link">← Back to website</a>
          <small className="ad-foot"><SiteIcon n="lock" size={13} /> Ward office staff only</small>
        </form>
      </main>
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

const dateText = ms => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Joins the citizen's photos (BEFORE, red band) and the admin's photos (AFTER, green band) into one tall picture,
 * with the ward branding and the raised / completed dates. Up to 3 photos in each row.
 */
async function composeBeforeAfter({ beforeUrls, afterData, id, raisedAt, doneAt }) {
  try { await Promise.all([document.fonts.load('700 26px neythal'), document.fonts.load('400 24px tamil010')]); } catch { /* fall back to system fonts */ }
  const afters = await Promise.all(afterData.slice(0, 3).map(loadImg));
  const befores = (await Promise.all(beforeUrls.slice(0, 3).map(u => loadImg(u).catch(() => null)))).filter(Boolean);
  const flag = await loadImg("/flag.jpg").catch(() => null);

  const W = 1200, HEAD = 96, BAND = 62, FOOT = 112, GAP = 6;
  const rowH = n => (n <= 1 ? 620 : 600);
  const hB = befores.length ? BAND + rowH(befores.length) : 0, hA = BAND + rowH(afters.length);
  const H = HEAD + hB + hA + FOOT;

  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.textBaseline = "middle";
  const head = '"neythal","Noto Sans Tamil",Arial,sans-serif', body = '"tamil010","Noto Sans Tamil",Arial,sans-serif';

  // header
  ctx.fillStyle = "#8a0f1b"; ctx.fillRect(0, 0, W, HEAD);
  ctx.fillStyle = "#f5c400"; ctx.fillRect(0, HEAD - 6, W, 6);
  if (flag) { ctx.save(); ctx.beginPath(); ctx.roundRect(24, 16, 102, 60, 8); ctx.clip(); ctx.drawImage(flag, 24, 16, 102, 60); ctx.restore(); }
  ctx.fillStyle = "#f5c400"; ctx.font = `700 34px ${head}`; ctx.fillText("தமிழக வெற்றிக் கழகம்", 142, 32);
  ctx.fillStyle = "#ffffffe6"; ctx.font = `400 24px ${body}`; ctx.fillText("வார்டு 38 · காட்டூர் · பார்த்திபன்", 142, 64);
  ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "700 28px Arial,sans-serif"; ctx.fillText(id, W - 24, 40); ctx.textAlign = "left";

  const band = (y, color, text) => {
    ctx.fillStyle = color; ctx.fillRect(0, y, W, BAND);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = `700 34px ${head}`; ctx.fillText(text, W / 2, y + BAND / 2 + 1); ctx.textAlign = "left";
  };
  const row = (y, imgs) => {
    const h = rowH(imgs.length), w = (W - GAP * (imgs.length - 1)) / imgs.length;
    imgs.forEach((img, k) => {
      const x = k * (w + GAP);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      ctx.restore();
    });
  };

  let y = HEAD;
  if (befores.length) { band(y, "#b3201f", "முன் · BEFORE"); row(y + BAND, befores); y += hB; }
  band(y, "#1f7a3a", "பின் · AFTER"); row(y + BAND, afters); y += hA;

  // footer with the dates
  ctx.fillStyle = "#5c0a12"; ctx.fillRect(0, y, W, FOOT);
  const days = Math.max(0, Math.round((doneAt - raisedAt) / 86400000));
  ctx.fillStyle = "#f5c400"; ctx.font = `700 28px ${head}`;
  ctx.fillText(`புகார் பதிவு: ${dateText(raisedAt)}`, 24, y + 36);
  ctx.fillStyle = "#fff"; ctx.fillText(`தீர்வு: ${dateText(doneAt)}${days === 0 ? " · அதே நாளில்" : ` · ${days} நாட்களில்`}`, 24, y + 76);
  ctx.textAlign = "right"; ctx.fillStyle = "#ffffffb3"; ctx.font = `400 22px ${body}`; ctx.fillText("tvkparthibankattur.vercel.app", W - 24, y + 76); ctx.textAlign = "left";

  let q = 0.84, out = c.toDataURL("image/jpeg", q);
  while (out.length > 1000000 && q > 0.45) { q -= 0.08; out = c.toDataURL("image/jpeg", q); }
  return out;
}

/* ---------- detail drawer ---------- */
function Detail({ id, token, onClose, onChanged, flash, dock }) {
  const [c, setC] = useState(null);
  const [status, setStatus] = useState(0);
  const [note, setNote] = useState("");
  const [afters, setAfters] = useState([]);
  const [composed, setComposed] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setC(null); setAfters([]); setComposed("");
    if (!id) return undefined;
    admin.one(token, id).then(r => { if (live) { setC(r); setStatus(r.status); setNote(r.note || ""); } }).catch(() => flash("Could not load complaint"));
    return () => { live = false; };
  }, [id, token, flash]);

  useEffect(() => {
    if (dock) return undefined;
    const k = e => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [onClose, dock]);

  const pickAfter = async e => {
    const files = [...e.target.files].slice(0, 3); e.target.value = ""; if (!files.length) return;
    setBusy(true);
    try {
      const data = await Promise.all(files.map(f => fileToJpeg(f, 900)));
      const all = [...afters, ...data].slice(0, 3);
      await rebuild(all); setStatus(2);
    } catch { flash("Could not read those photos"); }
    finally { setBusy(false); }
  };
  const rebuild = async list => {
    setAfters(list);
    if (!list.length) { setComposed(""); return; }
    const beforeUrls = Array.from({ length: Math.min(c.photoCount || 0, 3) }, (_, k) => admin.photoUrl(token, c.id, k));
    setComposed(await composeBeforeAfter({ beforeUrls, afterData: list, id: c.id, raisedAt: c.createdAt, doneAt: Date.now() }));
  };
  const dropAfter = async k => { setBusy(true); try { await rebuild(afters.filter((_, n) => n !== k)); } finally { setBusy(false); } };

  const save = async () => {
    if (status === 2 && !c.hasResult && !afters.length && c.status !== 2) { /* resolving without an after photo is allowed */ }
    setBusy(true);
    try {
      const body = { status, note, notify: true };
      if (status === 2 && afters.length && composed) { body.after = afters[0]; body.result = composed; }
      const r = await admin.patch(token, id, body);
      setC(p => ({ ...p, ...r })); setAfters([]); setComposed(""); onChanged();
      flash(r.pushed ? "Saved. The citizen's phone was notified" : "Saved");
    } catch (e) { flash(e.status === 400 ? "Photo was rejected, try a smaller one" : "Save failed"); }
    finally { setBusy(false); }
  };

  const publish = async on => {
    try { const r = await admin.patch(token, id, { publish: on, notify: false }); setC(p => ({ ...p, consent: r.consent })); flash(on ? "Shown on the website" : "Hidden from the website"); onChanged(); }
    catch { flash("Could not change this"); }
  };

  const link = c?.resultPage;
  const waLink = kind => {
    if (!c) return "#";
    const ta = c.lang !== "en", cat = (CATS.find(x => x.id === c.cat) || {})[ta ? "ta" : "en"] || c.cat, who = CFG.leaderName[ta ? "ta" : "en"];
    const line = "━━━━━━━━━━";
    const text = {
      received: ta
        ? `✅ புகார் பதிவாகிவிட்டது!\n${line}\n🪪 புகார் எண்: ${c.id}\n📋 வகை: ${cat}\n📝 தலைப்பு: ${c.desc}\n${line}\n🏛 தமிழக வெற்றிக் கழகம்\nவார்டு 38 · காட்டூர் பகுதி\n👤 ${who}\n📞 ${CFG.phoneShow}\n🕐 24X7 எப்போதும்\n${line}\n24 மணி நேரத்தில் தொடர்பு கொள்வோம்.`
        : `✅ Your complaint is registered!\n${line}\n🪪 ID: ${c.id}\n📋 Category: ${cat}\n📝 Details: ${c.desc}\n${line}\n🏛 Tamilaga Vettri Kazhagam\nWard 38 · Kattur\n👤 ${who}\n📞 ${CFG.phoneShow}\n🕐 24X7\n${line}\nWe will contact you within 24 hours.`,
      progress: ta
        ? `🛠 உங்கள் புகார் ${c.id} மீது நடவடிக்கை எடுக்கப்பட்டு வருகிறது.${c.note ? "\n" + c.note : ""}`
        : `🛠 Work has started on your complaint ${c.id}.${c.note ? "\n" + c.note : ""}`,
      resolved: c.hasResult && link
        ? (ta ? `✅ உங்கள் புகார் ${c.id} தீர்க்கப்பட்டது.\nமுன் / பின் படங்கள்: ${link}` : `✅ Your complaint ${c.id} is resolved.\nBefore and after photos: ${link}`)
        : (ta ? `✅ உங்கள் புகார் ${c.id} தீர்க்கப்பட்டது. நன்றி.` : `✅ Your complaint ${c.id} is resolved. Thank you.`)
    }[kind];
    return `https://wa.me/${intl(c.phone)}?text=${encodeURIComponent(text)}`;
  };
  const share = async () => {
    try {
      const blob = await (await fetch(c.resultUrl)).blob();
      const file = new File([blob], `${c.id}-before-after.jpg`, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: link });
      else flash("Sharing files is not supported here. Use Download");
    } catch { /* cancelled */ }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(link); flash("Link copied"); } catch { flash(link); } };

  const cat = c ? CATS.find(x => x.id === c.cat) : null;
  const steps = c ? [
    [ST_EN[0], c.createdAt],
    [ST_EN[1], c.progressAt || (c.status >= 1 ? c.updatedAt : null)],
    [ST_EN[2], c.resolvedAt || (c.status === 2 ? c.updatedAt : null)]
  ] : [];

  const body = !id ? (
    <div className="ad-emptyside">
      <span className="ad-emptyico"><SiteIcon n="search" size={26} /></span>
      <h3>Select a complaint</h3>
      <p>Click any complaint in the list to see the citizen, photos, voice message and update its status here.</p>
    </div>
  ) : !c ? <p className="ad-pad">Loading…</p> : (
    <div className="ad-db">
      <section className="ad-sum">
        <div className="ad-sum-top">
          <span className="ad-catico"><SiteIcon n={cat?.icon || "other"} size={22} /></span>
          <div><small>{cat ? `${cat.ta} · ${cat.en}` : c.cat}</small><b>{c.id}</b></div>
          <span className={"ad-pill s" + c.status}>{ST_EN[c.status]}</span>
        </div>
        <p className="ad-desc">{c.desc}</p>
        <dl className="ad-facts">
          <div><dt>Raised</dt><dd>{when(c.createdAt)}</dd></div>
          <div><dt>Open for</dt><dd>{ago(c.createdAt).replace(" ago", "")}</dd></div>
          <div className="wide"><dt>Location</dt><dd>{c.street || "Not given"}{c.lat != null && <a className="ad-maplink" href={`https://maps.google.com/?q=${c.lat},${c.lng}`} target="_blank" rel="noopener">Open map</a>}</dd></div>
        </dl>
      </section>

      <section className="ad-person">
        <span className="ad-avatar">{(c.name || "?").trim().charAt(0).toUpperCase()}</span>
        <div className="ad-who"><b>{c.name}</b><span>{c.phone}</span></div>
        <div className="ad-round">
          <a href={`tel:+${intl(c.phone)}`} aria-label="Call" data-tip="Call"><Ico d={I.phone} /></a>
          <a className="wa" href={`https://wa.me/${intl(c.phone)}`} target="_blank" rel="noopener" aria-label="WhatsApp" data-tip="WhatsApp"><Ico d={I.chat} /></a>
        </div>
      </section>

      {c.hasVoice && (
        <section className="ad-voice">
          <span className="ad-vico"><Ico d={I.mic} /></span>
          <div>
            <b>Voice message <small>{c.voiceSecs}s</small></b>
            <audio controls preload="none" src={admin.voiceUrl(token, c.id)} />
          </div>
        </section>
      )}

      <section className="ad-compare">
        <div className="ad-col">
          <h4>Before <small>citizen</small></h4>
          {c.photoCount > 0 ? (
            <div className="ad-thumbs">
              {Array.from({ length: c.photoCount }, (_, i) => (
                <a key={i} href={admin.photoUrl(token, c.id, i)} target="_blank" rel="noopener"><img src={admin.photoUrl(token, c.id, i)} alt={`Photo ${i + 1}`} loading="lazy" /></a>
              ))}
            </div>
          ) : <p className="ad-none">No photos added</p>}
        </div>
        <div className="ad-col after">
          <h4>After <small>you</small></h4>
          <div className="ad-thumbs">
            {afters.map((p, k) => (
              <div className="ad-thumb" key={k}><img src={p} alt={`After ${k + 1}`} /><button type="button" onClick={() => dropAfter(k)} aria-label="Remove"><Ico d={I.x} s={12} /></button></div>
            ))}
            {afters.length < 3 && (
              <label className="ad-addtile">
                <Ico d={I.cam} s={22} />
                <span>{afters.length || c.hasResult ? "Add more" : "Add photos"}</span>
                <input type="file" accept="image/*" multiple hidden onChange={pickAfter} />
              </label>
            )}
          </div>
          {c.hasResult && !afters.length && <p className="ad-none">After photos saved. Add new ones to replace.</p>}
        </div>
      </section>

      <section className="ad-panel">
        <h3>Update status</h3>
        <div className="ad-seg">
          {ST_EN.map((l, i) => <button key={l} className={status === i ? "on s" + i : ""} onClick={() => setStatus(i)}>{l}</button>)}
        </div>
        <input className="ad-line" type="text" maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="Note for the citizen (optional)" />
        {composed && <img className="ad-preview" src={composed} alt="Before and after preview" />}
        <button className="ad-btn primary ad-save" disabled={busy} onClick={save}>{busy ? "Working…" : "Save changes"}</button>
        {c.canPush && <p className="ad-meta">The citizen will get a phone alert when the status changes.</p>}
      </section>

      <section className="ad-time">
        <h3>Progress</h3>
        <ol>
          {steps.map(([l, at], k) => (
            <li key={l} className={(k <= c.status ? "on" : "") + (k === c.status ? " now" : "")}>
              <span className="ad-tdot">{k <= c.status ? <Ico d="M5 12.5l4.5 4.5L19 7.5" s={12} /> : k + 1}</span>
              <div><b>{l}</b><small>{at && k <= c.status ? when(at) : "Waiting"}</small></div>
            </li>
          ))}
        </ol>
      </section>

      {c.hasResult && (
        <section className="ad-result">
          <h3>Result photo</h3>
          <img src={c.resultUrl} alt="Before and after" />
          <div className="ad-round">
            <a className="wa" href={waLink("resolved")} target="_blank" rel="noopener" aria-label="Send on WhatsApp" data-tip="Send on WhatsApp"><Ico d={I.chat} /></a>
            {typeof navigator !== "undefined" && navigator.canShare && <button onClick={share} aria-label="Share photo" data-tip="Share photo"><Ico d={I.share} /></button>}
            <a href={c.resultUrl} download={`${c.id}-before-after.jpg`} aria-label="Download" data-tip="Download"><Ico d={I.dl} /></a>
            <button onClick={copy} aria-label="Copy link" data-tip="Copy link"><Ico d={I.link} /></button>
          </div>
          <label className="ad-switch">
            <input type="checkbox" checked={c.consent} onChange={e => publish(e.target.checked)} />
            <span><b>Show on the website</b><small>{c.consent ? "Visible on the Work done page" : "Hidden from the public"}</small></span>
          </label>
        </section>
      )}

      <details className="ad-more">
        <summary>Send a WhatsApp message</summary>
        <div className="ad-chips">
          <a href={waLink("received")} target="_blank" rel="noopener">Received</a>
          <a href={waLink("progress")} target="_blank" rel="noopener">In progress</a>
          <a href={waLink("resolved")} target="_blank" rel="noopener">Resolved</a>
        </div>
      </details>

      {c.notifications?.length > 0 && (
        <details className="ad-more">
          <summary>WhatsApp delivery log</summary>
          <ul className="ad-log">
            {c.notifications.map((n, i) => (
              <li key={i} className={n.ok ? "ok" : n.pending ? "wait" : "bad"}>
                <b>{n.ok ? "Sent" : n.pending ? "Queued" : "Failed"}</b> · {n.audience} · {n.kind} · {when(n.at)}
                {!n.ok && n.error && <em>{n.error}</em>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );

  if (dock) return <aside className="ad-dock" aria-label="Complaint details">{id && <header className="ad-dockhead"><span>Complaint details</span></header>}{body}</aside>;
  return (
    <div className="ad-drawer-wrap" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="ad-drawer" role="dialog" aria-modal="true" aria-label="Complaint details">
        <header className="ad-dh">
          <div><small>{cat ? catName(cat.id) : ""}</small><h2>{id}</h2></div>
          {c && <span className={"ad-pill s" + c.status}>{ST_EN[c.status]}</span>}
          <button className="ad-icon" onClick={onClose} aria-label="Close"><Ico d={I.x} /></button>
        </header>
        {body}
      </aside>
    </div>
  );
}

/* ---------- header icon button with a tooltip ---------- */
function IB({ tip, children, className = "", ...rest }) {
  const Tag = rest.href ? "a" : "button";
  return <Tag className={"ad-ib " + className} data-tip={tip} aria-label={tip} {...rest}>{children}</Tag>;
}

/* ---------- bell: new complaints and phone alerts ---------- */
const seenKey = "tvk38.adminSeenAt";
const readSeen = () => { try { return +localStorage.getItem(seenKey) || 0; } catch { return 0; } };

function Notifs({ token, fresh, onOpenComplaint, flash }) {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(readSeen);
  const [alertsOn, setAlertsOn] = useState(() => { try { return typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem("tvk38.adminAlerts") === "1"; } catch { return false; } });
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const supported = pushSupported();

  const unseen = fresh.filter(c => c.createdAt > seenAt).length;

  useEffect(() => {
    if (!open) return;
    const away = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = () => {
    setOpen(o => !o);
    if (!open) { const t = Date.now(); setSeenAt(t); try { localStorage.setItem(seenKey, String(t)); } catch { /* ignore */ } }
  };

  const enable = async () => {
    setBusy(true);
    try {
      const { key } = await api.pushKey();
      if (!key) { flash("Phone alerts are not set up on the server yet"); return; }
      const sub = await subscribePush(key);
      if (!sub) { flash("Notifications are blocked in this browser. Allow them in the site settings"); return; }
      await admin.savePush(token, sub);
      try { localStorage.setItem("tvk38.adminAlerts", "1"); } catch { /* ignore */ }
      setAlertsOn(true); flash("Phone alerts are on for this device");
    } catch { flash("Could not turn on alerts"); }
    finally { setBusy(false); }
  };

  return (
    <div className="ad-notif" ref={box}>
      <IB tip="Notifications" onClick={toggle} aria-expanded={open} className={open ? "open" : ""}>
        <Ico d={I.bell} />
        {unseen > 0 && <span className="ad-badge">{unseen > 9 ? "9+" : unseen}</span>}
      </IB>
      {open && (
        <div className="ad-pop" role="dialog" aria-label="Notifications">
          <header><b>Notifications</b><span>{fresh.length} new</span></header>
          <ul>
            {!fresh.length && <li className="ad-popempty">You are all caught up. New complaints appear here.</li>}
            {fresh.slice(0, 6).map(c => {
              const k = CATS.find(x => x.id === c.cat);
              return (
                <li key={c.id}>
                  <button onClick={() => { onOpenComplaint(c.id); setOpen(false); }}>
                    <span className="ad-catico sm"><SiteIcon n={k?.icon || "other"} size={16} /></span>
                    <span className="ad-pbody"><b>{c.id} <em>{k?.en}</em></b><small>{c.desc}</small></span>
                    <span className="ad-ptime">{ago(c.createdAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <footer>
            <div><b>Phone alerts</b><small>{!supported ? "This browser does not support push alerts." : alertsOn ? "On for this device. You get an alert for every new complaint." : "Get an alert on this device for every new complaint."}</small></div>
            {supported && (alertsOn ? <span className="ad-on">On</span> : <button className="ad-btn primary sm" onClick={enable} disabled={busy}>{busy ? "…" : "Turn on"}</button>)}
          </footer>
        </div>
      )}
    </div>
  );
}

const useMedia = q => {
  const [m, setM] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q), f = () => setM(mq.matches); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]);
  return m;
};

/* ---------- main ---------- */
function Panel({ token, onLogout }) {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [fresh, setFresh] = useState([]);
  const [status, setStatus] = useState("");
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [spin, setSpin] = useState(false);
  const seen = useRef(null);
  const tm = useRef(0);
  const dock = useMedia("(min-width: 1100px)");

  const flash = useCallback(m => { setToast(m); clearTimeout(tm.current); tm.current = setTimeout(() => setToast(""), 2800); }, []);

  const load = useCallback(async (quiet) => {
    try {
      const [s, l, f] = await Promise.all([admin.stats(token), admin.list(token, { status, cat, q: search }), admin.list(token, { status: "0" })]);
      setStats(s); setItems(l.items); setFresh(f.items);
      if (seen.current !== null && s.total > seen.current && quiet) { flash(`${s.total - seen.current} new complaint${s.total - seen.current > 1 ? "s" : ""}`); chime(); }
      seen.current = s.total;
    } catch (e) { if (e.status === 401) onLogout(); else flash("Connection problem"); }
    finally { setLoading(false); }
  }, [token, status, cat, search, flash, onLogout]);

  useEffect(() => { const h = setTimeout(() => load(false), search ? 250 : 0); return () => clearTimeout(h); }, [load, search]);
  useEffect(() => { const h = setInterval(() => load(true), 15000); return () => clearInterval(h); }, [load]);

  // on a wide screen the side panel is always showing a complaint
  useEffect(() => { if (dock && !open && items.length) setOpen(items[0].id); }, [dock, open, items]);

  const refresh = async () => { setSpin(true); setLoading(true); await load(false); setTimeout(() => setSpin(false), 400); flash("Updated"); };

  const cards = useMemo(() => stats ? [
    ["New", stats.received, "s0", "0", "Waiting for action"], ["In progress", stats.progress, "s1", "1", "Being worked on"], ["Resolved", stats.resolved, "s2", "2", "Completed"], ["Last 7 days", stats.week, "s3", null, "Complaints received"]
  ] : [], [stats]);

  const tabs = [["", "All", stats?.total], ["0", "New", stats?.received], ["1", "In progress", stats?.progress], ["2", "Resolved", stats?.resolved]];

  return (
    <div className={"ad" + (dock ? " has-dock" : "")}>
      <header className="ad-top">
        <div className="ad-brand"><img src="/flag.jpg" alt="" /><div><b>Complaints admin</b><small>Ward 38 · Kattur</small></div></div>
        <div className="ad-topsearch">
          <Ico d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM20 20l-4.2-4.2" s={18} />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, phone, name or street" aria-label="Search complaints" />
        </div>
        <div className="ad-top-r">
          <Notifs token={token} fresh={fresh} onOpenComplaint={setOpen} flash={flash} />
          <IB tip="Refresh" onClick={refresh} className={spin ? "spin" : ""}><Ico d={I.re} /></IB>
          <IB tip="Export CSV" href={admin.csvUrl(token)}><Ico d={I.dl} /></IB>
          <IB tip="Open website" href="#home" target="_blank" rel="noopener"><Ico d={I.link} /></IB>
          <IB tip="Sign out" className="out" onClick={() => { if (window.confirm("Sign out of the admin panel?")) onLogout(); }}><Ico d={I.out} /></IB>
        </div>
      </header>

      <main className="ad-main">
        {stats && stats.notify.provider === "console" && (
          <div className="ad-banner">WhatsApp is in demo mode. Messages are only printed in the server terminal. Set NOTIFY_PROVIDER=mcp to send real messages.</div>
        )}
        {stats && stats.pending > 0 && (
          <div className="ad-banner">{stats.pending} WhatsApp message{stats.pending > 1 ? "s are" : " is"} waiting to be sent. Make sure the WhatsApp worker (npm run worker) is running and the phone is linked.</div>
        )}

        <div className="ad-pagehead"><h1>Complaints</h1><p>Tap a complaint to see the details and update it.</p></div>

        <section className="ad-stats">
          {cards.map(([l, n, k, f, sub]) => (
            <button key={l} className={"ad-stat " + k + (f !== null && status === f ? " on" : "")} onClick={() => f !== null && setStatus(status === f ? "" : f)} disabled={f === null}>
              <span className="ad-statdot" aria-hidden="true" />
              <b>{n}</b><span>{l}</span><small>{sub}</small>
            </button>
          ))}
        </section>

        <section className="ad-filters">
          <div className="ad-seg scroll">
            {tabs.map(([v, l, n]) => <button key={l} className={status === v ? "on" : ""} onClick={() => setStatus(v)}>{l}{n != null && <i>{n}</i>}</button>)}
          </div>
          <div className="ad-row">
            <input className="ad-search ad-mobsearch" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, phone, name, street" />
            <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.en}</option>)}
            </select>
          </div>
        </section>

        <section className="ad-list" aria-busy={loading}>
          {!loading && !items.length && <div className="ad-empty">No complaints found.</div>}
          {items.map(c => {
            const k = CATS.find(x => x.id === c.cat);
            return (
              <button key={c.id} className={"ad-card" + (open === c.id ? " on" : "") + " s" + c.status} onClick={() => setOpen(c.id)}>
                <span className="ad-catico"><SiteIcon n={k?.icon || "other"} size={20} /></span>
                <div className="ad-cbody">
                  <div className="ad-ctop"><b>{c.id}</b><span className="ad-ctime">{ago(c.createdAt)}</span></div>
                  <p className="ad-clamp">{c.desc}</p>
                  <div className="ad-cmeta">
                    <span>{k?.en}</span><span>{c.name}</span>
                    {c.hasVoice && <span className="ad-vtag"><Ico d={I.mic} s={13} />{c.voiceSecs}s</span>}
                    {c.photoCount > 0 && <span className="ad-vtag ph"><Ico d={I.cam} s={13} />{c.photoCount}</span>}
                  </div>
                </div>
                <span className={"ad-pill s" + c.status}>{ST_EN[c.status]}</span>
              </button>
            );
          })}
        </section>
      </main>

      {dock
        ? <div className="ad-side"><Detail key="dock" id={open} token={token} onClose={() => setOpen(null)} onChanged={() => load(false)} flash={flash} dock /></div>
        : open && <Detail id={open} token={token} onClose={() => setOpen(null)} onChanged={() => load(false)} flash={flash} />}
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
