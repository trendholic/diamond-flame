/* Diamond Flame Home Appliances — storefront logic. */
(function () {
  "use strict";

  var DF = window.DF;
  var db = DF.db;
  var el = DF.el, pkr = DF.pkr, esc = DF.esc;

  var STORAGE_KEY = "dfha.cart.v1";
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
  function unitPrice(p) { return hasWholesale(p) ? p.wholesale_price : p.retail_price; }
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

  function renderGrid() {
    var grid = el("productGrid");
    var list = visibleProducts();
    if (!list.length) {
      grid.innerHTML = '<p class="loading">No appliances match your search.</p>';
      return;
    }
    grid.innerHTML = "";
    list.forEach(function (p) {
      var dealer = hasWholesale(p);
      // Savings shown to dealers = wholesale vs retail.
      var saving = dealer && p.retail_price > p.wholesale_price
        ? Math.round(100 - (p.wholesale_price / p.retail_price) * 100) : 0;
      var priceBlock = dealer
        ? '<span class="wholesale">' + pkr(p.wholesale_price) + '<small>/unit dealer price</small></span>' +
          '<span class="retail">' + pkr(p.retail_price) + "</span>"
        : '<span class="wholesale">' + pkr(p.retail_price) + '<small>/unit</small></span>';
      var card = document.createElement("article");
      card.className = "card";
      card.innerHTML =
        '<div class="card-media">' + esc(p.emoji || "📦") +
          (p.stock <= 0 ? '<span class="badge out">Out of stock</span>'
            : (saving ? '<span class="badge save">-' + saving + "%</span>" : "")) +
        '</div>' +
        '<div class="card-body">' +
          '<span class="card-brand">' + esc(p.brand || "") + " · " + esc(p.category) + "</span>" +
          '<h3 class="card-name">' + esc(p.name) + "</h3>" +
          '<p class="card-desc">' + esc(p.description || "") + "</p>" +
          '<div class="price-row">' + priceBlock + "</div>" +
          '<div class="card-foot">' +
            (dealer ? '<span class="moq">MOQ ' + p.moq + "</span>" : '<span class="moq">Retail</span>') +
            '<button class="add-btn" ' + (p.stock <= 0 ? "disabled" : "") + ' data-id="' + esc(p.id) + '">' +
              (p.stock <= 0 ? "Unavailable" : "Add to order") + "</button>" +
          "</div>" +
        "</div>";
      var btn = card.querySelector(".add-btn");
      if (btn && p.stock > 0) btn.addEventListener("click", function () { addToCart(p.id); });
      grid.appendChild(card);
    });
  }

  /* ---------- cart (MOQ-aware) ---------- */
  function addToCart(id) {
    var p = find(id);
    if (!p) return;
    var cur = cart[id] || 0;
    cart[id] = cur ? cur + 1 : minQty(p); // first add jumps to the minimum (MOQ for dealers, 1 retail)
    saveCart();
    updateCartUI();
    openCart();
  }
  function setQty(id, qty) {
    var p = find(id);
    var min = p ? minQty(p) : 1;
    if (qty < min) delete cart[id]; else cart[id] = qty;
    saveCart();
    updateCartUI();
  }
  function cartCount() { var n = 0; for (var k in cart) n += cart[k]; return n; }
  function cartTotal() {
    var t = 0;
    for (var id in cart) { var p = find(id); if (p) t += unitPrice(p) * cart[id]; }
    return t;
  }

  function updateCartUI() {
    el("cartCount").textContent = cartCount();
    el("cartTotal").textContent = pkr(cartTotal());
    var box = el("cartItems");
    var ids = Object.keys(cart);
    if (!ids.length) { box.innerHTML = '<p class="empty">No items yet. Add appliances to build a bulk order.</p>'; return; }
    box.innerHTML = "";
    ids.forEach(function (id) {
      var p = find(id);
      if (!p) { delete cart[id]; return; }
      var row = document.createElement("div");
      row.className = "drawer-row";
      row.innerHTML =
        '<div class="thumb">' + esc(p.emoji || "📦") + "</div>" +
        '<div class="info">' +
          "<strong>" + esc(p.name) + "</strong>" +
          '<span class="unit">' + pkr(unitPrice(p)) + (hasWholesale(p) ? " · MOQ " + p.moq : "") + "</span>" +
          '<div class="qty">' +
            '<button data-act="dec">−</button><span>' + cart[id] + '</span><button data-act="inc">+</button>' +
            '<button class="remove">Remove</button>' +
          "</div>" +
        "</div>" +
        '<div class="line-total">' + pkr(unitPrice(p) * cart[id]) + "</div>";
      row.querySelector('[data-act="inc"]').addEventListener("click", function () { setQty(id, cart[id] + 1); });
      row.querySelector('[data-act="dec"]').addEventListener("click", function () { setQty(id, cart[id] - 1); });
      row.querySelector(".remove").addEventListener("click", function () { setQty(id, 0); });
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
    for (var id in cart) {
      var p = find(id); if (!p) continue;
      html += '<div class="sum-row"><span>' + esc(p.name) + " × " + cart[id] +
        "</span><span>" + pkr(unitPrice(p) * cart[id]) + "</span></div>";
    }
    html += '<div class="sum-row sum-total"><span>Total</span><span>' + pkr(cartTotal()) + "</span></div>";
    el("orderSummary").innerHTML = html;
  }

  function submitOrder(e) {
    e.preventDefault();
    var f = e.target;
    var items = Object.keys(cart).map(function (id) {
      var p = find(id);
      return {
        id: id, name: p.name, brand: p.brand, qty: cart[id],
        price: unitPrice(p),
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
