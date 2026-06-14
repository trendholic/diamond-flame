/* Diamond Flame — assistant chat widget.
   Answers from the live catalogue + store policies, links to product pages,
   and hands off to WhatsApp. Optionally proxies to an AI endpoint (config.AI_ENDPOINT). */
(function () {
  "use strict";
  var DF = window.DF;
  if (!DF) return;
  var esc = DF.esc, pkr = DF.pkr, cfg = DF.cfg || {};
  var wa = cfg.WHATSAPP || "";
  var CATALOG = [];
  var DEFAULT_CHIPS = ["Browse products", "Delivery", "Payment", "Become a dealer"];

  /* ---- data ---- */
  function loadCatalog() {
    if (!DF.db) return;
    DF.db.rpc("catalogue").then(function (res) { if (!res.error) CATALOG = res.data || []; });
  }
  function searchProducts(q) {
    var words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
    var map = { ac: "air condition", airconditioner: "air condition", inverter: "inverter", cooling: "cool",
      fridge: "refrigerat", refrigerator: "refrigerat", freezer: "freez", washing: "washing", washer: "washing",
      laundry: "washing", tv: "televis", television: "televis", led: "televis", fan: "fan", cooler: "cooler",
      microwave: "microwave", oven: "oven", stove: "stove", geyser: "water", heater: "water" };
    var scored = CATALOG.map(function (p) {
      var hay = ((p.name || "") + " " + (p.category || "") + " " + (p.brand || "")).toLowerCase();
      var score = 0;
      words.forEach(function (w) { var k = map[w] || w; if (hay.indexOf(k) > -1) score++; });
      return { p: p, score: score };
    }).filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 4).map(function (x) { return x.p; });
  }
  function productListHtml(list) {
    if (!list.length) return "I couldn't find a match — " + waHtml("our team can help on WhatsApp.");
    return "Here's what I found:<div class='cw-prods'>" + list.map(function (p) {
      var cover = p.image_url || (Array.isArray(p.images) && p.images[0]) || "";
      var media = cover ? "<img src='" + esc(cover) + "' alt=''>" : "<span class='cw-emoji'>" + esc(p.emoji || "📦") + "</span>";
      return "<a class='cw-prod' href='#/p/" + encodeURIComponent(p.id) + "'>" + media +
        "<span><strong>" + esc(p.name) + "</strong><small>" + esc(p.category || "") + " · " + pkr(p.retail_price) + "</small></span></a>";
    }).join("") + "</div>";
  }
  function waHtml(prefix) {
    if (!wa) return prefix;
    return prefix + " <a class='cw-wa' href='https://wa.me/" + esc(wa) + "' target='_blank' rel='noopener'>Chat on WhatsApp</a>";
  }

  /* ---- intents ---- */
  function respond(text) {
    var t = text.toLowerCase().trim();
    if (/^(hi|hey|hello|salam|asalam|assalam|aoa|good (morning|evening|afternoon))/.test(t))
      return { html: "Hi! 👋 I'm the Diamond Flame assistant. Ask me about <b>ACs, refrigerators, washing machines, TVs</b> and more — or about delivery and payment.", chips: DEFAULT_CHIPS };
    if (/deliver|ship|dispatch|courier/.test(t))
      return { html: "🚚 We offer <b>insured nationwide delivery within 48 hours</b> of order confirmation, across Pakistan.", chips: DEFAULT_CHIPS };
    if (/pay|cod|cash|bank|transfer|installment/.test(t))
      return { html: "💳 Pay by <b>Cash on Delivery</b> or <b>Bank Transfer</b> (upload your receipt at checkout). Approved dealers can request credit terms.", chips: DEFAULT_CHIPS };
    if (/warrant|guarantee|return/.test(t))
      return { html: "✅ Every appliance is <b>100% genuine and sealed</b>. Keep your invoice, and our support team will help with any product issue.", chips: DEFAULT_CHIPS };
    if (/install|fit|setup|set up/.test(t))
      return { html: "🛠️ We offer setup guidance and can arrange professional installation for ACs, geysers and large appliances on request.", chips: DEFAULT_CHIPS };
    if (/dealer|wholesale|trade|bulk/.test(t))
      return { html: "🏷️ Become a verified dealer for wholesale pricing — tap below to apply (approved within 24 hours).", chips: ["Become a dealer", "Talk to a human"] };
    if (/contact|whatsapp|call|phone|human|agent|talk|support|help/.test(t))
      return { html: waHtml("Our team is happy to help directly. 😊"), chips: ["Browse products"] };
    var matches = searchProducts(t);
    if (matches.length || /product|catalog|ac|fridge|refriger|wash|tv|televis|fan|cooler|microwave|oven|stove|geyser|price|buy|show|browse|appliance/.test(t))
      return { html: productListHtml(matches.length ? matches : CATALOG.slice(0, 4)), chips: ["Delivery", "Payment", "Talk to a human"] };
    return { html: waHtml("I'm not totally sure about that one — our team can help directly."), chips: DEFAULT_CHIPS };
  }

  /* ---- UI ---- */
  var panel, body, chipsEl, input, opened = false;
  function build() {
    var fab = document.createElement("button");
    fab.className = "cw-fab"; fab.id = "cwFab"; fab.setAttribute("aria-label", "Chat with us");
    fab.innerHTML = "<span>💬</span>";
    panel = document.createElement("div");
    panel.className = "cw-panel"; panel.hidden = true;
    panel.innerHTML =
      "<div class='cw-head'><div><strong>Diamond Flame Assistant</strong><small>Typically replies instantly</small></div>" +
      "<button class='cw-x' id='cwClose' aria-label='Close'>✕</button></div>" +
      "<div class='cw-body' id='cwBody'></div>" +
      "<div class='cw-chips' id='cwChips'></div>" +
      "<form class='cw-input' id='cwForm'><input id='cwInput' placeholder='Ask about products, delivery…' autocomplete='off' /><button aria-label='Send'>➤</button></form>";
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    body = panel.querySelector("#cwBody");
    chipsEl = panel.querySelector("#cwChips");
    input = panel.querySelector("#cwInput");
    fab.addEventListener("click", toggle);
    panel.querySelector("#cwClose").addEventListener("click", toggle);
    panel.querySelector("#cwForm").addEventListener("submit", function (e) {
      e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ""; sendUser(v);
    });
  }
  function toggle() {
    opened = !opened;
    panel.hidden = !opened;
    document.getElementById("cwFab").classList.toggle("open", opened);
    if (opened && !body.childElementCount) {
      addMsg("bot", "Hi! 👋 I'm the Diamond Flame assistant. How can I help you today?");
      setChips(DEFAULT_CHIPS);
      if (!CATALOG.length) loadCatalog();
    }
    if (opened) setTimeout(function () { input.focus(); }, 60);
  }
  function addMsg(role, html) {
    var d = document.createElement("div");
    d.className = "cw-msg cw-" + role;
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }
  function setChips(list) {
    chipsEl.innerHTML = "";
    (list || []).forEach(function (label) {
      var b = document.createElement("button");
      b.className = "cw-chip"; b.type = "button"; b.textContent = label;
      b.addEventListener("click", function () { sendUser(label); });
      chipsEl.appendChild(b);
    });
  }
  function sendUser(text) {
    addMsg("user", esc(text));
    chipsEl.innerHTML = "";
    if (/become a dealer|apply.*dealer/i.test(text)) {
      addMsg("bot", "Opening the dealer application for you…");
      var c = document.getElementById("ctaJoin"); if (c) c.click();
      setChips(["Browse products", "Talk to a human"]); return;
    }
    if (cfg.AI_ENDPOINT) {
      addMsg("bot", "<span class='cw-typing'>…</span>");
      fetch(cfg.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) })
        .then(function (r) { return r.json(); })
        .then(function (d) { body.lastChild.remove(); addMsg("bot", esc(d.reply || "")); setChips(DEFAULT_CHIPS); })
        .catch(function () { body.lastChild.remove(); var r = respond(text); addMsg("bot", r.html); setChips(r.chips); });
      return;
    }
    var r = respond(text);
    setTimeout(function () { addMsg("bot", r.html); setChips(r.chips); }, 220);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
  loadCatalog();
})();
