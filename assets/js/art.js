/* Diamond Flame — bespoke jewellery line-art.
   Crisp, scalable gold SVG illustrations that replace placeholder emoji.
   window.DF_ART maps a product id to inline SVG markup; app.js renders it
   in the product cards and cart thumbnails. Falls back to p.emoji if a
   product has no art entry. */
(function () {
  "use strict";

  var GOLD = "#c8a558";
  var SOFT = "#e7d3a1";

  function n(v) { return (Math.round(v * 10) / 10).toString(); }

  function svg(inner) {
    return '<svg class="art" viewBox="0 0 48 48" fill="none" stroke="' + GOLD +
      '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  // Faceted round-brilliant gem, centred at (cx,cy) with crown half-width s.
  function gem(cx, cy, s) {
    var tl = [cx - s, cy - 0.5 * s], cl = [cx - 0.5 * s, cy - s],
        cr = [cx + 0.5 * s, cy - s], tr = [cx + s, cy - 0.5 * s],
        bot = [cx, cy + 1.15 * s],
        til = [cx - 0.3 * s, cy - 0.5 * s], tir = [cx + 0.3 * s, cy - 0.5 * s];
    function P(a) { return n(a[0]) + " " + n(a[1]); }
    return '<path d="M' + P(tl) + 'L' + P(cl) + 'L' + P(cr) + 'L' + P(tr) + 'L' + P(bot) + 'Z' +
      'M' + P(tl) + 'L' + P(tr) +
      'M' + P(cl) + 'L' + P(til) + 'M' + P(cr) + 'L' + P(tir) +
      'M' + P(til) + 'L' + P(bot) + 'M' + P(tir) + 'L' + P(bot) + '"/>';
  }

  // Rotated square (princess/baguette-style) stone.
  function rhombus(x, y, s) {
    return '<path d="M' + n(x) + ' ' + n(y - s) + 'L' + n(x + s) + ' ' + n(y) +
      'L' + n(x) + ' ' + n(y + s) + 'L' + n(x - s) + ' ' + n(y) + 'Z' +
      'M' + n(x) + ' ' + n(y - s) + 'L' + n(x) + ' ' + n(y + s) +
      'M' + n(x - s) + ' ' + n(y) + 'L' + n(x + s) + ' ' + n(y) + '"/>';
  }

  function circle(cx, cy, r, fill) {
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '"' +
      (fill ? ' fill="' + GOLD + '" stroke="none"' : '') + '/>';
  }

  function ellipse(cx, cy, rx, ry) {
    return '<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '"/>';
  }

  // Evenly spaced pavé / halo dots around a centre.
  function studded(cx, cy, rad, count, dot) {
    var s = "";
    for (var i = 0; i < count; i++) {
      var a = (Math.PI * 2 * i) / count - Math.PI / 2;
      s += circle(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, dot, true);
    }
    return s;
  }

  function spark(x, y, r) {
    return '<path stroke="' + SOFT + '" stroke-width="1.3" d="M' + n(x) + ' ' + n(y - r) +
      'L' + n(x) + ' ' + n(y + r) + 'M' + n(x - r) + ' ' + n(y) + 'L' + n(x + r) + ' ' + n(y) + '"/>';
  }

  window.DF_ART = {
    // Solitaire — single brilliant raised on a gold band.
    "df-ring-solitaire": svg(
      ellipse(24, 33, 9, 10) +
      '<path d="M21.5 23.5L23 21.6M26.5 23.5L25 21.6"/>' +
      gem(24, 15, 6) +
      spark(34, 11, 2)
    ),

    // Halo — centre stone framed by a ring of pavé diamonds.
    "df-ring-halo": svg(
      ellipse(24, 33, 9, 10) +
      '<path d="M21.5 24L23 21M26.5 24L25 21"/>' +
      studded(24, 15.5, 5.6, 9, 0.95) +
      gem(24, 15.5, 3.4) +
      spark(34, 11, 2)
    ),

    // Flame Drop — pear pendant hanging from a draped chain.
    "df-neck-pendant": svg(
      '<path d="M9 11C15 27 33 27 39 11"/>' +
      circle(24, 25, 1.3) +
      '<path d="M24 27C27.6 30 28 35 24 39C20 35 20.4 30 24 27Z M20.9 32.2L27.1 32.2M24 27.5L24 38.4"/>' +
      spark(36, 9, 2)
    ),

    // Rivière — graduated line of brilliants along a curve.
    "df-neck-riviera": svg(
      '<path d="M8 13C15 29 33 29 40 13"/>' +
      circle(11, 18, 1.1) + circle(15.5, 23, 1.5) + circle(20, 26, 1.9) +
      circle(24, 27, 2.2) + circle(28, 26, 1.9) + circle(32.5, 23, 1.5) + circle(37, 18, 1.1) +
      spark(24, 9, 2)
    ),

    // Classic Studs — a matched pair of brilliants.
    "df-ear-studs": svg(
      gem(15.5, 18, 5) +
      gem(31.5, 26, 5) +
      spark(38, 14, 1.8) + spark(10, 30, 1.8)
    ),

    // Cascade Drops — three diamonds falling from an ear wire.
    "df-ear-drops": svg(
      '<path d="M27 10C21 9 20 14 24 15"/>' +
      gem(24, 18, 2.6) + gem(24, 24, 3.1) + gem(24, 31.5, 3.7) +
      spark(34, 12, 1.8)
    ),

    // Tennis — a continuous line of linked square diamonds.
    "df-brace-tennis": svg(
      '<path d="M7 30Q24 22 41 30"/>' +
      rhombus(11, 28.6, 2.3) + rhombus(17.5, 25.9, 2.3) + rhombus(24, 24.9, 2.3) +
      rhombus(30.5, 25.9, 2.3) + rhombus(37, 28.6, 2.3) +
      spark(24, 14, 2)
    ),

    // Pavé Bangle — a gold band set all the way round.
    "df-brace-bangle": svg(
      circle(24, 25, 13) + circle(24, 25, 9) +
      studded(24, 25, 11, 18, 0.7) +
      spark(37, 12, 2)
    )
  };
})();
