// Minimal Supabase (PostgREST) data layer over fetch. No SDK needed.
const COLS = "id,cat,descr,street,lat,lng,has_photo,photo_count,has_result,name,phone,lang,status,note,consent_public,created_at,updated_at,progress_at,resolved_at";

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
  const one = async path => (await rest(path))[0] || null;

  return {
    async insertComplaint(row) { await rest("/complaints", { method: "POST", body: row, prefer: "return=minimal" }); },
    getComplaint: id => one(`/complaints?id=${eq(id)}&select=${COLS}`),
    async getPhoto(id, i) { const r = await one(`/complaints?id=${eq(id)}&select=photos`); return r?.photos?.[i] || null; },
    async getResult(id) { return (await one(`/complaints?id=${eq(id)}&select=result_image`))?.result_image || null; },
    async getPush(id) { return (await one(`/complaints?id=${eq(id)}&select=push_sub`))?.push_sub || null; },
    byPhone: (phone, limit = 20) => rest(`/complaints?phone=${eq(phone)}&select=${COLS}&order=created_at.desc&limit=${limit}`),
    async countSince(phone, since) { return (await rest(`/complaints?phone=${eq(phone)}&created_at=gt.${+since}&select=id`)).length; },
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
    summary: () => rest("/complaints?select=cat,status,created_at&limit=10000"),
    work: ({ limit = 12, offset = 0, cat = "" } = {}) => rest(`/complaints?has_result=eq.true&consent_public=eq.true${cat ? `&cat=${eq(cat)}` : ""}&select=id,cat,street,created_at,resolved_at&order=resolved_at.desc&limit=${limit}&offset=${offset}`),

    /* admin push devices */
    async saveAdminPush(sub) { await rest("/admin_push?on_conflict=endpoint", { method: "POST", body: { endpoint: sub.endpoint, sub, created_at: Date.now() }, prefer: "resolution=merge-duplicates,return=minimal" }); },
    listAdminPush: () => rest("/admin_push?select=endpoint,sub"),
    async deleteAdminPush(endpoint) { await rest(`/admin_push?endpoint=${eq(endpoint)}`, { method: "DELETE", prefer: "return=minimal" }); },

    /* optional WhatsApp queue (only used when WHATSAPP_QUEUE=1) */
    async addOutbox(rows) {
      if (!rows.length) return;
      const now = Date.now();
      await rest("/outbox", { method: "POST", body: rows.map(r => ({ ...r, created_at: now })), prefer: "return=minimal" });
    },
    outboxFor: id => rest(`/outbox?complaint_id=${eq(id)}&select=audience,to_phone,kind,status,error,created_at,sent_at&order=n.desc&limit=10`),
    pendingBatch: (limit = 10) => rest(`/outbox?status=eq.pending&select=n,to_phone,message,attempts&order=n.asc&limit=${limit}`),
    async markOutbox(n, patch) { await rest(`/outbox?n=eq.${+n}`, { method: "PATCH", body: patch, prefer: "return=minimal" }); },
    async pendingCount() { return (await rest("/outbox?status=eq.pending&select=n&limit=1000")).length; }
  };
}
