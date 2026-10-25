import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { newComplaintMessages, statusMessage, toIntl } from "./messages.js";

const CATS = ["road", "water", "drain", "light", "trash", "power", "other"];
const DEFAULT_URL = "https://tvkparthibankattur.vercel.app";

/* ---------- small helpers ---------- */
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
const send = (res, code, body, type = "application/json; charset=utf-8") => {
  res.statusCode = code;
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const adminView = c => ({
  id: c.id, cat: c.cat, desc: c.descr, street: c.street, lat: c.lat, lng: c.lng, hasPhoto: !!c.has_photo,
  name: c.name, phone: c.phone, lang: c.lang, status: c.status, note: c.note, createdAt: c.created_at, updatedAt: c.updated_at
});
const publicView = c => ({ id: c.id, cat: c.cat, status: c.status, createdAt: c.created_at, updatedAt: c.updated_at, snippet: c.descr.slice(0, 80) });

/* ---------- admin token: HMAC signed, 12h ---------- */
function secrets(env) {
  const password = env.ADMIN_PASSWORD || "";
  const secret = env.ADMIN_SECRET || createHmac("sha256", "tvk-ward38").update(password).digest("hex");
  return { password, secret };
}
const sign = (secret, body) => createHmac("sha256", secret).update(body).digest("base64url");
const makeToken = secret => { const exp = String(Date.now() + 12 * 3600e3); return `${exp}.${sign(secret, exp)}`; };
const validToken = (secret, t) => {
  if (!t || typeof t !== "string") return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig || +exp < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(secret, exp));
  return a.length === b.length && timingSafeEqual(a, b);
};
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

/* ---------- best effort rate limit (per warm instance) ---------- */
const hits = new Map();
function limited(name, ip, max, windowMs) {
  const key = `${name}:${ip}`, now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) { chunks.push(c); if (chunks.reduce((n, b) => n + b.length, 0) > 1.5e6) break; }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
}

/**
 * Builds the request handler. `getDb` returns the data layer (Supabase in production, in memory in tests).
 */
