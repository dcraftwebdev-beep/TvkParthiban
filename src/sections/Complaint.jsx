import { useEffect, useRef, useState, useCallback } from "react";
import { CFG, CATS } from "../lib/config.js";
import { T } from "../i18n/index.js";
import { api } from "../lib/api.js";
import { subscribePush, pushSupported } from "../lib/push.js";
import { canRecord, startRecording, blobToBase64, clock } from "../lib/recorder.js";
import { wa, Icon } from "../components/ui.jsx";

export function Complaint({ t, lang, say, onDone, micReq }) {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState(null);
  const [desc, setDesc] = useState("");
  const [street, setStreet] = useState("");
  const [coords, setCoords] = useState(null);
  const [gpsMsg, setGpsMsg] = useState("");
  const [photos, setPhotos] = useState([]);
  const [consent, setConsent] = useState(true);
  const [notify, setNotify] = useState(true);
  const [pushKey, setPushKey] = useState(null);
  useEffect(() => { if (pushSupported()) api.pushKey().then(r => setPushKey(r.key)).catch(() => {}); }, []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [down, setDown] = useState(null);
  const [voice, setVoice] = useState(null);   // { url, blob, secs, type }: the recorded voice message
  const [secs, setSecs] = useState(0);
  const recRef = useRef(null);
  const canRec = canRecord();

  const cancelRef = useRef(false);
  const stopRec = () => recRef.current?.stop();
  const cancelRec = () => { cancelRef.current = true; recRef.current?.stop(); };
  // leaving the page or this step while recording discards the take and releases the microphone
  useEffect(() => () => { cancelRef.current = true; recRef.current?.stop(); }, []);
  useEffect(() => { if (step !== 1 && recRef.current) cancelRec(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const clearVoice = () => setVoice(old => { if (old) URL.revokeObjectURL(old.url); return null; });
  const toggleRecord = useCallback(async () => {
    if (live) return stopRec();
    if (!canRec) return say(t.recNo);
    try {
      setSecs(0); cancelRef.current = false;
      const r = await startRecording(setSecs);
      recRef.current = r; setLive(true);
      r.done.then(({ blob, secs: s, type }) => {
        setLive(false); recRef.current = null;
        if (cancelRef.current) return;
        if (blob.size < 800) return say(t.recShort);
        setVoice(old => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(blob), blob, secs: s, type }; });
      });
    } catch { say(t.micDeny); setLive(false); }
  }, [live, canRec, t, say]);

  // "Voice complaint" tile elsewhere: jump to the details step and start recording
  const lastReq = useRef(0);
  useEffect(() => {
    if (micReq && micReq !== lastReq.current) { lastReq.current = micReq; setStep(1); setTimeout(toggleRecord, 700); }
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
    if (s >= 1 && !desc.trim() && !voice) return t.eDesc;
    if (s >= 3 && !name.trim()) return t.eName;
    if (s >= 3 && !/^[6-9]\d{9}$/.test(phone)) return t.ePhone;
    return "";
  };
  const go = n => {
    if (n > step) { const m = check(step); if (m) { setErr(m); say(m); return; } }
    setErr(""); if (live) stopRec(); setStep(n);
  };
  const pick = id => { setCat(id); setErr(""); setTimeout(() => setStep(1), 220); };

  const waText = c => {
    const tt = T[lang], cl = CATS.find(x => x.id === c.cat)[lang];
    let s = `*${tt.waHead} ${c.id}*\n${tt.waCat}: ${cl}\n${tt.waDesc}: ${c.desc}\n`;
    if (c.street) s += `${tt.waPlace}: ${c.street}\n`;
    if (c.coords) s += `${tt.waMap}: https://maps.google.com/?q=${c.coords.lat},${c.coords.lng}\n`;
    return s + `${tt.waName}: ${c.name}\n${tt.waPhone}: ${c.phone}`;
  };
  const reset = () => { setStep(0); setCat(null); setDesc(""); setStreet(""); setCoords(null); setGpsMsg(""); setPhotos([]); clearVoice(); setConsent(true); setName(""); setPhone(""); setErr(""); };

  const submit = async () => {
    const m = check(3); if (m) { setErr(m); say(m); return; }
    if (busy) return;
    setBusy(true); setDown(null);
    // ask for notification permission first, while the tap is still fresh
    const push = notify && pushKey ? await subscribePush(pushKey) : null;
    const body = { cat, desc: desc.trim(), street: street.trim(), coords, photos, consent, push, name: name.trim(), phone, lang };
    try {
      if (voice) body.voice = { data: await blobToBase64(voice.blob), type: voice.type, secs: voice.secs };
      const r = await api.create(body);
      onDone({ id: r.id, pushSaved: r.pushSaved, link: wa(waText({ id: r.id, ...body })) }); reset();
    } catch (e) {
      if (e.status === 429) { setErr(t.eLimit); say(t.eLimit); }
      else if (e.message === "voice") { setErr(t.recBig); }
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
          {[["mic", t.cB1], ["tick", t.cB2], ["search", t.cB3]].map(([n, x]) => <li key={x}><span><Icon n={n} size={18} /></span>{x}</li>)}
        </ul>
        <div className="cx-alt">
          <p>{t.cOr}</p>
          <a className="btn wa" href={wa()} target="_blank" rel="noopener"><Icon n="wa" size={18} />WhatsApp</a>
          <a className="btn ghost" href={`tel:+${CFG.phone}`}><Icon n="phone" size={18} />{t.qCall}</a>
        </div>
      </aside>

      <div className="cx-card rv">
        <div className="cx-bar" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}><i style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
        <div className="cx-meta">
          {step > 0 ? <button type="button" className="cx-back" onClick={() => go(step - 1)} aria-label={t.back}><Icon n="back" size={20} /></button> : <span className="cx-back ph" />}
          <div><small>{step + 1} / 4</small><b>{t.stepLabels[step]}</b></div>
          {catLabel && step > 0 && <span className="cx-pill">{catLabel}</span>}
        </div>

        <div className="cx-pane" key={step}>
          {step === 0 && (<>
            <h3>{t.fCat}</h3>
            <div className="cx-cats">
              {CATS.map(c => (
                <button key={c.id} type="button" className={"cx-cat" + (cat === c.id ? " on" : "")} onClick={() => pick(c.id)}>
                  <span className="cx-ico"><Icon n={c.icon} size={24} /></span><b>{c[lang]}</b>
                </button>
              ))}
            </div>
          </>)}

          {step === 1 && (<>
            <h3>{t.fDesc}</h3>
            {live ? (
              <div className="rec-live" role="status">
                <div className="rec-top">
                  <span className="rec-dot" aria-hidden="true" />
                  <b>{t.recording}</b>
                  <span className="rec-time">{clock(secs)}</span>
                </div>
                <p className="rec-say">{t.recSpeak}</p>
                <button type="button" className="rec-stop" onClick={stopRec}>
                  <span className="rec-sq" aria-hidden="true" />{t.recStopBtn}
                </button>
                <button type="button" className="rec-cancel" onClick={cancelRec}>{t.recCancel}</button>
              </div>
            ) : !voice ? (
              <button type="button" className="mic-big" onClick={toggleRecord}>
                <span className="mic-orb"><Icon n="mic" size={28} /></span>
                <span className="mic-txt">
                  <b>{t.recTap}</b>
                  <small>{t.recHint}</small>
                </span>
              </button>
            ) : (
              <div className="voice-done">
                <div className="vd-row">
                  <span className="vd-ico"><Icon n="tick" size={18} /></span>
                  <b>{t.recSaved} · {clock(voice.secs)}</b>
                </div>
                <audio controls src={voice.url} preload="metadata" />
                <div className="vd-actions">
                  <button type="button" onClick={toggleRecord}><Icon n="mic" size={16} />{t.recAgain}</button>
                  <button type="button" onClick={clearVoice}><Icon n="x" size={16} />{t.remove}</button>
                </div>
              </div>
            )}
            <div className="cx-or"><span>{t.orType}</span></div>
            <textarea rows={4} maxLength={600} value={desc} placeholder={t.fDescPh} onChange={e => setDesc(e.target.value)} />
            <div className="cx-photos">
              {photos.map((p, k) => (
                <div className="cx-thumb" key={k}>
                  <img src={p} alt="" />
                  <button type="button" onClick={() => setPhotos(list => list.filter((_, n) => n !== k))} aria-label={t.remove}><Icon n="x" size={14} /></button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="cx-add">
                  <Icon n="cam" size={24} />
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
              <span className="cx-ico"><Icon n={coords ? "tick" : "pin"} size={22} /></span>
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
              {voice && <div><dt>{t.voiceLabel}</dt><dd>{clock(voice.secs)}</dd></div>}
            </dl>
          </>)}
          {err && <p className="err" role="alert">{err}</p>}
        </div>

        <div className="cx-actions">
          {step === 1 && <button type="button" className="btn dark wide" onClick={() => go(2)}>{t.next}</button>}
          {step === 2 && <button type="button" className="btn dark wide" onClick={() => go(3)}>{t.next}</button>}
          {step === 3 && (<>
            <button type="button" className="btn dark wide" disabled={busy} onClick={submit}>{busy ? t.sending : t.fSubmit}</button>
            {down && <div className="cx-down"><p>{t.serverDown}</p><a className="btn wa wide" href={down} target="_blank" rel="noopener"><Icon n="wa" size={18} />{t.fSubmitWa}</a></div>}
          </>)}
        </div>
      </div>
    </div></section>
  );
}
