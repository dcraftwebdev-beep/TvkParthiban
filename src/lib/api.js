const TOKEN_KEY = "tvk38.admin";

async function req(path, { method = "GET", body, token } = {}) {
  const res = await fetch(path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) { const e = new Error(data?.error || `http_${res.status}`); e.status = res.status; throw e; }
  return data;
}

export const api = {
  stats: () => req("/api/stats"),
  create: payload => req("/api/complaints", { method: "POST", body: payload }),
  track: q => req(`/api/track?q=${encodeURIComponent(q)}`),
  work: (p = {}) => req(`/api/work?${new URLSearchParams(Object.entries(p).filter(([, v]) => v !== "" && v != null))}`),
  pushKey: () => req("/api/push-key")
};

export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } };
export const setToken = t => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

export const admin = {
  login: password => req("/api/admin/login", { method: "POST", body: { password } }),
  stats: t => req("/api/admin/stats", { token: t }),
  list: (t, p = {}) => req(`/api/admin/complaints?${new URLSearchParams(Object.entries(p).filter(([, v]) => v !== "" && v != null))}`, { token: t }),
  one: (t, id) => req(`/api/admin/complaints/${id}`, { token: t }),
  patch: (t, id, body) => req(`/api/admin/complaints/${id}`, { method: "PATCH", body, token: t }),
  message: (t, id, message) => req(`/api/admin/complaints/${id}/message`, { method: "POST", body: { message }, token: t }),
  savePush: (t, sub) => req("/api/admin/push", { method: "POST", body: { sub }, token: t }),
  voiceUrl: (t, id) => `/api/admin/voice/${id}?t=${encodeURIComponent(t)}`,
  photoUrl: (t, id, i = 0) => `/api/admin/photo/${id}/${i}?t=${encodeURIComponent(t)}`,
  csvUrl: t => `/api/admin/export.csv?t=${encodeURIComponent(t)}`
};