export function makeHandler(getDb, env = process.env) {
  const { password, secret } = secrets(env);
  const prefix = env.ID_PREFIX || "TVK38";
  const publicUrl = (env.PUBLIC_URL || DEFAULT_URL).replace(/\/$/, "");
  const adminPhones = (env.ADMIN_WHATSAPP || "").split(",").map(s => s.replace(/\D/g, "")).filter(Boolean);

  return async function handler(req, res) {
    try {
      const url = new URL(req.url, "http://x");
      const routed = url.searchParams.get("__p");   // set by the rewrite in vercel.json
      const path = (routed !== null ? "/" + routed : url.pathname.replace(/^\/api/, "")).replace(/\/+$/, "") || "/";
      const method = req.method;
      const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
      const bearer = (req.headers.authorization || "").replace(/^Bearer /, "") || url.searchParams.get("t");
      if (path === "/health" && method === "GET") {
        const configured = !!(env.SUPABASE_URL && (env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY));
        return send(res, 200, { ok: true, storage: "supabase", configured, admin: !!env.ADMIN_PASSWORD });
      }
      let db;
      try { db = getDb(); } catch (e) { console.error(e.message); return send(res, 503, { error: "not_configured" }); }

      /* ----- public ----- */

      if (path === "/stats" && method === "GET") {
        const rows = await db.summary();
        const done = rows.filter(r => r.status === 2).length;
        return send(res, 200, { total: rows.length, open: rows.length - done, done });
      }

      if (path === "/complaints" && method === "POST") {
        if (limited("create", ip, 8, 3600e3)) return send(res, 429, { error: "too_many_requests" });
        const b = await readBody(req);
        const cat = CATS.includes(b.cat) ? b.cat : null;
        const descr = clean(b.desc, 600), name = clean(b.name, 60), street = clean(b.street, 120);
        const phone = String(b.phone || "").replace(/\D/g, "").slice(-10);
        const lang = b.lang === "en" ? "en" : "ta";
        if (!cat) return send(res, 400, { error: "category" });
        if (descr.length < 3) return send(res, 400, { error: "desc" });
        if (!name) return send(res, 400, { error: "name" });
        if (!/^[6-9]\d{9}$/.test(phone)) return send(res, 400, { error: "phone" });
        if ((await db.countSince(phone, Date.now() - 3600e3)) >= 5) return send(res, 429, { error: "too_many_requests" });

        let lat = null, lng = null;
        const c = b.coords;
        if (c && Number.isFinite(+c.lat) && Number.isFinite(+c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180) { lat = +c.lat; lng = +c.lng; }

        let photo = null;
        const m = typeof b.photo === "string" && b.photo.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
        if (m) { const buf = Buffer.from(m[1], "base64"); if (buf.length <= 500 * 1024 && buf[0] === 0xff && buf[1] === 0xd8) photo = m[1]; }

        const id = `${prefix}-${randomInt(100000, 1000000)}`, now = Date.now();
        const row = { id, cat, descr, street, lat, lng, has_photo: !!photo, photo, name, phone, lang, status: 0, note: null, created_at: now, updated_at: now };
        await db.insertComplaint(row);
        try { await db.addOutbox(newComplaintMessages(row, { publicUrl, adminPhones }).map(r => ({ ...r, complaint_id: id }))); }
        catch (e) { console.error("outbox insert failed", e); }
        return send(res, 201, { id, status: 0, createdAt: now });
      }

      if (path === "/track" && method === "GET") {
        if (limited("track", ip, 30, 600e3)) return send(res, 429, { error: "too_many_requests" });
        const s = clean(url.searchParams.get("q"), 40).replace(/\s/g, "");
        if (!s) return send(res, 200, { items: [] });
        const digits = s.replace(/\D/g, "").slice(-10);
        let rows = [];
        if (/^TVK\d+-\d{6}$/i.test(s)) { const c = await db.getComplaint(s.toUpperCase()); if (c) rows = [c]; }
        else if (/^[6-9]\d{9}$/.test(digits)) rows = await db.byPhone(digits);
        return send(res, 200, { items: rows.map(publicView) });
      }

      /* ----- admin ----- */
      if (path === "/admin/login" && method === "POST") {
        if (!password) return send(res, 503, { error: "admin_not_configured" });
        if (limited("login", ip, 10, 600e3)) return send(res, 429, { error: "too_many_requests" });
        const b = await readBody(req);
        if (!safeEq(b.password ?? "", password)) return send(res, 401, { error: "bad_password" });
        return send(res, 200, { token: makeToken(secret), expiresIn: 12 * 3600 });
      }

      if (path.startsWith("/admin/")) {
        if (!validToken(secret, bearer)) return send(res, 401, { error: "unauthorized" });

        if (path === "/admin/stats" && method === "GET") {
          const rows = await db.summary();
          const by = [0, 1, 2].map(s => rows.filter(r => r.status === s).length);
          const catCount = {};
          for (const r of rows) catCount[r.cat] = (catCount[r.cat] || 0) + 1;
          return send(res, 200, {
            received: by[0], progress: by[1], resolved: by[2], total: rows.length,
            week: rows.filter(r => r.created_at > Date.now() - 7 * 86400e3).length,
            byCat: Object.entries(catCount).map(([cat, n]) => ({ cat, n })).sort((a, b) => b.n - a.n),
            pending: await db.pendingCount(),
            notify: { provider: "outbox" }
          });
        }

        if (path === "/admin/complaints" && method === "GET") {
          const sp = url.searchParams;
          const items = await db.list({ status: sp.get("status") ?? "", cat: sp.get("cat") || "", search: clean(sp.get("q"), 60) });
          return send(res, 200, { items: items.map(adminView) });
        }

        if (path === "/admin/export.csv" && method === "GET") {
          const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
          const st = ["Received", "In progress", "Resolved"];
          const head = ["ID", "Category", "Status", "Description", "Street", "Lat", "Lng", "Name", "Phone", "Created", "Updated", "Note"];
          const rows = (await db.list({ limit: 1000 })).map(c => [c.id, c.cat, st[c.status], c.descr, c.street, c.lat, c.lng, c.name, c.phone, new Date(c.created_at).toISOString(), new Date(c.updated_at).toISOString(), c.note].map(esc).join(","));
          res.setHeader("Content-Disposition", 'attachment; filename="complaints.csv"');
          return send(res, 200, "﻿" + [head.join(","), ...rows].join("\n"), "text/csv; charset=utf-8");
        }

        let m = path.match(/^\/admin\/photo\/([A-Za-z0-9-]+)$/);
        if (m && method === "GET") {
          const p = await db.getPhoto(m[1]);
          if (!p) return send(res, 404, { error: "not_found" });
          return send(res, 200, Buffer.from(p, "base64"), "image/jpeg");
        }

        m = path.match(/^\/admin\/complaints\/([A-Za-z0-9-]+)(\/message)?$/);
        if (m) {
          const c = await db.getComplaint(m[1]);
          if (!c) return send(res, 404, { error: "not_found" });

          if (!m[2] && method === "GET") return send(res, 200, { ...adminView(c), notifications: (await db.outboxFor(c.id)).map(n => ({ audience: n.audience, kind: n.kind, ok: n.status === "sent", pending: n.status === "pending", error: n.error, at: n.sent_at || n.created_at })) });

          if (!m[2] && method === "PATCH") {
            const b = await readBody(req);
            const status = b.status === undefined ? c.status : +b.status;
            if (![0, 1, 2].includes(status)) return send(res, 400, { error: "status" });
            const note = b.note === undefined ? c.note : clean(b.note, 300);
            await db.update(c.id, { status, note, updated_at: Date.now() });
            const next = { ...c, status, note };
            if (b.notify !== false && (status !== c.status || (note || "") !== (c.note || ""))) await db.addOutbox([{ ...statusMessage(next), complaint_id: c.id }]);
            return send(res, 200, adminView({ ...next, updated_at: Date.now() }));
          }

          if (m[2] && method === "POST") {
            const msg = clean((await readBody(req)).message, 800);
            if (!msg) return send(res, 400, { error: "bad_request" });
            await db.addOutbox([{ complaint_id: c.id, audience: "user", to_phone: toIntl(c.phone), kind: "custom", message: msg }]);
            return send(res, 200, { sent: false, queued: true });
          }
        }
      }

      return send(res, 404, { error: "not_found" });
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: "server_error" });
    }
  };
}

export const randomSecret = () => randomBytes(24).toString("hex");
