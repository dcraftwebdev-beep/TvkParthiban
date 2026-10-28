// In-memory stand-in for api/_lib/supabase.js (same interface). Used by the tests and the local dev server.
export function memDb() {
  const rows = [], outbox = [], admins = [];
  const light = ({ photos, photo, voice, result_image, after_photo, push_sub, ...r }) => ({ ...r });
  return {
    rows, outbox, admins,
    async insertComplaint(r) { rows.push({ ...r }); },
    async getComplaint(id) { const r = rows.find(x => x.id === id); return r ? light(r) : null; },
    async getPhoto(id, i) { return rows.find(x => x.id === id)?.photos?.[i] || null; },
    async getVoice(id) { const r = rows.find(x => x.id === id); return r && r.voice ? { voice: r.voice, voice_type: r.voice_type } : null; },
    async getResult(id) { return rows.find(x => x.id === id)?.result_image || null; },
    async getPush(id) { return rows.find(x => x.id === id)?.push_sub || null; },
    async byPhone(p) { return rows.filter(r => r.phone === p).sort((a, b) => b.created_at - a.created_at).map(light); },
    async countSince(p, since) { return rows.filter(r => r.phone === p && r.created_at > since).length; },
    async list({ status, cat, search, sort }) {
      const out = rows.filter(r => (status === "" || status === undefined || r.status === +status) && (!cat || r.cat === cat) &&
        (!search || [r.id, r.phone, r.name, r.descr, r.street].some(v => String(v).toLowerCase().includes(search.toLowerCase())))).map(light);
      const byNew = (a, b) => b.created_at - a.created_at;
      return out.sort(sort === "oldest" ? (a, b) => a.created_at - b.created_at : sort === "newest" ? byNew : (a, b) => a.status - b.status || byNew(a, b));
    },
    async update(id, patch) { Object.assign(rows.find(x => x.id === id), patch); },
    async summary() { return rows.map(({ cat, status, created_at }) => ({ cat, status, created_at })); },
    async work({ limit = 12, offset = 0, cat = "" } = {}) { return rows.filter(r => r.has_result && r.consent_public && (!cat || r.cat === cat)).sort((a, b) => b.resolved_at - a.resolved_at).slice(offset, offset + limit).map(({ id, cat, street, created_at, resolved_at }) => ({ id, cat, street, created_at, resolved_at })); },
    async saveAdminPush(sub) { const i = admins.findIndex(a => a.endpoint === sub.endpoint); const row = { endpoint: sub.endpoint, sub }; if (i >= 0) admins[i] = row; else admins.push(row); },
    async listAdminPush() { return admins.map(a => ({ ...a })); },
    async deleteAdminPush(endpoint) { const i = admins.findIndex(a => a.endpoint === endpoint); if (i >= 0) admins.splice(i, 1); },
    async addOutbox(list) { for (const r of list) outbox.push({ n: outbox.length + 1, status: "pending", attempts: 0, created_at: Date.now(), ...r }); },
    async outboxFor(id) { return outbox.filter(o => o.complaint_id === id).reverse(); },
    async pendingCount() { return outbox.filter(o => o.status === "pending").length; }
  };
}
