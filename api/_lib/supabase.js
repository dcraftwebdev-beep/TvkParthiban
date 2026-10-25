// Minimal Supabase (PostgREST) data layer over fetch. No SDK needed.
const COLS = "id,cat,descr,street,lat,lng,has_photo,name,phone,lang,status,note,created_at,updated_at";

export function supabaseDb(env = process.env) {
  const url = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are not set");

  async function rest(path, { method = "GET", body, prefer } = {}) {
    const res = await fetch(`${url}/rest/v1${path}`, {
      method,
      headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`supabase ${res.status}: ${text.slice(0, 240)}`);
    return text ? JSON.parse(text) : null;
  }
  const eq = v => `eq.${encodeURIComponent(v)}`;

  return {
    async insertComplaint(row) { await rest("/complaints", { method: "POST", body: row, prefer: "return=minimal" }); },
    async getComplaint(id) { return (await rest(`/complaints?id=${eq(id)}&select=${COLS}`))[0] || null; },
    async getPhoto(id) { return (await rest(`/complaints?id=${eq(id)}&select=photo`))[0]?.photo || null; },
    async byPhone(phone, limit = 20) { return rest(`/complaints?phone=${eq(phone)}&select=${COLS}&order=created_at.desc&limit=${limit}`); },
    async countSince(phone, since) {
      const rows = await rest(`/complaints?phone=${eq(phone)}&created_at=gt.${+since}&select=id`);
      return rows.length;
    },
    async list({ status, cat, search, limit = 200 }) {
      const q = [`select=${COLS}`, "order=created_at.desc", `limit=${Math.min(+limit || 200, 1000)}`];
      if (status !== undefined && status !== "" && !Number.isNaN(+status)) q.push(`status=eq.${+status}`);
      if (cat) q.push(`cat=${eq(cat)}`);
      if (search) {
        const s = String(search).replace(/[^\p{L}\p{N} .@_-]/gu, "").trim();
        if (s) q.push(`or=(${["id", "phone", "name", "descr", "street"].map(c => `${c}.ilike.*${encodeURIComponent(s)}*`).join(",")})`);
      }
      return rest(`/complaints?${q.join("&")}`);
    },
    async update(id, patch) { await rest(`/complaints?id=${eq(id)}`, { method: "PATCH", body: patch, prefer: "return=minimal" }); },
    async summary() { return rest("/complaints?select=cat,status,created_at&limit=10000"); },
    async addOutbox(rows) {
      if (!rows.length) return;
      const now = Date.now();
      await rest("/outbox", { method: "POST", body: rows.map(r => ({ ...r, created_at: now })), prefer: "return=minimal" });
    },
    async outboxFor(id) {
      const rows = await rest(`/outbox?complaint_id=${eq(id)}&select=audience,to_phone,kind,status,error,created_at,sent_at&order=n.desc&limit=10`);
      return rows;
    },
    async pendingBatch(limit = 10) { return rest(`/outbox?status=eq.pending&select=n,to_phone,message,attempts&order=n.asc&limit=${limit}`); },
    async markOutbox(n, patch) { await rest(`/outbox?n=eq.${+n}`, { method: "PATCH", body: patch, prefer: "return=minimal" }); },
    async pendingCount() {
      const rows = await rest("/outbox?status=eq.pending&select=n&limit=1000");
      return rows.length;
    }
  };
}
