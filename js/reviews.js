/* Diamond Flame — reviews carousel (role-aware).
   ▸ Regular customers see CUSTOMER reviews (home users).
   ▸ Signed-in dealers/admins see DEALER reviews (shops & trade).
   The active set switches automatically when the viewer's role is known
   (store.js dispatches a "df:role" event). Add/edit a review by adding an
   object to either array: { n: "Name", c: "City or shop", r: 5, t: "Text" }.
   Auto-rotating fade slider, responsive (1/2/3 per view), arrows, pause-on-hover. */
(function () {
  "use strict";

  /* ---- regular customer reviews (home users) ---- */
  var CUSTOMER = [
    { n: "Ayesha Khan", c: "Lahore", r: 5, t: "The glass auto-ignition hob is stunning and the brass burners are seriously powerful. Wipes clean in seconds." },
    { n: "Sana Farooq", c: "Islamabad", r: 5, t: "The range hood is whisper quiet yet clears smoke instantly. Build quality feels genuinely premium." },
    { n: "Bilal Ahmed", c: "Karachi", r: 5, t: "Double-bowl steel sink is built like a tank. No scratches, no stains after months of heavy use." },
    { n: "Hina Malik", c: "Faisalabad", r: 5, t: "Instant electric geyser heats water in seconds — no more waiting. Installation guidance was very helpful." },
    { n: "Usman Tariq", c: "Rawalpindi", r: 5, t: "5-burner steel hob is a beast. Flame-failure safety gives real peace of mind with kids around." },
    { n: "Fatima Noor", c: "Multan", r: 4, t: "Lovely glass hob, looks elegant in my kitchen. Took a day longer to arrive but well packaged." },
    { n: "Hamza Sheikh", c: "Sialkot", r: 5, t: "The chimney's suction is excellent — fried fish and not a hint of smell left behind. Highly recommend." },
    { n: "Areeba Javed", c: "Lahore", r: 5, t: "Customer service actually answers the phone. Sorted my geyser query in minutes. Rare these days." },
    { n: "Kamran Aslam", c: "Peshawar", r: 5, t: "Gas geyser is efficient and the flame is steady even with low pressure. Worth every rupee." },
    { n: "Nadia Iqbal", c: "Hyderabad", r: 5, t: "Satin-finish sink hides water spots beautifully. Such a thoughtful, premium touch." },
    { n: "Tariq Mehmood", c: "Quetta", r: 4, t: "Strong cooling fan, moves a lot of air and runs quiet. Happy with the value for money." },
    { n: "Saba Riaz", c: "Bahawalpur", r: 5, t: "The glass top wipes clean with one swipe. Auto-ignition catches first time, every time." },
    { n: "Adnan Qureshi", c: "Lahore", r: 5, t: "Range hood looks like it belongs in a showroom. Powerful and surprisingly quiet on low." },
    { n: "Rabia Aslam", c: "Islamabad", r: 5, t: "Electric geyser is compact and fast. Perfect for our apartment, and the finish is spotless." },
    { n: "Komal Pervaiz", c: "Faisalabad", r: 5, t: "I compared a few options — Diamond Flame's build felt the most premium for the price. No regrets." },
    { n: "Faisal Mahmood", c: "Sialkot", r: 5, t: "The burners are heavy brass, not cheap alloy. You can feel the quality difference instantly." },
    { n: "Iqra Saleem", c: "Multan", r: 5, t: "Sink came with everything — waste, pipe, the lot. Fitting was effortless thanks to their guide." },
    { n: "Mehwish Asif", c: "Lahore", r: 5, t: "Ordered online, paid cash on delivery, zero hassle. The hob exceeded my expectations." },
    { n: "Anam Tariq", c: "Gujranwala", r: 5, t: "The glass-and-steel hob is a centrepiece. Guests always ask where I got it." },
    { n: "Nimra Aziz", c: "Sargodha", r: 5, t: "Cooling fan is powerful and elegant. Runs all day without heating up." },
    { n: "Asad Raza", c: "Quetta", r: 5, t: "Instant gas geyser is a game changer in winter. Hot water the moment you open the tap." },
    { n: "Sidra Kamal", c: "Bahawalpur", r: 5, t: "Beautiful matte finish on the hood. Suction handled my heavy frying without a problem." },
    { n: "Owais Siddiqui", c: "Lahore", r: 5, t: "Their after-sales sent me a spare knob free of charge. That's how you earn loyal customers." },
    { n: "Mahnoor Shah", c: "Multan", r: 5, t: "Quietest range hood I've used. Clears steam and smell fast, looks gorgeous over the hob." },
    { n: "Aiman Raza", c: "Gujranwala", r: 5, t: "The electric geyser's thermostat is accurate and safe. Heats fast, holds temperature well." },
    { n: "Laiba Iqbal", c: "Lahore", r: 5, t: "Auto-ignition, flame-failure cut-off, heavy burners — feels safe and premium. Love it." },
    { n: "Noor Fatima", c: "Hyderabad", r: 5, t: "Sink is gorgeous and the satin finish is so practical. Worth every rupee." },
    { n: "Zoya Ahmed", c: "Islamabad", r: 5, t: "The glass hob transformed my kitchen's look. Cleaning is effortless now." },
    { n: "Mahira Noor", c: "Karachi", r: 5, t: "From order to delivery in 48 hours, insured and sealed. The geyser works flawlessly." },
    { n: "Kashif Iqbal", c: "Multan", r: 5, t: "Best decision for our new home. Every Diamond Flame piece feels built to last." }
  ];

  /* ---- dealer / shop reviews (trade) ---- */
  var DEALER = [
    { n: "Imran Yousaf", c: "Yousaf Electronics · Sargodha", r: 5, t: "As a dealer the wholesale pricing is unbeatable and stock is always genuine, sealed and ready. Smooth reorders every time." },
    { n: "Mizan Rauf", c: "Rauf Home Appliances · Gujranwala", r: 5, t: "I order hobs in bulk at wholesale rates — perfectly sealed, insured delivery, and my margins are excellent." },
    { n: "Daniyal Khan", c: "Khan Traders · Rawalpindi", r: 5, t: "Dealer pricing plus reliable stock made Diamond Flame my go-to supplier. Genuine products on every order." },
    { n: "Yasir Hussain", c: "Hussain & Sons · Hyderabad", r: 5, t: "Supplied a full housing project with their sinks — all consistent, all flawless. Fast dispatch, easy reordering." },
    { n: "Bilal Hussain", c: "Al-Bilal Electronics · Lahore", r: 5, t: "Wholesale full kitchen sets — packaging, quality and delivery all top notch. My customers keep coming back." },
    { n: "Faizan Ali", c: "Ali Electronics · Peshawar", r: 5, t: "Stocked their hobs and geysers in my shop; they sell themselves. Genuine units, strong demand, great support." },
    { n: "Adeel Saleem", c: "Saleem Trading · Faisalabad", r: 5, t: "Credit terms and priority dispatch as an approved dealer have been a game changer for my cash flow." },
    { n: "Naveed Akhtar", c: "Akhtar Home Store · Multan", r: 5, t: "Best wholesale rates in the market and the stock is always authentic and sealed. Never had a return issue." },
    { n: "Shahid Mehmood", c: "Mehmood Appliances · Sialkot", r: 4, t: "Reliable supplier, consistent quality across every batch. Delivery to my shop is insured and on time." },
    { n: "Kashif Raza", c: "Raza Electronics · Karachi", r: 5, t: "Bulk orders arrive sealed and complete. The dealer dashboard makes reordering and tracking effortless." },
    { n: "Tariq Javed", c: "Javed & Co · Islamabad", r: 5, t: "Margins are healthy and the brand is genuinely premium, so customers trust it. Repeat business every month." },
    { n: "Usman Ghani", c: "Ghani Traders · Bahawalpur", r: 5, t: "From wholesale order to insured delivery in 48 hours. Genuine stock and a team that actually picks up the phone." }
  ];

  var dealerMode = !!(window.DF && window.DF.isDealer);
  function data() { return dealerMode ? DEALER : CUSTOMER; }
  function aggText() {
    return dealerMode
      ? '<span class="rw-agg-stars">★★★★★</span> Trusted by shops &amp; dealers across Pakistan'
      : '<span class="rw-agg-stars">★★★★★</span> Rated by our customers across Pakistan';
  }

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function initials(name) {
    var p = name.trim().split(/\s+/);
    return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }
  function starRow(r) { var f = Math.round(r), o = ""; for (var i = 0; i < 5; i++) o += i < f ? "★" : "☆"; return o; }
  function card(rv) {
    return '<figure class="rw-card">' +
      '<div class="rw-stars">' + starRow(rv.r) + "</div>" +
      '<blockquote class="rw-text">“' + esc(rv.t) + '”</blockquote>' +
      '<figcaption class="rw-cap"><span class="rw-av">' + esc(initials(rv.n)) + "</span>" +
      '<span class="rw-meta"><strong>' + esc(rv.n.trim()) + "</strong><small>" + esc(rv.c) + "</small></span></figcaption>" +
      "</figure>";
  }

  var track, bar, idx = 0, perView = 3, timer = null, INTERVAL = 5200;
  function pv() { var w = window.innerWidth; return w < 600 ? 1 : (w < 1024 ? 2 : 3); }
  function pages() { return Math.max(1, Math.ceil(data().length / perView)); }

  function paint() {
    var start = idx * perView;
    var items = data().slice(start, start + perView);
    track.style.setProperty("--pv", perView);
    track.innerHTML = items.map(card).join("");
    track.classList.remove("rv-anim"); void track.offsetWidth; track.classList.add("rv-anim");
    if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
  }
  function go(n) { var t = pages(); idx = ((n % t) + t) % t; paint(); }
  function next() { go(idx + 1); }
  function prev() { go(idx - 1); }
  function play() { stop(); timer = setInterval(next, INTERVAL); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  function applyAgg() { var agg = $("#reviewsAggregate"); if (agg) agg.innerHTML = aggText(); }

  function build() {
    track = $("#rvTrack"); bar = $("#rvBar");
    if (!track) return;
    perView = pv();
    applyAgg();
    go(0); play();

    var wrap = track.closest(".rv-wrap");
    if (wrap) {
      wrap.addEventListener("mouseenter", stop);
      wrap.addEventListener("mouseleave", play);
    }
    var p = $("#rvPrev"), n = $("#rvNext");
    if (p) p.addEventListener("click", function () { prev(); play(); });
    if (n) n.addEventListener("click", function () { next(); play(); });

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var np = pv();
        if (np !== perView) { perView = np; idx = 0; paint(); }
      }, 200);
    }, { passive: true });
  }

  // Switch the review set the moment the viewer's role is known (or changes).
  document.addEventListener("df:role", function (e) {
    var dealer = !!(e.detail && e.detail.dealer);
    if (dealer === dealerMode) return;
    dealerMode = dealer;
    if (!track) return;
    idx = 0; applyAgg(); paint(); play();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
