import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CFG, CATS } from "./config.js";
import { T } from "./i18n.js";
import { TVK_SITE } from "./i18n-tvk.js";
import { api } from "./api.js";
import { subscribePush, pushSupported } from "./push.js";
import Admin from "./Admin.jsx";

const wa = text => `https://wa.me/${CFG.phone}${text ? "?text=" + encodeURIComponent(text) : ""}`;

const Icon = ({ d, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className="ic" aria-hidden="true"><path d={d} /></svg>
);
const P = {
  home: "M4 11l8-7 8 7v9H4z", plus: "M12 5v14M5 12h14", search: "M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM20 20l-4.2-4.2",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  mic: "M9 3h6v12H9zM5 11a7 7 0 0 0 14 0M12 18v3", chat: "M4 20l1.4-4.2A8 8 0 1 1 8.3 18.7L4 20z",
  pin: "M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  cam: "M3 7h4l2-2h6l2 2h4v12H3zM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", tick: "M5 12.5l4.5 4.5L19 7.5",
  plus2: "M12 5v14M5 12h14", copy: "M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10", user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  scale: "M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z", heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z",
  dove: "M4 14c4 0 6-3 8-6 1 3 3 4 8 4-1 5-5 8-10 8-3 0-5-2-6-6z", hand: "M7 11V6a1.500 1.500 0 0 1 3 0v4m0-1V4.500a1.500 1.500 0 0 1 3 0V10m0-1.500a1.500 1.500 0 0 1 3 0V14c0 4-2 7-6 7-3 0-4.500-2-6-5l-1-2a1.500 1.500 0 0 1 2.500-1.500L7 14"
};

/* ---------- hooks ---------- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".rv");
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  });
}
function useCount(to, run) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf, t0;
    const step = t => { t0 ??= t; const p = Math.min(1, (t - t0) / 1100); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return n;
}
function useInView() {
  const ref = useRef(null); const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, v];
}

/* ---------- small parts ---------- */
const Flag = () => <img className="flagimg" src="/flag.jpg" alt="" aria-hidden="true" />;

function Head({ eyebrow, title, sub, dark }) {
  return (
    <div className={"sec-head rv" + (dark ? " on-dark" : "")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {sub && <p className="sub">{sub}</p>}
    </div>
  );
}

function Stat({ to, label, run }) {
  const n = useCount(to, run);
  return <div className="stat"><b>{n}</b><span>{label}</span></div>;
}

/* ---------- app ---------- */
function Portal() {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem("tvk38.lang") || "ta"; } catch { return "ta"; } });
  const t = T[lang];
  const [srv, setSrv] = useState({ total: 0, open: 0, done: 0 });
  const [statKey, setStatKey] = useState(0);
  const [solid, setSolid] = useState(false);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState("");
  const [done, setDone] = useState(null);
  const [statRef, statIn] = useInView();
  const micTrigger = useRef(0);
  const [micReq, setMicReq] = useState(0);

  useReveal();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === "ta" ? "மக்கள் குறைகள் மையம் | வார்டு 38 காட்டூர்" : "People's Grievance Centre | Ward 38 Kattur";
    try { localStorage.setItem("tvk38.lang", lang); } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const map = { home: "home", leader: "leader", kural: "leader", tvk: "leader", journey: "leader", join: "leader", complaint: "complaint", track: "track", how: "contact", contact: "contact" };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setTab(map[e.target.id]); }), { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const say = useCallback(m => { setToast(m); clearTimeout(say.h); say.h = setTimeout(() => setToast(""), 2800); }, []);

  useEffect(() => { api.stats().then(setSrv).catch(() => {}); }, [statKey]);

  return (
    <>
      <Ticker t={t} />
      <TopBar t={t} lang={lang} setLang={setLang} solid={solid} />
      <main>
        <Hero t={t} onVoice={() => { setMicReq(n => n + 1); }} />
        <Quick t={t} onVoice={() => setMicReq(n => n + 1)} />
        <section className="stats" ref={statRef} aria-label="Statistics">
          <div className="wrap stats-in">
            <Stat to={38} label={t.sWard} run={statIn} />
            <Stat to={srv.total} label={t.sTotal} run={statIn} />
            <Stat to={srv.open} label={t.sOpen} run={statIn} />
            <Stat to={srv.done} label={t.sDone} run={statIn} />
          </div>
        </section>
        <Leader t={t} lang={lang} />
        <Complaint t={t} lang={lang} say={say} onDone={c => { setDone(c); setStatKey(k => k + 1); }} micReq={micReq} micTrigger={micTrigger} />
        <Kural lang={lang} t={t} />
        <Tvk t={t} />
        <Journey t={t} />
        <Join t={t} />
        <Track t={t} lang={lang} />
        <How t={t} />
        <WorkDone t={t} lang={lang} />
        <Updates t={t} />
        <Faq t={t} />
        <Contact t={t} />
      </main>
      <Footer t={t} lang={lang} />
      <TabBar t={t} tab={tab} />
      <div className={"toast" + (toast ? " show" : "")} role="status">{toast}</div>
      {done && <Sheet t={t} c={done} onClose={() => { setDone(null); location.hash = "#track"; }} />}
    </>
  );
}

