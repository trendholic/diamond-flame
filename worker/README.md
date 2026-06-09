# Diamond Flame — Cloudflare Worker

One tiny serverless function that powers two storefront features, with your
**Anthropic API key kept server-side** (never shipped to the browser):

| Endpoint | Used by | Purpose |
|----------|---------|---------|
| `GET /proxy?url=…` | Admin → Products → **Import from URL** | Private, unlimited CORS proxy (replaces the flaky public proxies) |
| `POST /chat` `{message}` → `{reply}` | Storefront **💬 chat widget** | Real Claude (`claude-opus-4-8`) answers, grounded in your live catalogue |

## Deploy (5 minutes)

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and
[Node.js](https://nodejs.org). From this `worker/` folder:

```bash
# 1. Log in
npx wrangler login

# 2. Add your Anthropic API key as a secret (get one at console.anthropic.com)
npx wrangler secret put ANTHROPIC_API_KEY
#   → paste your sk-ant-... key when prompted

# 3. Deploy
npx wrangler deploy
```

Wrangler prints your Worker URL, e.g.
`https://diamond-flame-worker.<your-subdomain>.workers.dev`.

## Wire it into the site

Edit `js/config.js` and set both values to your Worker URL:

```js
AI_ENDPOINT:  "https://diamond-flame-worker.<your-subdomain>.workers.dev/chat",
IMPORT_PROXY: "https://diamond-flame-worker.<your-subdomain>.workers.dev/proxy?url=",
```

Commit & push, hard-refresh — that's it:
- The **chat widget** now uses real Claude (falls back to the built-in assistant if the Worker is down).
- **Import from URL** now goes through your private proxy first (no rate limits).

## Notes & hardening
- **Cost:** `/chat` uses `claude-opus-4-8` at ~1K max tokens per reply — cents per
  conversation. Swap `MODEL` to `claude-haiku-4-5` in the Worker for cheaper replies.
- **Lock down CORS:** set `ALLOW_ORIGIN` in `wrangler.toml` to your site origin
  (e.g. `https://trendholic.github.io`) instead of `*`.
- **Abuse protection:** for a public store, add Cloudflare rate-limiting rules or a
  Turnstile check in front of `/chat` and `/proxy`.
- The `SUPABASE_ANON_KEY` here is the public anon key (safe to expose); it only lets
  the Worker read the public catalogue to ground answers.
