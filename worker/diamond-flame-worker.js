/**
 * Diamond Flame — Cloudflare Worker
 * Two endpoints behind one tiny deploy:
 *   GET  /proxy?url=<encoded>  → CORS proxy for "Import from URL" (unlimited, private)
 *   POST /chat   {message,history?} → Claude-backed assistant reply  {reply}
 *
 * The Anthropic API key stays server-side as a Worker secret (ANTHROPIC_API_KEY).
 * Optional grounding: if SUPABASE_URL + SUPABASE_ANON_KEY are set, /chat fetches
 * the live catalogue so the assistant can answer about real products & prices.
 */

const MODEL = "claude-opus-4-8";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      if (url.pathname === "/proxy") return handleProxy(url, cors);
      if (url.pathname === "/chat" && request.method === "POST") return handleChat(request, env, cors);
      if (url.pathname === "/") return json({ ok: true, service: "diamond-flame-worker" }, 200, cors);
      return json({ error: "Not found" }, 404, cors);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500, cors);
    }
  }
};

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": (env && env.ALLOW_ORIGIN) || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json" }, cors)
  });
}

/* ---------- /proxy : fetch a remote page and return it with CORS ---------- */
async function handleProxy(url, cors) {
  const target = url.searchParams.get("url");
  if (!target) return json({ error: "missing url" }, 400, cors);
  let parsed;
  try { parsed = new URL(target); } catch (e) { return json({ error: "bad url" }, 400, cors); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    return json({ error: "only http(s)" }, 400, cors);

  const res = await fetch(parsed.toString(), {
    headers: {
      // Pose as a normal browser so product pages render their markup/meta tags.
      "User-Agent": "Mozilla/5.0 (compatible; DiamondFlameImporter/1.0)",
      "Accept": "text/html,application/xhtml+xml"
    },
    redirect: "follow",
    cf: { cacheTtl: 300 }
  });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: Object.assign({ "Content-Type": "text/html; charset=utf-8" }, cors)
  });
}

/* ---------- /chat : Claude-backed store assistant ---------- */
async function handleChat(request, env, cors) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500, cors);
  const data = await request.json().catch(() => ({}));
  const message = (data && data.message || "").toString().slice(0, 2000);
  if (!message) return json({ error: "missing message" }, 400, cors);

  var catalogue = await loadCatalogue(env);
  var system =
    "You are the Diamond Flame assistant — a warm, concise sales assistant for a premium " +
    "kitchen-fittings brand in Pakistan selling kitchen sinks, gas hobs, electric hobs and " +
    "kitchen hoods. Prices are in Pakistani Rupees (Rs). Help shoppers find the right product, " +
    "explain delivery (insured nationwide within 48 hours), payment (Cash on Delivery or Bank " +
    "Transfer), and the 10-year finish warranty. Be brief (2-4 sentences). If you don't know " +
    "something or the customer wants to order/complain, suggest contacting the team on WhatsApp " +
    "+92 303 0042020. Never invent products or prices that aren't in the catalogue." +
    (catalogue ? "\n\nCurrent catalogue (name — category — retail price):\n" + catalogue : "");

  // Optional short prior turns from the client, sanitised to {role,content}.
  var history = Array.isArray(data.history)
    ? data.history.filter(function (m) { return m && (m.role === "user" || m.role === "assistant") && m.content; })
        .slice(-6).map(function (m) { return { role: m.role, content: String(m.content).slice(0, 2000) }; })
    : [];

  var res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: system,
      messages: history.concat([{ role: "user", content: message }])
    })
  });
  if (!res.ok) {
    var errText = await res.text();
    return json({ error: "claude error", detail: errText.slice(0, 500) }, 502, cors);
  }
  var out = await res.json();
  var reply = (out.content || []).filter(function (b) { return b.type === "text"; })
    .map(function (b) { return b.text; }).join("").trim();
  return json({ reply: reply || "Sorry, I didn't catch that — please try again." }, 200, cors);
}

async function loadCatalogue(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return "";
  try {
    var r = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/catalogue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": env.SUPABASE_ANON_KEY,
        "authorization": "Bearer " + env.SUPABASE_ANON_KEY
      },
      body: "{}"
    });
    if (!r.ok) return "";
    var rows = await r.json();
    if (!Array.isArray(rows)) return "";
    return rows.slice(0, 40).map(function (p) {
      return "- " + p.name + " — " + (p.category || "") + " — Rs " + Number(p.retail_price || 0).toLocaleString("en-PK");
    }).join("\n");
  } catch (e) { return ""; }
}
