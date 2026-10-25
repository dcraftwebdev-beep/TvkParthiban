import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || join(here, "data");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "tvk.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    cat TEXT NOT NULL,
    descr TEXT NOT NULL,
    street TEXT,
    lat REAL, lng REAL,
    has_photo INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'ta',
    status INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_c_phone ON complaints(phone);
  CREATE INDEX IF NOT EXISTS idx_c_status ON complaints(status);
  CREATE TABLE IF NOT EXISTS notifications (
    n INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL,
    audience TEXT NOT NULL,
    to_phone TEXT NOT NULL,
    kind TEXT NOT NULL,
    ok INTEGER NOT NULL,
    error TEXT,
    at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_n_c ON notifications(complaint_id);
`);

export const q = {
  insert: db.prepare(`INSERT INTO complaints (id,cat,descr,street,lat,lng,has_photo,name,phone,lang,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?)`),
  byId: db.prepare("SELECT * FROM complaints WHERE id = ?"),
  byPhone: db.prepare("SELECT * FROM complaints WHERE phone = ? ORDER BY created_at DESC LIMIT 20"),
  update: db.prepare("UPDATE complaints SET status = ?, note = ?, updated_at = ? WHERE id = ?"),
  counts: db.prepare("SELECT status, COUNT(*) AS n FROM complaints GROUP BY status"),
  byCat: db.prepare("SELECT cat, COUNT(*) AS n FROM complaints GROUP BY cat ORDER BY n DESC"),
  last7: db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE created_at > ?"),
  logNotify: db.prepare("INSERT INTO notifications (complaint_id,audience,to_phone,kind,ok,error,at) VALUES (?,?,?,?,?,?,?)"),
  notesFor: db.prepare("SELECT audience,to_phone,kind,ok,error,at FROM notifications WHERE complaint_id = ? ORDER BY n DESC LIMIT 10")
};

export function list({ status, cat, search, limit = 200 }) {
  const where = [], args = [];
  if (status !== undefined && status !== "" && !Number.isNaN(+status)) { where.push("status = ?"); args.push(+status); }
  if (cat) { where.push("cat = ?"); args.push(cat); }
  if (search) {
    where.push("(id LIKE ? OR phone LIKE ? OR name LIKE ? OR descr LIKE ? OR street LIKE ?)");
    const s = `%${search}%`; args.push(s, s, s, s, s);
  }
  const sql = `SELECT * FROM complaints ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ${Math.min(+limit || 200, 1000)}`;
  return db.prepare(sql).all(...args);
}
