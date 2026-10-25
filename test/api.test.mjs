// Runs the Vercel API handler against an in-memory data layer. Usage: node test/api.test.mjs
import http from "node:http";
import assert from "node:assert/strict";
import { makeHandler } from "../api/_lib/app.js";

/* in-memory stand-in for the Supabase layer, same interface */
function memDb() {
  const rows = [], outbox = [];
  const strip = ({ photo, ...r }) => ({ ...r });
  return {
    rows, outbox,
    async insertComplaint(r) { rows.push({ ...r }); },
    async getComplaint(id) { const r = rows.find(x => x.id === id); return r ? strip(r) : null; },
    async getPhoto(id) { return rows.find(x => x.id === id)?.photo || null; },
    async byPhone(p) { return rows.filter(r => r.phone === p).sort((a, b) => b.created_at - a.created_at).map(strip); },
    async countSince(p, since) { return rows.filter(r => r.phone === p && r.created_at > since).length; },
    async list({ status, cat, search }) {
      return rows.filter(r => (status === "" || status === undefined || r.status === +status) && (!cat || r.cat === cat) &&
        (!search || [r.id, r.phone, r.name, r.descr, r.street].some(v => String(v).toLowerCase().includes(search.toLowerCase())))).map(strip).reverse();
    },
    async update(id, patch) { Object.assign(rows.find(x => x.id === id), patch); },
    async summary() { return rows.map(({ cat, status, created_at }) => ({ cat, status, created_at })); },
    async addOutbox(list) { for (const r of list) outbox.push({ n: outbox.length + 1, status: "pending", attempts: 0, created_at: Date.now(), ...r }); },
    async outboxFor(id) { return outbox.filter(o => o.complaint_id === id).reverse(); },
    async pendingCount() { return outbox.filter(o => o.status === "pending").length; }
  };
}

const db = memDb();
const env = { ADMIN_PASSWORD: "secret-pass", ADMIN_WHATSAPP: "7603959394", PUBLIC_URL: "https://example.test" };
const server = http.createServer(makeHandler(() => db, env));
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const call = async (path, { method = "GET", body, token, ip } = {}) => {
  const r = await fetch(base + path, { method, headers: { ...(ip ? { "x-forwarded-for": ip } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get("content-type") || "";
  return { status: r.status, data: ct.includes("json") ? await r.json() : await r.text(), ct };
};
const jpeg = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64");
const good = { cat: "road", desc: "Pothole near Kattur school", name: "Meena", phone: "9123456780", street: "Main St", lang: "ta", coords: { lat: 10.8, lng: 78.7 }, photo: jpeg };

let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log("ok  ", name); };

await t("health", async () => assert.equal((await call("/api/health")).data.ok, true));
await t("validation rejects bad input", async () => {
  assert.equal((await call("/api/complaints", { method: "POST", body: { ...good, cat: "x" } })).data.error, "category");
  assert.equal((await call("/api/complaints", { method: "POST", body: { ...good, desc: "a" } })).data.error, "desc");
  assert.equal((await call("/api/complaints", { method: "POST", body: { ...good, name: "" } })).data.error, "name");
  assert.equal((await call("/api/complaints", { method: "POST", body: { ...good, phone: "12345" } })).data.error, "phone");
});
let id;
await t("create complaint", async () => {
  const r = await call("/api/complaints", { method: "POST", body: good });
  assert.equal(r.status, 201); assert.match(r.data.id, /^TVK38-\d{6}$/); id = r.data.id;
  assert.equal(db.rows[0].has_photo, true);
});
await t("two WhatsApp messages queued (user + admin)", async () => {
  assert.equal(db.outbox.length, 2);
  assert.equal(db.outbox[0].to_phone, "919123456780"); assert.ok(db.outbox[0].message.includes(id));
  assert.equal(db.outbox[1].to_phone, "917603959394"); assert.equal(db.outbox[1].audience, "admin");
});
await t("public stats", async () => assert.deepEqual((await call("/api/stats")).data, { total: 1, open: 1, done: 0 }));
await t("track by id and by phone, no private data", async () => {
  const a = (await call(`/api/track?q=${id}`)).data.items[0], b = (await call("/api/track?q=9123456780")).data.items;
  assert.equal(a.id, id); assert.equal(b.length, 1); assert.equal(a.name, undefined); assert.equal(a.phone, undefined);
});
await t("admin routes need a token", async () => {
  assert.equal((await call("/api/admin/stats")).status, 401);
  assert.equal((await call("/api/admin/stats", { token: "1.bad" })).status, 401);
  assert.equal((await call("/api/admin/login", { method: "POST", body: { password: "nope" } })).status, 401);
});
let token;
await t("admin login", async () => { const r = await call("/api/admin/login", { method: "POST", body: { password: "secret-pass" } }); assert.equal(r.status, 200); token = r.data.token; });
await t("admin stats and list", async () => {
  const s = (await call("/api/admin/stats", { token })).data; assert.equal(s.received, 1); assert.equal(s.pending, 2);
  const l = (await call("/api/admin/complaints?q=kattur", { token })).data.items; assert.equal(l.length, 1); assert.equal(l[0].name, "Meena");
});
await t("admin detail with delivery log", async () => {
  const d = (await call(`/api/admin/complaints/${id}`, { token })).data;
  assert.equal(d.notifications.length, 2); assert.equal(d.notifications[0].pending, true);
});
await t("status change queues a user message", async () => {
  const r = await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { status: 1, note: "Work on Monday" } });
  assert.equal(r.data.status, 1); assert.equal(db.outbox.length, 3);
  assert.ok(db.outbox[2].message.includes("Work on Monday")); assert.equal(db.outbox[2].to_phone, "919123456780");
  assert.equal((await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { status: 9 } })).status, 400);
});
await t("custom message queued", async () => {
  const r = await call(`/api/admin/complaints/${id}/message`, { method: "POST", token, body: { message: "Hello" } });
  assert.equal(r.data.queued, true); assert.equal(db.outbox.at(-1).kind, "custom");
});
await t("photo and csv", async () => {
  const p = await fetch(`${base}/api/admin/photo/${id}?t=${encodeURIComponent(token)}`); assert.equal(p.status, 200); assert.equal(p.headers.get("content-type"), "image/jpeg");
  const c = await call(`/api/admin/export.csv?t=${encodeURIComponent(token)}`); assert.equal(c.status, 200); assert.ok(c.data.includes(id));
});
await t("per-phone limit (5 an hour)", async () => {
  for (let i = 0; i < 4; i++) assert.equal((await call("/api/complaints", { method: "POST", ip: "9.9.9.9", body: { ...good, photo: undefined } })).status, 201);
  assert.equal((await call("/api/complaints", { method: "POST", ip: "9.9.9.9", body: { ...good, photo: undefined } })).status, 429);
});
await t("unknown route is 404", async () => assert.equal((await call("/api/nothing")).status, 404));

server.close();
console.log(`\n${n} checks passed`);
