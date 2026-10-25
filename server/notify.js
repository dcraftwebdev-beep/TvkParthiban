// WhatsApp notifications through the dynamolabs/whatsapp-mcp server (MCP over stdio).
// The backend acts as an MCP client and calls the `wa_send_message` tool.
// NOTIFY_PROVIDER=mcp      -> send via the MCP server at WHATSAPP_MCP_PATH (dist/index.js)
// NOTIFY_PROVIDER=console  -> only log the messages (default, safe for development)
import { q } from "./db.js";

const PROVIDER = process.env.NOTIFY_PROVIDER || "console";
const MCP_PATH = process.env.WHATSAPP_MCP_PATH || "";
const PUBLIC_URL = (process.env.PUBLIC_URL || "http://localhost:5188").replace(/\/$/, "");
export const ADMIN_PHONES = (process.env.ADMIN_WHATSAPP || "").split(",").map(s => s.replace(/\D/g, "")).filter(Boolean);

const CAT = {
  ta: { road: "சாலை", water: "குடிநீர்", drain: "கழிவுநீர்", light: "தெருவிளக்கு", trash: "குப்பை", power: "மின்சாரம்", other: "பிற" },
  en: { road: "Road", water: "Drinking water", drain: "Drainage", light: "Streetlight", trash: "Garbage", power: "Electricity", other: "Other" }
};
const STATUS = { ta: ["பெறப்பட்டது", "நடவடிக்கையில்", "தீர்க்கப்பட்டது"], en: ["Received", "In progress", "Resolved"] };

export const toIntl = p => { const d = String(p).replace(/\D/g, ""); return d.length === 10 ? "91" + d : d; };

/* ---------- MCP client ---------- */
let clientP = null;
async function getClient() {
  if (clientP) return clientP;
  clientP = (async () => {
    if (!MCP_PATH) throw new Error("WHATSAPP_MCP_PATH is not set");
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
    const transport = new StdioClientTransport({ command: process.execPath, args: [MCP_PATH], stderr: "inherit" }); // QR code prints here
    const client = new Client({ name: "tvk-ward-portal", version: "1.0.0" });
    transport.onclose = () => { clientP = null; };
    await client.connect(transport);
    return client;
  })().catch(e => { clientP = null; throw e; });
  return clientP;
}

const text = r => (r?.content || []).map(c => c.text || "").join("\n");

async function sendRaw(phone, message) {
  const to = toIntl(phone);
  if (PROVIDER !== "mcp") { console.log(`[whatsapp:console] to ${to}\n${message}\n`); return; }
  const client = await getClient();
  const out = text(await client.callTool({ name: "wa_send_message", arguments: { to, message } }));
  if (!out.startsWith("✅")) throw new Error(out || "send failed");
}

/** Fire-and-forget with delivery log. Never throws. */
export async function send(complaintId, audience, kind, phone, message) {
  let ok = 1, error = null;
  try { await sendRaw(phone, message); }
  catch (e) { ok = 0; error = String(e.message || e).slice(0, 300); console.error(`[whatsapp] ${audience}/${kind} to ${phone} failed: ${error}`); }
  q.logNotify.run(complaintId, audience, toIntl(phone), kind, ok, error, Date.now());
  return ok === 1;
}

// A small delay between messages keeps a linked-device session from looking like spam.
let chain = Promise.resolve();
const queue = fn => (chain = chain.then(fn).then(() => new Promise(r => setTimeout(r, 1200))).catch(() => {}));

/* ---------- message templates ---------- */
const mapLink = c => (c.lat != null ? `https://maps.google.com/?q=${c.lat},${c.lng}` : "");

export function notifyNewComplaint(c) {
  const L = c.lang === "en" ? "en" : "ta", cat = CAT[L][c.cat] || c.cat;
  const userMsg = L === "en"
    ? `✅ *Complaint registered*\n\nID: *${c.id}*\nCategory: ${cat}\n\nThank you ${c.name}. Our Ward 38 (Kattur) team will look into it and update you here.\nTrack: ${PUBLIC_URL}/#track`
    : `✅ *புகார் பதிவு செய்யப்பட்டது*\n\nபுகார் எண்: *${c.id}*\nவகை: ${cat}\n\nநன்றி ${c.name}. வார்டு 38 (காட்டூர்) குழு விரைவில் நடவடிக்கை எடுத்து இங்கே தெரிவிக்கும்.\nநிலை அறிய: ${PUBLIC_URL}/#track`;
  const adminMsg = `🆕 *New complaint ${c.id}*\n${CAT.ta[c.cat] || c.cat} / ${CAT.en[c.cat] || c.cat}\n\n${c.descr}\n\n📍 ${c.street || "-"}${mapLink(c) ? "\n" + mapLink(c) : ""}\n👤 ${c.name}\n📞 ${c.phone}\nhttps://wa.me/${toIntl(c.phone)}\n\nAdmin: ${PUBLIC_URL}/#/admin`;
  queue(() => send(c.id, "user", "created", c.phone, userMsg));
  for (const a of ADMIN_PHONES) queue(() => send(c.id, "admin", "created", a, adminMsg));
}

export function notifyStatus(c) {
  const L = c.lang === "en" ? "en" : "ta";
  const note = c.note ? (L === "en" ? `\nNote: ${c.note}` : `\nகுறிப்பு: ${c.note}`) : "";
  const msg = L === "en"
    ? `🔔 *Update on ${c.id}*\nStatus: *${STATUS.en[c.status]}*${note}`
    : `🔔 *புகார் ${c.id} புதுப்பிப்பு*\nநிலை: *${STATUS.ta[c.status]}*${note}`;
  queue(() => send(c.id, "user", "status", c.phone, msg));
}

export const notifyInfo = () => ({ provider: PROVIDER, mcpPath: !!MCP_PATH, admins: ADMIN_PHONES.length });
