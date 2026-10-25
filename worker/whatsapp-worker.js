// Sends the queued WhatsApp messages (the `outbox` table in Supabase) through dynamolabs/whatsapp-mcp.
// Run it on a computer or server that stays on and has the WhatsApp phone linked:
//   npm run worker
// Needs in .env: SUPABASE_URL, SUPABASE_SERVICE_KEY, WHATSAPP_MCP_PATH (full path to whatsapp-mcp/dist/index.js)
import { supabaseDb } from "../api/_lib/supabase.js";

const MCP_PATH = process.env.WHATSAPP_MCP_PATH || "";
const POLL_MS = +process.env.WORKER_POLL_MS || 8000;
const GAP_MS = +process.env.WORKER_GAP_MS || 1500;     // pause between messages, keeps the linked session calm
const MAX_ATTEMPTS = 3;
const DRY_RUN = process.env.WORKER_DRY_RUN === "1";    // print instead of sending

const db = supabaseDb();
const sleep = ms => new Promise(r => setTimeout(r, ms));

let clientP = null;
async function getClient() {
  if (clientP) return clientP;
  clientP = (async () => {
    if (!MCP_PATH) throw new Error("WHATSAPP_MCP_PATH is not set");
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
    const transport = new StdioClientTransport({ command: process.execPath, args: [MCP_PATH], stderr: "inherit" }); // the QR code prints here on first run
    const client = new Client({ name: "tvk-whatsapp-worker", version: "1.0.0" });
    transport.onclose = () => { clientP = null; };
    await client.connect(transport);
    return client;
  })().catch(e => { clientP = null; throw e; });
  return clientP;
}

async function sendOne(to, message) {
  if (DRY_RUN) { console.log(`[dry-run] to ${to}\n${message}\n`); return; }
  const client = await getClient();
  const r = await client.callTool({ name: "wa_send_message", arguments: { to, message } });
  const out = (r?.content || []).map(c => c.text || "").join("\n");
  if (!out.startsWith("✅")) throw new Error(out || "send failed");
}

async function tick() {
  const batch = await db.pendingBatch(10);
  for (const m of batch) {
    try {
      await sendOne(m.to_phone, m.message);
      await db.markOutbox(m.n, { status: "sent", sent_at: Date.now(), error: null, attempts: m.attempts + 1 });
      console.log(`sent #${m.n} to ${m.to_phone}`);
    } catch (e) {
      const attempts = m.attempts + 1, error = String(e.message || e).slice(0, 300);
      await db.markOutbox(m.n, { status: attempts >= MAX_ATTEMPTS ? "failed" : "pending", attempts, error });
      console.error(`#${m.n} to ${m.to_phone} failed (${attempts}/${MAX_ATTEMPTS}): ${error}`);
      if (/not connected/i.test(error)) break;      // the phone is not linked yet, retry on the next poll
    }
    await sleep(GAP_MS);
  }
}

console.log(`WhatsApp worker started (${DRY_RUN ? "dry run" : MCP_PATH ? "whatsapp-mcp" : "NO WHATSAPP_MCP_PATH"}), polling every ${POLL_MS / 1000}s`);
for (;;) {
  try { await tick(); } catch (e) { console.error("poll error:", String(e.message || e)); }
  await sleep(POLL_MS);
}
