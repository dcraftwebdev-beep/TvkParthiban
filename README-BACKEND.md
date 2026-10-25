# TVK Ward 38 (Kattur) complaint portal: backend and admin

Live site: https://tvkparthibankattur.vercel.app

There are two ways to run the backend. Production uses Vercel + Supabase. Local development can use the built-in SQLite server.

| | Production (Vercel) | Local development |
|---|---|---|
| API | `api/[...path].js` (Vercel function) | `server/index.js` (Express) |
| Data | Supabase Postgres | SQLite file in `server/data/` |
| WhatsApp | queued in the `outbox` table, sent by `npm run worker` | printed in the terminal, or sent directly with whatsapp-mcp |

## 1. Production: Vercel + Supabase

### a) Create the tables (once)
Supabase dashboard, SQL Editor, New query. Paste the contents of `supabase/schema.sql` and press Run.

### b) Add environment variables in Vercel
Project, Settings, Environment Variables. Add these for Production, then redeploy.

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project Settings, API, Project URL |
| `SUPABASE_SERVICE_KEY` | Project Settings, API, the **service_role** key. Secret. Never commit it. |
| `ADMIN_PASSWORD` | the login password for `/#/admin` |
| `ADMIN_SECRET` | any long random text (signs admin sessions) |
| `PUBLIC_URL` | `https://tvkparthibankattur.vercel.app` |
| `ADMIN_WHATSAPP` | `7603959394` (comma separate more numbers) |

Check it: open `https://tvkparthibankattur.vercel.app/api/health`. It should show `{"ok":true,"storage":"supabase"}`.

### c) Send the WhatsApp messages (worker)
Vercel cannot hold a linked WhatsApp session, so the API only queues messages. A small worker sends them. Run it on a PC or server that stays on:

```bash
git clone https://github.com/dynamolabs/whatsapp-mcp.git C:/tools/whatsapp-mcp
cd C:/tools/whatsapp-mcp && npm install && npm run build
```

In this project's `.env` (local file, not committed) set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `WHATSAPP_MCP_PATH=C:/tools/whatsapp-mcp/dist/index.js`, then:

```bash
npm run worker
```

On first run a QR code prints in the terminal. Scan it from WhatsApp, Linked devices. The worker checks the queue every 8 seconds, retries a failed message up to 3 times, and the admin panel shows each message as Queued, Sent or Failed.

Until the worker runs, complaints still save and show in the admin panel. Only the WhatsApp messages wait.

Notes on whatsapp-mcp: it automates WhatsApp Web and is unofficial, so a number that messages many people who have not contacted it can be banned. Use a dedicated SIM and keep volume low. For heavy use switch to the official WhatsApp Business Cloud API (only `worker/whatsapp-worker.js` changes). Only one WhatsApp Web session can be linked at a time.

## 2. Local development

```bash
npm install
cp .env.example .env
npm run server      # Express + SQLite API on :8787
npm run dev         # website on :5188 (proxies /api to :8787)
npm test            # API tests (in-memory data layer)
```

## How a complaint flows

1. The form posts to `POST /api/complaints`. The API validates it, saves it and returns an ID like `TVK38-482913`.
2. It queues a WhatsApp confirmation to the citizen and an alert to each admin number.
3. In the admin panel, set the status and an optional note, then "Save & notify user". The citizen gets an update.

## Security notes

- Change `ADMIN_PASSWORD` before launch. Vercel serves HTTPS by default.
- Create is limited to 5 per phone per hour and 8 per IP per hour, tracking to 30 per 10 minutes, admin login to 10 per 10 minutes.
- Public tracking only returns category, status, date and the first 80 characters of the description. Never names or phone numbers.
- Photos (JPEG, up to 500 KB) are stored in Supabase and only served to a signed-in admin.
- The service_role key bypasses row level security. Keep it only in Vercel and in the worker's local `.env`.
