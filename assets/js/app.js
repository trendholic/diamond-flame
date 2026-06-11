/* Diamond Flame storefront — vanilla JS, no build step.
   Cart persists in localStorage. Static-host friendly (GitHub Pages). */
(function () {
  "use strict";

  var STORAGE_KEY = "diamondflame.cart.v1";
  var products = window.PRODUCTS || [];
  var ART = window.DF_ART || {};
  var cart = loadCart();

  // Bespoke SVG illustration for a product, falling back to its emoji.
  function artFor(p) { return ART[p.id] || p.emoji || ""; }

  // ---- helpers ----
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function pkr(n) { return "PKR " + n.toLocaleString("en-PK"); }
  function byId(id) { return document.getElementById(id); }
  function findProduct(id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  }

  // ---- product grid + filters ----
  function categories() {
    var seen = {}, out = ["All"];
    products.forEach(function (p) { if (!seen[p.category]) { seen[p.category] = 1; out.push(p.category); } });
    return out;
  }

  function renderFilters() {
    var wrap = byId("filters");
    wrap.innerHTML = "";
    categories().forEach(function (cat, i) {
      var b = document.createElement("button");
      b.className = "filter" + (i === 0 ? " active" : "");
      b.textContent = cat;
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("active"); });
        b.classList.add("active");
        renderProducts(cat);
      });
      wrap.appendChild(b);
    });
  }

  function renderProducts(filter) {
    var grid = byId("productGrid");
    grid.innerHTML = "";
    products
      .filter(function (p) { return !filter || filter === "All" || p.category === filter; })
      .forEach(function (p) {
        var card = document.createElement("article");
        card.className = "card";
        card.innerHTML =
          '<div class="card-media">' + artFor(p) + '</div>' +
          '<div class="card-body">' +
            '<span class="card-cat">' + p.category + '</span>' +
            '<h3 class="card-name">' + p.name + '</h3>' +
            '<p class="card-desc">' + p.desc + '</p>' +
            '<div class="card-foot">' +
              '<span class="price">' + pkr(p.price) + '</span>' +
              '<button class="add-btn" data-id="' + p.id + '">Add to bag</button>' +
            '</div>' +
          '</div>';
        card.querySelector(".add-btn").addEventListener("click", function () { addToCart(p.id); });
        grid.appendChild(card);
      });
  }

  // ---- cart ----
  function cartCount() {
    var n = 0; for (var k in cart) n += cart[k]; return n;
  }
  function cartTotal() {
    var t = 0;
    for (var id in cart) { var p = findProduct(id); if (p) t += p.price * cart[id]; }
    return t;
  }
  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart(); updateCartUI(); openCart();
  }
  function setQty(id, qty) {
    if (qty <= 0) delete cart[id]; else cart[id] = qty;
    saveCart(); updateCartUI();
  }

  function updateCartUI() {
    byId("cartCount").textContent = cartCount();
    byId("cartTotal").textContent = pkr(cartTotal());
    var box = byId("cartItems");
    box.innerHTML = "";
    var ids = Object.keys(cart);
    if (!ids.length) {
      box.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
      return;
    }
    ids.forEach(function (id) {
      var p = findProduct(id); if (!p) return;
      var row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML =
        '<div class="thumb">' + artFor(p) + '</div>' +
        '<div class="info">' +
          '<strong>' + p.name + '</strong><br>' +
          '<span class="unit">' + pkr(p.price) + '</span>' +
          '<div class="qty">' +
            '<button data-act="dec">−</button>' +
            '<span>' + cart[id] + '</span>' +
            '<button data-act="inc">+</button>' +
            '<button class="remove">Remove</button>' +
          '</div>' +
        '</div>';
      row.querySelector('[data-act="inc"]').addEventListener("click", function () { setQty(id, cart[id] + 1); });
      row.querySelector('[data-act="dec"]').addEventListener("click", function () { setQty(id, cart[id] - 1); });
      row.querySelector(".remove").addEventListener("click", function () { setQty(id, 0); });
      box.appendChild(row);
    });
  }

  // ---- drawer + modal ----
  function openCart() { byId("cartDrawer").classList.add("open"); byId("drawerOverlay").classList.add("open"); }
  function closeCart() { byId("cartDrawer").classList.remove("open"); byId("drawerOverlay").classList.remove("open"); }

  function openCheckout() {
    if (!cartCount()) return;
    renderOrderSummary();
    byId("checkoutForm").hidden = false;
    byId("checkoutDone").hidden = true;
    byId("checkoutOverlay").classList.add("open");
  }
  function closeCheckout() { byId("checkoutOverlay").classList.remove("open"); }

  function renderOrderSummary() {
    var box = byId("orderSummary");
    var html = "";
    for (var id in cart) {
      var p = findProduct(id); if (!p) continue;
      html += '<div class="sum-row"><span>' + p.name + ' × ' + cart[id] + '</span><span>' + pkr(p.price * cart[id]) + '</span></div>';
    }
    html += '<div class="sum-row sum-total"><span>Total</span><span>' + pkr(cartTotal()) + '</span></div>';
    box.innerHTML = html;
  }

  function handleOrder(e) {
    e.preventDefault();
    var data = new FormData(e.target);
    var name = (data.get("name") || "").toString().trim();
    var order = {
      ref: "DF-" + Date.now().toString(36).toUpperCase(),
      customer: { name: name, phone: data.get("phone"), email: data.get("email"), address: data.get("address") },
      items: Object.keys(cart).map(function (id) {
        var p = findProduct(id);
        return { id: id, name: p && p.name, qty: cart[id], price: p && p.price };
      }),
      total: cartTotal(),
      placedAt: new Date().toISOString()
    };
    // Static demo: record locally. Wire to a backend (e.g. Supabase) here.
    try {
      var log = JSON.parse(localStorage.getItem("diamondflame.orders") || "[]");
      log.push(order);
      localStorage.setItem("diamondflame.orders", JSON.stringify(log));
    } catch (err) {}

    cart = {}; saveCart(); updateCartUI();
    byId("doneMsg").textContent = "Thank you, " + (name.split(" ")[0] || "friend") +
      ". Your order " + order.ref + " is confirmed — we'll call to arrange delivery.";
    byId("checkoutForm").hidden = true;
    byId("checkoutDone").hidden = false;
  }

  // ---- wire up ----
  function init() {
    renderFilters();
    renderProducts("All");
    updateCartUI();
    byId("year").textContent = new Date().getFullYear();

    byId("cartBtn").addEventListener("click", openCart);
    byId("closeCart").addEventListener("click", closeCart);
    byId("drawerOverlay").addEventListener("click", closeCart);
    byId("checkoutBtn").addEventListener("click", function () { closeCart(); openCheckout(); });
    byId("closeCheckout").addEventListener("click", closeCheckout);
    byId("checkoutOverlay").addEventListener("click", function (e) {
      if (e.target === byId("checkoutOverlay")) closeCheckout();
    });
    byId("doneClose").addEventListener("click", closeCheckout);
    byId("orderForm").addEventListener("submit", handleOrder);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeCart(); closeCheckout(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
