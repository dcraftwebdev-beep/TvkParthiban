// Web push (free, automatic): notifies a citizen's phone or an admin device without WhatsApp.
import webpush from "web-push";

let ready = false;
function init(env) {
  if (ready) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT || "mailto:admin@example.com", env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  ready = true;
  return true;
}

export const pushEnabled = env => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

/** Never throws. gone = the subscription no longer exists and can be deleted. */
export async function sendPush(env, sub, payload) {
  if (!sub || !sub.endpoint || !init(env)) return { ok: false, error: "not_configured" };
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 86400 });
    return { ok: true };
  } catch (e) {
    return { ok: false, gone: e.statusCode === 404 || e.statusCode === 410, error: String(e.message || e).slice(0, 200) };
  }
}

const CAT = {
  ta: { road: "சாலை", water: "குடிநீர்", drain: "கழிவுநீர்", light: "தெருவிளக்கு", trash: "குப்பை", power: "மின்சாரம்", other: "பிற" },
  en: { road: "Road", water: "Drinking water", drain: "Drainage", light: "Streetlight", trash: "Garbage", power: "Electricity", other: "Other" }
};

export function citizenPush(c, url) {
  const L = c.lang === "en" ? "en" : "ta";
  if (c.status === 2) {
    return L === "en"
      ? { title: "Your complaint is resolved", body: `${c.id} is done. See the before and after photos.`, url }
      : { title: "உங்கள் புகார் தீர்க்கப்பட்டது", body: `${c.id} முடிந்தது. முன் / பின் படங்களைப் பாருங்கள்.`, url };
  }
  return L === "en"
    ? { title: "Complaint update", body: `${c.id} is now in progress.${c.note ? " " + c.note : ""}`, url }
    : { title: "புகார் புதுப்பிப்பு", body: `${c.id} நடவடிக்கையில் உள்ளது.${c.note ? " " + c.note : ""}`, url };
}

export const adminPush = (c, url) => ({
  title: `புதிய புகார் · ${CAT.ta[c.cat] || c.cat}`,
  body: `${c.descr.slice(0, 90)} (${c.name}, ${c.phone})`,
  url
});
