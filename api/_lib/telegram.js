// Free, automatic admin alert with a link: a Telegram bot messages the ward office when a complaint arrives.
// Setup: talk to @BotFather on Telegram, create a bot, copy its token. Message the bot once, then open
// https://api.telegram.org/bot<TOKEN>/getUpdates and copy the "chat":{"id": ...} number.
const esc = s => String(s ?? "").replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

const CAT = {
  road: "சாலை / Road", water: "குடிநீர் / Drinking water", drain: "கழிவுநீர் / Drainage", light: "தெருவிளக்கு / Streetlight",
  trash: "குப்பை / Garbage", power: "மின்சாரம் / Electricity", other: "பிற / Other"
};

export const telegramEnabled = env => !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);

/** Never throws. `photo` is the first photo as base64 (optional). */
export async function telegramNewComplaint(env, c, photo, adminUrl) {
  if (!telegramEnabled(env)) return { ok: false, error: "not_configured" };
  const chats = String(env.TELEGRAM_CHAT_ID).split(",").map(s => s.trim()).filter(Boolean);
  const map = c.lat != null ? `\n📍 <a href="https://maps.google.com/?q=${c.lat},${c.lng}">Map</a>` : "";
  const text = `🆕 <b>புதிய புகார் ${esc(c.id)}</b>\n${esc(CAT[c.cat] || c.cat)}\n\n${esc(c.descr)}\n\n` +
    `📌 ${esc(c.street || "-")}${map}\n👤 ${esc(c.name)}\n📞 ${esc(c.phone)}  ·  <a href="https://wa.me/91${esc(c.phone)}">WhatsApp</a>` +
    (c.photo_count ? `\n🖼 ${c.photo_count} photo${c.photo_count > 1 ? "s" : ""}` : "");
  const keyboard = JSON.stringify({ inline_keyboard: [[{ text: "Open admin panel", url: adminUrl }]] });
  const call = m => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${m}`;
  let ok = true, error = "";
  for (const chat of chats) {
    try {
      let res;
      if (photo) {
        const fd = new FormData();
        fd.append("chat_id", chat); fd.append("caption", text.slice(0, 1000)); fd.append("parse_mode", "HTML"); fd.append("reply_markup", keyboard);
        fd.append("photo", new Blob([Buffer.from(photo, "base64")], { type: "image/jpeg" }), "complaint.jpg");
        res = await fetch(call("sendPhoto"), { method: "POST", body: fd, signal: AbortSignal.timeout(8000) });
      } else {
        res = await fetch(call("sendMessage"), {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000),
          body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", reply_markup: JSON.parse(keyboard), disable_web_page_preview: true })
        });
      }
      if (!res.ok) { ok = false; error = `telegram ${res.status}`; }
    } catch (e) { ok = false; error = String(e.message || e).slice(0, 120); }
  }
  if (!ok) console.error("telegram alert failed:", error);
  return { ok, error };
}
