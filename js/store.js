/* Diamond Flame Home Appliances — storefront logic. */
(function () {
  "use strict";

  var DF = window.DF;
  var db = DF.db;
  var el = DF.el, pkr = DF.pkr, esc = DF.esc;

  var STORAGE_KEY = "dfha.cart.v2"; // v2: keyed by product+variant, value {pid,variant,qty}
  var products = [];
  var cart = loadCart();
  var profile = null;
  var activeCat = "All";
  var query = "";

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function find(id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  }

  /* ---------- catalogue ---------- */
  function loadProducts() {
    if (!DF.configured || !db) {
      el("backendBanner").hidden = false;
      el("gridLoading").textContent = "Catalogue unavailable until the backend is connected.";
      return;
    }
    // catalogue() is a security-definer RPC that returns only the prices the
    // caller may see: wholesale is NULL unless you are a dealer/admin, cost is
    // NULL unless admin. So the UI is driven purely by the data it receives.
    db.rpc("catalogue").then(function (res) {
      if (res.error) {
        el("gridLoading").textContent = "Could not load catalogue: " + res.error.message;
        return;
      }
      products = res.data || [];
      el("statCount").textContent = products.length;
      renderFilters();
      renderGrid();
      updateCartUI();
      updateDealerHint();
    });
  }

  // True when the catalogue came back with wholesale pricing (i.e. dealer/admin).
  function isDealerView() {
    return products.some(function (p) {
      return p.wholesale_price !== null && p.wholesale_price !== undefined;
    });
  }
  function hasWholesale(p) {
    return p.wholesale_price !== null && p.wholesale_price !== undefined;
  }
  function variantsOf(p) { return Array.isArray(p.variants) ? p.variants : []; }
  function variantByName(p, name) {
    var vs = variantsOf(p);
    for (var i = 0; i < vs.length; i++) if (vs[i].name === name) return vs[i];
    return null;
  }
  function retailOf(p, v) { return (v && v.retail_price != null) ? v.retail_price : p.retail_price; }
  function wholesaleOf(p, v) { return (v && v.wholesale_price != null) ? v.wholesale_price : p.wholesale_price; }
  // Effective unit price for the active tier (wholesale falls back to retail).
  function unitPrice(p, v) {
    if (hasWholesale(p)) { var w = wholesaleOf(p, v); return (w != null) ? w : retailOf(p, v); }
    return retailOf(p, v);
  }
  function stockOf(p, v) { return v ? (v.stock != null ? Number(v.stock) : 0) : Number(p.stock || 0); }
  function minQty(p) { return hasWholesale(p) ? (p.moq || 1) : 1; }

  function updateDealerHint() {
    var hint = el("dealerHint");
    if (!hint) return;
    if (isDealerView()) {
      hint.textContent = "✓ Dealer pricing active — you're seeing wholesale rates.";
      hint.className = "dealer-hint active";
    } else {
      hint.textContent = "Retail prices shown. Dealers: sign in to see wholesale rates.";
      hint.className = "dealer-hint";
    }
  }

  function categories() {
    var seen = {}, out = ["All"];
    products.forEach(function (p) {
      if (p.category && !seen[p.category]) { seen[p.category] = 1; out.push(p.category); }
    });
    return out;
  }

  function renderFilters() {
    var wrap = el("filters");
    wrap.innerHTML = "";
    categories().forEach(function (cat) {
      var b = document.createElement("button");
      b.className = "chip" + (cat === activeCat ? " active" : "");
      b.textContent = cat;
      b.addEventListener("click", function () {
        activeCat = cat;
        renderFilters();
        renderGrid();
      });
      wrap.appendChild(b);
    });
  }

  function visibleProducts() {
    var q = query.trim().toLowerCase();
    return products.filter(function (p) {
      if (activeCat !== "All" && p.category !== activeCat) return false;
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().indexOf(q) > -1 ||
        (p.brand || "").toLowerCase().indexOf(q) > -1 ||
        (p.category || "").toLowerCase().indexOf(q) > -1
      );
    });
  }

  function mediaInner(p) {
    return p.image_url
      ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" loading="lazy" />'
      : '<span class="media-emoji">' + esc(p.emoji || "🍳") + "</span>";
  }
  function priceRowHtml(p, v) {
    var retail = retailOf(p, v);
    if (hasWholesale(p)) {
      var w = unitPrice(p, v);
      var saving = retail > w ? Math.round(100 - (w / retail) * 100) : 0;
      return '<span class="wholesale">' + pkr(w) + '<small>/unit dealer price</small></span>' +
        (saving ? '<span class="retail">' + pkr(retail) + "</span>" : "");
    }
    return '<span class="wholesale">' + pkr(retail) + '<small>/unit</small></span>';
  }

  function renderGrid() {
    var grid = el("productGrid");
    var list = visibleProducts();
    if (!list.length) {
      grid.innerHTML = '<p class="loading">No products match your search.</p>';
      return;
    }
    grid.innerHTML = "";
    list.forEach(function (p) {
      var vs = variantsOf(p);
      var card = document.createElement("article");
      card.className = "card";
      var variantPick = vs.length
        ? '<div class="variant-pick"><select class="variant-select">' + vs.map(function (v) {
            return '<option value="' + esc(v.name) + '">' + esc(v.name) + "</option>";
          }).join("") + "</select></div>"
        : "";
      card.innerHTML =
        '<div class="card-media">' + mediaInner(p) + "</div>" +
        '<div class="card-body">' +
          '<span class="card-brand">' + (p.brand ? esc(p.brand) + " · " : "") + esc(p.category) + "</span>" +
          '<h3 class="card-name">' + esc(p.name) + "</h3>" +
          '<p class="card-desc">' + esc(p.description || "") + "</p>" +
          variantPick +
          '<div class="price-row"></div>' +
          '<div class="card-foot">' +
            (hasWholesale(p) ? '<span class="moq">MOQ ' + p.moq + "</span>" : '<span class="moq">Retail</span>') +
            '<button class="add-btn">Add to order</button>' +
          "</div>" +
        "</div>";

      var sel = card.querySelector(".variant-select");
      var media = card.querySelector(".card-media");
      var priceRow = card.querySelector(".price-row");
      var addBtn = card.querySelector(".add-btn");

      function refresh() {
        var v = sel ? variantByName(p, sel.value) : null;
        priceRow.innerHTML = priceRowHtml(p, v);
        Array.prototype.forEach.call(media.querySelectorAll(".badge"), function (b) { b.remove(); });
        var st = stockOf(p, v);
        var retail = retailOf(p, v), w = unitPrice(p, v);
        var saving = hasWholesale(p) && retail > w ? Math.round(100 - (w / retail) * 100) : 0;
        var badges = "";
        if (st <= 0) {
          badges = '<span class="badge out">Out of stock</span>';
        } else {
          if (saving) badges += '<span class="badge save">-' + saving + "%</span>";
          if (st <= 5) badges += '<span class="badge low">Only ' + st + " left</span>";
        }
        if (badges) media.insertAdjacentHTML("beforeend", badges);
        addBtn.disabled = st <= 0;
        addBtn.textContent = st <= 0 ? "Unavailable" : "Add to order";
      }
      if (sel) sel.addEventListener("change", refresh);
      refresh();
      addBtn.addEventListener("click", function () {
        if (!addBtn.disabled) addToCart(p.id, sel ? sel.value : "");
      });
      grid.appendChild(card);
    });
  }

  /* ---------- cart (MOQ-aware, variant-aware; keyed by product+variant) ---------- */
  function lineKey(pid, variant) { return pid + "||" + (variant || ""); }
  function addToCart(pid, variant) {
    var p = find(pid); if (!p) return;
    var v = variantByName(p, variant);
    if (stockOf(p, v) <= 0) return;
    var key = lineKey(pid, variant);
    var cur = cart[key] ? cart[key].qty : 0;
    cart[key] = { pid: pid, variant: variant || "", qty: cur ? cur + 1 : minQty(p) };
    saveCart(); updateCartUI(); openCart();
  }
  function setQty(key, qty) {
    var line = cart[key]; if (!line) return;
    var p = find(line.pid);
    var min = p ? minQty(p) : 1;
    if (qty < min) delete cart[key]; else line.qty = qty;
    saveCart(); updateCartUI();
  }
  function cartCount() { var n = 0; for (var k in cart) n += cart[k].qty; return n; }
  function cartTotal() {
    var t = 0;
    for (var k in cart) {
      var line = cart[k], p = find(line.pid);
      if (p) t += unitPrice(p, variantByName(p, line.variant)) * line.qty;
    }
    return t;
  }

  function updateCartUI() {
    el("cartCount").textContent = cartCount();
    el("cartTotal").textContent = pkr(cartTotal());
    var box = el("cartItems");
    var keys = Object.keys(cart);
    if (!keys.length) { box.innerHTML = '<p class="empty">No items yet. Add products to build your order.</p>'; return; }
    box.innerHTML = "";
    keys.forEach(function (key) {
      var line = cart[key];
      var p = find(line.pid);
      if (!p) { delete cart[key]; return; }
      var v = variantByName(p, line.variant);
      var unit = unitPrice(p, v);
      var thumb = p.image_url ? '<img src="' + esc(p.image_url) + '" alt="" />' : esc(p.emoji || "🍳");
      var row = document.createElement("div");
      row.className = "drawer-row";
      row.innerHTML =
        '<div class="thumb">' + thumb + "</div>" +
        '<div class="info">' +
          "<strong>" + esc(p.name) + "</strong>" +
          (line.variant ? '<span class="variant-tag">' + esc(line.variant) + "</span>" : "") +
          '<span class="unit">' + pkr(unit) + (hasWholesale(p) ? " · MOQ " + p.moq : "") + "</span>" +
          '<div class="qty">' +
            '<button data-act="dec">−</button><span>' + line.qty + '</span><button data-act="inc">+</button>' +
            '<button class="remove">Remove</button>' +
          "</div>" +
        "</div>" +
        '<div class="line-total">' + pkr(unit * line.qty) + "</div>";
      row.querySelector('[data-act="inc"]').addEventListener("click", function () { setQty(key, line.qty + 1); });
      row.querySelector('[data-act="dec"]').addEventListener("click", function () { setQty(key, line.qty - 1); });
      row.querySelector(".remove").addEventListener("click", function () { setQty(key, 0); });
      box.appendChild(row);
    });
  }

  /* ---------- drawers & modals ---------- */
  function openCart() { el("cartDrawer").classList.add("open"); el("drawerOverlay").classList.add("open"); }
  function closeCart() { el("cartDrawer").classList.remove("open"); el("drawerOverlay").classList.remove("open"); }
  // Single source of truth for which auth form is shown.
  function setAuthMode(mode) {
    var isLogin = mode !== "signup";
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === (isLogin ? "login" : "signup"));
    });
    el("loginForm").hidden = !isLogin;
    el("signupForm").hidden = isLogin;
    if (isLogin) el("dealerFields").hidden = true;
    el("authTitle").textContent = isLogin ? "Welcome back" : "Create your account";
    el("authSub").textContent = isLogin
      ? "Sign in to see your pricing and track your orders."
      : "Set up your shop account — apply as a dealer for wholesale rates.";
  }

  function openAuth() {
    setAuthMode("login");
    el("authOverlay").classList.add("open");
  }
  function closeAuth() { el("authOverlay").classList.remove("open"); }
  function closeCheckout() { el("checkoutOverlay").classList.remove("open"); }

  function openCheckout() {
    if (!cartCount()) { DF.toast("Your order is empty.", "warn"); return; }
    if (!DF.configured) { DF.toast("Connect the backend to place orders.", "warn"); return; }
    renderOrderSummary();
    el("checkoutForm").hidden = false;
    el("checkoutDone").hidden = true;
    if (profile) {
      var f = el("orderForm");
      if (f.business && profile.business) f.business.value = profile.business;
      if (f.customer_name && profile.full_name) f.customer_name.value = profile.full_name;
      if (f.email && profile.email) f.email.value = profile.email;
      if (f.phone && profile.phone) f.phone.value = profile.phone;
    }
    el("checkoutOverlay").classList.add("open");
  }

  function renderOrderSummary() {
    var html = "";
    for (var k in cart) {
      var line = cart[k], p = find(line.pid); if (!p) continue;
      var v = variantByName(p, line.variant);
      var label = esc(p.name) + (line.variant ? " (" + esc(line.variant) + ")" : "");
      html += '<div class="sum-row"><span>' + label + " × " + line.qty +
        "</span><span>" + pkr(unitPrice(p, v) * line.qty) + "</span></div>";
    }
    html += '<div class="sum-row sum-total"><span>Total</span><span>' + pkr(cartTotal()) + "</span></div>";
    el("orderSummary").innerHTML = html;
  }

  function submitOrder(e) {
    e.preventDefault();
    var f = e.target;
    var items = Object.keys(cart).map(function (k) {
      var line = cart[k], p = find(line.pid), v = variantByName(p, line.variant);
      return {
        id: line.pid, name: p.name, variant: line.variant, brand: p.brand, qty: line.qty,
        price: unitPrice(p, v),
        tier: hasWholesale(p) ? "wholesale" : "retail"
      };
    });
    var order = {
      ref: "DF-" + Date.now().toString(36).toUpperCase(),
      user_id: profile ? profile.id : null,
      business: f.business.value.trim(),
      customer_name: f.customer_name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      address: f.address.value.trim(),
      items: items,
      total: cartTotal(),
      status: "pending"
    };
    var submitBtn = f.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "Submitting…";

    db.from("orders").insert(order).select().single().then(function (res) {
      submitBtn.disabled = false; submitBtn.textContent = "Submit order";
      if (res.error) { DF.toast("Order failed: " + res.error.message, "warn"); return; }
      cart = {}; saveCart(); updateCartUI();
      el("doneMsg").textContent =
        "Thank you. Order " + order.ref + " is logged — our team will call " +
        order.phone + " to confirm stock and delivery.";
      el("checkoutForm").hidden = true;
      el("checkoutDone").hidden = false;
    });
  }

  /* ---------- auth ---------- */
  function refreshAuthUI() {
    DF.currentProfile().then(function (p) {
      profile = p;
      var btn = el("authBtn");
      if (p) {
        var label = (p.full_name || p.email || "Account").split(" ")[0];
        btn.textContent = "Hi, " + label + " · Sign out";
        btn.onclick = function () {
          db.auth.signOut().then(function () {
            profile = null; refreshAuthUI(); loadProducts(); DF.toast("Signed out.");
          });
        };
      } else {
        btn.textContent = "Sign in";
        btn.onclick = openAuth;
      }
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    var f = e.target;
    db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value })
      .then(function (res) {
        if (res.error) { DF.toast(res.error.message, "warn"); return; }
        closeAuth(); f.reset(); refreshAuthUI(); loadProducts(); DF.toast("Welcome back.");
      });
  }

  // Upload a dealer document to public storage and return its public URL.
  function uploadDealerFile(file, folder) {
    var clean = file.name.replace(/[^\w.\-]+/g, "_");
    var path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "-" + clean;
    return db.storage.from("dealer-docs").upload(path, file).then(function (res) {
      if (res.error) throw res.error;
      return db.storage.from("dealer-docs").getPublicUrl(path).data.publicUrl;
    });
  }

  function handleSignup(e) {
    e.preventDefault();
    var f = e.target;
    var applyingDealer = f.dealer_apply.checked;
    var submitBtn = f.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "Creating…";

    // If applying as a dealer, upload the shop card + photos first, then sign up
    // with the URLs in metadata (so the signup trigger records them even before
    // email confirmation grants a session).
    var prep;
    if (applyingDealer) {
      submitBtn.textContent = "Uploading documents…";
      var folder = "signup/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      var cardFile = f.shop_card.files[0];
      var photoFiles = Array.prototype.slice.call(f.shop_photos.files, 0, 3);
      var jobs = [];
      if (cardFile) jobs.push(uploadDealerFile(cardFile, folder));
      photoFiles.forEach(function (pf) { jobs.push(uploadDealerFile(pf, folder)); });
      prep = Promise.all(jobs).then(function (urls) {
        var i = 0, cardUrl = "", photos = [];
        if (cardFile) cardUrl = urls[i++];
        for (; i < urls.length; i++) photos.push(urls[i]);
        return { whatsapp: f.whatsapp.value.trim(), shop_card_url: cardUrl, shop_photos: photos };
      });
    } else {
      prep = Promise.resolve(null);
    }

    prep.then(function (dealerData) {
      var data = {
        full_name: f.full_name.value.trim(),
        business: f.business.value.trim(),
        phone: f.phone.value.trim(),
        dealer_apply: applyingDealer ? "true" : "false"
      };
      if (dealerData) {
        data.whatsapp = dealerData.whatsapp;
        data.shop_card_url = dealerData.shop_card_url;
        data.shop_photos = dealerData.shop_photos;
      }
      submitBtn.textContent = "Creating account…";
      return db.auth.signUp({ email: f.email.value.trim(), password: f.password.value, options: { data: data } });
    }).then(function (res) {
      submitBtn.disabled = false; submitBtn.textContent = "Create account";
      if (res.error) { DF.toast(res.error.message, "warn"); return; }
      f.reset();
      el("dealerFields").hidden = true;
      closeAuth();
      var dealerMsg = applyingDealer
        ? " Your dealer application is pending — you'll see wholesale prices once an admin approves it."
        : "";
      if (res.data.session) { refreshAuthUI(); loadProducts(); DF.toast("Account created." + dealerMsg); }
      else { DF.toast("Account created — check your email to confirm, then sign in." + dealerMsg); }
    }).catch(function (err) {
      submitBtn.disabled = false; submitBtn.textContent = "Create account";
      DF.toast("Sign-up failed: " + (err && err.message ? err.message : err), "warn");
    });
  }

  /* ---------- wiring ---------- */
  function init() {
    el("year").textContent = new Date().getFullYear();
    if (!DF.configured) el("backendBanner").hidden = false;

    loadProducts();
    refreshAuthUI();

    el("search").addEventListener("input", function (e) { query = e.target.value; renderGrid(); });
    el("cartBtn").addEventListener("click", openCart);
    el("closeCart").addEventListener("click", closeCart);
    el("drawerOverlay").addEventListener("click", closeCart);
    el("checkoutBtn").addEventListener("click", function () { closeCart(); openCheckout(); });
    el("closeCheckout").addEventListener("click", closeCheckout);
    el("doneClose").addEventListener("click", closeCheckout);
    el("orderForm").addEventListener("submit", submitOrder);

    var ctaJoin = el("ctaJoin");
    if (ctaJoin) ctaJoin.addEventListener("click", function () { setAuthMode("signup"); el("authOverlay").classList.add("open"); });

    el("closeAuth").addEventListener("click", closeAuth);
    el("loginForm").addEventListener("submit", handleLogin);
    el("signupForm").addEventListener("submit", handleSignup);
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
      tab.addEventListener("click", function () { setAuthMode(tab.getAttribute("data-tab")); });
    });
    // "Create an account" / "Sign in" switch links inside each form.
    Array.prototype.forEach.call(document.querySelectorAll("[data-goto]"), function (link) {
      link.addEventListener("click", function () { setAuthMode(link.getAttribute("data-goto")); });
    });

    // Reveal dealer verification fields only when applying as a dealer.
    el("dealerApply").addEventListener("change", function () {
      el("dealerFields").hidden = !this.checked;
      var wa = el("signupForm").elements["whatsapp"];
      if (wa) wa.required = this.checked;
    });

    document.querySelectorAll(".modal-overlay").forEach(function (ov) {
      ov.addEventListener("click", function (e) { if (e.target === ov) ov.classList.remove("open"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeCart(); closeAuth(); closeCheckout();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