/* ---------- chrome ---------- */
function Ticker({ t }) {
  return <div className="ticker"><div className="wrap"><span className="dot" />{t.ticker}<a href={`tel:+${CFG.phone}`}>{CFG.phoneShow}</a></div></div>;
}

function TopBar({ t, lang, setLang, solid }) {
  return (
    <header className={"top" + (solid ? " solid" : "")}>
      <div className="wrap top-in">
        <a className="brand" href="#home"><img className="brand-flag" src="/flag.jpg" alt="TVK" /><span className="brand-text"><b>{t.brand}</b><small>{t.brandSub}</small></span></a>
        <nav className="desk-nav" aria-label="Primary">
          <a href="#home">{t.navHome}</a><a href="#leader">{t.navLeader}</a><a href="#tvk">{t.navTvk}</a>
          <a href="#complaint">{t.navComplaint}</a><a href="#track">{t.navTrack}</a><a href="#contact">{t.navContact}</a>
        </nav>
        <div className="lang" role="group" aria-label="Language">
          <button className={lang === "ta" ? "on" : ""} onClick={() => setLang("ta")}>த</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
        </div>
        <a className="top-cta" href="#complaint">{t.ctaRaise}</a>
      </div>
    </header>
  );
}

function TabBar({ t, tab }) {
  const items = [["home", "#home", P.home, t.navHome], ["leader", "#leader", P.user, t.navLeader], ["complaint", "#complaint", P.plus, t.navComplaint], ["track", "#track", P.search, t.navTrack], ["contact", "#contact", P.phone, t.navContact]];
  return (
    <nav className="tabbar" aria-label="App navigation">
      {items.map(([id, href, d, label]) => (
        <a key={id} href={href} className={(tab === id ? "on " : "") + (id === "complaint" ? "fab" : "")}><Icon d={d} /><span>{label}</span></a>
      ))}
    </nav>
  );
}

function Footer({ t, lang }) {
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap foot-top">
        <div className="foot-photo"><img src="/portrait.jpg" alt={CFG.leaderName[lang]} loading="lazy" /></div>
        <div className="foot-cta">
          <p className="eyebrow">{t.fEyebrow}</p>
          <h2>{t.fTitle}</h2>
          <p className="foot-text">{t.fText}</p>
          <a className="btn primary" href="#complaint">{t.ctaRaise}<Icon d="M7 17 17 7M8 7h9v9" size={18} /></a>
          <div className="foot-icons">
            <a href={wa()} target="_blank" rel="noopener" aria-label="WhatsApp"><WaGlyph size={22} /></a>
            <a href={`tel:+${CFG.phone}`} aria-label={t.qCall}><Icon d={P.phone} size={22} /></a>
            <a href="https://x.com/TVKVijayHQ" target="_blank" rel="noopener" aria-label="X: TVK Vijay"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg></a>
            <a href="https://x.com/TVKPartyHQ" target="_blank" rel="noopener" aria-label="X: TVK Party HQ"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg></a>
          </div>
        </div>
      </div>

      <div className="wrap foot-mid">
        <p className="foot-brand">{t.fBrand}</p>
        <div className="foot-cols">
          <div>
            <h4>{t.fCol1}</h4>
            <a href="#home">{t.navHome}</a><a href="#leader">{t.navLeader}</a><a href="#tvk">{t.navTvk}</a><a href="#updates">{t.uTitle}</a>
          </div>
          <div>
            <h4>{t.fCol2}</h4>
            <a href="#complaint">{t.navComplaint}</a><a href="#track">{t.navTrack}</a><a href="#how">{t.navHow}</a><a href="#contact">{t.navContact}</a>
          </div>
          <div>
            <h4>{t.fCol3}</h4>
            <a href={wa()} target="_blank" rel="noopener">WhatsApp</a>
            <a href={`tel:+${CFG.phone}`}>{CFG.phoneShow}</a>
            <span>{t.kNote}</span>
          </div>
        </div>
      </div>

      <div className="wrap foot-bot">
        <p>© {year} {t.footer}. {t.fRights}</p>
        <a href={TVK_SITE} target="_blank" rel="noopener">tvkvijay.com</a>
      </div>
    </footer>
  );
}

