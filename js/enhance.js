/* Diamond Flame — expert motion layer (dependency-free, additive).
   Drives: opening preloader, hero entrance, scroll progress,
   cascade reveals, stat count-up, subtle 3D card tilt.
   Everything is guarded so a failure can never hide content. */
(function () {
  "use strict";
  var docEl = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(pointer:fine)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---- reveal the hero (idempotent, with hard failsafe) ---- */
  var revealed = false;
  function reveal() { if (revealed) return; revealed = true; docEl.classList.add("df-ready"); }

  /* ---- 1. Opening preloader ---------------------------------- */
  function dismissPreloader(pre) {
    if (!pre) { reveal(); return; }
    reveal();                         // start hero entrance as the curtain lifts
    pre.classList.add("done");
    setTimeout(function () { if (pre && pre.parentNode) pre.parentNode.removeChild(pre); }, 850);
  }
  (function preloader() {
    var pre = $("#dfPreloader");
    var seen = false;
    try { seen = sessionStorage.getItem("df_seen") === "1"; } catch (e) {}
    if (!pre || reduce || seen) { dismissPreloader(pre); }
    else {
      try { sessionStorage.setItem("df_seen", "1"); } catch (e) {}
      var start = Date.now();
      function go() {
        var wait = Math.max(0, 1050 - (Date.now() - start)); // graceful minimum on-screen time
        setTimeout(function () { dismissPreloader(pre); }, wait);
      }
      if (document.readyState === "complete") go();
      else window.addEventListener("load", go);
      setTimeout(function () { dismissPreloader(pre); }, 3200); // absolute failsafe
    }
  })();
  /* if anything above threw before scheduling, this guarantees the hero shows */
  setTimeout(reveal, 3600);

  /* ---- 2. Scroll progress bar -------------------------------- */
  var bar = $("#dfProgress");
  if (bar && !reduce) {
    var ticking = false;
    function draw() {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      var p = Math.min(Math.max(window.scrollY / max, 0), 1);
      bar.style.transform = "scaleX(" + p + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(draw); }
    }, { passive: true });
    draw();
  }

  /* ---- 3. Cascade reveals for card grids ---------------------- */
  var grids = $all(".collection-grid, .why-grid, .review-grid");
  grids.forEach(function (g) { g.classList.add("df-cascade"); });
  if ("IntersectionObserver" in window && !reduce) {
    var gio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("df-in"); gio.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    grids.forEach(function (g) { gio.observe(g); });
  } else {
    grids.forEach(function (g) { g.classList.add("df-in"); });
  }

  /* ---- 4. Stat count-up -------------------------------------- */
  function countUp(el) {
    var m = (el.textContent || "").trim().match(/^([^\d]*)([\d,]+)(.*)$/);
    if (!m) return;
    var prefix = m[1], suffix = m[3], target = parseInt(m[2].replace(/,/g, ""), 10);
    if (!isFinite(target)) return;
    var dur = 1200, t0 = performance.now();
    function fmt(n) { return n.toLocaleString("en-US"); }
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmt(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + fmt(target) + suffix;
    })(t0);
  }
  var trustRow = $(".trust-row");
  if (trustRow && "IntersectionObserver" in window && !reduce) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          $all(".trust-item strong", e.target).forEach(countUp);
          sio.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    sio.observe(trustRow);
  }

  /* ---- 5. Subtle 3D tilt (desktop, non-magnetic cards) -------- */
  if (fine && !reduce) {
    var MAX = 5; // degrees — restrained, premium
    $all(".why-card, .review-card, .hero-product").forEach(function (card) {
      card.classList.add("df-tilt");
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "perspective(800px) rotateX(" + (-py * MAX).toFixed(2) +
          "deg) rotateY(" + (px * MAX).toFixed(2) + "deg) translateY(-4px)";
      });
      card.addEventListener("mouseleave", function () { card.style.transform = ""; });
    });
  }
})();
