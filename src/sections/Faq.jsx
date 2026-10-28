import { useState } from "react";
import { Icon, Head } from "../components/ui.jsx";

export function Faq({ t }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="sec faq"><div className="wrap narrow">
      <Head eyebrow={t.faqEyebrow} title={t.faqTitle} />
      <div className="acc rv">
        {t.faq.map(([q, a], i) => (
          <div key={q} className={"acc-i" + (open === i ? " open" : "")}>
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{q}<Icon n="plus" size={18} /></button>
            <div className="acc-b"><p>{a}</p></div>
          </div>
        ))}
      </div>
    </div></section>
  );
}
