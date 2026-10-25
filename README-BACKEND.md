# TVK Ward 38 (Kattur) complaint portal: backend and admin

## Run it

```bash
npm install
cp .env.example .env        # then edit .env (admin password, numbers)
npm run server              # API on http://localhost:8787
npm run dev                 # website on http://localhost:5188 (proxies /api to the API)
```

Production: `npm run build` then `npm run server`. The server also serves the built site, so one process and one port.

- Website: `/`
- Admin panel: `/#/admin` (password = `ADMIN_PASSWORD` in `.env`)
- Data: SQLite file and photos in `server/data/` (back this folder up). Needs Node 22.13 or newer.

## What happens when someone files a complaint

1. The form posts to `POST /api/complaints`. The server validates it, saves it and returns an ID like `TVK38-482913`.
2. The server queues two WhatsApp messages: a confirmation to the citizen (in Tamil or English, whichever the site was in) and an alert to every number in `ADMIN_WHATSAPP`.
3. In the admin panel you open the complaint, set the status and an optional note, and press "Save & notify user". The citizen gets a WhatsApp update.
4. Every message attempt is logged per complaint (Sent or Failed) and visible in the admin panel.

## WhatsApp through whatsapp-mcp

The backend talks to [dynamolabs/whatsapp-mcp](https://github.com/dynamolabs/whatsapp-mcp) as an MCP client and calls its `wa_send_message` tool. That project links to a WhatsApp account by QR code (it uses whatsapp-web.js).

```bash
git clone https://github.com/dynamolabs/whatsapp-mcp.git C:/tools/whatsapp-mcp
cd C:/tools/whatsapp-mcp
npm install
npm run build
```

Then in `.env`:

```
NOTIFY_PROVIDER=mcp
WHATSAPP_MCP_PATH=C:/tools/whatsapp-mcp/dist/index.js
ADMIN_WHATSAPP=7603959394
```

Start `npm run server`. On the first message the server starts the MCP process and a QR code is printed in the server terminal. Scan it from WhatsApp, Linked devices, on the phone that will send the messages. The session is saved in `.wwebjs_auth/` inside the MCP folder.

Things to know:

- Only one WhatsApp Web session can be linked at a time. Do not also run the MCP in Claude Desktop with the same number.
- This is an unofficial WhatsApp Web automation. WhatsApp can ban a number that sends many messages to people who have not messaged it first. Use a dedicated SIM, keep volume low (the server already spaces messages 1.2 seconds apart), and for heavy use switch to the official WhatsApp Business Cloud API. Only `src/notify.js` would change.
- Until `NOTIFY_PROVIDER=mcp` is set, messages are only printed in the server terminal (demo mode). The admin panel shows a yellow notice while in demo mode.
- The linked phone must stay online.

## Security notes

- Change `ADMIN_PASSWORD` before going live and serve the site over HTTPS (for example behind Caddy or Nginx). Admin tokens last 12 hours.
- Complaint creation is limited to 8 per hour per IP, tracking to 30 per 10 minutes, and admin login to 10 per 10 minutes.
- Public tracking only returns category, status, date and the first 80 characters of the description. It never returns names or phone numbers.
- Photos are only served to a signed-in admin.
