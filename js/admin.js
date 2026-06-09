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
      renderBranding();
    });
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
    brandImageKeys = ["logo_url", "hero_image_url", "banner_url"].concat(cats.map(function (c) { return "col:" + c; }));
    el("brandingBody").innerHTML =
      brandImageField("logo_url", "Logo") +
      brandImageField("hero_image_url", "Hero image") +
      brandTextField("hero_headline", "Hero headline") +
      brandTextField("hero_subtext", "Hero subtext", true) +
      brandImageField("banner_url", "Promo banner image") +
      brandTextField("banner_link", "Promo banner link (optional, e.g. #catalogue)") +
      '<div class="brand-sub">Collection images</div>' +
      cats.map(function (c) { return brandImageField("col:" + c, c); }).join("");
    var body = el("brandingBody");
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
    Promise.all(uploads).then(function () {
      var rows = [];
      brandImageKeys.forEach(function (k) {
        var val = (k in assetUrls) ? assetUrls[k] : (settingsMap[k] || null);
        rows.push({ key: k, value: val || null });
      });
      ["hero_headline", "hero_subtext", "banner_link"].forEach(function (k) {
        rows.push({ key: k, value: (settingsMap[k] || "").trim() || null });
      });
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
    var head = '<tr class="thead"><th>Ref</th><th>Business</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th><th>Status</th></tr>';
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
        "</tr>";
    }).join("");

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
