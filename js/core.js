/* Shared core: Supabase client + small helpers used by storefront and admin. */
(function () {
  "use strict";

  var cfg = window.DF_CONFIG || {};
  var configured =
    !!cfg.SUPABASE_URL &&
    !!cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("YOUR_") === -1 &&
    cfg.SUPABASE_ANON_KEY.indexOf("YOUR_") === -1;

  var client = null;
  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  function pkr(n) {
    var v = Number(n || 0);
    return (cfg.CURRENCY || "Rs") + " " + v.toLocaleString("en-PK");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function el(id) { return document.getElementById(id); }

  function toast(msg, kind) {
    var t = document.createElement("div");
    t.className = "toast" + (kind ? " toast-" + kind : "");
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 300);
    }, 2600);
  }

  // Resolve the signed-in user's profile (id, email, role). null if signed out.
  function currentProfile() {
    if (!client) return Promise.resolve(null);
    return client.auth.getUser().then(function (res) {
      var user = res && res.data && res.data.user;
      if (!user) return null;
      return client
        .from("profiles")
        .select("id,email,full_name,role")
        .eq("id", user.id)
        .maybeSingle()
        .then(function (p) {
          return (
            p.data || { id: user.id, email: user.email, full_name: "", role: "customer" }
          );
        });
    });
  }

  window.DF = {
    configured: configured,
    db: client,
    cfg: cfg,
    pkr: pkr,
    esc: esc,
    el: el,
    toast: toast,
    currentProfile: currentProfile
  };
})();
