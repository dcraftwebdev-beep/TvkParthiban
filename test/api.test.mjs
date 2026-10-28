// Runs the Vercel API handler against an in-memory data layer. Usage: node test/api.test.mjs
// Set VIA_REWRITE=1 to send requests the way the Vercel rewrite does (/api/index?__p=...).
import http from "node:http";
import assert from "node:assert/strict";
import { makeHandler } from "../api/_lib/app.js";
import { memDb } from "./memdb.js";

const db = memDb();
const env = { ADMIN_PASSWORD: "secret-pass", PUBLIC_URL: "https://example.test", TELEGRAM_BOT_TOKEN: "tok123", TELEGRAM_CHAT_ID: "111,222" };

// capture the Telegram calls instead of sending them
const realFetch = globalThis.fetch, telegram = [];
globalThis.fetch = (u, o) => String(u).startsWith("https://api.telegram.org/")
  ? (telegram.push({ url: String(u), body: o?.body }), Promise.resolve(new Response('{"ok":true}', { status: 200 })))
  : realFetch(u, o);
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
await t("Telegram alert goes to every chat, first one with the photo and the admin link", async () => {
  assert.equal(telegram.length, 4);   // 2 chats x 2 complaints so far
  assert.ok(telegram[0].url.endsWith("/bottok123/sendPhoto")); assert.ok(telegram[0].body instanceof FormData);
  assert.equal(telegram[0].body.get("chat_id"), "111"); assert.ok(telegram[0].body.get("caption").includes(id));
  assert.ok(telegram[0].body.get("reply_markup").includes("https://example.test/#/admin"));
  assert.equal(telegram[1].body.get("chat_id"), "222");
});
await t("public stats", async () => assert.deepEqual((await call("/api/stats")).data, { total: 2, open: 2, done: 0 }));
await t("admin list shows what needs action first: new, then in progress, then resolved", async () => {
  const tk = (await call("/api/admin/login", { method: "POST", body: { password: "secret-pass" } })).data.token;
  const all = (await call("/api/admin/complaints", { token: tk })).data.items;
  const ranks = all.map(c => c.status);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  const oldest = (await call("/api/admin/complaints?sort=oldest", { token: tk })).data.items.map(c => c.createdAt);
  assert.deepEqual(oldest, [...oldest].sort((a, b) => a - b));
});

await t("track by only the 6 digits of the id, or with the prefix and a space", async () => {
  const six = id.split("-")[1];
  for (const q of [six, `TVK38 ${six}`, `tvk38-${six}`]) {
    const items = (await call(`/api/track?q=${encodeURIComponent(q)}`)).data.items;
    assert.equal(items.length, 1); assert.equal(items[0].id, id);
  }
  assert.equal((await call("/api/track?q=000000")).data.items.length, 0);
});

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
await t("citizen sees the result and the dates in tracking", async () => {
  const a = (await call(`/api/track?q=${id}`)).data.items[0]; assert.equal(a.status, 2); assert.equal(a.result, resultUrl);
  assert.ok(a.progressAt && a.resolvedAt && a.createdAt <= a.progressAt && a.progressAt <= a.resolvedAt);
  assert.equal(a.street, "Main St"); assert.equal(a.note, "Work on Monday"); assert.equal(a.name, undefined);
});
await t("public work page lists published finished work with paging and no private data", async () => {
  const r = (await call("/api/work")).data; const w = r.items;
  assert.equal(w.length, 1); assert.equal(w[0].image, resultUrl); assert.equal(w[0].id, undefined); assert.equal(w[0].name, undefined); assert.equal(w[0].street, "Main St");
  assert.ok(w[0].at >= w[0].raisedAt); assert.equal(typeof w[0].days, "number"); assert.equal(r.more, false);
  assert.equal((await call("/api/work?cat=water")).data.items.length, 0);
  assert.equal((await call("/api/work?cat=road")).data.items.length, 1);
  assert.equal((await call("/api/work?offset=1")).data.items.length, 0);
});
await t("admin can unpublish and publish a result", async () => {
  assert.equal((await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { publish: false } })).data.consent, false);
  assert.equal((await call("/api/work")).data.items.length, 0);
  assert.equal((await call(`/api/admin/complaints/${id}`, { method: "PATCH", token, body: { publish: true } })).data.consent, true);
  assert.equal((await call("/api/work")).data.items.length, 1);
});
await t("csv export", async () => {
  const c = await call(`/api/admin/export.csv?t=${encodeURIComponent(token)}`); assert.equal(c.status, 200); assert.ok(c.data.includes(id));
});
await t("per-phone limit (5 an hour)", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await call("/api/complaints", { method: "POST", ip: "9.9.9.9", body: { ...good, phone: "9555555555", push: undefined, photos: [] } })).status, 201);
  assert.equal((await call("/api/complaints", { method: "POST", ip: "9.9.9.9", body: { ...good, phone: "9555555555", push: undefined, photos: [] } })).status, 429);
});
await t("voice message is stored as audio, playable by the admin with Range support, voice-only complaints allowed", async () => {
  const audio = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 251));
  const r = await call("/api/complaints", { method: "POST", ip: "7.7.7.7", body: { cat: "water", desc: "", name: "Voice User", phone: "9444444444", lang: "ta", voice: { data: audio.toString("base64"), type: "audio/webm;codecs=opus", secs: 12 } } });
  assert.equal(r.status, 201);
  assert.equal(db.rows.at(-1).descr, "(குரல் செய்தி)"); assert.equal(db.rows.at(-1).has_voice, true); assert.equal(db.rows.at(-1).voice_type, "audio/webm");
  const vid = r.data.id;
  assert.equal((await call("/api/complaints", { method: "POST", ip: "7.7.7.7", body: { cat: "water", name: "X", phone: "9444444445", voice: { data: "AAAA", type: "text/html", secs: 5 } } })).data.error, "voice");
  assert.equal((await call("/api/complaints", { method: "POST", ip: "7.7.7.7", body: { cat: "water", desc: "", name: "X", phone: "9444444446" } })).data.error, "desc");
  assert.equal((await fetch(`${base}/api/admin/voice/${vid}`)).status, 401);
  const tk = (await call("/api/admin/login", { method: "POST", body: { password: "secret-pass" } })).data.token;
  const url = process.env.VIA_REWRITE ? viaRewrite(`/api/admin/voice/${vid}?t=${encodeURIComponent(tk)}`) : `/api/admin/voice/${vid}?t=${encodeURIComponent(tk)}`;
  const full = await fetch(base + url); assert.equal(full.status, 200); assert.equal(full.headers.get("content-type"), "audio/webm"); assert.equal(full.headers.get("accept-ranges"), "bytes");
  assert.equal(Buffer.from(await full.arrayBuffer()).length, 1000);
  const part = await fetch(base + url, { headers: { Range: "bytes=100-199" } });
  assert.equal(part.status, 206); assert.equal(part.headers.get("content-range"), "bytes 100-199/1000"); assert.equal(Buffer.from(await part.arrayBuffer())[0], 100);
  assert.equal((await fetch(base + url, { headers: { Range: "bytes=5000-" } })).status, 416);
  const d = (await call(`/api/admin/complaints/${vid}`, { token: tk })).data; assert.equal(d.hasVoice, true); assert.equal(d.voiceSecs, 12);
});
await t("unknown route is 404", async () => assert.equal((await call("/api/nothing")).status, 404));

server.close();
console.log(`\n${n} checks passed`);
