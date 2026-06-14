# Auto-send orders to your WhatsApp

When a customer places an order, the site can send the full order (items, total,
payment method, **receipt link**) to your WhatsApp **automatically** — no tap
needed. The WhatsApp key stays server-side in the Cloudflare worker.

Until this is set up, the site falls back to a one-tap **"Send order details on
WhatsApp"** button on the order-confirmation screen, so nothing is lost.

## Option A — CallMeBot (easiest, free, ~3 minutes)

1. **Get your CallMeBot API key** (one time, on the phone that should receive orders):
   - Add **+34 644 51 95 23** to your contacts.
   - Send it this WhatsApp message: **`I allow callmebot to send me messages`**
   - It replies with your **API key** (a number).

2. **Deploy the worker with your secret** (from the `worker/` folder):
   ```bash
   npx wrangler deploy
   npx wrangler secret put CALLMEBOT_APIKEY    # paste the key from step 1
   ```
   `ADMIN_WHATSAPP` (your number) is already set in `wrangler.toml`.

3. **Point the site at the worker.** In `js/config.js` set:
   ```js
   ORDER_WEBHOOK: "https://diamond-flame-worker.<your-subdomain>.workers.dev/notify-order",
   ```
   (Use the URL printed by `wrangler deploy`.) Commit & push.

Done — every order now arrives on your WhatsApp automatically.

## Option B — official WhatsApp Cloud API (no third party)

Same as above, but instead of `CALLMEBOT_APIKEY` set the two Meta values and the
worker will use the Cloud API automatically:
```bash
npx wrangler secret put WA_TOKEN       # permanent access token
npx wrangler secret put WA_PHONE_ID    # your WhatsApp phone-number ID
```

## Most reliable: fire on the database (optional)

Client POST fires when the customer finishes checkout. To guarantee delivery even
if the browser closes, add a **Supabase Database Webhook**: Dashboard → Database →
Webhooks → on `INSERT` into `orders` → HTTP POST to the same
`…/notify-order` URL. The worker understands both the storefront payload and the
Supabase `{ record: … }` shape.

## Test
```bash
curl -X POST "https://<your-worker>/notify-order" -H "Content-Type: application/json" \
  -d '{"ref":"DF-TEST","customer_name":"Test","phone":"03001234567","address":"Lahore","items":[{"qty":1,"name":"Gas Hob"}],"total":25000,"payment_method":"cod"}'
```
You should receive the message on WhatsApp within a few seconds.