/* ---------- hero ---------- */
function Hero({ t }) {
  return (
    <section className="hero" id="home">
      <video className="hero-video hero-bg" autoPlay muted loop playsInline preload="auto" aria-hidden="true"><source src="/hero.mp4" type="video/mp4" /></video>
      <video className="hero-video hero-main" autoPlay muted loop playsInline preload="auto"><source src="/hero.mp4" type="video/mp4" /></video>
      <div className="hero-shade" />
      <div className="wrap hero-copy">
        <p className="eyebrow gold">{t.heroEyebrow}</p>
        <h1>{t.heroTitle[0]}<br />{t.heroTitle[1]}</h1>
        <p className="lead">{t.heroLead}</p>
        <div className="hero-cta">
          <a className="btn primary" href="#complaint">{t.ctaRaise}</a>
          <a className="btn ghost" href="#track">{t.ctaTrack}</a>
        </div>
        <p className="rep"><span>{t.repLabel}</span><b>{CFG.leaderName[t === T.ta ? "ta" : "en"]}</b></p>
      </div>
    </section>
  );
}

function Quick({ t, onVoice }) {
  return (
    <section className="quick"><div className="wrap quick-in">
      <a className="tile" href="#complaint"><Icon d={P.plus} /><div><b>{t.qComplaint}</b><small>{t.qComplaintSub}</small></div></a>
      <a className="tile" href="#complaint" onClick={onVoice}><Icon d={P.mic} /><div><b>{t.qVoice}</b><small>{t.qVoiceSub}</small></div></a>
      <a className="tile" href={wa()} target="_blank" rel="noopener"><Icon d={P.chat} /><div><b>WhatsApp</b><small>{t.qWaSub}</small></div></a>
      <a className="tile" href={`tel:+${CFG.phone}`}><Icon d={P.phone} /><div><b>{t.qCall}</b><small>{t.qCallSub}</small></div></a>
    </div></section>
  );
}

/* ---------- leader ---------- */
function Leader({ t, lang }) {
  return (
    <section className="sec leader" id="leader"><div className="wrap leader-in">
      <div className="portrait rv">
        <div className="portrait-frame"><img src="/portrait.jpg" alt={CFG.leaderName[lang]} loading="lazy" /></div>
        <div className="portrait-tag"><Flag /><span>{t.lOrg}</span></div>
      </div>
      <div className="leader-copy rv">
        <p className="eyebrow">{t.lEyebrow}</p>
        <h2>{CFG.leaderName[lang]}</h2>
        <p className="roles"><span className="role">{t.lRole}</span><span className="role alt">{t.lRole2}</span></p>
        <p className="body">{t.lText}</p>
        <ul className="ticks">{[t.lP1, t.lP2, t.lP3].map(x => <li key={x}><Icon d={P.tick} size={18} />{x}</li>)}</ul>
        <a className="btn dark" href={wa()} target="_blank" rel="noopener"><Icon d={P.chat} size={18} />{t.lCta}</a>
      </div>
    </div></section>
  );
}

/* ---------- kural ---------- */
function Kural({ lang, t }) {
  return (
    <section className="kural" id="kural"><div className="wrap rv">
      <span className="q">“</span>
      <blockquote><p>{CFG.kural.ta[0]}</p><p>{CFG.kural.ta[1]}</p></blockquote>
      <cite>{t.kuralTag}</cite>
      {lang === "en" && <p className="kural-en">{CFG.kural.en}</p>}
    </div></section>
  );
}

/* ---------- tvk ---------- */
function Tvk({ t }) {
  return (
    <section className="sec dark tvk" id="tvk"><div className="wrap">
      <Head eyebrow={t.tvkEyebrow} title={t.tvkTitle} sub={t.tvkLead} dark />

      <figure className="tvk-banner rv">
        <img src="/tvk/flag-leader.webp" alt="TVK flag" loading="lazy" />
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

      <div className="icons rv">
        <p>{t.iconsTitle}</p>
        <ul>{t.ic.map(n => <li key={n}>{n}</li>)}</ul>
      </div>
    </div></section>
  );
}

