import express from "express";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, q, list, UPLOAD_DIR } from "./db.js";
import { notifyNewComplaint, notifyStatus, notifyInfo, send, ADMIN_PHONES } from "./notify.js";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = +process.env.PORT || 8787;
const PREFIX = process.env.ID_PREFIX || "TVK38";
const CATS = ["road", "water", "drain", "light", "trash", "power", "other"];

/* ---------- admin auth (password -> signed 12h token) ---------- */
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = randomBytes(6).toString("hex");
  console.warn(`\n[admin] ADMIN_PASSWORD is not set. Temporary password for this run: ${ADMIN_PASSWORD}\n`);
}
const SECRET = process.env.ADMIN_SECRET || createHmac("sha256", "tvk").update(ADMIN_PASSWORD).digest("hex");
const sign = body => createHmac("sha256", SECRET).update(body).digest("base64url");
const mkToken = () => { const exp = String(Date.now() + 12 * 3600e3); return `${exp}.${sign(exp)}`; };
const okToken = t => {
  if (!t || typeof t !== "string") return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig || +exp < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
};
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const requireAdmin = (req, res, next) => {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "") || req.query.t;
  if (!okToken(t)) return res.status(401).json({ error: "unauthorized" });
  next();
};

/* ---------- tiny in-memory rate limiter ---------- */
const hits = new Map();
const limit = (name, max, windowMs) => (req, res, next) => {
  const key = `${name}:${req.ip}`, now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return res.status(429).json({ error: "too_many_requests" });
  arr.push(now); hits.set(key, arr); next();
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

/* ---------- helpers ---------- */
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
const publicView = c => ({ id: c.id, cat: c.cat, status: c.status, createdAt: c.created_at, updatedAt: c.updated_at, snippet: c.descr.slice(0, 80) });
const adminView = c => ({
  id: c.id, cat: c.cat, desc: c.descr, street: c.street, lat: c.lat, lng: c.lng, hasPhoto: !!c.has_photo,
  name: c.name, phone: c.phone, lang: c.lang, status: c.status, note: c.note, createdAt: c.created_at, updatedAt: c.updated_at
});
function newId() {
  for (let i = 0; i < 10; i++) { const id = `${PREFIX}-${randomInt(100000, 1000000)}`; if (!q.byId.get(id)) return id; }
  throw new Error("id generation failed");
}

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "700kb" }));
app.use((req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "same-origin"); next(); });

/* ---------- public API ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true, notify: notifyInfo() }));

app.get("/api/stats", (_req, res) => {
  const by = Object.fromEntries(q.counts.all().map(r => [r.status, r.n]));
  const total = (by[0] || 0) + (by[1] || 0) + (by[2] || 0);
  res.json({ total, open: (by[0] || 0) + (by[1] || 0), done: by[2] || 0 });
});

app.post("/api/complaints", limit("create", 8, 3600e3), (req, res) => {
  const b = req.body || {};
  const cat = CATS.includes(b.cat) ? b.cat : null;
  const descr = clean(b.desc, 600), name = clean(b.name, 60), street = clean(b.street, 120);
  const phone = String(b.phone || "").replace(/\D/g, "").slice(-10);
  const lang = b.lang === "en" ? "en" : "ta";
  if (!cat) return res.status(400).json({ error: "category" });
  if (descr.length < 3) return res.status(400).json({ error: "desc" });
  if (!name) return res.status(400).json({ error: "name" });
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: "phone" });
  let lat = null, lng = null;
  if (b.coords && Number.isFinite(+b.coords.lat) && Number.isFinite(+b.coords.lng) && Math.abs(b.coords.lat) <= 90 && Math.abs(b.coords.lng) <= 180) { lat = +b.coords.lat; lng = +b.coords.lng; }

  const id = newId(), now = Date.now();
  let hasPhoto = 0;
  const m = typeof b.photo === "string" && b.photo.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (m) { const buf = Buffer.from(m[1], "base64"); if (buf.length <= 500 * 1024 && buf[0] === 0xff && buf[1] === 0xd8) { writeFileSync(join(UPLOAD_DIR, `${id}.jpg`), buf); hasPhoto = 1; } }

  q.insert.run(id, cat, descr, street, lat, lng, hasPhoto, name, phone, lang, now, now);
  notifyNewComplaint(q.byId.get(id));
  res.status(201).json({ id, status: 0, createdAt: now });
});

app.get("/api/track", limit("track", 30, 600e3), (req, res) => {
  const s = clean(req.query.q, 40).replace(/\s/g, "");
  if (!s) return res.json({ items: [] });
  const digits = s.replace(/\D/g, "").slice(-10);
  let rows = [];
  if (/^TVK\d+-\d{6}$/i.test(s)) { const c = q.byId.get(s.toUpperCase()); if (c) rows = [c]; }
  else if (/^[6-9]\d{9}$/.test(digits)) rows = q.byPhone.all(digits);
  res.json({ items: rows.map(publicView) });
});

/* ---------- admin API ---------- */
app.post("/api/admin/login", limit("login", 10, 600e3), (req, res) => {
  if (!safeEq(req.body?.password ?? "", ADMIN_PASSWORD)) return res.status(401).json({ error: "bad_password" });
  res.json({ token: mkToken(), expiresIn: 12 * 3600 });
});

