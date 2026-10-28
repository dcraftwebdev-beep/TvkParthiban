import { catLabels } from "../../shared/cats.js";
// WhatsApp message templates. Returns rows for the outbox table; the worker sends them.
const CAT = { ta: catLabels("ta"), en: catLabels("en") };
const STATUS = { ta: ["பெறப்பட்டது", "நடவடிக்கையில்", "தீர்க்கப்பட்டது"], en: ["Received", "In progress", "Resolved"] };

export const toIntl = p => { const d = String(p).replace(/\D/g, ""); return d.length === 10 ? "91" + d : d; };
const mapLink = c => (c.lat != null ? `https://maps.google.com/?q=${c.lat},${c.lng}` : "");

export function newComplaintMessages(c, { publicUrl, adminPhones }) {
  const L = c.lang === "en" ? "en" : "ta", cat = CAT[L][c.cat] || c.cat;
  const user = L === "en"
    ? `✅ *Complaint registered*\n\nID: *${c.id}*\nCategory: ${cat}\n\nThank you ${c.name}. Our Ward 38 (Kattur) team will look into it and update you here.\nTrack: ${publicUrl}/#track`
    : `✅ *புகார் பதிவு செய்யப்பட்டது*\n\nபுகார் எண்: *${c.id}*\nவகை: ${cat}\n\nநன்றி ${c.name}. வார்டு 38 (காட்டூர்) குழு விரைவில் நடவடிக்கை எடுத்து இங்கே தெரிவிக்கும்.\nநிலை அறிய: ${publicUrl}/#track`;
  const admin = `🆕 *New complaint ${c.id}*\n${CAT.ta[c.cat] || c.cat} / ${CAT.en[c.cat] || c.cat}\n\n${c.descr}\n\n📍 ${c.street || "-"}${mapLink(c) ? "\n" + mapLink(c) : ""}\n👤 ${c.name}\n📞 ${c.phone}\nhttps://wa.me/${toIntl(c.phone)}\n\nAdmin: ${publicUrl}/#/admin`;
  return [
    { audience: "user", to_phone: toIntl(c.phone), kind: "created", message: user },
    ...adminPhones.map(p => ({ audience: "admin", to_phone: toIntl(p), kind: "created", message: admin }))
  ];
}

export function statusMessage(c) {
  const L = c.lang === "en" ? "en" : "ta";
  const note = c.note ? (L === "en" ? `\nNote: ${c.note}` : `\nகுறிப்பு: ${c.note}`) : "";
  const message = L === "en"
    ? `🔔 *Update on ${c.id}*\nStatus: *${STATUS.en[c.status]}*${note}`
    : `🔔 *புகார் ${c.id} புதுப்பிப்பு*\nநிலை: *${STATUS.ta[c.status]}*${note}`;
  return { audience: "user", to_phone: toIntl(c.phone), kind: "status", message };
}
