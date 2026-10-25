// Runs the Vercel API handler against an in-memory data layer. Usage: node test/api.test.mjs
// Set VIA_REWRITE=1 to send requests the way the Vercel rewrite does (/api/index?__p=...).
import http from "node:http";
import assert from "node:assert/strict";
import { makeHandler } from "../api/_lib/app.js";
import { memDb } from "./memdb.js";

const db = memDb();
const env = { ADMIN_PASSWORD: "secret-pass", PUBLIC_URL: "https://example.test" };
const server = http.createServer(makeHandler(() => db, env));
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const viaRewrite = p => { const u = new URL(p, "http://x"); u.searchParams.set("__p", u.pathname.replace(/^\/api\/?/, "")); return "/api/index" + u.search; };
const call = async (path0, { method = "GET", body, token, ip } = {}) => {
  const path = process.env.VIA_REWRITE ? viaRewrite(path0) : path0;
  const r = await fetch(base + path, { method, headers: { ...(ip ? { "x-forwarded-for": ip } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get("content-type") || "";
  return { status: r.status, data: ct.includes("json") ? await r.json() : ct.startsWith("image") ? Buffer.from(await r.arrayBuffer()) : await r.text(), ct };
};
const jpegOf = bytes => "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...bytes]).toString("base64");
const subscription = { endpoint: "https://push.example.test/abc", keys: { p256dh: "BPk", auth: "au" } };
const good = { cat: "road", desc: "Pothole near Kattur school", name: "Meena", phone: "9123456780", street: "Main St", lang: "ta", coords: { lat: 10.8, lng: 78.7 }, photos: [jpegOf([1]), jpegOf([2]), jpegOf([3])], consent: true, push: subscription };

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
await t("create complaint with 3 photos, consent and a push subscription", async () => {
  const r = await call("/api/complaints", { method: "POST", body: good });
  assert.equal(r.status, 201); assert.match(r.data.id, /^TVK38-\d{6}$/); id = r.data.id;
  assert.equal(r.data.photos, 3); assert.equal(r.data.pushSaved, true);
  assert.equal(db.rows[0].photo_count, 3); assert.equal(db.rows[0].consent_public, true);
});
await t("photos beyond 4 and non-JPEG files are dropped", async () => {
  const r = await call("/api/complaints", { method: "POST", ip: "8.8.8.8", body: { ...good, phone: "9000000001", push: undefined, photos: [jpegOf([1]), jpegOf([2]), jpegOf([3]), jpegOf([4]), jpegOf([5]), "data:image/png;base64,AAAA", "junk"] } });
  assert.equal(r.data.photos, 4); assert.equal(r.data.pushSaved, false);
});
await t("WhatsApp queue is off by default", async () => assert.equal(db.outbox.length, 0));
await t("public stats", async () => assert.deepEqual((await call("/api/stats")).data, { total: 2, open: 2, done: 0 }));
await t("track by id and by phone, no private data", async () => {
  const a = (await call(`/api/track?q=${id}`)).data.items[0], b = (await call("/api/track?q=9123456780")).data.items;
  assert.equal(a.id, id); assert.equal(b.length, 1); assert.equal(a.name, undefined); assert.equal(a.phone, undefined); assert.equal(a.result, null);
});
await t("admin routes need a token", async () => {
  assert.equal((await call("/api/admin/stats")).status, 401);
  assert.equal((await call("/api/admin/stats", { token: "1.bad" })).status, 401);
  assert.equal((await call("/api/admin/login", { method: "POST", body: { password: "nope" } })).status, 401);
});
let token;
await t("admin login", async () => { const r = await call("/api/admin/login", { method: "POST", body: { password: "secret-pass" } }); assert.equal(r.status, 200); token = r.data.token; });
await t("admin stats and list", async () => {
  const s = (await call("/api/admin/stats", { token })).data; assert.equal(s.received, 2);
  const l = (await call("/api/admin/complaints?q=9123456780", { token })).data.items; assert.equal(l.length, 1); assert.equal(l[0].photoCount, 3);
});
await t("admin can open each before photo", async () => {
  for (const i of [0, 1, 2]) { const r = await call(`/api/admin/photo/${id}/${i}?t=${encodeURIComponent(token)}`); assert.equal(r.status, 200); assert.equal(r.data[2], 0xff); }
  assert.equal((await call(`/api/admin/photo/${id}/3?t=${encodeURIComponent(token)}`)).status, 404);
});
await t("admin saves an alert device", async () => {
  assert.equal((await call("/api/admin/push", { method: "POST", token, body: { sub: { endpoint: "http://bad" } } })).status, 400);
  assert.equal((await call("/api/admin/push", { method: "POST", token, body: { sub: { ...subscription, endpoint: "https://push.example.test/admin1" } } })).status, 200);
  assert.equal(db.admins.length, 1);
});
await t("in progress update", async () => {
  const r = await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { status: 1, note: "Work on Monday" } });
  assert.equal(r.data.status, 1); assert.equal(r.data.hasResult, false);
  assert.equal((await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { status: 9 } })).status, 400);
});
let resultUrl;
await t("resolving with an after photo stores the joined image", async () => {
  assert.equal((await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { status: 2, after: "data:image/png;base64,AAAA", result: jpegOf([9]) } })).status, 400);
  const r = await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { status: 2, after: jpegOf([7]), result: jpegOf([8, 8, 8]) } });
  assert.equal(r.status, 200); assert.equal(r.data.status, 2); assert.equal(r.data.hasResult, true); assert.ok(r.data.resolvedAt);
  resultUrl = r.data.resultUrl; assert.match(resultUrl, /^\/api\/r\/TVK38-\d{6}\/image\?k=/);
});
await t("result image and page need the right key", async () => {
  const img = await call(resultUrl); assert.equal(img.status, 200); assert.equal(img.ct, "image/jpeg"); assert.equal(img.data[2], 0xff);
  assert.equal((await call(`/api/r/${id}/image?k=wrong`)).status, 404);
  const page = await call(`/api/r/${id}?k=${resultUrl.split("k=")[1]}`);
  assert.equal(page.status, 200); assert.ok(page.data.includes('property="og:image"')); assert.ok(page.data.includes(`https://example.test/api/r/${id}/image`));
});
await t("citizen sees the result in tracking", async () => {
  const a = (await call(`/api/track?q=${id}`)).data.items[0]; assert.equal(a.status, 2); assert.equal(a.result, resultUrl);
});
await t("public work gallery only shows consented, finished work", async () => {
  const w = (await call("/api/work")).data.items; assert.equal(w.length, 1); assert.equal(w[0].image, resultUrl); assert.equal(w[0].id, undefined);
  db.rows[0].consent_public = false;
  assert.equal((await call("/api/work")).data.items.length, 0);
});
await t("csv export", async () => {
  const c = await call(`/api/admin/export.csv?t=${encodeURIComponent(token)}`); assert.equal(c.status, 200); assert.ok(c.data.includes(id));
});
await t("per-phone limit (5 an hour)", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await call("/api/complaints", { method: "POST", ip: "9.9.9.9", body: { ...good, phone: "9555555555", push: undefined, photos: [] } })).status, 201);
  assert.equal((await call("/api/complaints", { method: "POST", ip: "9.9.9.9", body: { ...good, phone: "9555555555", push: undefined, photos: [] } })).status, 429);
});
await t("unknown route is 404", async () => assert.equal((await call("/api/nothing")).status, 404));

server.close();
console.log(`\n${n} checks passed`);
