import { useEffect, useRef, useState, useCallback } from "react";
import { T } from "./i18n/index.js";
import { api } from "./lib/api.js";
import { Stat } from "./components/ui.jsx";
import { useReveal, useInView } from "./hooks/index.js";
import { Ticker, TopBar } from "./components/layout/Header.jsx";
import { TabBar } from "./components/layout/TabBar.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import { Sheet } from "./components/Sheet.jsx";
import { Hero, Quick } from "./sections/Hero.jsx";
import { Leader } from "./sections/Leader.jsx";
import { Team } from "./sections/Team.jsx";
import { Kural } from "./sections/Kural.jsx";
import { Tvk, Journey, Join } from "./sections/Tvk.jsx";
import { Complaint } from "./sections/Complaint.jsx";
import { Track } from "./sections/Track.jsx";
import { How } from "./sections/How.jsx";
import { Updates } from "./sections/Updates.jsx";
import { WorkDone, WorkPage } from "./sections/Work.jsx";
import { Faq } from "./sections/Faq.jsx";
import { Contact } from "./sections/Contact.jsx";
import Admin from "./admin/Admin.jsx";

function Portal({ view }) {
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

  // coming back from the work page to a section of the home page: scroll to it once it has rendered
  useEffect(() => {
    if (view === "home" && location.hash.length > 1 && !location.hash.startsWith("#/")) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView(), 60);
    }
  }, [view]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === "ta" ? "மக்கள் சேவை மையம் | வார்டு 38 காட்டூர்" : "Makkal Sevai Mayyam | Ward 38 Kattur";
    try { localStorage.setItem("tvk38.lang", lang); } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const map = { home: "home", leader: "leader", team: "leader", kural: "leader", tvk: "leader", journey: "leader", join: "leader", complaint: "complaint", track: "track", how: "contact", contact: "contact" };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setTab(map[e.target.id]); }), { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const say = useCallback(m => { setToast(m); clearTimeout(say.h); say.h = setTimeout(() => setToast(""), 2800); }, []);

  useEffect(() => { api.stats().then(setSrv).catch(() => {}); }, [statKey]);

  return (
    <>
      <Ticker t={t} />
      <TopBar t={t} lang={lang} setLang={setLang} solid={solid || view === "work"} />
      {view === "work" ? <WorkPage t={t} lang={lang} /> : <main>
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
                <Complaint t={t} lang={lang} say={say} onDone={c => { setDone(c); setStatKey(k => k + 1); }} micReq={micReq} micTrigger={micTrigger} />
        <Team t={t} />
        <Leader t={t} lang={lang} />
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
      </main>}
      <Footer t={t} lang={lang} />
      <TabBar t={t} tab={tab} />
      <div className={"toast" + (toast ? " show" : "")} role="status">{toast}</div>
      {done && <Sheet t={t} c={done} onClose={() => { setDone(null); location.hash = "#track"; }} />}
    </>
  );
}

/* ---------- route: portal or admin ---------- */
export default function App() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => { const h = () => setHash(location.hash); window.addEventListener("hashchange", h); return () => window.removeEventListener("hashchange", h); }, []);
  return hash.startsWith("#/admin") ? <Admin /> : <Portal view={hash.startsWith("#/work") ? "work" : "home"} />;
}
