// In-memory stand-in for api/_lib/supabase.js (same interface). Used by the tests and the local dev server.
export function memDb() {
  const rows = [], outbox = [], admins = [];
  const light = ({ photos, photo, result_image, after_photo, push_sub, ...r }) => ({ ...r });
  return {
    rows, outbox, admins,
    async insertComplaint(r) { rows.push({ ...r }); },
    async getComplaint(id) { const r = rows.find(x => x.id === id); return r ? light(r) : null; },
    async getPhoto(id, i) { return rows.find(x => x.id === id)?.photos?.[i] || null; },
    async getResult(id) { return rows.find(x => x.id === id)?.result_image || null; },
    async getPush(id) { return rows.find(x => x.id === id)?.push_sub || null; },
    async byPhone(p) { return rows.filter(r => r.phone === p).sort((a, b) => b.created_at - a.created_at).map(light); },
    async countSince(p, since) { return rows.filter(r => r.phone === p && r.created_at > since).length; },
    async list({ status, cat, search }) {
      return rows.filter(r => (status === "" || status === undefined || r.status === +status) && (!cat || r.cat === cat) &&
        (!search || [r.id, r.phone, r.name, r.descr, r.street].some(v => String(v).toLowerCase().includes(search.toLowerCase())))).map(light).reverse();
    },
    async update(id, patch) { Object.assign(rows.find(x => x.id === id), patch); },
    async summary() { return rows.map(({ cat, status, created_at }) => ({ cat, status, created_at })); },
    async work(limit = 12) { return rows.filter(r => r.has_result && r.consent_public).sort((a, b) => b.resolved_at - a.resolved_at).slice(0, limit).map(({ id, cat, resolved_at }) => ({ id, cat, resolved_at })); },
    async saveAdminPush(sub) { const i = admins.findIndex(a => a.endpoint === sub.endpoint); const row = { endpoint: sub.endpoint, sub }; if (i >= 0) admins[i] = row; else admins.push(row); },
    async listAdminPush() { return admins.map(a => ({ ...a })); },
    async deleteAdminPush(endpoint) { const i = admins.findIndex(a => a.endpoint === endpoint); if (i >= 0) admins.splice(i, 1); },
    async addOutbox(list) { for (const r of list) outbox.push({ n: outbox.length + 1, status: "pending", attempts: 0, created_at: Date.now(), ...r }); },
    async outboxFor(id) { return outbox.filter(o => o.complaint_id === id).reverse(); },
    async pendingCount() { return outbox.filter(o => o.status === "pending").length; }
  };
}
