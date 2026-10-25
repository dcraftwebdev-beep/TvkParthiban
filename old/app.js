(() => {
  // ---- Config: change these for the ward office ----
  const CFG = {
    phone: "917902030402",
    phoneShow: "+91 79020 30402",
    prefix: "TVK36",
    storeKey: "tvk36.complaints"
  };

  const I = {
    road: '<path d="M8 3 4 21M16 3l4 18M12 4v3m0 4v3m0 4v2"/>',
    water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    drain: '<path d="M3 8h18M3 12h18M3 16h18M7 8v8M12 8v8M17 8v8"/>',
    light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    power: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    other: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>'
  };
  const CATS = [
    { id: "road", i: I.road, ta: "சாலை", en: "Road" },
    { id: "water", i: I.water, ta: "குடிநீர்", en: "Water" },
    { id: "drain", i: I.drain, ta: "கழிவுநீர்", en: "Drainage" },
    { id: "light", i: I.light, ta: "தெருவிளக்கு", en: "Streetlight" },
    { id: "trash", i: I.trash, ta: "குப்பை", en: "Garbage" },
    { id: "power", i: I.power, ta: "மின்சாரம்", en: "Electricity" },
    { id: "other", i: I.other, ta: "பிற", en: "Other" }
  ];

  const T = {
    ta: {
      brand: "மக்கள் குறைகள் மையம்", brandSub: "வார்டு 36 · திருவெறும்பூர்",
      navHome: "முகப்பு", navComplaint: "புகார்", navTrack: "நிலை", navHow: "செயல்முறை", navContact: "தொடர்பு",
      heroEyebrow: "திருச்சிராப்பள்ளி மாநகராட்சி · வார்டு 36",
      heroTitle: "உங்கள் குறை,<br>எங்கள் பொறுப்பு.",
      heroLead: "சாலை, குடிநீர், கழிவுநீர், தெருவிளக்கு என எந்த பிரச்சனையாக இருந்தாலும் பேசியோ, எழுதியோ பதிவு செய்யுங்கள்.",
      ctaRaise: "புகார் பதிவு செய்", ctaTrack: "நிலை அறிய", repLabel: "வார்டு பிரதிநிதி",
      qRaise: "புகார்", qRaiseSub: "பதிவு செய்", qVoice: "குரல்", qVoiceSub: "பேசி பதிவு",
      qWaSub: "நேரடியாக", qCall: "அழை", qCallSub: "கைபேசி",
      sTotal: "பதிவான புகார்கள்", sOpen: "நடவடிக்கையில்", sDone: "தீர்க்கப்பட்டவை",
      cEyebrow: "புகார் பதிவு", cTitle: "என்ன பிரச்சனை?",
      fCat: "வகையைத் தேர்ந்தெடுக்கவும்", fDesc: "பிரச்சனையைக் கூறுங்கள்",
      fDescPh: "இங்கே எழுதுங்கள் அல்லது மைக்கை அழுத்தி பேசுங்கள்",
      micHint: "மைக்கை அழுத்தி தமிழில் அல்லது ஆங்கிலத்தில் பேசலாம்.",
      micListen: "கேட்கிறேன்... பேசுங்கள்", micNo: "இந்த உலாவியில் குரல் வசதி இல்லை. Chrome பயன்படுத்தவும்.",
      micDeny: "மைக் அனுமதி தேவை.",
      fPlace: "இடம் மற்றும் படம்", fStreetPh: "தெரு / பகுதி பெயர்", fGps: "என் இருப்பிடம்", fPhoto: "புகைப்படம்",
      gpsWait: "இருப்பிடம் பெறுகிறது...", gpsOk: "இருப்பிடம் சேர்க்கப்பட்டது", gpsFail: "இருப்பிடம் கிடைக்கவில்லை",
      fWho: "உங்கள் விவரம்", fNamePh: "பெயர்", fPhonePh: "கைபேசி எண்",
      fSubmit: "புகாரைச் சமர்ப்பி", fSubmitWa: "WhatsApp மூலம் அனுப்பு",
      eCat: "வகையைத் தேர்ந்தெடுக்கவும்.", eDesc: "பிரச்சனையை விவரிக்கவும்.", eName: "பெயரை உள்ளிடவும்.", ePhone: "சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்.",
      tEyebrow: "புகார் நிலை", tTitle: "உங்கள் புகார் எங்கே?", tPh: "புகார் எண் அல்லது கைபேசி எண்", tBtn: "தேடு",
      tNone: "எந்த புகாரும் கிடைக்கவில்லை. எண்ணைச் சரிபார்க்கவும்.", tHint: "இந்த சாதனத்தில் பதிவு செய்த புகார்கள் இங்கே தெரியும்.",
      st0: "பெறப்பட்டது", st1: "நடவடிக்கையில்", st2: "தீர்க்கப்பட்டது",
      hEyebrow: "எப்படி செயல்படுகிறது", hTitle: "நான்கு எளிய படிகள்",
      h1t: "பதிவு", h1p: "குரல், எழுத்து அல்லது புகைப்படத்துடன் புகாரைப் பதிவு செய்யுங்கள்.",
      h2t: "புகார் எண்", h2p: "உடனே தனி புகார் எண் கிடைக்கும்.",
      h3t: "நடவடிக்கை", h3p: "அலுவலகக் குழு சம்பந்தப்பட்ட துறைக்கு அனுப்பி பின்தொடரும்.",
      h4t: "தீர்வு", h4p: "தீர்வு கிடைத்ததும் உங்களுக்குத் தெரிவிக்கப்படும்.",
      kEyebrow: "தொடர்பு", kTitle: "நேரடியாகத் தொடர்பு கொள்ளுங்கள்",
      kWa: "WhatsApp வாயிலாகப் புகார்", kCall: "கைபேசி வாயிலாகப் புகார்",
      kNote: "வார்டு 36 · திருச்சிராப்பள்ளி மாநகராட்சி · திருவெறும்பூர் சட்டமன்றத் தொகுதி",
      footer: "தமிழக வெற்றிக் கழகம் · வார்டு 36 மக்கள் குறைகள் மையம்",
      okTitle: "புகார் பதிவானது", okText: "இந்த எண்ணைக் குறித்து வைத்துக் கொள்ளுங்கள். நிலை அறிய இதைப் பயன்படுத்தலாம்.",
      okWa: "WhatsApp இல் உறுதிப்படுத்து", okClose: "மூடு",
      waHead: "புகார்", waCat: "வகை", waDesc: "விவரம்", waPlace: "இடம்", waName: "பெயர்", waPhone: "கைபேசி", waMap: "வரைபடம்"
    },
    en: {
      brand: "People's Grievance Centre", brandSub: "Ward 36 · Thiruverumbur",
      navHome: "Home", navComplaint: "Complaint", navTrack: "Track", navHow: "How it works", navContact: "Contact",
      heroEyebrow: "Tiruchirappalli Corporation · Ward 36",
      heroTitle: "Your problem,<br>our responsibility.",
      heroLead: "Roads, water, drainage, streetlights, whatever it is, report it by voice or text in under a minute.",
      ctaRaise: "Raise a complaint", ctaTrack: "Track status", repLabel: "Ward representative",
      qRaise: "Complaint", qRaiseSub: "Register", qVoice: "Voice", qVoiceSub: "Speak it",
      qWaSub: "Direct chat", qCall: "Call", qCallSub: "Mobile",
      sTotal: "Complaints logged", sOpen: "In progress", sDone: "Resolved",
      cEyebrow: "Register complaint", cTitle: "What is the problem?",
      fCat: "Choose a category", fDesc: "Describe the problem",
      fDescPh: "Type here or tap the mic and speak",
      micHint: "Tap the mic and speak in Tamil or English.",
      micListen: "Listening... speak now", micNo: "Voice input is not supported here. Try Chrome.",
      micDeny: "Microphone permission needed.",
      fPlace: "Location and photo", fStreetPh: "Street / area name", fGps: "My location", fPhoto: "Photo",
      gpsWait: "Getting location...", gpsOk: "Location added", gpsFail: "Could not get location",
      fWho: "Your details", fNamePh: "Name", fPhonePh: "Mobile number",
      fSubmit: "Submit complaint", fSubmitWa: "Send via WhatsApp",
      eCat: "Please choose a category.", eDesc: "Please describe the problem.", eName: "Please enter your name.", ePhone: "Enter a valid 10 digit mobile number.",
      tEyebrow: "Complaint status", tTitle: "Where is my complaint?", tPh: "Complaint ID or mobile number", tBtn: "Search",
      tNone: "No complaint found. Check the number.", tHint: "Complaints filed on this device show up here.",
      st0: "Received", st1: "In progress", st2: "Resolved",
      hEyebrow: "How it works", hTitle: "Four simple steps",
      h1t: "Register", h1p: "File your complaint with voice, text or a photo.",
      h2t: "Get an ID", h2p: "You instantly receive a unique complaint number.",
      h3t: "Action", h3p: "The ward office forwards it to the right department and follows up.",
      h4t: "Resolved", h4p: "You are informed as soon as it is fixed.",
      kEyebrow: "Contact", kTitle: "Reach us directly",
      kWa: "Complaint via WhatsApp", kCall: "Complaint via phone",
      kNote: "Ward 36 · Tiruchirappalli Corporation · Thiruverumbur Assembly Constituency",
      footer: "Tamilaga Vettri Kazhagam · Ward 36 Grievance Centre",
      okTitle: "Complaint registered", okText: "Keep this number safe. Use it to check the status later.",
      okWa: "Confirm on WhatsApp", okClose: "Close",
      waHead: "Complaint", waCat: "Category", waDesc: "Details", waPlace: "Location", waName: "Name", waPhone: "Mobile", waMap: "Map"
    }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let lang = "ta", cat = null, coords = null, photoData = "", lastWa = "";

  const load = () => { try { return JSON.parse(localStorage.getItem(CFG.storeKey)) || []; } catch { return []; } };
  const save = list => { try { localStorage.setItem(CFG.storeKey, JSON.stringify(list)); } catch {} };
  const t = k => T[lang][k] || k;

  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove("show"), 2800);
  }

  // ---- language ----
  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-t]").forEach(el => { el.innerHTML = t(el.dataset.t); });
    $$("[data-ph]").forEach(el => { el.placeholder = t(el.dataset.ph); });
    $$(".lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    document.title = lang === "ta" ? "மக்கள் குறைகள் மையம் | வார்டு 36 திருவெறும்பூர்" : "People's Grievance Centre | Ward 36 Thiruverumbur";
    renderChips(); stats();
    if (rec) rec.lang = lang === "ta" ? "ta-IN" : "en-IN";
    try { localStorage.setItem("tvk36.lang", lang); } catch {}
  }

  function renderChips() {
    $("#chips").innerHTML = CATS.map(c =>
      `<button type="button" class="chip${cat === c.id ? " on" : ""}" data-cat="${c.id}"><svg viewBox="0 0 24 24">${c.i}</svg>${c[lang]}</button>`
    ).join("");
  }

  // ---- links ----
  const wa = text => `https://wa.me/${CFG.phone}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  $("#qWa").href = wa(); $("#cWa").href = wa();
  $("#qCall").href = $("#cCall").href = "tel:+" + CFG.phone;
  $("#yr").textContent = new Date().getFullYear();

  // ---- voice ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, base = "";
  if (SR) {
    rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = "ta-IN";
    rec.onresult = e => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      $("#desc").value = (base + " " + txt).trim();
    };
    rec.onerror = e => { if (e.error === "not-allowed") toast(t("micDeny")); stopMic(); };
    rec.onend = () => stopMic();
  }
  function stopMic() {
    listening = false; $("#mic").classList.remove("live");
    $("#micHint").textContent = t("micHint");
  }
  $("#mic").addEventListener("click", () => {
    if (!rec) return toast(t("micNo"));
    if (listening) { rec.stop(); return; }
    base = $("#desc").value; rec.lang = lang === "ta" ? "ta-IN" : "en-IN";
    try { rec.start(); listening = true; $("#mic").classList.add("live"); $("#micHint").textContent = t("micListen"); }
    catch { stopMic(); }
  });
  $("#qVoice").addEventListener("click", () => setTimeout(() => $("#mic").click(), 700));

  // ---- gps & photo ----
  $("#gps").addEventListener("click", () => {
    if (!navigator.geolocation) return toast(t("gpsFail"));
    $("#gpsOut").textContent = t("gpsWait");
    navigator.geolocation.getCurrentPosition(p => {
      coords = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
      $("#gpsOut").textContent = `${t("gpsOk")}: ${coords.lat}, ${coords.lng}`;
      $("#gps").classList.add("ok");
    }, () => { $("#gpsOut").textContent = t("gpsFail"); }, { enableHighAccuracy: true, timeout: 10000 });
  });
  $("#photo").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const s = Math.min(1, 640 / img.width), c = document.createElement("canvas");
      c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      photoData = c.toDataURL("image/jpeg", .6); URL.revokeObjectURL(url);
      const p = $("#preview"); p.src = photoData; p.hidden = false;
      $("#photoLbl").parentElement.classList.add("ok");
    };
    img.src = url;
  });

  $("#chips").addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    cat = b.dataset.cat; $$(".chip").forEach(c => c.classList.toggle("on", c === b));
  });
  $("#phone").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, ""); });

  // ---- submit ----
  function validate() {
    const err = $("#err"); err.textContent = "";
    const d = $("#desc").value.trim(), n = $("#name").value.trim(), p = $("#phone").value;
    const msg = !cat ? t("eCat") : !d ? t("eDesc") : !n ? t("eName") : !/^[6-9]\d{9}$/.test(p) ? t("ePhone") : "";
    if (msg) { err.textContent = msg; toast(msg); return null; }
    return { desc: d, name: n, phone: p };
  }
  function waText(c) {
    const cl = CATS.find(x => x.id === c.cat)[lang], tt = T[lang];
    let s = `*${tt.waHead} ${c.id}*\n${tt.waCat}: ${cl}\n${tt.waDesc}: ${c.desc}\n`;
    if (c.street) s += `${tt.waPlace}: ${c.street}\n`;
    if (c.coords) s += `${tt.waMap}: https://maps.google.com/?q=${c.coords.lat},${c.coords.lng}\n`;
    return s + `${tt.waName}: ${c.name}\n${tt.waPhone}: ${c.phone}`;
  }
  function record() {
    const v = validate(); if (!v) return null;
    const list = load();
    const c = {
      id: `${CFG.prefix}-${String(Date.now()).slice(-6)}`, cat, ...v,
      street: $("#street").value.trim(), coords, photo: photoData ? "yes" : "", status: 0, at: Date.now()
    };
    list.unshift(c); save(list); stats();
    return c;
  }
  function reset() {
    $("#form").reset(); cat = null; coords = null; photoData = "";
    $("#preview").hidden = true; $("#gpsOut").textContent = "";
    $$(".soft").forEach(s => s.classList.remove("ok")); renderChips();
  }
  function done(c) {
    lastWa = wa(waText(c));
    $("#okId").textContent = c.id; $("#sheet").hidden = false; reset();
  }
  $("#form").addEventListener("submit", e => { e.preventDefault(); const c = record(); if (c) done(c); });
  $("#sendWa").addEventListener("click", () => {
    const c = record(); if (!c) return;
    window.open(wa(waText(c)), "_blank", "noopener"); done(c);
  });
  $("#okWa").addEventListener("click", () => window.open(lastWa, "_blank", "noopener"));
  $("#okClose").addEventListener("click", () => { $("#sheet").hidden = true; location.hash = "#track"; });
  $("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") $("#sheet").hidden = true; });

  // ---- track ----
  function esc(s) { return String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])); }
  function renderTrack(list) {
    const out = $("#trackOut");
    if (!list.length) { out.innerHTML = `<p class="empty">${t("tNone")}</p>`; return; }
    out.innerHTML = list.map(c => {
      const cl = CATS.find(x => x.id === c.cat)[lang];
      const d = new Date(c.at).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
      return `<article class="t-card"><div class="t-top"><b>${esc(c.id)}</b><span class="badge s${c.status}">${t("st" + c.status)}</span></div>
      <p><strong>${cl}</strong> · ${esc(c.desc).slice(0, 140)}</p><small>${esc(c.street || "")} ${d}</small>
      <div class="progress">${[0, 1, 2].map(i => `<i class="${i <= c.status ? "f" : ""}"></i>`).join("")}</div></article>`;
    }).join("");
  }
  $("#trackForm").addEventListener("submit", e => {
    e.preventDefault();
    const q = $("#trackInput").value.trim().toLowerCase(); if (!q) return;
    renderTrack(load().filter(c => c.id.toLowerCase().includes(q) || c.phone.includes(q)));
  });
  function stats() {
    const l = load();
    $("#sTotal").textContent = l.length;
    $("#sOpen").textContent = l.filter(c => c.status < 2).length;
    $("#sDone").textContent = l.filter(c => c.status === 2).length;
    if (!$("#trackOut").innerHTML.trim()) $("#trackOut").innerHTML = `<p class="empty">${t("tHint")}</p>`;
  }

  // ---- nav state ----
  $$(".lang button").forEach(b => b.addEventListener("click", () => { lang = b.dataset.lang; applyLang(); }));
  const top = $("#top");
  addEventListener("scroll", () => top.classList.toggle("solid", scrollY > 60), { passive: true });
  const map = { home: "home", quick: "home", complaint: "complaint", track: "track", how: "contact", contact: "contact" };
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) $$(".tabbar a").forEach(a => a.classList.toggle("on", a.dataset.tab === map[en.target.id]));
  }), { rootMargin: "-45% 0px -50% 0px" });
  Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });

  try { lang = localStorage.getItem("tvk36.lang") || "ta"; } catch {}
  applyLang();
})();
