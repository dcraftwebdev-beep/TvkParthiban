// Local development API on http://localhost:8787 (vite proxies /api here).
// Uses your Supabase project when SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env, otherwise an in-memory store
// (data disappears when you stop it, so you can test freely).
import http from "node:http";
import { makeHandler } from "../api/_lib/app.js";
import { supabaseDb } from "../api/_lib/supabase.js";
import { memDb } from "../test/memdb.js";

const useSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
if (!process.env.ADMIN_PASSWORD) { process.env.ADMIN_PASSWORD = "dev-admin"; console.log("ADMIN_PASSWORD not set, using: dev-admin"); }
const db = useSupabase ? supabaseDb() : memDb();
const port = +process.env.PORT || 8787;

http.createServer(makeHandler(() => db)).listen(port, () => {
  console.log(`Local API on http://localhost:${port}  (data: ${useSupabase ? "your Supabase project" : "in memory"})`);
});
