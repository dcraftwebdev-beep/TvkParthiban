import { useEffect, useState } from "react";
import { wa, Icon, P } from "./ui.jsx";

export function Sheet({ t, c, onClose }) {
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
      <div className="ok-card">
        <button type="button" className="ok-x" onClick={onClose} aria-label={t.okClose}><Icon d="M6 6l12 12M18 6 6 18" size={16} /></button>
        <div className="ok-head">
          <span className="ok-tick"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
          <h3 id="okT">{t.okTitle}</h3>
        </div>
        <div className="ok-body">
          <p className="ok-label">{t.okIdLabel}</p>
          <button type="button" className={"ok-id" + (copied ? " done" : "")} onClick={copy} aria-label={t.copy}>
            <b>{c.id}</b>
            <span><Icon d={copied ? P.tick : P.copy} size={16} />{copied ? t.copied : t.copy}</span>
          </button>
          <p className="ok-note">{t.okShort}</p>
          {c.pushSaved && <p className="ok-bell"><Icon d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21a2 2 0 0 0 4 0" size={16} />{t.okBell}</p>}
          <div className="ok-actions">
            <a className="ok-btn wa" href={c.link} target="_blank" rel="noopener"><Icon d={P.chat} size={17} />WhatsApp</a>
            <a className="ok-btn" href="#track" onClick={onClose}><Icon d={P.search} size={17} />{t.navTrack}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
