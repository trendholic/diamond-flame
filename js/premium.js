/* Diamond Flame — premium interactions (lightweight, dependency-free). */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* sticky header shadow */
  var header = $(".site-header");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* mobile menu (hamburger) */
  var navToggle = $("#navToggle");
  var navAuth = $("#navAuth");
  var authBtn = $("#authBtn");
  function closeMenu() {
    if (!header) return;
    header.classList.remove("menu-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }
  if (navToggle && header) {
    navToggle.addEventListener("click", function () {
      var open = header.classList.toggle("menu-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && navAuth && authBtn) navAuth.textContent = authBtn.textContent; /* mirror sign-in / account state */
    });
    $all("#primaryNav a").forEach(function (a) {
      if (a === navAuth) return;
      a.addEventListener("click", closeMenu);
    });
    if (navAuth && authBtn) {
      navAuth.addEventListener("click", function (e) { e.preventDefault(); closeMenu(); authBtn.click(); });
    }
    window.addEventListener("resize", function () { if (window.innerWidth > 720) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    document.addEventListener("click", function (e) {
      if (header.classList.contains("menu-open") && !header.contains(e.target)) closeMenu();
    });
  }

  /* scroll reveal — bulletproof: reveal anything whose top enters the viewport.
     Works for sections taller than the screen (mobile single-column grids) and
     never leaves content stuck invisible, even if IntersectionObserver misfires. */
  function revealInView() {
    $all("[data-reveal]:not(.in)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight * 0.95) el.classList.add("in");
    });
  }
  if (reduce) {
    $all("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
  } else {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
      $all("[data-reveal]").forEach(function (el) { io.observe(el); });
    }
    // Always-on failsafe so the reveal can never get stuck regardless of the observer.
    window.addEventListener("scroll", revealInView, { passive: true });
    window.addEventListener("resize", revealInView);
    revealInView();
    setTimeout(revealInView, 800);
  }

  /* magnetic buttons */
  if (!reduce && window.matchMedia("(pointer:fine)").matches) {
    $all(".magnetic").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18;
        var y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* hero parallax */
  var visual = $(".hero-visual");
  if (visual && !reduce) {
    window.addEventListener("scroll", function () {
      var y = Math.min(window.scrollY, 600);
      visual.style.transform = "translateY(" + (y * 0.06) + "px)";
    }, { passive: true });
  }

  /* collection cards -> jump to catalogue and apply the matching filter */
  $all(".collection-card[data-cat]").forEach(function (card) {
    card.addEventListener("click", function (e) {
      e.preventDefault();
      var cat = card.getAttribute("data-cat");
      var target = document.getElementById("catalogue");
      if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      setTimeout(function () {
        var chip = $all("#filters .chip").filter(function (c) { return c.textContent.trim() === cat; })[0];
        if (chip) chip.click();
      }, 500);
    });
  });

  /* floating order bar mirrors the cart count */
  var floatCart = $("#floatCart");
  var cartCount = $("#cartCount");
  var cartBtn = $("#cartBtn");
  function syncFloat() {
    if (!floatCart || !cartCount) return;
    var n = parseInt(cartCount.textContent, 10) || 0;
    floatCart.hidden = n <= 0;
    floatCart.classList.toggle("show", n > 0);
    floatCart.firstChild && (floatCart.lastChild.textContent = " View your order (" + n + ")");
  }
  if (floatCart && cartCount) {
    floatCart.addEventListener("click", function () { if (cartBtn) cartBtn.click(); });
    new MutationObserver(syncFloat).observe(cartCount, { childList: true, characterData: true, subtree: true });
    syncFloat();
  }
})();