function Journey({ t }) {
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

function Join({ t }) {
  return (
    <section className="sec dark join" id="join"><div className="wrap join-in">
      <div className="join-poster rv">
        <img src="/tvk/poster.jpg" alt="TVK" loading="lazy" />
        <img className="join-chip c1" src="/tvk/scarf.jpg" alt="" loading="lazy" />
        <img className="join-chip c2" src="/tvk/whistle.jpg" alt="" loading="lazy" />
      </div>
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

/* ---------- complaint wizard ---------- */
function Complaint({ t, lang, say, onDone, micReq }) {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState(null);
  const [desc, setDesc] = useState("");
  const [street, setStreet] = useState("");
  const [coords, setCoords] = useState(null);
  const [gpsMsg, setGpsMsg] = useState("");
  const [photos, setPhotos] = useState([]);
  const [consent, setConsent] = useState(false);
  const [notify, setNotify] = useState(true);
  const [pushKey, setPushKey] = useState(null);
  useEffect(() => { if (pushSupported()) api.pushKey().then(r => setPushKey(r.key)).catch(() => {}); }, []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [down, setDown] = useState(null);
  const recRef = useRef(null);
  const baseRef = useRef("");
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopMic = () => { try { recRef.current?.stop(); } catch { /* ignore */ } setLive(false); };
  const toggleMic = useCallback(() => {
    if (!SR) return say(t.micNo);
    if (live) return stopMic();
    const r = new SR(); recRef.current = r;
    r.continuous = true; r.interimResults = true; r.lang = lang === "ta" ? "ta-IN" : "en-IN";
    baseRef.current = desc;
    r.onresult = e => { let s = ""; for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; setDesc((baseRef.current + " " + s).trim()); };
    r.onerror = e => { if (e.error === "not-allowed") say(t.micDeny); setLive(false); };
    r.onend = () => setLive(false);
    try { r.start(); setLive(true); } catch { setLive(false); }
  }, [SR, live, desc, lang, t, say]);

  // "Voice" tile elsewhere: jump to the details step and start the mic
  const lastReq = useRef(0);
  useEffect(() => {
    if (micReq && micReq !== lastReq.current) { lastReq.current = micReq; setStep(1); setTimeout(toggleMic, 700); }
  }, [micReq]); // eslint-disable-line react-hooks/exhaustive-deps

  const gps = () => {
    if (!navigator.geolocation) return setGpsMsg(t.gpsFail);
    setGpsMsg(t.gpsWait);
    navigator.geolocation.getCurrentPosition(p => {
      const c = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
      setCoords(c); setGpsMsg(`${t.gpsOk}: ${c.lat}, ${c.lng}`);
    }, () => setGpsMsg(t.gpsFail), { enableHighAccuracy: true, timeout: 10000 });
  };

  // Each photo is shrunk in the browser (max 900px wide, JPEG) so five of them still upload fast on mobile data.
  const shrink = file => new Promise(resolve => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 900 / img.width), c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      let q = 0.7, out = c.toDataURL("image/jpeg", q);
      while (out.length > 380000 && q > 0.35) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      URL.revokeObjectURL(url); resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
  const onPhotos = async e => {
    const files = [...e.target.files].slice(0, 4 - photos.length);
    e.target.value = "";
    const added = (await Promise.all(files.map(shrink))).filter(Boolean);
    if (added.length) setPhotos(p => [...p, ...added].slice(0, 4));
  };

  const check = s => {
    if (s >= 0 && !cat) return t.eCat;
    if (s >= 1 && !desc.trim()) return t.eDesc;
    if (s >= 3 && !name.trim()) return t.eName;
    if (s >= 3 && !/^[6-9]\d{9}$/.test(phone)) return t.ePhone;
    return "";
  };
  const go = n => {
    if (n > step) { const m = check(step); if (m) { setErr(m); say(m); return; } }
    setErr(""); if (live) stopMic(); setStep(n);
  };
  const pick = id => { setCat(id); setErr(""); setTimeout(() => setStep(1), 220); };

  const waText = c => {
    const tt = T[lang], cl = CATS.find(x => x.id === c.cat)[lang];
    let s = `*${tt.waHead} ${c.id}*\n${tt.waCat}: ${cl}\n${tt.waDesc}: ${c.desc}\n`;
    if (c.street) s += `${tt.waPlace}: ${c.street}\n`;
    if (c.coords) s += `${tt.waMap}: https://maps.google.com/?q=${c.coords.lat},${c.coords.lng}\n`;
    return s + `${tt.waName}: ${c.name}\n${tt.waPhone}: ${c.phone}`;
  };
  const reset = () => { setStep(0); setCat(null); setDesc(""); setStreet(""); setCoords(null); setGpsMsg(""); setPhotos([]); setConsent(false); setName(""); setPhone(""); setErr(""); };

  const submit = async () => {
    const m = check(3); if (m) { setErr(m); say(m); return; }
    if (busy) return;
    setBusy(true); setDown(null);
    // ask for notification permission first, while the tap is still fresh
    const push = notify && pushKey ? await subscribePush(pushKey) : null;
    const body = { cat, desc: desc.trim(), street: street.trim(), coords, photos, consent, push, name: name.trim(), phone, lang };
    try {
      const r = await api.create(body);
      onDone({ id: r.id, pushSaved: r.pushSaved, link: wa(waText({ id: r.id, ...body })) }); reset();
    } catch (e) {
      if (e.status === 429) { setErr(t.eLimit); say(t.eLimit); }
      else if (e.status && e.status < 500) { setErr(t.eServer); }
      else setDown(wa(waText({ id: "-", ...body })));
    } finally { setBusy(false); }
  };

  const catLabel = cat ? CATS.find(c => c.id === cat)[lang] : "";

  return (
    <section className="sec complaint" id="complaint"><div className="wrap cx">
      <aside className="cx-side rv">
        <p className="eyebrow">{t.cEyebrow}</p>
        <h2>{t.cTitle}</h2>
        <p className="sub">{t.cSub}</p>
        <ul className="cx-points">
          {[[P.mic, t.cB1], [P.tick, t.cB2], [P.search, t.cB3]].map(([d, x]) => <li key={x}><span><Icon d={d} size={18} /></span>{x}</li>)}
        </ul>
        <div className="cx-alt">
          <p>{t.cOr}</p>
          <a className="btn wa" href={wa()} target="_blank" rel="noopener"><Icon d={P.chat} size={18} />WhatsApp</a>
          <a className="btn ghost" href={`tel:+${CFG.phone}`}><Icon d={P.phone} size={18} />{t.qCall}</a>
        </div>
      </aside>

      <div className="cx-card rv">
        <div className="cx-bar" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}><i style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
        <div className="cx-meta">
          {step > 0 ? <button type="button" className="cx-back" onClick={() => go(step - 1)} aria-label={t.back}><Icon d="M15 5l-7 7 7 7" size={20} /></button> : <span className="cx-back ph" />}
          <div><small>{step + 1} / 4</small><b>{t.stepLabels[step]}</b></div>
          {catLabel && step > 0 && <span className="cx-pill">{catLabel}</span>}
        </div>

        <div className="cx-pane" key={step}>
          {step === 0 && (<>
            <h3>{t.fCat}</h3>
            <div className="cx-cats">
              {CATS.map(c => (
                <button key={c.id} type="button" className={"cx-cat" + (cat === c.id ? " on" : "")} onClick={() => pick(c.id)}>
                  <span className="cx-ico"><Icon d={c.d} size={24} /></span><b>{c[lang]}</b>
                </button>
              ))}
            </div>
          </>)}

          {step === 1 && (<>
            <h3>{t.fDesc}</h3>
            <button type="button" className={"mic-big" + (live ? " live" : "")} onClick={toggleMic}>
              <span className="mic-orb"><Icon d={P.mic} size={28} /><i className="ring" /><i className="ring r2" /></span>
              <span className="mic-txt"><b>{live ? t.speaking : t.speak}</b><small>{t.micHint}</small></span>
            </button>
            <div className="cx-or"><span>{t.orType}</span></div>
            <textarea rows={4} maxLength={600} value={desc} placeholder={t.fDescPh} onChange={e => setDesc(e.target.value)} />
            <div className="cx-photos">
              {photos.map((p, k) => (
                <div className="cx-thumb" key={k}>
                  <img src={p} alt="" />
                  <button type="button" onClick={() => setPhotos(list => list.filter((_, n) => n !== k))} aria-label={t.remove}><Icon d="M6 6l12 12M18 6 6 18" size={14} /></button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="cx-add">
                  <Icon d={P.cam} size={24} />
                  <b>{photos.length ? t.addMore : t.fPhoto}</b>
                  <small>{photos.length}/4</small>
                  <input type="file" accept="image/*" multiple hidden onChange={onPhotos} />
                </label>
              )}
            </div>
            <p className="hint">{t.photoHelp2}</p>
          </>)}

          {step === 2 && (<>
            <h3>{t.fPlace}</h3>
            <button type="button" className={"cx-opt" + (coords ? " ok" : "")} onClick={gps}>
              <span className="cx-ico"><Icon d={coords ? P.tick : P.pin} size={22} /></span>
              <span><b>{t.fGps}</b><small>{gpsMsg || t.gpsHelp}</small></span>
            </button>
            <div className="cx-or"><span>{t.orType}</span></div>
            <input type="text" value={street} placeholder={t.fStreetPh} onChange={e => setStreet(e.target.value)} autoComplete="street-address" />
          </>)}

          {step === 3 && (<>
            <h3>{t.fWho}</h3>
            <input type="text" value={name} placeholder={t.fNamePh} onChange={e => setName(e.target.value)} autoComplete="name" />
            <input type="tel" inputMode="numeric" maxLength={10} value={phone} placeholder={t.fPhonePh} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} autoComplete="tel-national" />
            {pushKey && <label className="cx-check"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /><span><b>{t.notifyMe}</b><small>{t.notifyHelp}</small></span></label>}
            {photos.length > 0 && <label className="cx-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span><b>{t.consent}</b><small>{t.consentHelp}</small></span></label>}
            <dl className="cx-sum">
              <div><dt>{T[lang].waCat}</dt><dd>{catLabel || "-"}</dd></div>
              <div><dt>{T[lang].waDesc}</dt><dd>{desc || "-"}</dd></div>
              {(street || coords) && <div><dt>{T[lang].waPlace}</dt><dd>{street || `${coords.lat}, ${coords.lng}`}</dd></div>}
              {photos.length > 0 && <div><dt>{t.fPhoto}</dt><dd>{photos.length}</dd></div>}
            </dl>
          </>)}
          {err && <p className="err" role="alert">{err}</p>}
        </div>

        <div className="cx-actions">
          {step === 1 && <button type="button" className="btn dark wide" onClick={() => go(2)}>{t.next}</button>}
          {step === 2 && <button type="button" className="btn dark wide" onClick={() => go(3)}>{t.next}</button>}
          {step === 3 && (<>
            <button type="button" className="btn dark wide" disabled={busy} onClick={submit}>{busy ? t.sending : t.fSubmit}</button>
            {down && <div className="cx-down"><p>{t.serverDown}</p><a className="btn wa wide" href={down} target="_blank" rel="noopener"><Icon d={P.chat} size={18} />{t.fSubmitWa}</a></div>}
          </>)}
        </div>
      </div>
    </div></section>
  );
}

/* ---------- one complaint in the tracker ---------- */
const dayMs = 86400000;
function TrackCard({ c, t, lang }) {
  const loc = lang === "ta" ? "ta-IN" : "en-IN";
  const date = ms => ms ? new Date(ms).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }) : "";
  const time = ms => ms ? new Date(ms).toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" }) : "";
  const stepAt = [c.createdAt, c.progressAt || (c.status >= 1 ? c.updatedAt : null), c.resolvedAt || (c.status === 2 ? c.updatedAt : null)];
  const done = c.status === 2;
  const days = Math.max(0, Math.round(((done ? stepAt[2] : Date.now()) - c.createdAt) / dayMs));
  const took = done ? (days === 0 ? t.tSameDay : `${days} ${t.tDays}`) : `${days} ${t.tDays}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(c.id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  return (
    <article className={"t-card" + (done ? " is-done" : "")}>
      <div className="t-top">
        <button type="button" className="t-id" onClick={copy} title={t.copy}>{c.id}<Icon d={copied ? P.tick : P.copy} size={14} /></button>
        <span className={"badge s" + c.status}>{t.st[c.status]}</span>
      </div>
      <p className="t-desc"><strong>{CATS.find(x => x.id === c.cat)?.[lang]}</strong> · {c.snippet}</p>
      {c.street && <p className="t-loc"><Icon d={P.pin} size={14} />{c.street}</p>}

      <ol className="t-steps">
        {[0, 1, 2].map(i => (
          <li key={i} className={(i <= c.status ? "on" : "") + (i === c.status ? " now" : "")}>
            <span className="t-dot">{i <= c.status ? <Icon d={P.tick} size={13} /> : i + 1}</span>
            <div><b>{t.st[i]}</b><small>{stepAt[i] && i <= c.status ? `${date(stepAt[i])}, ${time(stepAt[i])}` : t.tWaiting}</small></div>
          </li>
        ))}
      </ol>

      <dl className="t-facts">
        <div><dt>{t.tRaised}</dt><dd>{date(c.createdAt)}</dd></div>
        <div><dt>{t.tDone}</dt><dd>{done ? date(stepAt[2]) : t.tPending}</dd></div>
        <div><dt>{done ? t.tTaken : t.tOpenFor}</dt><dd>{took}</dd></div>
      </dl>

      {c.note && <p className="t-note"><b>{t.tNote}</b>{c.note}</p>}
      {c.result && (
        <a className="t-result" href={c.result} target="_blank" rel="noopener">
          <img src={c.result} alt={t.beforeAfter} loading="lazy" /><span>{t.beforeAfter}</span>
        </a>
      )}
      <div className="t-contact">
        <a href={`tel:+${CFG.phone}`}><Icon d={P.phone} size={16} />{t.qCall}</a>
        <a href={wa(`${c.id}`)} target="_blank" rel="noopener"><Icon d={P.chat} size={16} />WhatsApp</a>
      </div>
    </article>
  );
}

/* ---------- track ---------- */
function Track({ t, lang }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const search = async e => {
    e.preventDefault(); const s = q.trim(); if (!s || busy) return;
    setBusy(true); setFail(false);
    try { setRes((await api.track(s)).items); } catch { setFail(true); setRes(null); } finally { setBusy(false); }
  };
  return (
    <section className="sec dark" id="track"><div className="wrap narrow">
      <Head eyebrow={t.tEyebrow} title={t.tTitle} dark />
      <form className="track-form rv" onSubmit={search}>
        <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder={t.tPh} enterKeyHint="search" />
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "…" : t.tBtn}</button>
      </form>
      <div className="track-out">
        {fail && <p className="empty">{t.tFail}</p>}
        {!fail && res === null && <p className="empty">{t.tHint}</p>}
        {res && !res.length && <p className="empty">{t.tNone}</p>}
        {res && res.map(c => (
          <TrackCard key={c.id} c={c} t={t} lang={lang} />
        ))}
      </div>
    </div></section>
  );
}

/* ---------- how / moments / faq / contact ---------- */
function How({ t }) {
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

function WaGlyph({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M12 2a9.900 9.900 0 0 0-8.500 14.900L2 22l5.300-1.400A9.900 9.900 0 1 0 12 2zm0 1.800a8.100 8.100 0 1 1-4.200 15l-.3-.2-3 .8.8-2.900-.2-.3A8.100 8.100 0 0 1 12 3.800zM8.600 7.600c-.2 0-.5 0-.7.300-.3.300-1 1-1 2.400s1 2.800 1.200 3c.1.200 2 3.200 5 4.400 2.500 1 3 .8 3.500.7.600-.1 1.800-.7 2-1.400.3-.7.300-1.300.2-1.400-.1-.1-.3-.2-.7-.4l-1.900-.9c-.3-.1-.5-.1-.7.100l-.9 1.100c-.2.200-.3.200-.7.100-.3-.2-1.300-.5-2.400-1.500-.9-.8-1.500-1.800-1.700-2.100-.2-.3 0-.5.100-.6l.5-.6.300-.5c.1-.2 0-.4 0-.5l-.9-2.100c-.2-.5-.4-.4-.6-.4z" />
    </svg>
  );
}

function Updates({ t }) {
  const [all, setAll] = useState(false);
  const share = (title, text) => wa(`*${title}*\n${text}\n\n${CFG.phoneShow}`);
  const items = all ? t.updates : t.updates.slice(0, 5);
  return (
    <section className="sec updates" id="updates"><div className="wrap">
      <div className="up-head rv">
        <p className="eyebrow">{t.uEyebrow}</p>
        <h2>{t.uTitle}</h2>
        <p className="sub">{t.uSub}</p>
      </div>

      <div className="wa-channel rv">
        <div className="wa-head">
          <span className="wa-av"><Flag /></span>
          <div><b>{t.uChannel}</b><small>{t.uChannelSub}</small></div>
          <a className="wa-join" href={wa()} target="_blank" rel="noopener" aria-label={t.uJoin}><WaGlyph size={18} /><span>{t.uJoinShort}</span></a>
        </div>
        <div className="wa-feed">
          {(
            <article className="wa-card wa-photo">
              <img src="/event.jpg" alt="" loading="lazy" />
              <div className="wa-photo-cap"><span className="wa-tag">{t.uTag}</span><p>{t.uPhotoCap}</p></div>
            </article>
          )}
          {items.map(([tag, title, body, src]) => (
            <article className="wa-card live" key={title}>
              <header className="wa-top">
                <span className="wa-status live">{t.uLaunched}</span>
                <span className="wa-tag">{tag}</span>
              </header>
              <h3>{title}</h3>
              <p>{body}</p>
              <div className="wa-row">
                <a href={src} target="_blank" rel="noopener">{t.uSrc}</a>
                <a className="wa-share" href={share(title, body)} target="_blank" rel="noopener"><WaGlyph size={16} />{t.uShare}</a>
              </div>
            </article>
          ))}
        </div>
      </div>
      {t.updates.length > 5 && <button type="button" className="wa-more" onClick={() => setAll(v => !v)}>{all ? t.uLess : t.uMore}</button>}
      <p className="up-note">{t.uNote}</p>
    </div></section>
  );
}

function WorkDone({ t, lang }) {
  const [items, setItems] = useState([]);
  useEffect(() => { api.work().then(r => setItems(r.items || [])).catch(() => {}); }, []);
  if (!items.length) return null;
  return (
    <section className="sec workdone" id="work"><div className="wrap">
      <Head eyebrow={t.wEyebrow} title={t.wTitle} sub={t.wSub} />
      <div className="work-grid">
        {items.map((w, i) => (
          <a key={i} className="work-card rv" href={w.image} target="_blank" rel="noopener">
            <img src={w.image} alt={t.beforeAfter} loading="lazy" />
            <span>{CATS.find(x => x.id === w.cat)?.[lang]} · {new Date(w.at).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short" })}</span>
          </a>
        ))}
      </div>
    </div></section>
  );
}

function Faq({ t }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="sec faq"><div className="wrap narrow">
      <Head eyebrow={t.faqEyebrow} title={t.faqTitle} />
      <div className="acc rv">
        {t.faq.map(([q, a], i) => (
          <div key={q} className={"acc-i" + (open === i ? " open" : "")}>
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{q}<Icon d={P.plus2} size={18} /></button>
            <div className="acc-b"><p>{a}</p></div>
          </div>
        ))}
      </div>
    </div></section>
  );
}

function Contact({ t }) {
  return (
    <section className="sec contact" id="contact"><div className="wrap narrow">
      <Head eyebrow={t.kEyebrow} title={t.kTitle} />
      <div className="contact-grid rv">
        <a className="c-card" href={wa()} target="_blank" rel="noopener"><Icon d={P.chat} size={26} /><span>{t.kWa}</span><b>{CFG.phoneShow}</b></a>
        <a className="c-card" href={`tel:+${CFG.phone}`}><Icon d={P.phone} size={26} /><span>{t.kCall}</span><b>{CFG.phoneShow}</b></a>
      </div>
      <p className="note">{t.kNote}</p>
    </div></section>
  );
}

function Sheet({ t, c, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const k = e => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [onClose]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.id); }
    catch { const ta = document.createElement("textarea"); ta.value = c.id; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch { /* ignore */ } ta.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="okT" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-card">
        <button type="button" className="sheet-x" onClick={onClose} aria-label={t.okClose}><Icon d="M6 6l12 12M18 6 6 18" size={18} /></button>
        <div className="tick"><Icon d={P.tick} size={30} /></div>
        <h3 id="okT">{t.okTitle}</h3>
        <div className="idbox">
          <b>{c.id}</b>
          <button type="button" className={"copy" + (copied ? " ok" : "")} onClick={copy} aria-label={t.copy}><Icon d={copied ? P.tick : P.copy} size={20} /><span>{copied ? t.copied : t.copy}</span></button>
        </div>
        <p>{c.pushSaved ? t.okPush : t.okText}</p>
        <a className="btn wa wide" href={c.link} target="_blank" rel="noopener"><Icon d={P.chat} size={18} />{t.okWa}</a>
        <button type="button" className="btn ghost-d wide" onClick={onClose}>{t.okClose}</button>
      </div>
    </div>
  );
}

/* ---------- route: portal or admin ---------- */
export default function App() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => { const h = () => setHash(location.hash); window.addEventListener("hashchange", h); return () => window.removeEventListener("hashchange", h); }, []);
  return hash.startsWith("#/admin") ? <Admin /> : <Portal />;
}
