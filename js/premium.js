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

  /* scroll reveal */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $all("[data-reveal]").forEach(function (el) { io.observe(el); });
  } else {
    $all("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
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
