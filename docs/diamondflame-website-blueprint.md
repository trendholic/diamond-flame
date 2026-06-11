# DiamondFlame Home Appliances — Premium Website Implementation Blueprint

**Audience:** Shopify theme developers, front-end engineers, UX/UI designers, SEO leads, and content team.
**Objective:** Build a website that makes DiamondFlame read as a trusted international premium appliance manufacturer in the league of Bosch, Miele, Thermador, Viking, Fisher & Paykel, KitchenAid, and Samsung — a brand a buyer would believe is worth $100M+.

> **How to read this doc.** Part A sets the brand, design system, and technical foundation that every page inherits. Part B specifies each of the 10 page types using a fixed template: **Purpose & KPI → Layout → Headline → Copywriting → CTA → UX behavior → Conversion psychology → SEO strategy.** Part C details the cross-cutting conversion features. Part D is the Shopify architecture, performance, accessibility, and the build roadmap.

---

# PART A — FOUNDATION

## A1. Positioning & brand strategy

**One-line positioning:** *Professional-grade kitchen appliances, engineered to international standards and built to last a generation.*

**Perception levers that signal "$100M premium manufacturer":**

| Lever | How luxury appliance brands signal it | DiamondFlame application |
|---|---|---|
| Engineering authority | Miele "Immer Besser", test-to-20-years claims | Publish test standards, materials, tolerances, lifecycle testing |
| Provenance & heritage | "Designed in Germany / California" | A clear design+engineering origin story; founding year; factory imagery |
| Restraint | Lots of negative space, few words, one hero product | Editorial layouts, generous whitespace, one idea per screen |
| Proof | Certifications, awards, pro-kitchen usage | Certification wall, warranty terms, real reviews, dealer network |
| Service promise | White-glove install, long warranty, parts for 10+ yrs | Warranty Center + Installation Center as first-class destinations |

**Strategic decision to confirm with stakeholders (flagged, not assumed):** the current live site leads with "Crafted in Pakistan." For an *international premium* perception you have two honest options — (a) lead with **engineering/standards** and treat manufacturing location as a transparency detail, or (b) make provenance a deliberate hero ("Engineered in-house to international standards"). Miele (German) and Fisher & Paykel (New Zealand) prove provenance is an asset when framed as craftsmanship, not as a budget signal. **Recommendation: option (a)** — lead with standards, materials, and lifecycle, keep provenance truthful and confident.

**Brand voice:** calm, precise, understated. Short declarative sentences. Specific numbers over adjectives ("16,000 Pa suction" beats "powerful"). Never exclaim. Never discount-shout on brand surfaces.

## A2. Visual identity

**Color palette — dark & white, metal accents.**

```
--ink:        #0E0E0F   /* near-black, primary text & dark sections   */
--graphite:   #1A1B1D   /* dark UI panels                              */
--smoke:      #6B6E73   /* secondary text                              */
--line:       #E6E6E8   /* hairline borders on white                   */
--paper:      #FFFFFF   /* primary light background                    */
--mist:       #F6F6F4   /* alternating section background               */
--brass:      #B08D57   /* single metallic accent (CTAs, focus, key)   */
--brass-2:    #D8B987   /* accent gradient highlight                   */
--signal:     #1F9D6B   /* success/in-stock only                       */
--danger:     #B4232B   /* errors only                                 */
```

Rules: **one** accent (brass) used sparingly for primary CTAs, active states, and focus rings. Everything else is ink/white/grey. Dark sections (ink/graphite) used for hero, story, and trust bands to create rhythm and a "gallery" feel. Never more than ~5% of a screen in accent color.

**Typography — premium, two-family system.**

