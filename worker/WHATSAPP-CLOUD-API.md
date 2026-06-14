# Automatic order alerts via the official WhatsApp Cloud API

This is the reliable, official way. It has two parts:
1. **Get WhatsApp Cloud API credentials from Meta** (you do this once).
2. **Connect them to the site** (I do this once you send me the values).

The WhatsApp token is powerful, so it stays **server-side** in the Cloudflare
worker — never in the public website.

---

## Part 1 — Get your credentials (~15 minutes)

1. Go to **https://developers.facebook.com/** and log in with your Facebook account.
2. Top right → **My Apps** → **Create App**.
3. Use case: choose **Other** → type **Business** → next.
4. Name it (e.g. `Diamond Flame Orders`), pick your business (or create one) → **Create app**.
5. On the app dashboard, find **WhatsApp** → click **Set up**.
6. You'll land on **WhatsApp → API Setup**. Here you'll see:
   - A **temporary access token** (button to copy) → this is **WA_TOKEN**.
   - **Phone number ID** (under "From") → this is **WA_PHONE_ID**.
7. Under **"To"**, click **Manage phone number list** → **Add** your own WhatsApp
   number (the one that should receive order alerts). WhatsApp sends it a code —
   enter it to verify. (In test mode messages only go to verified numbers.)
8. Optional sanity check: on that same page click **Send message** — you should
   get a "hello_world" template on your WhatsApp. That proves it works.

### Send me these three things
- **WA_TOKEN** (the temporary access token)
- **WA_PHONE_ID** (the Phone number ID)
- The **WhatsApp number** that should receive alerts (e.g. 923030042020)

> ⚠️ The temporary token lasts **24 hours** — perfect for testing today. For
> permanent use we'll create a never-expiring **System User token** (5 more
> minutes); I'll guide you once the test works.

---

## Part 2 — I connect it (after you send the values)

The Cloudflare worker (`worker/diamond-flame-worker.js`) already speaks the Cloud
API. We deploy it (browser, no install needed) and add the secrets:

- `WA_TOKEN`, `WA_PHONE_ID` (secrets), `ADMIN_WHATSAPP` (your number).

Then set `ORDER_WEBHOOK` in `js/config.js` to the worker's `/notify-order` URL.
Once that's in, **every order auto-sends to your WhatsApp** with full details +
the receipt link — no taps, no third-party bot.

I'll handle the wiring and we'll place a live test order together to confirm.