app.get("/api/admin/complaints", requireAdmin, (req, res) => {
  res.json({ items: list({ status: req.query.status, cat: req.query.cat, search: clean(req.query.q, 60) }).map(adminView) });
});

app.get("/api/admin/stats", requireAdmin, (_req, res) => {
  const by = Object.fromEntries(q.counts.all().map(r => [r.status, r.n]));
  res.json({
    received: by[0] || 0, progress: by[1] || 0, resolved: by[2] || 0,
    total: (by[0] || 0) + (by[1] || 0) + (by[2] || 0),
    week: q.last7.get(Date.now() - 7 * 86400e3).n,
    byCat: q.byCat.all(),
    notify: { ...notifyInfo() }
  });
});

app.get("/api/admin/complaints/:id", requireAdmin, (req, res) => {
  const c = q.byId.get(req.params.id);
  if (!c) return res.status(404).json({ error: "not_found" });
  res.json({ ...adminView(c), notifications: q.notesFor.all(c.id) });
});

app.patch("/api/admin/complaints/:id", requireAdmin, (req, res) => {
  const c = q.byId.get(req.params.id);
  if (!c) return res.status(404).json({ error: "not_found" });
  const status = req.body.status === undefined ? c.status : +req.body.status;
  if (![0, 1, 2].includes(status)) return res.status(400).json({ error: "status" });
  const note = req.body.note === undefined ? c.note : clean(req.body.note, 300);
  q.update.run(status, note, Date.now(), c.id);
  const next = q.byId.get(c.id);
  if (req.body.notify !== false && (status !== c.status || (note || "") !== (c.note || ""))) notifyStatus(next);
  res.json(adminView(next));
});

app.post("/api/admin/complaints/:id/message", requireAdmin, async (req, res) => {
  const c = q.byId.get(req.params.id);
  const msg = clean(req.body?.message, 800);
  if (!c || !msg) return res.status(400).json({ error: "bad_request" });
  res.json({ sent: await send(c.id, "user", "custom", c.phone, msg) });
});

app.get("/api/admin/photo/:id", requireAdmin, (req, res) => {
  const f = join(UPLOAD_DIR, `${String(req.params.id).replace(/[^A-Za-z0-9-]/g, "")}.jpg`);
  if (!existsSync(f)) return res.status(404).end();
  res.type("jpeg").send(readFileSync(f));
});

app.get("/api/admin/export.csv", requireAdmin, (_req, res) => {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["ID", "Category", "Status", "Description", "Street", "Lat", "Lng", "Name", "Phone", "Created", "Updated", "Note"];
  const st = ["Received", "In progress", "Resolved"];
  const rows = list({ limit: 1000 }).map(c => [c.id, c.cat, st[c.status], c.descr, c.street, c.lat, c.lng, c.name, c.phone, new Date(c.created_at).toISOString(), new Date(c.updated_at).toISOString(), c.note].map(esc).join(","));
  res.setHeader("Content-Disposition", 'attachment; filename="complaints.csv"');
  res.type("text/csv").send("﻿" + [head.join(","), ...rows].join("\n"));
});

app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

/* ---------- serve the built site ---------- */
const dist = join(here, "..", "dist");
if (existsSync(dist)) app.use(express.static(dist));

app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ error: "server_error" }); });

app.listen(PORT, () => {
  const n = notifyInfo();
  console.log(`TVK ward portal API on http://localhost:${PORT}  (notify: ${n.provider}, admin numbers: ${ADMIN_PHONES.length})`);
});
process.on("SIGINT", () => { db.close(); process.exit(0); });