- **Display / headlines:** a high-contrast modern serif (e.g., *Fraunces*, *Canela*, or *GT Super*) OR a refined grotesque (e.g., *Söhne*, *Neue Haas*). Pick **one** display family. Headlines tight tracking (`-0.02em`), large sizes via `clamp()`.
- **Body / UI:** a neutral humanist sans (e.g., *Inter*, *Söhne*, *Suisse Int'l*). 16–18px body, 1.6 line-height, max 70ch measure.
- **Numerals/specs:** tabular figures for spec tables and prices.
- Type scale (modular ~1.25): 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48 / 64 / 80.

**Imagery direction (critical for premium perception):**
- High-end kitchen scenes: matte cabinetry, stone counters, low warm light, lifestyle-in-context.
- Product on seamless dark or paper backgrounds, studio-lit, 3/4 hero angle + straight-on.
- Detail macros (brushed steel grain, knurled knobs, flame, glass).
- Always shoot/select with consistent light temperature and one art-direction recipe.
- Avoid: cluttered scenes, cheap stock, harsh on-white catalogue cut-outs for hero use.
- **Spec:** AVIF/WebP, art-directed `<picture>`, never upscale; hero ≤ 200KB on mobile.

**Motion:** subtle, physical, 200–600ms eased; reveal-on-scroll; image parallax ≤6%; honor `prefers-reduced-motion`. Motion should feel like weighted machinery, never bouncy.

**Iconography:** thin-stroke (1.5px) line icons, custom set, no emoji on brand surfaces.

## A3. Information architecture (global nav)

```
Logo | Kitchen ▾   Laundry ▾   Built-in ▾   Discover ▾   Support ▾        ⌕  Dealers  Account  Cart
```
- **Kitchen / Laundry / Built-in** = mega-menu collections (by category + by use + featured product + imagery).
- **Discover** = About, Technology/Engineering, Blog, Sustainability.
- **Support** = Support Center, Warranty, Installation, Manuals, Contact, Live Chat.
- Utility: Search, **Dealer Locator**, Account, Cart.
- **Mobile:** hamburger → full-screen overlay nav with accordion sections, persistent Search + Dealers + Cart; sticky bottom bar on PDPs.

**Footer (every page):** four columns — Shop (collections), Support (warranty/install/manuals/contact), Company (about/careers/press/sustainability), Connect (newsletter, social, dealer CTA) — plus certification/trust badge row, payment + financing logos, and legal.

## A4. Conversion psychology principles applied site-wide

- **Authority & social proof** (Cialdini): certifications, reviews, dealer count, years of testing near every decision point.
- **Cognitive ease / Hick's Law:** one primary CTA per screen; comparison tool to reduce overwhelm.
- **Loss aversion / risk reversal:** warranty length, free-return/white-glove framing surface *before* price objection.
- **Anchoring:** show flagship first; financing reframes price as monthly.
- **Commitment & consistency:** micro-yeses (configure → compare → save → cart).
- **Peak-end:** beautiful PDP media + frictionless cart and reassurance at checkout.

---

# PART B — PAGE TYPES

> Template per page: **Purpose & KPI · Layout · Headline · Copywriting · CTA · UX behavior · Conversion psychology · SEO strategy.**

## B1. Homepage

**Purpose & KPI.** Establish premium credibility in 5 seconds and route traffic to collections/PDPs. KPIs: hero→collection CTR, scroll depth, assisted conversions, bounce rate < 40%.

**Layout (top→bottom):**
1. **Hero** — full-bleed cinematic kitchen or flagship product, dark overlay, headline + sub + dual CTA, quiet scroll cue. One product, one message.
2. **Trust strip** — hairline band: warranty length · certifications · dealer count · review rating (logos/numbers, not words).
3. **Category tiles** — Kitchen / Laundry / Built-in / Instant Hot Water; large imagery, hover reveal.
4. **Flagship feature** — alternating editorial blocks (image + 3-line story) for the hero technology.
5. **Best sellers / New** — product carousel (PDP cards with rating, price, financing-from).
6. **Proof band (dark)** — review quote rotator + aggregate rating + press/certification logos.
7. **Service promise** — Warranty · Installation · Support tri-column with links to those centers.
8. **Editorial / Blog teasers** — 3 latest guides (SEO + authority).
9. **Dealer locator teaser** — "Find DiamondFlame near you" + map thumbnail + zip field.
10. **Newsletter** — design-led, value-led ("Care guides & early access").
11. **Footer.**

**Headline (hero):** *“Engineered for the kitchens that outlast trends.”*
Alt: *“Professional performance. Built for a generation.”*

**Copywriting (hero sub):** “DiamondFlame builds hobs, hoods, ovens and instant water systems to international standards — precision engineering, premium materials, and a warranty that proves it.”

**CTA.** Primary: **Explore the Collection** (brass). Secondary: **Why DiamondFlame** (ghost). Tertiary inline: **Find a dealer**.

**UX behavior.** Hero media lazy-loads a poster first (LCP-safe); reveal-on-scroll for sections; sticky condensed header after 8px; category tiles hover-zoom (desktop) / tap (mobile); carousels are swipeable with snap; all motion respects reduced-motion.

**Conversion psychology.** Authority + restraint up top (credibility before catalog); trust strip pre-empts risk; service promise reduces post-purchase anxiety; editorial builds expertise; dealer teaser adds omnichannel legitimacy ("real company, real network").

**SEO strategy.** Title: `DiamondFlame — Premium Kitchen & Home Appliances`. Meta: brand + category + warranty proof. Schema: `Organization` + `WebSite` (Sitelinks SearchAction) + `BreadcrumbList`. H1 = hero headline; one H1 only. Internal links to all top collections + service centers. Target brand + head terms ("premium kitchen appliances", "built-in hobs", brand name). Preload hero, ship critical CSS.

## B2. Collection pages

**Purpose & KPI.** Help buyers narrow and compare; push to PDP. KPIs: filter usage, PDP CTR, compare adds, products-viewed/session.

**Layout:**
1. **Collection hero** — concise banner: category name, one-line value prop, lifestyle image, breadcrumb.
2. **Intro SEO copy (collapsible)** — 60–90 words above the fold, "read more" reveals 200–400 words (keyword-rich, human).
3. **Toolbar** — result count · sort · **Filter** (sticky). Filters: type, fuel (gas/electric/induction), width, finish, features, price, rating, availability.
4. **Product grid** — 3-up desktop / 2-up tablet / 1–2 mobile. Card: image (hover alt-image), badge (New/Best/Save), name, 1-line descriptor, rating, price + "from $X/mo", **Add to Compare** checkbox, quick-add.
5. **Comparison bar** — appears when ≥2 selected; sticky bottom "Compare (n)".
6. **Reassurance band** — warranty/financing/free-install messaging.
7. **Related collections + blog links.**
8. **Pagination** — "Load more" with proper `rel=next/prev` fallback + crawlable links.

**Headline:** e.g. *“Built-In Ovens — pro results, engineered to disappear into your kitchen.”*

**Copywriting (intro):** lead with benefit + authority: “Every DiamondFlame oven is lifecycle-tested and backed by [X]-year warranty. Choose by size, fuel, and finish — and compare like a professional.”

**CTA.** Card-level **View** / **Quick add**; global **Compare**; section **Talk to a specialist** (chat).

**UX behavior.** Filters update grid via AJAX (no reload), reflected in URL params for shareable/indexable states; "sticky filter" rail desktop, full-screen filter sheet mobile; skeleton loaders; lazy-load images below fold; preserve scroll on back.

**Conversion psychology.** Filtering = control + commitment; compare reduces decision paralysis; "from $/mo" anchors affordability; badges create scarcity/recency cues.

**SEO strategy.** Title: `[Category] — DiamondFlame`. Unique meta per collection. Schema: `CollectionPage` + `BreadcrumbList` + `ItemList`. Indexable, human-readable URLs `/collections/built-in-ovens`. Canonicalize filtered/sorted param URLs to the base collection (allow indexing only of strategically chosen facet pages). Intro copy targets category + modifier keywords; internal-link to top PDPs and relevant guides.

## B3. Product pages (PDP)

**Purpose & KPI.** The money page. KPIs: add-to-cart rate, sticky-bar CTR, compare/financing/video engagement, RPV.

**Layout:**
1. **Breadcrumb.**
2. **Gallery (left/60%)** — large media, thumbnail rail, zoom, **product video** + 360° if available; lifestyle + detail + dimension shots.
3. **Buy box (right/40%, sticky on desktop)** — name, short descriptor, rating (→reviews), price + strike MSRP, **finance "from $X/mo"**, variant selectors (finish/fuel/width as swatches/segmented), stock + lead time, **Add to Cart** (primary), **Add to Compare**, delivery/install estimator (zip), warranty badge, trust badges (secure, returns, dealer-installable), share/save.
4. **Sticky Add-to-Cart bar** — appears on scroll: thumbnail, name, price, variant, ATC. (Mobile: fixed bottom.)
5. **Key specs at a glance** — 4–6 hero specs with icons.
6. **Story / features** — alternating editorial blocks with macro imagery + video.
7. **Full specifications** — accordion tables (tabular figures); dimensions diagram; downloads (manual, spec sheet, energy label, CAD).
8. **Warranty & installation** — what's covered, install options, link to centers.
9. **Comparison** — "Compare with similar DiamondFlame models" mini-table.
10. **Reviews** — aggregate + distribution + filterable verified reviews + photos + Q&A.
11. **FAQ (PDP-specific)** — accordion.
12. **Related / frequently bought** (e.g., hob + hood + install kit).
13. **Recently viewed.**

**Headline:** product name as H1; supporting tagline e.g. *“DF-90 Induction Hob — silent power, surgical control.”*

**Copywriting.** Benefit-first descriptor (2 lines) → scannable feature bullets → spec proof. Use numbers and materials. Reassure: “Backed by [X]-year warranty. Professional installation available nationwide.”

**CTA.** Primary **Add to Cart** (always reachable via sticky bar). Secondary **Book installation** / **Find a dealer**. Micro: **Add to Compare**, **Download spec sheet**, **Ask a question** (chat).

**UX behavior.** Sticky buy box (desktop) + sticky bottom ATC (mobile); variant change updates price/image/SKU/availability without reload; gallery zoom & swipe; lazy-load video (poster→click); cart opens as slide-over with cross-sell; inline validation; optimistic UI on add.

**Conversion psychology.** Sticky ATC removes friction at intent peak; financing reframes price; warranty/trust badges = risk reversal; reviews + Q&A = social proof; bundles raise AOV; specs satisfy the rational buyer who justifies an emotional choice.

**SEO strategy.** Title: `[Product Name] | DiamondFlame`. Unique meta with key spec + benefit. Schema: `Product` (name, brand, sku/mpn, image, description), `Offer` (price, availability, priceValidUntil), `AggregateRating` + `Review`, `BreadcrumbList`, `VideoObject` for product video, `FAQPage` for PDP FAQ. Descriptive URL `/products/df-90-induction-hob`. Crawlable spec text (not image-only). Internal links to collection, comparisons, guides. Image alt text with model + feature.

## B4. About Us

**Purpose & KPI.** Manufacture trust and scale perception. KPIs: time-on-page, scroll depth, onward CTR to collections/dealers, brand-search lift.

**Layout:** cinematic hero (factory/engineering) → founding story (year, mission) → **by-the-numbers** band (units made, countries served, dealers, years testing, warranty) → engineering & standards section (test labs, materials, certifications) → craftsmanship gallery → leadership/team (optional) → sustainability → certifications/press wall → CTA to collection + dealer.

**Headline:** *“We don’t build appliances to fill kitchens. We build them to outlast them.”*

**Copywriting.** Confident, specific, restrained. Lead with philosophy + standards, support with numbers and proof. Avoid hype; let facts (warranty, testing, certifications) carry weight.

**CTA.** **Explore the collection** + **Meet our dealers** + **Read our engineering standards**.

**UX behavior.** Parallax/reveal storytelling; animated stat counters (reduced-motion safe); full-bleed imagery; lightweight.

**Conversion psychology.** Authority + scale + transparency = trustworthiness; numbers make a young/unknown brand feel established; sustainability addresses modern premium-buyer values.

**SEO strategy.** Title: `About DiamondFlame — Engineering & Heritage`. Schema: `AboutPage` + `Organization` (logo, foundingDate, numberOfEmployees, award, sameAs). Target brand-authority and "[brand] reviews/quality/manufacturer" queries. Strong internal hub linking to Warranty, Installation, Dealers.

## B5. Warranty Center

**Purpose & KPI.** Convert warranty (a top objection) into a selling point; enable registration & claims. KPIs: registrations, claim starts, PDP→warranty→back-to-PDP, support deflection.

**Layout:** hero ("Protected for years, not months") → **coverage matrix** by category (years, what's covered/excluded) → **register your product** (form: model, serial, purchase date, receipt upload) → **start a claim** flow (status tracker) → extended-warranty/plans → warranty FAQ → contact/chat.

**Headline:** *“A warranty that says what we believe about our machines.”*

**Copywriting.** Plain-language coverage, no fine-print games; "Here’s exactly what’s covered" tables. Confidence framing: long warranty = engineering confidence.

**CTA.** **Register your product** (primary), **Start a claim**, **Compare protection plans**.

**UX behavior.** Multi-step forms with progress + autosave; serial-number helper (where to find it, image); file upload with validation; claim status by reference number; success states with next steps.

**Conversion psychology.** Risk reversal + transparency; registration creates ownership commitment & data capture; clarity reduces anxiety pre-purchase.

**SEO strategy.** Title: `DiamondFlame Warranty — Coverage, Registration & Claims`. Schema: `FAQPage` + `HowTo` (register/claim) + `WebPage`. Target "[brand] warranty", "register [brand] appliance", "[category] warranty terms". Link from every PDP and footer.

## B6. Installation Center

**Purpose & KPI.** Remove the "how will I install this?" blocker; sell pro installation; reduce returns. KPIs: install bookings, dealer referrals, guide downloads, PDP assist.

**Layout:** hero → **book professional installation** (zip → availability → schedule) → "what to expect" (steps, timeline, what's included) → pre-installation checklist + dimension/clearance specs → category install guides (video + PDF) → **find a certified installer/dealer** → safety & compliance notes → FAQ → chat.

**Headline:** *“White-glove installation, done to DiamondFlame standard.”*

**Copywriting.** Reassuring, procedural, expert. Set expectations precisely (timeline, prep, included). Emphasize certified technicians and compliance.

**CTA.** **Book installation** (primary), **Download install guide**, **Find a certified dealer**.

**UX behavior.** Zip-based availability; scheduling widget (or lead capture if manual); downloadable PDFs; embedded how-to videos (lazy); checklist with print option.

**Conversion psychology.** Effort reduction + competence signaling; pro install reframes a daunting task as effortless; certification = authority + safety reassurance.

**SEO strategy.** Title: `DiamondFlame Installation — Booking, Guides & Requirements`. Schema: `HowTo` per guide, `VideoObject`, `Service`/`Offer` for install service, `FAQPage`. Target "install [category]", "[product] installation guide", "[product] dimensions/clearance". Link from PDP specs + Support.

## B7. Support Center

**Purpose & KPI.** Self-serve hub that deflects tickets and supports owners (retention/repeat). KPIs: search success, article helpfulness, deflection rate, contact-form quality.

**Layout:** **search-first hero** ("How can we help?") → quick links (Warranty, Installation, Manuals, Parts, Troubleshooting, Contact) → category tiles → **manuals & downloads** (search by model) → troubleshooting guides → **FAQ system** (searchable, categorized accordions) → registered-product/account panel → contact options (chat, form, phone, hours) → still-need-help CTA.

**Headline:** *“Owner support, engineered to be as good as the appliance.”*

**Copywriting.** Helpful, calm, plain language. Lead with search; organize by task. "Find your manual", "Troubleshoot in 3 steps".

**CTA.** **Search**, **Download manual**, **Contact support**, **Start live chat**.

**UX behavior.** Instant search with suggestions; type-by-model lookup; article "Was this helpful?" feedback; breadcrumb in articles; persistent chat launcher; mobile-first accordions.

**Conversion psychology.** Reliable post-purchase support increases trust *pre*-purchase (buyers check support before buying premium) and drives retention/advocacy.

**SEO strategy.** Title: `DiamondFlame Support — Manuals, FAQs & Help`. Schema: `FAQPage`, `QAPage` where relevant, `WebPage` + sitelinks search. This is a long-tail SEO engine: target "[model] manual", "[model] error [code]", "how to clean [product]". Strong internal linking; keep articles indexable and fast.

## B8. Blog system (Editorial / Guides)

**Purpose & KPI.** Top-of-funnel SEO + authority + email capture + internal-linking to PDPs. KPIs: organic sessions, assisted conversions, email signups, scroll/read depth.

**Layout:** **magazine hub** — featured post + category filters (Buying Guides, How-To, Care & Maintenance, Recipes/Lifestyle, Behind the Engineering) → grid of cards (image, category, title, read time) → newsletter block → popular guides. **Article template:** hero image + H1 + author/date/read-time → TOC (sticky on desktop) → rich body (headings, images, callouts, comparison tables, embedded products) → key takeaways → related products (commercial bridge) → related articles → newsletter → comments/share (optional).

**Headline (hub):** *“The DiamondFlame Journal — kitchens, craft, and the science of better appliances.”*

**Copywriting.** Genuinely useful, expert, non-salesy editorial that earns links; naturally reference products where relevant.

**CTA.** **Shop the products in this guide**, **Subscribe**, **Find a dealer**.

**UX behavior.** Sticky TOC + reading-progress bar; lazy images; estimated read time; "shop this look" inline product cards; fast pagination.

**Conversion psychology.** Reciprocity (free expertise) + authority → trust that transfers to product pages; soft commerce bridges convert researchers.

**SEO strategy.** This is the primary organic growth engine. Topic clusters: pillar pages ("Induction vs gas vs electric") linking to spokes; target informational + commercial-investigation keywords. Schema: `Article`/`BlogPosting` (author, datePublished, image), `BreadcrumbList`, `FAQPage` where used, `HowTo` for tutorials. Clean URLs `/blog/induction-vs-gas`. Internal-link every article to ≥2 PDPs/collections and related guides. Add canonical, OG/Twitter cards, XML sitemap.

## B9. Dealer Locator

**Purpose & KPI.** Prove distribution scale (legitimacy) and drive omnichannel + B2B. KPIs: searches, dealer clicks/directions, dealer-application submissions.

**Layout:** hero ("Experience DiamondFlame in person") → **search bar** (zip/city + radius + filters: showroom/service/installer) → **map + results list** (split view; cards: name, address, phone, hours, services, distance, directions, call, website) → "Become a dealer" B2B CTA → trust line (number of dealers/countries).

**Headline:** *“Find DiamondFlame near you.”*

**Copywriting.** Concise, action-oriented. Reassure that authorized dealers mean genuine product + valid warranty + expert install.

**CTA.** **Search**, **Get directions**, **Call**, **Become a dealer**.

**UX behavior.** Geolocate (with permission) or manual zip; debounced search; map markers sync with list hover/click; mobile = list-first with map toggle; lazy-load map JS (don't block render); empty-state with "contact us / shop online".

**Conversion psychology.** Physical presence = legitimacy and scale (key to "$100M" perception); authorized-dealer framing protects warranty (risk reversal) and supports premium pricing.

**SEO strategy.** Title: `DiamondFlame Dealer Locator — Showrooms & Service`. **Local SEO**: per-dealer landing pages where viable with `LocalBusiness`/`Store` schema (name, address, geo, hours, telephone), embedded in a `Store` directory; `BreadcrumbList`. Target "[brand] dealer near me", "[brand] showroom [city]". Ensure markers/list are crawlable (SSR or HTML fallback for JS map).

## B10. Contact Page

**Purpose & KPI.** Route every intent to the right channel; capture qualified leads. KPIs: form completion, response routing accuracy, chat starts, B2B leads.

**Layout:** hero ("We’re here to help") → **intent selector** (Product question · Support/Warranty · Installation · Dealer/B2B · Press) that adapts the form → **contact form** (name, email, phone, topic, order/model optional, message, consent) → direct channels (chat, phone + hours, email, WhatsApp) → HQ/showroom address + map → links to Support/Warranty/Install → response-time promise.

**Headline:** *“Talk to DiamondFlame.”*

**Copywriting.** Warm, efficient, sets expectations ("We reply within one business day"). Guide users to the fastest channel for their need.

**CTA.** **Send message** (primary), **Start live chat**, **Call us**, **Find a dealer**.

**UX behavior.** Conditional fields by intent; inline validation; spam protection (honeypot + token, not intrusive CAPTCHA); success state with reference + next steps + deflection links; accessible labels.

**Conversion psychology.** Channel choice + fast-response promise reduces friction and anxiety; routing makes a small brand feel like a structured organization.

**SEO strategy.** Title: `Contact DiamondFlame — Support, Sales & Dealers`. Schema: `ContactPage` + `Organization` (`contactPoint` with type/area/languages) + `LocalBusiness` for HQ. Target "[brand] contact/customer service/phone number". Link from header/footer globally.

---

# PART C — CONVERSION FEATURES (cross-cutting)

| Feature | Where | Implementation notes | Psychology |
|---|---|---|---|
| **Sticky Add-to-Cart** | PDP | Reveals on scroll past buy box; mobile fixed bottom bar (thumb, name, price, variant, ATC); never covers footer/legal | Intent-peak friction removal |
| **Comparison tool** | Collection + PDP | Persist up to 4 via localStorage; sticky compare bar; full-screen compare table (specs, price, finance, rating, CTA per column); sharable URL | Reduces paralysis, rational justification |
| **Warranty badges** | PDP, cards, cart | Reusable badge component ("[X]-Year Warranty") with link to Warranty Center | Risk reversal |
| **Trust badges** | PDP, cart, checkout | Secure checkout, authorized-dealer, certifications, returns/installation; real, verifiable | Authority + safety |
| **Reviews** | PDP, collection, home | Verified reviews app (Judge.me/Okendo/Yotpo); aggregate, distribution, photos, Q&A; emit `Review`/`AggregateRating` schema | Social proof |
| **Product videos** | PDP, home, blog | Self-host or lazy embed; poster→click; captions; `VideoObject` schema | Engagement + comprehension |
| **Financing** | PDP, cart, collection cards | "from $X/mo"; provider (Shop Pay Installments/Affirm/Klarna or local); transparent terms | Price reframing / anchoring |
| **Live chat** | Global launcher | Persistent; routes to support/sales; offline → form; mobile-safe placement (avoids sticky ATC/FABs) | Reassurance, real-time objection handling |
| **FAQ system** | PDP, Support, Warranty, Install | Reusable accordion; searchable on Support; `FAQPage` schema | Objection handling, SEO long-tail |

**FAB/sticky stacking rule (mobile):** define one z-index + spacing system so Live Chat, WhatsApp, sticky ATC, and cookie/consent never overlap. Recommended: sticky ATC owns the bottom edge on PDP; chat launcher sits above it; one FAB max elsewhere.

---

# PART D — TECHNICAL IMPLEMENTATION

## D1. Shopify architecture

- **Theme:** Online Store 2.0, section-everywhere, JSON templates; build modular **sections + blocks** so merchandisers compose pages. Consider Dawn as a clean base or a premium OS2.0 theme; keep JS minimal and framework-free where possible (Web Components / vanilla) for performance.
- **Metafields/metaobjects** for: specs (structured), downloads (manual/spec/CAD/energy label), warranty terms, video, dimension diagrams, certifications, finishes. Use **metaobjects** for reusable content (certifications, dealers, FAQ entries, blog authors).
- **Products/variants:** finish/fuel/width as variant options; SKUs/MPNs set; inventory + lead-time metafields. Use selling plans/financing app.
- **Collections:** manual + automated (by type/tag); curated hero + intro metafields per collection.
- **Pages built as sections:** About, Warranty, Installation, Support, Contact, Dealer Locator (custom section + app/metaobjects for dealers), Blog via Shopify Blogs (or headless CMS if volume demands).
- **Apps (keep lean):** Reviews (Okendo/Judge.me), Financing (Shop Pay Installments/Affirm/Klarna), Search & filtering (Search & Discovery or Searchanise), Dealer locator (Storemapper/Stockist or custom + metaobjects), Help/Chat (Gorgias/Zendesk/Tidio), optionally a "compare" app or custom build.
- **Cart:** AJAX slide-over with cross-sell + financing + trust row; Shop Pay enabled.
- **Custom builds:** Comparison tool, sticky ATC, spec accordions, dimension diagrams, install/warranty multi-step forms (app proxy or form + backend), dealer map (lazy map + crawlable list).

## D2. Performance (premium = fast)

- **Targets:** LCP < 2.5s (mobile), CLS < 0.1, INP < 200ms; Lighthouse ≥ 90.
- Preload hero font (subset, `font-display:swap`) + LCP image; critical CSS inline; defer non-critical JS; avoid render-blocking apps.
- Images: AVIF/WebP, responsive `srcset`/`sizes`, art-directed `<picture>`, explicit width/height (no CLS), lazy-load below fold, CDN.
- Limit third-party scripts; lazy-load chat/map/video; audit app bloat ruthlessly.
- Reserve space for dynamic blocks (reviews, sticky bars) to protect CLS.

## D3. SEO architecture (site-wide)

- Clean, descriptive URLs; canonical tags; XML sitemap; robots.txt; no thin/duplicate (manage faceted URLs).
- Global `Organization`/`WebSite` schema; page-type schema as specified per section; validate with Rich Results.
- Title/meta templates per template type; one H1/page; logical H2/H3.
- Internal linking hubs: PDP↔collection↔guide↔support; breadcrumbs everywhere.
- Hreflang/multi-market if international; localized currency/financing.
- Core Web Vitals as a ranking + UX investment; image alt text; OG/Twitter cards.

## D4. Accessibility (WCAG 2.2 AA)

- Color contrast ≥ 4.5:1 (verify brass on white/ink); visible brass focus rings.
- Full keyboard operability (nav, mega-menu, filters, gallery, sticky ATC, modals, carousels); logical focus order; focus trap + restore in modals/drawers.
- Semantic HTML + ARIA only where needed; labelled forms with inline, programmatic errors.
- `prefers-reduced-motion` honored globally; captions/transcripts for video; alt text for meaningful images, empty alt for decorative.
- Tap targets ≥ 44px; skip-to-content link; tested with screen readers (VoiceOver/NVDA).

## D5. Mobile-first UX

- Design at 360px first; thumb-zone CTAs; sticky bottom ATC on PDP; full-screen nav/filter sheets; large tap targets; performance budget tighter on mobile; test on real mid-range Android.

## D6. Build roadmap (suggested phases)

1. **Foundation** — design tokens, type/color system, component library (buttons, cards, badges, accordions, forms), global header/footer/nav, metafield/metaobject schema.
2. **Core commerce** — Collection + PDP templates, cart, sticky ATC, reviews, financing, trust/warranty badges.
3. **Conversion** — comparison tool, FAQ system, video, live chat, search & filtering.
4. **Trust & service** — Homepage, About, Warranty, Installation, Support centers.
5. **Growth** — Blog system + topic clusters, Dealer Locator, Contact.
6. **Hardening** — performance pass, accessibility audit, SEO/schema validation, analytics & CRO instrumentation (events for ATC, sticky-bar, compare, finance, chat), A/B test plan.

## D7. Measurement

Instrument GA4 + Shopify analytics events: hero CTR, collection filter use, PDP ATC, sticky-bar ATC, compare adds, finance widget views, video plays, chat starts, warranty registrations, dealer searches, newsletter signups. Define a CRO backlog and continuous A/B testing (hero, PDP buy box, financing presentation, badge placement).

---

### Appendix — relationship to the current codebase
The existing repo is a custom (non-Shopify) storefront. If the decision is to **stay custom**, this blueprint maps 1:1 to components/sections you already have (header, trust strip, collection grid, PDP, reviews, chat) — treat "Shopify sections/metafields" as "templates/components/config." If the decision is to **migrate to Shopify**, use Part D1 as the porting plan. Recommend confirming platform direction before Phase 1, since it changes app choices and data modeling but not the UX/CRO/SEO strategy above.
