/* Diamond Flame — customer reviews carousel.
   ▸ To add / edit a review, just add an object to the REVIEWS array:
       { n: "Full Name", c: "City", r: 5, t: "What they said." }
   Professional auto-rotating fade slider — each review shown once, no
   duplication. Responsive (1 / 2 / 3 per view), arrows, auto-advance,
   pause-on-hover, and a synced progress bar. Zero dependencies. */
(function () {
  "use strict";

  var REVIEWS = [
    { n: "Ayesha Khan", c: "Lahore", r: 5, t: "The glass auto-ignition hob is stunning and the brass burners are seriously powerful. Wipes clean in seconds." },
    { n: "Mizan Rauf", c: "Gujranwala", r: 5, t: "Ordered hobs in bulk for my shop at wholesale rates — sealed, perfect, and delivered insured next day." },
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
    { n: "Maria Shah", c: "Gujranwala", r: 5, t: "Bought a full kitchen set — hob, hood and sink. Everything matches and the quality is consistent." },
    { n: "Imran Yousaf", c: "Sargodha", r: 5, t: "As a dealer the wholesale pricing is unbeatable and stock is always genuine. Smooth every time." },
    { n: "Saba Riaz", c: "Bahawalpur", r: 5, t: "The glass top wipes clean with one swipe. Auto-ignition catches first time, every time." },
    { n: "Adnan Qureshi", c: "Lahore", r: 5, t: "Range hood looks like it belongs in a showroom. Powerful and surprisingly quiet on low." },
    { n: "Rabia Aslam", c: "Islamabad", r: 5, t: "Electric geyser is compact and fast. Perfect for our apartment, and the finish is spotless." },
    { n: "Zeeshan Ali", c: "Karachi", r: 4, t: "Solid steel hob, even heat across burners. Delivery was insured and arrived without a scratch." },
    { n: "Komal Pervaiz", c: "Faisalabad", r: 5, t: "I compared a few options — Diamond Flame's build felt the most premium for the price. No regrets." },
    { n: "Faisal Mahmood", c: "Sialkot", r: 5, t: "The burners are heavy brass, not cheap alloy. You can feel the quality difference instantly." },
    { n: "Iqra Saleem", c: "Multan", r: 5, t: "Sink came with everything — waste, pipe, the lot. Fitting was effortless thanks to their guide." },
    { n: "Waleed Akhtar", c: "Rawalpindi", r: 5, t: "Hood's auto-clean feature actually works. Six months on and it still looks brand new." },
    { n: "Mehwish Asif", c: "Lahore", r: 5, t: "Ordered online, paid cash on delivery, zero hassle. The hob exceeded my expectations." },
    { n: "Shahbaz Khan", c: "Peshawar", r: 4, t: "Geyser works great and heats fast. Build feels sturdy and safe. Would buy again." },
    { n: "Anam Tariq", c: "Gujranwala", r: 5, t: "The glass-and-steel hob is a centrepiece. Guests always ask where I got it." },
    { n: "Yasir Hussain", c: "Hyderabad", r: 5, t: "Wholesale order of sinks for a housing project — all consistent, all flawless. Will reorder." },
    { n: "Nimra Aziz", c: "Sargodha", r: 5, t: "Cooling fan is powerful and elegant. Runs all day without heating up." },
    { n: "Asad Raza", c: "Quetta", r: 5, t: "Instant gas geyser is a game changer in winter. Hot water the moment you open the tap." },
    { n: "Sidra Kamal", c: "Bahawalpur", r: 5, t: "Beautiful matte finish on the hood. Suction handled my heavy frying without a problem." },
    { n: "Junaid Bashir", c: "Karachi", r: 5, t: "Honestly the best hob I've owned. Premium feel, safe, and the price was fair." },
    { n: "Hira Naveed", c: "Islamabad", r: 4, t: "Lovely sink, deep bowls. One small packaging dent but the product itself was perfect." },
    { n: "Owais Siddiqui", c: "Lahore", r: 5, t: "Their after-sales sent me a spare knob free of charge. That's how you earn loyal customers." },
    { n: "Rida Fatima", c: "Faisalabad", r: 5, t: "The whole kitchen feels upgraded. Hob, hood and geyser all from Diamond Flame — no complaints." },
    { n: "Talha Mehmood", c: "Sialkot", r: 5, t: "Burners light instantly and the glass is thick and sturdy. Great safety features too." },
    { n: "Mahnoor Shah", c: "Multan", r: 5, t: "Quietest range hood I've used. Clears steam and smell fast, looks gorgeous over the hob." },
    { n: "Daniyal Khan", c: "Rawalpindi", r: 5, t: "Dealer pricing plus reliable stock — my go-to supplier now. Genuine products every order." },
    { n: "Aiman Raza", c: "Gujranwala", r: 5, t: "The electric geyser's thermostat is accurate and safe. Heats fast, holds temperature well." },
    { n: "Saad Anwar", c: "Karachi", r: 4, t: "Good steel sink, well finished. Delivery slightly delayed but communication was clear." },
    { n: "Laiba Iqbal", c: "Lahore", r: 5, t: "Auto-ignition, flame-failure cut-off, heavy burners — feels safe and premium. Love it." },
    { n: "Faizan Ali", c: "Peshawar", r: 5, t: "Bought two hobs for rental units. Tenants love them and they've held up perfectly." },
    { n: "Noor Fatima", c: "Hyderabad", r: 5, t: "Sink is gorgeous and the satin finish is so practical. Worth every rupee." },
    { n: "Hassan Raza", c: "Sargodha", r: 5, t: "Powerful suction hood at a fair price. Installation team was professional and tidy." },
    { n: "Amna Yousaf", c: "Quetta", r: 5, t: "Instant geyser saved us in winter mornings. Compact, fast and beautifully finished." },
    { n: "Rehan Malik", c: "Bahawalpur", r: 4, t: "Cooling fan is strong and quiet. Solid value, would buy again." },
    { n: "Zoya Ahmed", c: "Islamabad", r: 5, t: "The glass hob transformed my kitchen's look. Cleaning is effortless now." },
    { n: "Bilal Hussain", c: "Lahore", r: 5, t: "Ordered a full set at wholesale — packaging, quality and delivery all top notch." },
    { n: "Sundas Khalid", c: "Faisalabad", r: 5, t: "Range hood is a beauty and seriously effective. My kitchen finally stays fresh." },
    { n: "Arsalan Tariq", c: "Sialkot", r: 5, t: "Steel hob heats evenly and the build is rock solid. Excellent customer support too." },
    { n: "Mahira Noor", c: "Karachi", r: 5, t: "From order to delivery in 48 hours, insured and sealed. The geyser works flawlessly." },
    { n: "Kashif Iqbal", c: "Multan", r: 5, t: "Best decision for our new home. Every Diamond Flame piece feels built to last." }
  ];

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
  function pages() { return Math.max(1, Math.ceil(REVIEWS.length / perView)); }

  function paint() {
    var start = idx * perView;
    var items = REVIEWS.slice(start, start + perView);
    track.style.setProperty("--pv", perView);
    track.innerHTML = items.map(card).join("");
    // re-trigger the fade-in animation
    track.classList.remove("rv-anim"); void track.offsetWidth; track.classList.add("rv-anim");
    // re-sync the progress bar
    if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
  }
  function go(n) { var t = pages(); idx = ((n % t) + t) % t; paint(); }
  function next() { go(idx + 1); }
  function prev() { go(idx - 1); }
  function play() { stop(); timer = setInterval(next, INTERVAL); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  function build() {
    track = $("#rvTrack"); bar = $("#rvBar");
    if (!track) return;
    perView = pv();
    var agg = $("#reviewsAggregate");
    if (agg) agg.innerHTML = '<span class="rw-agg-stars">★★★★★</span> Rated by our customers across Pakistan';
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
