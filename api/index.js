// Vercel serverless function: every /api/* request lands here.
import { makeHandler } from "./_lib/app.js";
import { supabaseDb } from "./_lib/supabase.js";

let db;
const handler = makeHandler(() => (db ??= supabaseDb()));

export default handler;
export const config = { maxDuration: 15 };
