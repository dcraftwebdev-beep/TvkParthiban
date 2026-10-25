# TVK Ward 38 (Kattur) complaint portal: backend and admin

Live site: https://tvkparthibankattur.vercel.app
Everything runs on Vercel and Supabase. Nothing has to run on a laptop.

## What it does

- Citizens file a complaint with up to 4 photos. They can tick "notify this phone" and "you may show my photo".
- Admins sign in at `/#/admin`, change the status, and when a complaint is resolved add an **after photo**.
  The admin panel joins the citizen's first photo and the after photo into one branded **before/after** picture.
- The citizen is told in three free ways, no WhatsApp business account needed:
  1. **Push notification** on their phone (if they allowed it) with a link to the result.
  2. **Track page**: the picture shows under their complaint, searchable by ID or mobile number.
  3. **Your own WhatsApp**: the admin panel's "Send on my WhatsApp" button opens the citizen's chat with a link.
     WhatsApp shows the before/after picture as a preview card. "Share photo" sends the picture itself.
- Admins get a push alert on their phone for every new complaint (bell button in the admin panel).
- Consented, resolved work appears in the public "Before and after" section of the site.

## Setup (once)

### 1. Supabase tables
SQL Editor, New query, paste and Run, in this order:
1. `supabase/schema.sql` (only if you have not run it yet)
2. `supabase/migration-002.sql` (photos, before/after, push)

### 2. Vercel environment variables
Project, Settings, Environment Variables (Production), then redeploy.

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase, Project Settings, API, Project URL |
| `SUPABASE_SERVICE_KEY` | the service_role (or secret) key. Secret. |
| `ADMIN_PASSWORD` | login for `/#/admin` |
| `ADMIN_SECRET` | long random text, signs sessions and result links |
| `VAPID_PUBLIC_KEY` | generate once: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | from the same command. Secret. |
| `VAPID_SUBJECT` | `mailto:you@example.com` |

Check `https://tvkparthibankattur.vercel.app/api/health`. You want `configured`, `admin` and `push` all true.

### 3. Turn on alerts on your phone
Open `/#/admin` on the phone, sign in, tap the bell. Allow notifications. New complaints now alert that phone.
On iPhone, first use Share, Add to Home Screen, then open the site from the home screen icon.

## Local development

```bash
npm install
cp .env.example .env
npm run server      # local API on :8787 (in memory unless SUPABASE_URL and SUPABASE_SERVICE_KEY are set)
npm run dev         # website on :5188, proxies /api to :8787
npm test            # 20 API checks
```

Careful: if `.env` has your Supabase keys, `npm run server` talks to the real database. Blank them for testing.

## Optional: automatic WhatsApp (needs a computer that stays on)

Not needed for the flow above. If you ever want automatic WhatsApp messages through whatsapp-mcp, set `WHATSAPP_QUEUE=1` in Vercel
so the API queues messages in the `outbox` table, and run `npm run worker` on a computer that stays on
(see `worker/whatsapp-worker.js`). WhatsApp can ban numbers that automate messages, so use a dedicated SIM.

## Security notes

- Change `ADMIN_PASSWORD` before launch. Vercel serves HTTPS.
- Create is limited to 5 per phone per hour and 8 per IP per hour, tracking to 30 per 10 minutes, admin login to 10 per 10 minutes.
- Public tracking returns category, status, date, the first 80 characters and the result picture. Never names or phone numbers.
- Result links carry a signed key, so only people who were sent the link can open them.
- Citizen photos are only shown to a signed-in admin. A photo is only used publicly if the citizen ticked the consent box.
- The service_role key bypasses row level security. Keep it only in Vercel and your local `.env`.
