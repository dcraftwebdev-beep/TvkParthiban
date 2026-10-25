import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { newComplaintMessages, statusMessage, toIntl } from "./messages.js";
import { sendPush, citizenPush, adminPush, pushEnabled } from "./push.js";

const CATS = ["road", "water", "drain", "light", "trash", "power", "other"];
const DEFAULT_URL = "https://tvkparthibankattur.vercel.app";
const MAX_PHOTOS = 4;

/* ---------- small helpers ---------- */
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
const send = (res, code, body, type = "application/json; charset=utf-8", cache = "no-store") => {
  res.statusCode = code;
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", cache);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const esc = s => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

/** Accepts a "data:image/jpeg;base64,..." string, returns the base64 part if it is a real JPEG under maxBytes. */
function jpegB64(s, maxBytes) {
  const m = typeof s === "string" && s.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  return buf.length <= maxBytes && buf[0] === 0xff && buf[1] === 0xd8 ? m[1] : null;
}
const validSub = s => s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.keys && s.keys.p256dh && s.keys.auth;

/* ---------- tokens: admin session (12h) and per-complaint result link ---------- */
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
  const chunks = []; let size = 0;
  for await (const c of req) { chunks.push(c); size += c.length; if (size > 6e6) break; }
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
  const queueWhatsApp = env.WHATSAPP_QUEUE === "1";

  const resultKey = id => sign(secret, "result:" + id).slice(0, 14);
  const resultPath = id => `/api/r/${id}/image?k=${resultKey(id)}`;
  const resultPage = id => `${publicUrl}/api/r/${id}?k=${resultKey(id)}`;

  const adminView = c => ({
    id: c.id, cat: c.cat, desc: c.descr, street: c.street, lat: c.lat, lng: c.lng,
    hasPhoto: !!c.has_photo, photoCount: c.photo_count || 0, hasResult: !!c.has_result,
    name: c.name, phone: c.phone, lang: c.lang, status: c.status, note: c.note, consent: !!c.consent_public,
    createdAt: c.created_at, updatedAt: c.updated_at, progressAt: c.progress_at || null, resolvedAt: c.resolved_at,
    resultUrl: c.has_result ? resultPath(c.id) : null, resultPage: c.has_result ? resultPage(c.id) : null
  });
  const publicView = c => ({
    id: c.id, cat: c.cat, status: c.status, createdAt: c.created_at, updatedAt: c.updated_at,
    progressAt: c.progress_at || null, resolvedAt: c.resolved_at || null, street: c.street || "", note: c.note || "",
    snippet: c.descr.slice(0, 80), result: c.has_result ? resultPath(c.id) : null
  });

  async function pushAllAdmins(db, payload) {
    if (!pushEnabled(env)) return;
    const subs = await db.listAdminPush();
    await Promise.allSettled(subs.map(async r => {
      const out = await sendPush(env, r.sub, payload);
      if (out.gone) await db.deleteAdminPush(r.endpoint);
    }));
  }

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
        return send(res, 200, { ok: true, storage: "supabase", configured, admin: !!env.ADMIN_PASSWORD, push: pushEnabled(env) });
      }
      let db;
      try { db = getDb(); } catch (e) { console.error(e.message); return send(res, 503, { error: "not_configured" }); }

      /* ----- public ----- */
      if (path === "/stats" && method === "GET") {
        const rows = await db.summary();
        const done = rows.filter(r => r.status === 2).length;
        return send(res, 200, { total: rows.length, open: rows.length - done, done });
      }

      if (path === "/push-key" && method === "GET") return send(res, 200, { key: pushEnabled(env) ? env.VAPID_PUBLIC_KEY : null });

      if (path === "/work" && method === "GET") {
        const sp = url.searchParams;
        const limit = Math.min(Math.max(+sp.get("limit") || 12, 1), 24), offset = Math.max(+sp.get("offset") || 0, 0);
        const cat = CATS.includes(sp.get("cat")) ? sp.get("cat") : "";
        const rows = await db.work({ limit: limit + 1, offset, cat });   // one extra row tells us whether there is a next page
        const days = r => Math.max(0, Math.round((r.resolved_at - r.created_at) / 86400000));
        return send(res, 200, {
          items: rows.slice(0, limit).map(r => ({ cat: r.cat, street: r.street || "", raisedAt: r.created_at, at: r.resolved_at, days: days(r), image: resultPath(r.id), page: resultPage(r.id) })),
          more: rows.length > limit
        }, "application/json; charset=utf-8", "public, max-age=60");
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

        const list = Array.isArray(b.photos) ? b.photos : (b.photo ? [b.photo] : []);
        const photos = [];
        let total = 0;
        for (const p of list.slice(0, MAX_PHOTOS)) {
          const j = jpegB64(p, 300 * 1024);
          if (j && total + j.length < 1.3e6) { photos.push(j); total += j.length; }
        }

        const id = `${prefix}-${randomInt(100000, 1000000)}`, now = Date.now();
        const row = {
          id, cat, descr, street, lat, lng, has_photo: photos.length > 0, photo_count: photos.length, photos,
          has_result: false, name, phone, lang, status: 0, note: null, consent_public: b.consent === true,
          push_sub: validSub(b.push) ? b.push : null, created_at: now, updated_at: now
        };
        await db.insertComplaint(row);
        if (queueWhatsApp) {
          try { await db.addOutbox(newComplaintMessages(row, { publicUrl, adminPhones }).map(r => ({ ...r, complaint_id: id }))); }
          catch (e) { console.error("outbox insert failed", e); }
        }
        try { await pushAllAdmins(db, adminPush(row, `${publicUrl}/#/admin`)); } catch (e) { console.error("admin push failed", e); }
        return send(res, 201, { id, status: 0, createdAt: now, pushSaved: !!row.push_sub, photos: photos.length });
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

      /* ----- before/after result: page for link previews + the image itself ----- */
      let m = path.match(/^\/r\/(TVK\d+-\d{6})(\/image)?$/);
      if (m && method === "GET") {
        const id = m[1], k = url.searchParams.get("k") || "";
        if (!safeEq(k, resultKey(id))) return send(res, 404, { error: "not_found" });
        const c = await db.getComplaint(id);
        if (!c || !c.has_result) return send(res, 404, { error: "not_found" });
        if (m[2]) {
          const b64 = await db.getResult(id);
          if (!b64) return send(res, 404, { error: "not_found" });
          return send(res, 200, Buffer.from(b64, "base64"), "image/jpeg", "public, max-age=3600");
        }
        const img = `${publicUrl}/api/r/${id}/image?k=${resultKey(id)}`;
        const ta = c.lang !== "en";
        const title = ta ? `புகார் ${id} தீர்க்கப்பட்டது` : `Complaint ${id} resolved`;
        const desc = ta ? "வார்டு 38 காட்டூர் · முன் / பின் படங்கள்" : "Ward 38 Kattur · before and after photos";
        const html = `<!doctype html><html lang="${ta ? "ta" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}">
<style>body{margin:0;background:#3d060c;color:#fff;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
main{max-width:640px;width:100%;text-align:center}img{width:100%;border-radius:16px;border:3px solid #f5c400;display:block}
h1{font-size:22px;margin:18px 0 6px}p{color:#ffffffbf;margin:0 0 18px}a{display:inline-block;background:#f5c400;color:#3d060c;font-weight:700;padding:13px 26px;border-radius:99px;text-decoration:none}</style></head>
<body><main><img src="${esc(img)}" alt=""><h1>${esc(title)}</h1><p>${esc(desc)}</p><a href="${esc(publicUrl)}/#track">${ta ? "தளத்தைப் பார்க்க" : "Open the site"}</a></main></body></html>`;
        return send(res, 200, html, "text/html; charset=utf-8", "public, max-age=300");
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
            pending: queueWhatsApp ? await db.pendingCount() : 0,
            push: pushEnabled(env),
            notify: { provider: "outbox" }
          });
        }

        if (path === "/admin/push" && method === "POST") {
          const b = await readBody(req);
          if (!validSub(b.sub)) return send(res, 400, { error: "bad_subscription" });
          await db.saveAdminPush(b.sub);
          return send(res, 200, { ok: true });
        }

        if (path === "/admin/complaints" && method === "GET") {
          const sp = url.searchParams;
          const items = await db.list({ status: sp.get("status") ?? "", cat: sp.get("cat") || "", search: clean(sp.get("q"), 60) });
          return send(res, 200, { items: items.map(adminView) });
        }

        if (path === "/admin/export.csv" && method === "GET") {
          const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
          const st = ["Received", "In progress", "Resolved"];
          const head = ["ID", "Category", "Status", "Description", "Street", "Lat", "Lng", "Name", "Phone", "Photos", "Created", "Updated", "Note"];
          const rows = (await db.list({ limit: 1000 })).map(c => [c.id, c.cat, st[c.status], c.descr, c.street, c.lat, c.lng, c.name, c.phone, c.photo_count || 0, new Date(c.created_at).toISOString(), new Date(c.updated_at).toISOString(), c.note].map(q).join(","));
          res.setHeader("Content-Disposition", 'attachment; filename="complaints.csv"');
          return send(res, 200, "﻿" + [head.join(","), ...rows].join("\n"), "text/csv; charset=utf-8");
        }

        m = path.match(/^\/admin\/photo\/([A-Za-z0-9-]+)(?:\/(\d))?$/);
        if (m && method === "GET") {
          const p = await db.getPhoto(m[1], +(m[2] || 0));
          if (!p) return send(res, 404, { error: "not_found" });
          return send(res, 200, Buffer.from(p, "base64"), "image/jpeg");
        }

        m = path.match(/^\/admin\/complaints\/([A-Za-z0-9-]+)(\/message)?$/);
        if (m) {
          const c = await db.getComplaint(m[1]);
          if (!c) return send(res, 404, { error: "not_found" });

          if (!m[2] && method === "GET") {
            const notifications = queueWhatsApp ? (await db.outboxFor(c.id)).map(n => ({ audience: n.audience, kind: n.kind, ok: n.status === "sent", pending: n.status === "pending", error: n.error, at: n.sent_at || n.created_at })) : [];
            return send(res, 200, { ...adminView(c), notifications, canPush: !!(await db.getPush(c.id)) });
          }

          if (!m[2] && method === "PATCH") {
            const b = await readBody(req);
            const status = b.status === undefined ? c.status : +b.status;
            if (![0, 1, 2].includes(status)) return send(res, 400, { error: "status" });
            const note = b.note === undefined ? c.note : clean(b.note, 300);
            const patch = { status, note, updated_at: Date.now() };
            if (status === 1 && !c.progress_at) patch.progress_at = Date.now();
            if (status === 2 && c.status !== 2) patch.resolved_at = Date.now();
            if (status !== 2 && c.resolved_at) patch.resolved_at = null;
            if (typeof b.publish === "boolean") patch.consent_public = b.publish;
            if (b.after !== undefined) {
              const after = jpegB64(b.after, 500 * 1024), result = jpegB64(b.result, 1300 * 1024);
              if (!after || !result) return send(res, 400, { error: "image" });
              patch.after_photo = after; patch.result_image = result; patch.has_result = true;
              if (status !== 2) return send(res, 400, { error: "result_needs_resolved" });
            }
            await db.update(c.id, patch);
            const next = { ...c, ...patch };

            const changed = status !== c.status || (note || "") !== (c.note || "") || patch.has_result;
            let pushed = false;
            if (b.notify !== false && changed) {
              const sub = await db.getPush(c.id);
              if (sub && (status === 2 || status === 1)) {
                const target = next.has_result ? resultPage(c.id) : `${publicUrl}/#track`;
                pushed = (await sendPush(env, sub, citizenPush(next, target))).ok;
              }
              if (queueWhatsApp) await db.addOutbox([{ ...statusMessage(next), complaint_id: c.id }]);
            }
            return send(res, 200, { ...adminView({ ...next }), pushed });
          }

          if (m[2] && method === "POST") {
            if (!queueWhatsApp) return send(res, 400, { error: "whatsapp_queue_off" });
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
