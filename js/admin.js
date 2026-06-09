/* Diamond Flame Home Appliances — admin dashboard logic. */
(function () {
  "use strict";

  var DF = window.DF;
  var db = DF.db;
  var el = DF.el, pkr = DF.pkr, esc = DF.esc;

  var profile = null;
  var products = [];
  var orders = [];
  var customers = [];
  var requests = [];
  var customerQuery = "";
  var customerRole = "";
  var keptImages = [];
  var settingsMap = {}, assetUrls = {}, assetFiles = {}, brandImageKeys = [];
  var heroSlides = [], heroSlideFiles = [];

  var STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

  function fmtDate(s) {
    if (!s) return "";
    var d = new Date(s);
    return d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
  }

  /* ---------- gate ---------- */
  function boot() {
    if (!DF.configured || !db) {
      showGate("Backend not connected. Add your Supabase keys in js/config.js.");
      return;
    }
    DF.currentProfile().then(function (p) {
      if (!p) { showGate(""); return; }
      if (p.role !== "admin") {
        showGate("Signed in as " + (p.email || "user") + ", but this account is not an admin. " +
          "Run the admin SQL snippet in the README, then refresh.");
        el("signOutBtn").hidden = false;
        return;
      }
      profile = p;
      showDashboard();
    });
  }

  function showGate(msg) {
    el("loginGate").hidden = false;
    el("dashboard").hidden = true;
    el("gateHint").textContent = msg || "";
  }

  function showDashboard() {
    el("loginGate").hidden = true;
    el("dashboard").hidden = false;
    el("signOutBtn").hidden = false;
    el("whoami").textContent = (profile.full_name || profile.email) + " · admin";
    loadAll();
  }

  function loadAll() {
    Promise.all([loadProducts(), loadOrders(), loadCustomers()]).then(function () {
      renderStats();
      renderRequests();
      renderDealerOptions();
      loadBranding();
    });
  }

  /* ---------- branding / store images ---------- */
  function loadBranding() {
    db.from("settings").select("key,value").then(function (res) {
      settingsMap = {};
      (res.data || []).forEach(function (r) { settingsMap[r.key] = r.value; });
      assetUrls = {}; assetFiles = {};
      try { heroSlides = JSON.parse(settingsMap.hero_images || "[]"); } catch (e) { heroSlides = []; }
      if (!Array.isArray(heroSlides)) heroSlides = [];
      heroSlideFiles = [];
      renderBranding();
    });
  }
  function heroSlidesField() {
    var thumbs = heroSlides.map(function (u, i) {
      return '<div class="gthumb"><img src="' + esc(u) + '" alt="" /><button type="button" class="gdel hero-del" data-i="' + i + '" aria-label="Remove">✕</button></div>';
    }).join("");
    thumbs += heroSlideFiles.map(function (f) {
      return '<div class="gthumb"><img src="' + URL.createObjectURL(f) + '" alt="" /><span class="gcover">new</span></div>';
    }).join("");
    return '<div class="brand-field brand-wide"><label>Hero slides <small>(rotate automatically; up to 6)</small></label>' +
      '<div class="gallery-edit">' + (thumbs || '<p class="gempty">No hero images yet.</p>') + "</div>" +
      '<label class="asset-up" style="margin-top:8px">Upload hero images<input type="file" accept="image/*" multiple id="heroSlidesInput" /></label></div>';
  }
  function categoriesList() {
    var seen = {}, out = [];
    products.forEach(function (p) { if (p.category && !seen[p.category]) { seen[p.category] = 1; out.push(p.category); } });
    return out;
  }
  function brandImageField(key, label) {
    var url = (key in assetUrls) ? assetUrls[key] : (settingsMap[key] || "");
    var pending = assetFiles[key];
    var prev = pending ? '<img src="' + URL.createObjectURL(pending) + '" alt="" />'
      : (url ? '<img src="' + esc(url) + '" alt="" />' : '<span class="aempty">No image</span>');
    return '<div class="brand-field"><label>' + esc(label) + "</label>" +
      '<div class="asset"><div class="asset-prev">' + prev + "</div>" +
      '<div class="asset-actions"><label class="asset-up">Upload<input type="file" accept="image/*" class="asset-file" data-key="' + esc(key) + '" /></label>' +
      ((url || pending) ? '<button type="button" class="link-btn danger asset-clear" data-key="' + esc(key) + '">Remove</button>' : "") +
      "</div></div></div>";
  }
  function brandTextField(key, label, ta) {
    var v = settingsMap[key] || "";
    return '<div class="brand-field"><label>' + esc(label) + "</label>" +
      (ta ? '<textarea class="brand-text" data-key="' + esc(key) + '" rows="2">' + esc(v) + "</textarea>"
          : '<input class="brand-text" data-key="' + esc(key) + '" value="' + esc(v) + '" />') + "</div>";
  }
  function captureBrandTexts() {
    Array.prototype.forEach.call(el("brandingBody").querySelectorAll(".brand-text"), function (inp) {
      settingsMap[inp.getAttribute("data-key")] = inp.value;
    });
  }
  function renderBranding() {
    var cats = categoriesList();
    brandImageKeys = ["logo_url", "favicon_url", "banner_url"].concat(cats.map(function (c) { return "col:" + c; }));
    el("brandingBody").innerHTML =
      brandImageField("logo_url", "Logo") +
      brandImageField("favicon_url", "Favicon (small square icon)") +
      heroSlidesField() +
      brandTextField("hero_headline", "Hero headline") +
      brandTextField("hero_subtext", "Hero subtext", true) +
      brandImageField("banner_url", "Promo banner image") +
      brandTextField("banner_link", "Promo banner link (optional, e.g. #catalogue)") +
      '<div class="brand-sub">Collection images</div>' +
      cats.map(function (c) { return brandImageField("col:" + c, c); }).join("");
    var body = el("brandingBody");
    var hsInput = body.querySelector("#heroSlidesInput");
    if (hsInput) hsInput.addEventListener("change", function () {
      Array.prototype.push.apply(heroSlideFiles, Array.prototype.slice.call(hsInput.files, 0, 6 - heroSlides.length - heroSlideFiles.length));
      captureBrandTexts();
      renderBranding();
    });
    Array.prototype.forEach.call(body.querySelectorAll(".hero-del"), function (btn) {
      btn.addEventListener("click", function () {
        heroSlides.splice(parseInt(btn.getAttribute("data-i"), 10), 1);
        captureBrandTexts();
        renderBranding();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".asset-file"), function (inp) {
      inp.addEventListener("change", function () {
        var file = inp.files[0]; if (!file) return;
        var key = inp.getAttribute("data-key");
        assetFiles[key] = file;
        var prev = inp.closest(".asset").querySelector(".asset-prev");
        prev.innerHTML = '<img src="' + URL.createObjectURL(file) + '" alt="" />';
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".asset-clear"), function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-key");
        assetUrls[key] = ""; delete assetFiles[key];
        captureBrandTexts();
        renderBranding();
      });
    });
  }
  function uploadSiteAsset(file) {
    var clean = file.name.replace(/[^\w.\-]+/g, "_");
    var path = "branding/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "-" + clean;
    return db.storage.from("site-assets").upload(path, file).then(function (res) {
      if (res.error) throw res.error;
      return db.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
    });
  }
  function saveBranding() {
    captureBrandTexts();
    var btn = el("saveBranding");
    btn.disabled = true; btn.textContent = "Saving…";
    var pendingKeys = Object.keys(assetFiles);
    var uploads = pendingKeys.map(function (k) {
      return uploadSiteAsset(assetFiles[k]).then(function (url) { assetUrls[k] = url; });
    });
    var heroJob = Promise.all(heroSlideFiles.map(uploadSiteAsset)).then(function (urls) {
      heroSlides = heroSlides.concat(urls); heroSlideFiles = [];
    });
    Promise.all(uploads.concat([heroJob])).then(function () {
      var rows = [];
      brandImageKeys.forEach(function (k) {
        var val = (k in assetUrls) ? assetUrls[k] : (settingsMap[k] || null);
        rows.push({ key: k, value: val || null });
      });
      ["hero_headline", "hero_subtext", "banner_link"].forEach(function (k) {
        rows.push({ key: k, value: (settingsMap[k] || "").trim() || null });
      });
      rows.push({ key: "hero_images", value: JSON.stringify(heroSlides) });
      return db.from("settings").upsert(rows);
    }).then(function (res) {
      btn.disabled = false; btn.textContent = "Save branding";
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      assetFiles = {};
      loadBranding();
      DF.toast("Branding saved — refresh the storefront to see it.");
    }).catch(function (err) {
      btn.disabled = false; btn.textContent = "Save branding";
      DF.toast("Save failed: " + (err && err.message ? err.message : err), "warn");
    });
  }

  /* ---------- data ---------- */
  function loadProducts() {
    return db.from("products").select("*").order("category").order("name").then(function (res) {
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      products = res.data || [];
      renderProducts();
    });
  }

  function loadOrders() {
    return db.from("orders").select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      orders = res.data || [];
      renderOrders();
    });
  }

  function loadCustomers() {
    return db.from("profiles").select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) { customers = []; requests = []; renderCustomers(); return; }
      customers = res.data || [];
      requests = customers.filter(function (c) { return c.dealer_status === "pending"; });
      renderCustomers();
    });
  }

  /* ---------- documents (invoice / ledger / catalogue, print-to-PDF) ---------- */
  var COMPANY = {
    name: "Diamond Flame", tagline: "Premium Kitchen Fittings",
    address: "Model Town, Gujranwala, Pakistan", email: "sales@diamond-flame.com"
  };
  function waNumber() { return (DF.cfg && DF.cfg.WHATSAPP) ? DF.cfg.WHATSAPP : ""; }
  function docCss() {
    return "@page{size:A4;margin:16mm 14mm 22mm}*{box-sizing:border-box}" +
      "body{font-family:Arial,Helvetica,sans-serif;color:#1a1d24;font-size:12px;margin:0}" +
      ".doc-top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2f6bff;padding-bottom:14px;margin-bottom:18px}" +
      ".doc-brand{display:flex;gap:12px;align-items:center}.doc-logo{height:46px;width:auto}" +
      ".doc-brand h1{font-size:20px;margin:0;color:#0b0d12}.doc-brand small{color:#697080;font-size:11px}" +
      ".doc-meta{text-align:right;font-size:11px;color:#444}.doc-title{font-size:22px;font-weight:700;color:#2f6bff;letter-spacing:1px;margin-bottom:4px}" +
      ".parties{display:flex;justify-content:space-between;gap:24px;margin-bottom:16px}.party h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#697080;margin:0 0 4px}.party p{margin:1px 0}" +
      ".party.to{text-align:right}" +
      "table.tbl{width:100%;border-collapse:collapse;margin-top:6px}table.tbl th{background:#0b0d12;color:#fff;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.5px}" +
      "table.tbl td{padding:8px 10px;border-bottom:1px solid #e7eaf0}table.tbl tr:nth-child(even) td{background:#f7f9fc}.right{text-align:right}" +
      ".totals{margin-top:14px;margin-left:auto;width:280px}.totals .row{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{border-top:2px solid #0b0d12;margin-top:6px;padding-top:8px;font-size:16px;font-weight:700}" +
      ".badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}.b-paid{background:#e6f7ef;color:#1f9d6b}.b-unpaid{background:#fff3e0;color:#b5790a}" +
      ".note{margin-top:18px;font-size:11px;color:#555;border-top:1px dashed #ccc;padding-top:8px}" +
      ".doc-foot{position:fixed;left:0;right:0;bottom:8mm;text-align:center;font-size:10px;color:#555;border-top:1px solid #e7eaf0;padding-top:5px}.doc-foot b{color:#1f9d6b}" +
      ".cat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.cat-item{border:1px solid #e7eaf0;border-radius:8px;padding:10px;display:flex;gap:10px;page-break-inside:avoid}" +
      ".cat-item img{width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid #eee}.cat-emoji{width:64px;height:64px;display:grid;place-items:center;font-size:34px;background:#f4f6f9;border-radius:6px}" +
      ".cat-item h4{margin:0 0 2px;font-size:13px}.cat-cat{color:#697080;font-size:10px;text-transform:uppercase;letter-spacing:.5px}.cat-price{font-weight:700;font-size:13px;margin-top:3px}.cat-trade{color:#2f6bff;font-size:11px}";
  }
  function docFooter() {
    var wa = waNumber();
    return '<div class="doc-foot">' + esc(COMPANY.name) + " · " + esc(COMPANY.address) +
      (wa ? ' · WhatsApp <b>+' + esc(wa) + "</b>" : "") + " · " + esc(COMPANY.email) + "</div>";
  }
  function docHeader(title, rightHtml) {
    var logo = settingsMap.logo_url
      ? '<img class="doc-logo" src="' + esc(settingsMap.logo_url) + '" alt="" />'
      : '<div style="font-size:34px">🔥</div>';
    return '<div class="doc-top"><div class="doc-brand">' + logo +
      "<div><h1>" + esc(COMPANY.name) + "</h1><small>" + esc(COMPANY.tagline) + "</small></div></div>" +
      '<div class="doc-meta"><div class="doc-title">' + esc(title) + "</div>" + (rightHtml || "") + "</div></div>";
  }
  function printDoc(title, inner) {
    var w = window.open("", "_blank");
    if (!w) { DF.toast("Allow pop-ups to generate the document.", "warn"); return; }
    w.document.open();
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) +
      "</title><style>" + docCss() + "</style></head><body>" + inner + docFooter() + "</body></html>");
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 500);
  }

  function generateInvoice(id) {
    var o = orders.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    var items = (Array.isArray(o.items) ? o.items : []).map(function (i) {
      var line = Number(i.price || 0) * Number(i.qty || 0);
      return "<tr><td>" + esc(i.name || "") + (i.variant ? " <small>(" + esc(i.variant) + ")</small>" : "") +
        '</td><td class="right">' + (i.qty || 0) + '</td><td class="right">' + pkr(i.price) + '</td><td class="right">' + pkr(line) + "</td></tr>";
    }).join("");
    var paid = o.payment_status === "paid";
    var right = "<div>Invoice #: <strong>" + esc(o.ref || o.id) + "</strong></div>" +
      "<div>Date: " + esc(fmtDate(o.created_at)) + "</div>" +
      "<div>Payment: " + (o.payment_method === "bank_transfer" ? "Bank Transfer" : "Cash on Delivery") + "</div>" +
      '<div>Status: <span class="badge ' + (paid ? "b-paid" : "b-unpaid") + '">' + esc(o.payment_status || "unpaid") + "</span></div>";
    var inner = docHeader("INVOICE", right) +
      '<div class="parties"><div class="party"><h3>Billed to</h3>' +
        "<p><strong>" + esc(o.business || o.customer_name || "") + "</strong></p>" +
        (o.customer_name ? "<p>" + esc(o.customer_name) + "</p>" : "") +
        (o.phone ? "<p>" + esc(o.phone) + "</p>" : "") +
        (o.email ? "<p>" + esc(o.email) + "</p>" : "") +
        (o.address ? "<p>" + esc(o.address) + "</p>" : "") +
      '</div><div class="party to"><h3>From</h3><p><strong>' + esc(COMPANY.name) + "</strong></p><p>" + esc(COMPANY.address) +
        "</p><p>" + esc(COMPANY.email) + "</p>" + (waNumber() ? "<p>WhatsApp +" + esc(waNumber()) + "</p>" : "") + "</div></div>" +
      '<table class="tbl"><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Amount</th></tr></thead><tbody>' +
        (items || '<tr><td colspan="4">No items</td></tr>') + "</tbody></table>" +
      '<div class="totals"><div class="row grand"><span>Total</span><span>' + pkr(o.total) + "</span></div></div>";
    if (o.payment_method === "bank_transfer" && DF.cfg && DF.cfg.BANK) {
      var b = DF.cfg.BANK;
      inner += '<div class="note"><strong>Bank transfer details:</strong> ' + esc(b.bank) + " · " + esc(b.title) +
        " · " + esc(b.account) + " · IBAN " + esc(b.iban) + (o.payment_ref ? " · Ref: " + esc(o.payment_ref) : "") + "</div>";
    }
    inner += '<div class="note">Thank you for your business. Questions? Message us on WhatsApp' +
      (waNumber() ? " +" + esc(waNumber()) : "") + ".</div>";
    printDoc("Invoice " + (o.ref || ""), inner);
  }

  function generateLedger() {
    var rows = orders.slice().sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
    var billed = 0, paid = 0;
    var body = rows.map(function (o) {
      var amt = Number(o.total || 0); billed += amt; if (o.payment_status === "paid") paid += amt;
      return "<tr><td>" + esc(fmtDate(o.created_at)) + "</td><td>" + esc(o.ref || o.id) + "</td><td>" +
        esc(o.business || o.customer_name || "") + "</td><td>" + (o.payment_method === "bank_transfer" ? "Bank" : "COD") +
        '</td><td class="right">' + pkr(amt) + '</td><td><span class="badge ' + (o.payment_status === "paid" ? "b-paid" : "b-unpaid") +
        '">' + esc(o.payment_status || "unpaid") + "</span></td></tr>";
    }).join("");
    var inner = docHeader("LEDGER / STATEMENT", "<div>Generated: " + esc(fmtDate(new Date().toISOString())) +
        "</div><div>Entries: " + rows.length + "</div>") +
      '<table class="tbl"><thead><tr><th>Date</th><th>Ref</th><th>Business</th><th>Pay</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="6">No orders.</td></tr>') + "</tbody></table>" +
      '<div class="totals"><div class="row"><span>Total billed</span><span>' + pkr(billed) + "</span></div>" +
        '<div class="row"><span>Total paid</span><span>' + pkr(paid) + "</span></div>" +
        '<div class="row grand"><span>Outstanding</span><span>' + pkr(billed - paid) + "</span></div></div>";
    printDoc("Ledger", inner);
  }

  function generateCatalogue() {
    var body = products.filter(function (p) { return p.active; }).map(function (p) {
      var cover = p.image_url || (Array.isArray(p.images) && p.images[0]) || "";
      var media = cover ? '<img src="' + esc(cover) + '" alt="" />' : '<div class="cat-emoji">' + esc(p.emoji || "🍳") + "</div>";
      return '<div class="cat-item">' + media + '<div><div class="cat-cat">' + esc(p.category || "") + "</div><h4>" +
        esc(p.name) + '</h4><div class="cat-price">' + pkr(p.retail_price) + '</div><div class="cat-trade">Trade: ' +
        pkr(p.wholesale_price) + "</div></div></div>";
    }).join("");
    var inner = docHeader("PRODUCT CATALOGUE", "<div>" + esc(fmtDate(new Date().toISOString())) +
        "</div><div>" + products.length + " products</div>") +
      '<div class="cat-grid">' + (body || "No products.") + "</div>";
    printDoc("Catalogue", inner);
  }

  /* ---------- stats ---------- */
  function renderStats() {
    var revenue = orders
      .filter(function (o) { return o.status !== "cancelled"; })
      .reduce(function (s, o) { return s + Number(o.total || 0); }, 0);
    var pending = orders.filter(function (o) { return o.status === "pending"; }).length;
    var lowStock = products.filter(function (p) { return p.stock <= p.moq; }).length;
    var cards = [
      { label: "Orders", value: orders.length },
      { label: "Pending orders", value: pending },
      { label: "Revenue", value: pkr(revenue) },
      { label: "Products", value: products.length },
      { label: "Low stock", value: lowStock },
      { label: "Dealer requests", value: requests.length }
    ];
    el("stats").innerHTML = cards.map(function (c) {
      return '<div class="stat"><strong>' + esc(String(c.value)) + "</strong><span>" + esc(c.label) + "</span></div>";
    }).join("");

    var badge = el("reqBadge");
    if (requests.length) { badge.hidden = false; badge.textContent = requests.length; }
    else { badge.hidden = true; }
  }

  /* ---------- orders ---------- */
  function renderOrders() {
    var t = el("ordersTable").querySelector("tbody");
    if (!orders.length) { t.innerHTML = '<tr><td class="empty-cell">No orders yet.</td></tr>'; return; }
    var head = '<tr class="thead"><th>Ref</th><th>Business</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th><th>Status</th><th></th></tr>';
    var PAYSTATUS = ["unpaid", "paid", "refunded"];
    t.innerHTML = head + orders.map(function (o) {
      var itemCount = Array.isArray(o.items)
        ? o.items.reduce(function (s, i) { return s + Number(i.qty || 0); }, 0) : 0;
      var opts = STATUSES.map(function (s) {
        return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + s + "</option>";
      }).join("");
      var payOpts = PAYSTATUS.map(function (s) {
        return '<option value="' + s + '"' + (s === (o.payment_status || "unpaid") ? " selected" : "") + ">" + s + "</option>";
      }).join("");
      var methodLabel = o.payment_method === "bank_transfer" ? "🏦 Bank transfer" : "💵 Cash on delivery";
      var proof = o.payment_proof_url
        ? '<a class="thumb-link" href="' + esc(o.payment_proof_url) + '" data-full="' + esc(o.payment_proof_url) + '" title="Receipt"><img src="' + esc(o.payment_proof_url) + '" alt="receipt" loading="lazy" /></a>'
        : "";
      return "<tr>" +
        "<td><code>" + esc(o.ref || o.id) + "</code></td>" +
        "<td><strong>" + esc(o.business || "—") + "</strong><br><small>" + esc(o.customer_name || "") +
          " · " + esc(o.phone || "") + "</small></td>" +
        "<td>" + itemCount + " units</td>" +
        "<td>" + pkr(o.total) + "</td>" +
        '<td class="pay-cell"><small>' + methodLabel + "</small>" +
          (o.payment_ref ? '<br><small class="muted">Ref: ' + esc(o.payment_ref) + "</small>" : "") +
          '<div class="pay-line"><select class="pay-select pay-' + esc(o.payment_status || "unpaid") + '" data-id="' + esc(o.id) + '">' +
          payOpts + "</select>" + proof + "</div></td>" +
        "<td>" + esc(fmtDate(o.created_at)) + "</td>" +
        '<td><select class="status-select status-' + esc(o.status) + '" data-id="' + esc(o.id) + '">' +
          opts + "</select></td>" +
        '<td class="actions"><button class="link-btn" data-invoice="' + esc(o.id) + '">Invoice</button></td>' +
        "</tr>";
    }).join("");

    Array.prototype.forEach.call(t.querySelectorAll("[data-invoice]"), function (b) {
      b.addEventListener("click", function () { generateInvoice(b.getAttribute("data-invoice")); });
    });
    Array.prototype.forEach.call(t.querySelectorAll(".status-select"), function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id");
        db.from("orders").update({ status: sel.value }).eq("id", id).then(function (res) {
          if (res.error) { DF.toast(res.error.message, "warn"); return; }
          var o = orders.filter(function (x) { return x.id === id; })[0];
          if (o) o.status = sel.value;
          DF.toast("Order updated.");
          renderStats();
        });
      });
    });
    Array.prototype.forEach.call(t.querySelectorAll(".pay-select"), function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id");
        db.from("orders").update({ payment_status: sel.value }).eq("id", id).then(function (res) {
          if (res.error) { DF.toast(res.error.message, "warn"); return; }
          var o = orders.filter(function (x) { return x.id === id; })[0];
          if (o) o.payment_status = sel.value;
          DF.toast("Payment marked " + sel.value + ".");
        });
      });
    });
  }

  // CSV-escape a single cell (quote when it contains comma/quote/newline).
  function csvCell(v) {
    v = (v == null ? "" : String(v));
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function exportOrdersCsv() {
    if (!orders.length) { DF.toast("No orders to export.", "warn"); return; }
    var headers = ["Ref", "Business", "Customer", "Phone", "Email", "Address", "Items", "Total (PKR)", "Status", "Date"];
    var lines = orders.map(function (o) {
      var items = (Array.isArray(o.items) ? o.items : []).map(function (i) {
        return (i.name || "") + " x" + (i.qty || 0);
      }).join("; ");
      return [o.ref || o.id, o.business, o.customer_name, o.phone, o.email, o.address,
        items, o.total, o.status, fmtDate(o.created_at)].map(csvCell).join(",");
    });
    // Prepend BOM so Excel reads UTF-8 (Rs sign, etc.) correctly.
    var csv = "﻿" + headers.join(",") + "\r\n" + lines.join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "diamond-flame-orders-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    DF.toast("Exported " + orders.length + " order" + (orders.length === 1 ? "" : "s") + ".");
  }

  /* ---------- products ---------- */
  function renderProducts() {
    var t = el("productsTable").querySelector("tbody");
    if (!products.length) { t.innerHTML = '<tr><td class="empty-cell">No products yet.</td></tr>'; return; }
    var head = '<tr class="thead"><th>Item</th><th>Retail</th><th>Wholesale</th>' +
      '<th>Landing</th><th>Margin</th><th>Stock</th><th></th></tr>';
    t.innerHTML = head + products.map(function (p) {
      var cost = Number(p.cost_price || 0);
      var wm = Number(p.wholesale_price || 0) - cost;
      var wmPct = p.wholesale_price > 0 ? Math.round((wm / p.wholesale_price) * 100) : 0;
      var nv = Array.isArray(p.variants) ? p.variants.length : 0;
      var thumb = p.image_url
        ? '<span class="p-thumb"><img src="' + esc(p.image_url) + '" alt="" /></span>'
        : '<span class="p-thumb p-emoji">' + esc(p.emoji || "🍳") + "</span>";
      return "<tr" + (p.active ? "" : ' class="inactive"') + ">" +
        '<td class="p-cell">' + thumb + "<span><strong>" + esc(p.name) + "</strong><br><small>" +
          (p.brand ? esc(p.brand) + " · " : "") + esc(p.category) + " · MOQ " + p.moq +
          (nv ? " · " + nv + " variant" + (nv === 1 ? "" : "s") : "") + "</small></span></td>" +
        "<td>" + pkr(p.retail_price) + "</td>" +
        "<td>" + pkr(p.wholesale_price) + "</td>" +
        '<td class="cost-cell">' + pkr(cost) + "</td>" +
        '<td><span class="' + (wm >= 0 ? "pos" : "neg") + '">' + pkr(wm) + " · " + wmPct + "%</span></td>" +
        "<td>" + p.stock + "</td>" +
        '<td class="actions">' +
          '<button class="link-btn" data-edit="' + esc(p.id) + '">Edit</button>' +
          '<button class="link-btn danger" data-del="' + esc(p.id) + '">Delete</button>' +
        "</td></tr>";
    }).join("");

    Array.prototype.forEach.call(t.querySelectorAll("[data-edit]"), function (b) {
      b.addEventListener("click", function () { openProduct(b.getAttribute("data-edit")); });
    });
    Array.prototype.forEach.call(t.querySelectorAll("[data-del]"), function (b) {
      b.addEventListener("click", function () { deleteProduct(b.getAttribute("data-del")); });
    });
  }

  function findProduct(id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  }

  function openProduct(id) {
    var form = el("productForm");
    form.reset();
    var f = form.elements; // use .elements: "id"/"name" collide with form properties
    var p = id ? findProduct(id) : null;
    el("productModalTitle").textContent = p ? "Edit product" : "Add product";
    f["id"].value = p ? p.id : "";
    f["image_url"].value = (p && p.image_url) || "";
    if (p) {
      f["name"].value = p.name || "";
      f["brand"].value = p.brand || "";
      f["category"].value = p.category || "";
      f["description"].value = p.description || "";
      f["retail_price"].value = p.retail_price;
      f["wholesale_price"].value = p.wholesale_price;
      f["cost_price"].value = p.cost_price != null ? p.cost_price : 0;
      f["moq"].value = p.moq;
      f["stock"].value = p.stock;
      f["emoji"].value = p.emoji || "🍳";
      f["active"].checked = !!p.active;
    } else {
      f["emoji"].value = "🍳";
      f["cost_price"].value = 0;
      f["active"].checked = true;
    }
    var existing = (p && Array.isArray(p.images) && p.images.length) ? p.images.slice()
      : (p && p.image_url ? [p.image_url] : []);
    keptImages = existing;
    f["images_files"].value = "";
    renderGallery();
    renderVariantRows(p && Array.isArray(p.variants) ? p.variants : []);
    renderMargins();
    el("productOverlay").classList.add("open");
  }

  /* ---------- image gallery editor ---------- */
  function renderGallery() {
    var box = el("galleryEdit");
    var pending = el("productForm").elements["images_files"].files.length;
    var html = keptImages.map(function (u, i) {
      return '<div class="gthumb"><img src="' + esc(u) + '" alt="" />' +
        (i === 0 ? '<span class="gcover">Cover</span>' : "") +
        '<button type="button" class="gdel" data-i="' + i + '" aria-label="Remove">✕</button></div>';
    }).join("");
    if (pending) html += '<div class="gpending">+' + pending + " new image" + (pending === 1 ? "" : "s") + " to upload</div>";
    if (!html) html = '<p class="gempty">No images yet — upload one or more above.</p>';
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll(".gdel"), function (b) {
      b.addEventListener("click", function () {
        keptImages.splice(parseInt(b.getAttribute("data-i"), 10), 1);
        renderGallery();
      });
    });
  }

  /* ---------- variant editor ---------- */
  function variantRowHtml(v) {
    v = v || {};
    return '<div class="variant-row">' +
      '<input class="v-name" placeholder="Name (e.g. Double bowl)" value="' + esc(v.name || "") + '" />' +
      '<input class="v-retail" type="number" min="0" step="1" placeholder="Retail" value="' + (v.retail_price != null ? esc(v.retail_price) : "") + '" />' +
      '<input class="v-wholesale" type="number" min="0" step="1" placeholder="Wholesale" value="' + (v.wholesale_price != null ? esc(v.wholesale_price) : "") + '" />' +
      '<input class="v-stock" type="number" min="0" step="1" placeholder="Stock" value="' + (v.stock != null ? esc(v.stock) : "") + '" />' +
      '<button type="button" class="link-btn danger v-del" aria-label="Remove">✕</button>' +
      "</div>";
  }
  function renderVariantRows(list) {
    el("variantRows").innerHTML = (list || []).map(variantRowHtml).join("");
    bindVariantRowRemovers();
  }
  function bindVariantRowRemovers() {
    Array.prototype.forEach.call(el("variantRows").querySelectorAll(".v-del"), function (b) {
      b.onclick = function () { b.parentNode.remove(); };
    });
  }
  function collectVariants() {
    var out = [];
    Array.prototype.forEach.call(el("variantRows").querySelectorAll(".variant-row"), function (row) {
      var name = row.querySelector(".v-name").value.trim();
      if (!name) return; // skip unnamed rows
      var rp = row.querySelector(".v-retail").value;
      var wp = row.querySelector(".v-wholesale").value;
      var st = row.querySelector(".v-stock").value;
      out.push({
        name: name,
        retail_price: rp === "" ? null : Number(rp),
        wholesale_price: wp === "" ? null : Number(wp),
        stock: st === "" ? 0 : Math.max(0, parseInt(st, 10) || 0)
      });
    });
    return out;
  }

  // Live profit-margin readout as the admin types prices.
  function renderMargins() {
    var box = el("marginReadout");
    if (!box) return;
    var f = el("productForm").elements;
    var cost = Number(f["cost_price"].value) || 0;
    var retail = Number(f["retail_price"].value) || 0;
    var ws = Number(f["wholesale_price"].value) || 0;
    function pct(sale) { return sale > 0 ? Math.round(((sale - cost) / sale) * 100) : 0; }
    function cls(n) { return n >= 0 ? "pos" : "neg"; }
    var rm = retail - cost, wm = ws - cost;
    box.innerHTML =
      '<div class="m-row"><span>Retail margin</span><strong class="' + cls(rm) + '">' +
        pkr(rm) + " · " + pct(retail) + "%</strong></div>" +
      '<div class="m-row"><span>Wholesale margin</span><strong class="' + cls(wm) + '">' +
        pkr(wm) + " · " + pct(ws) + "%</strong></div>";
  }

  // Upload a product image to public storage; resolves to its public URL.
  function uploadProductImage(file) {
    var clean = file.name.replace(/[^\w.\-]+/g, "_");
    var path = "products/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "-" + clean;
    return db.storage.from("product-images").upload(path, file).then(function (res) {
      if (res.error) throw res.error;
      return db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    });
  }

  function saveProduct(e) {
    e.preventDefault();
    var f = e.target.elements; // use .elements: "id"/"name" collide with form properties
    var id = f["id"].value;
    var submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "Saving…";

    var files = Array.prototype.slice.call(f["images_files"].files, 0, 6 - keptImages.length);
    var imgStep;
    if (files.length) {
      submitBtn.textContent = "Uploading images…";
      imgStep = Promise.all(files.map(uploadProductImage)).then(function (urls) {
        return keptImages.concat(urls);
      });
    } else {
      imgStep = Promise.resolve(keptImages.slice());
    }

    imgStep.then(function (images) {
      var payload = {
        name: f["name"].value.trim(),
        brand: f["brand"].value.trim(),
        category: f["category"].value.trim(),
        description: f["description"].value.trim(),
        image_url: images[0] || null,
        images: images,
        retail_price: Number(f["retail_price"].value),
        wholesale_price: Number(f["wholesale_price"].value),
        cost_price: Number(f["cost_price"].value),
        moq: Math.max(1, parseInt(f["moq"].value, 10) || 1),
        stock: Math.max(0, parseInt(f["stock"].value, 10) || 0),
        emoji: f["emoji"].value.trim() || "🍳",
        active: f["active"].checked,
        variants: collectVariants()
      };
      submitBtn.textContent = "Saving…";
      return id
        ? db.from("products").update(payload).eq("id", id)
        : db.from("products").insert(payload);
    }).then(function (res) {
      submitBtn.disabled = false; submitBtn.textContent = "Save product";
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      el("productOverlay").classList.remove("open");
      DF.toast(id ? "Product updated." : "Product added.");
      loadProducts().then(renderStats);
    }).catch(function (err) {
      submitBtn.disabled = false; submitBtn.textContent = "Save product";
      DF.toast("Save failed: " + (err && err.message ? err.message : err), "warn");
    });
  }

  function deleteProduct(id) {
    var p = findProduct(id);
    if (!window.confirm('Delete "' + (p ? p.name : "this product") + '"?')) return;
    db.from("products").delete().eq("id", id).then(function (res) {
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      DF.toast("Product deleted.");
      loadProducts().then(renderStats);
    });
  }

  /* ---------- customers ---------- */
  function filteredCustomers() {
    var q = customerQuery.trim().toLowerCase();
    return customers.filter(function (c) {
      if (customerRole && c.role !== customerRole) return false;
      if (!q) return true;
      return (c.business || "").toLowerCase().indexOf(q) > -1 ||
        (c.full_name || "").toLowerCase().indexOf(q) > -1 ||
        (c.email || "").toLowerCase().indexOf(q) > -1 ||
        (c.phone || "").toLowerCase().indexOf(q) > -1;
    });
  }

  function renderCustomers() {
    var t = el("customersTable").querySelector("tbody");
    if (!customers.length) { t.innerHTML = '<tr><td class="empty-cell">No customers yet.</td></tr>'; return; }
    var list = filteredCustomers();
    if (!list.length) { t.innerHTML = '<tr><td class="empty-cell">No customers match your filter.</td></tr>'; return; }
    var head = '<tr class="thead"><th>Business</th><th>Name</th><th>Contact</th><th>Documents</th><th>Role / access</th><th>Joined</th></tr>';
    t.innerHTML = head + list.map(function (c) {
      var opts = ["customer", "dealer", "admin"].map(function (r) {
        return '<option value="' + r + '"' + (r === c.role ? " selected" : "") + ">" + r + "</option>";
      }).join("");
      return "<tr>" +
        "<td><strong>" + esc(c.business || "—") + "</strong>" +
          (c.dealer_status && c.dealer_status !== "none"
            ? '<br><span class="ds ds-' + esc(c.dealer_status) + '">' + esc(c.dealer_status) + "</span>" : "") + "</td>" +
        "<td>" + esc(c.full_name || "—") + "</td>" +
        "<td>" + esc(c.email || "") + "<br><small>" + esc(c.phone || "") + "</small></td>" +
        '<td class="verify-cell">' + verificationCell(c) + "</td>" +
        '<td><select class="role-select" data-id="' + esc(c.id) + '">' + opts + "</select></td>" +
        "<td>" + esc(fmtDate(c.created_at)) + "</td>" +
        "</tr>";
    }).join("");

    Array.prototype.forEach.call(t.querySelectorAll(".role-select"), function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id");
        db.from("profiles").update({ role: sel.value }).eq("id", id).then(function (res) {
          if (res.error) { DF.toast(res.error.message, "warn"); return; }
          DF.toast(sel.value === "dealer"
            ? "Dealer approved — they now see wholesale prices."
            : "Role updated to " + sel.value + ".");
          loadCustomers().then(renderDealerOptions);
        });
      });
    });
  }

  /* ---------- dealer documents ---------- */
  // Thumbnail opens the in-dashboard lightbox (see init) via [data-full].
  function docThumb(url, title) {
    return '<button type="button" class="thumb-link" data-full="' + esc(url) + '" title="' +
      esc(title) + '" aria-label="' + esc(title) + '"><img src="' + esc(url) +
      '" alt="' + esc(title) + '" loading="lazy" /></button>';
  }
  function verificationCell(c) {
    var parts = [];
    if (c.whatsapp) {
      var wa = String(c.whatsapp).replace(/[^\d+]/g, "");
      parts.push('<a class="doc-wa" href="https://wa.me/' + esc(wa.replace(/^\+/, "")) +
        '" target="_blank" rel="noopener">📱 ' + esc(c.whatsapp) + "</a>");
    }
    var thumbs = "";
    if (c.shop_card_url) thumbs += docThumb(c.shop_card_url, "Shop card");
    (Array.isArray(c.shop_photos) ? c.shop_photos : []).forEach(function (u, i) {
      thumbs += docThumb(u, "Shop photo " + (i + 1));
    });
    if (thumbs) parts.push('<div class="doc-thumbs">' + thumbs + "</div>");
    return parts.length ? parts.join("") : '<small class="muted">—</small>';
  }

  function renderRequests() {
    var t = el("requestsTable").querySelector("tbody");
    el("approveAll").disabled = !requests.length;
    if (!requests.length) { t.innerHTML = '<tr><td class="empty-cell">No pending dealer applications.</td></tr>'; return; }
    var head = '<tr class="thead"><th>Business</th><th>Applicant</th><th>Contact</th><th>Verification</th><th>Applied</th><th></th></tr>';
    t.innerHTML = head + requests.map(function (c) {
      return "<tr>" +
        "<td><strong>" + esc(c.business || "—") + "</strong></td>" +
        "<td>" + esc(c.full_name || "—") + "</td>" +
        "<td>" + esc(c.email || "") + "<br><small>" + esc(c.phone || "") + "</small></td>" +
        '<td class="verify-cell">' + verificationCell(c) + "</td>" +
        "<td>" + esc(fmtDate(c.created_at)) + "</td>" +
        '<td class="actions">' +
          '<button class="btn btn-flame sm" data-approve="' + esc(c.id) + '">Approve</button> ' +
          '<button class="link-btn danger" data-reject="' + esc(c.id) + '">Reject</button>' +
        "</td></tr>";
    }).join("");

    Array.prototype.forEach.call(t.querySelectorAll("[data-approve]"), function (b) {
      b.addEventListener("click", function () { decideRequest(b.getAttribute("data-approve"), true); });
    });
    Array.prototype.forEach.call(t.querySelectorAll("[data-reject]"), function (b) {
      b.addEventListener("click", function () { decideRequest(b.getAttribute("data-reject"), false); });
    });
  }

  function approveAllRequests() {
    if (!requests.length) return;
    if (!window.confirm("Approve all " + requests.length + " pending dealer application(s)?")) return;
    var ids = requests.map(function (c) { return c.id; });
    db.from("profiles").update({ role: "dealer", dealer_status: "approved" }).in("id", ids).then(function (res) {
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      DF.toast("Approved " + ids.length + " dealer" + (ids.length === 1 ? "" : "s") + ".");
      loadCustomers().then(function () { renderStats(); renderRequests(); renderDealerOptions(); });
    });
  }

  function decideRequest(id, approve) {
    var patch = approve
      ? { role: "dealer", dealer_status: "approved" }
      : { dealer_status: "rejected" };
    db.from("profiles").update(patch).eq("id", id).then(function (res) {
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      DF.toast(approve ? "Dealer approved." : "Application rejected.");
      loadCustomers().then(function () { renderStats(); renderRequests(); renderDealerOptions(); });
    });
  }

  /* ---------- per-dealer pricing ---------- */
  function dealers() {
    return customers.filter(function (c) { return c.role === "dealer"; });
  }

  function renderDealerOptions() {
    var sel = el("pricingDealer");
    var prev = sel.value;
    var ds = dealers();
    if (!ds.length) {
      sel.innerHTML = '<option value="">No dealers yet</option>';
      el("savePricing").disabled = true;
      el("pricingTable").querySelector("tbody").innerHTML =
        '<tr><td class="empty-cell">Approve a dealer first to set custom prices.</td></tr>';
      return;
    }
    sel.innerHTML = ds.map(function (d) {
      return '<option value="' + esc(d.id) + '">' + esc(d.business || d.full_name || d.email) + "</option>";
    }).join("");
    if (prev && ds.some(function (d) { return d.id === prev; })) sel.value = prev;
    loadDealerPricing();
  }

  function loadDealerPricing() {
    var dealerId = el("pricingDealer").value;
    if (!dealerId) return;
    el("savePricing").disabled = false;
    db.from("dealer_prices").select("*").eq("dealer_id", dealerId).then(function (res) {
      var overrides = {};
      (res.data || []).forEach(function (r) { overrides[r.product_id] = r.price; });
      renderPricingTable(overrides);
    });
  }

  function renderPricingTable(overrides) {
    var t = el("pricingTable").querySelector("tbody");
    if (!products.length) { t.innerHTML = '<tr><td class="empty-cell">No products.</td></tr>'; return; }
    var head = '<tr class="thead"><th>Product</th><th>Default wholesale</th><th>This dealer\'s price</th></tr>';
    t.innerHTML = head + products.map(function (p) {
      var ov = overrides[p.id];
      return "<tr>" +
        "<td>" + esc(p.emoji || "📦") + " <strong>" + esc(p.name) + "</strong><br><small>" +
          esc(p.brand || "") + " · " + esc(p.category) + "</small></td>" +
        "<td>" + pkr(p.wholesale_price) + "</td>" +
        '<td><input class="price-input" type="number" min="0" step="1" ' +
          'data-pid="' + esc(p.id) + '" placeholder="' + p.wholesale_price + '" ' +
          'value="' + (ov != null ? ov : "") + '" /></td>' +
        "</tr>";
    }).join("");
  }

  function savePricing() {
    var dealerId = el("pricingDealer").value;
    if (!dealerId) return;
    var inputs = el("pricingTable").querySelectorAll(".price-input");
    var upserts = [], deletes = [];
    Array.prototype.forEach.call(inputs, function (inp) {
      var pid = inp.getAttribute("data-pid");
      var raw = inp.value.trim();
      if (raw === "") { deletes.push(pid); }
      else { upserts.push({ dealer_id: dealerId, product_id: pid, price: Number(raw) }); }
    });
    var btn = el("savePricing");
    btn.disabled = true; btn.textContent = "Saving…";
    var jobs = [];
    if (upserts.length) jobs.push(db.from("dealer_prices").upsert(upserts));
    if (deletes.length) jobs.push(db.from("dealer_prices").delete().eq("dealer_id", dealerId).in("product_id", deletes));
    Promise.all(jobs).then(function (results) {
      btn.disabled = false; btn.textContent = "Save prices";
      var err = results.filter(function (r) { return r && r.error; })[0];
      if (err) { DF.toast(err.error.message, "warn"); return; }
      DF.toast("Dealer prices saved.");
    });
  }

  /* ---------- wiring ---------- */
  function init() {
    el("adminLoginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value })
        .then(function (res) {
          if (res.error) { el("gateHint").textContent = res.error.message; return; }
          f.reset(); boot();
        });
    });

    el("signOutBtn").addEventListener("click", function () {
      db.auth.signOut().then(function () { profile = null; showGate(""); el("signOutBtn").hidden = true; });
    });

    el("refreshOrders").addEventListener("click", function () { loadOrders().then(renderStats); });
    el("exportOrders").addEventListener("click", exportOrdersCsv);
    el("exportLedger").addEventListener("click", generateLedger);
    el("downloadCatalogue").addEventListener("click", generateCatalogue);
    el("approveAll").addEventListener("click", approveAllRequests);
    el("customerSearch").addEventListener("input", function (e) { customerQuery = e.target.value; renderCustomers(); });
    el("customerRole").addEventListener("change", function (e) { customerRole = e.target.value; renderCustomers(); });
    el("refreshCustomers").addEventListener("click", function () {
      loadCustomers().then(function () { renderStats(); renderRequests(); renderDealerOptions(); });
    });
    el("refreshRequests").addEventListener("click", function () {
      loadCustomers().then(function () { renderStats(); renderRequests(); renderDealerOptions(); });
    });
    el("newProductBtn").addEventListener("click", function () { openProduct(null); });
    el("closeProduct").addEventListener("click", function () { el("productOverlay").classList.remove("open"); });
    el("productForm").addEventListener("submit", saveProduct);
    el("productForm").addEventListener("input", renderMargins);
    el("addVariant").addEventListener("click", function () {
      el("variantRows").insertAdjacentHTML("beforeend", variantRowHtml({}));
      bindVariantRowRemovers();
    });
    el("productForm").elements["images_files"].addEventListener("change", renderGallery);
    el("saveBranding").addEventListener("click", saveBranding);
    el("pricingDealer").addEventListener("change", loadDealerPricing);
    el("savePricing").addEventListener("click", savePricing);

    Array.prototype.forEach.call(document.querySelectorAll(".dtab"), function (tab) {
      tab.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll(".dtab"), function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var view = tab.getAttribute("data-view");
        ["orders", "products", "requests", "pricing", "customers", "branding"].forEach(function (v) {
          el("view-" + v).hidden = v !== view;
        });
      });
    });

    document.querySelectorAll(".modal-overlay").forEach(function (ov) {
      ov.addEventListener("click", function (e) { if (e.target === ov) ov.classList.remove("open"); });
    });

    // Document lightbox — any thumbnail with [data-full] opens a full preview.
    function closeLightbox() { el("lightbox").hidden = true; el("lightboxImg").src = ""; }
    document.addEventListener("click", function (e) {
      var thumb = e.target.closest && e.target.closest(".thumb-link[data-full]");
      if (thumb) { el("lightboxImg").src = thumb.getAttribute("data-full"); el("lightbox").hidden = false; return; }
      if (e.target === el("lightbox") || (e.target.closest && e.target.closest("#lightboxClose"))) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { el("productOverlay").classList.remove("open"); closeLightbox(); }
    });

    boot();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
