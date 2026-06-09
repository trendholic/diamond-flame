# Diamond Flame

A static storefront for **Diamond Flame** — fine jewellery, handcrafted in Lahore.
Prices in PKR. No build step, no dependencies — plain HTML/CSS/JS.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy (GitHub Pages)

1. Push this branch to GitHub.
2. Repo **Settings → Pages → Source: Deploy from a branch**.
3. Pick this branch and `/(root)`, then **Save**.
4. Your site goes live at `https://<user>.github.io/diamond-flame/`.

A custom domain (e.g. `www.diamond-flame.com`) can be added under the same
Pages settings once DNS points at GitHub Pages.

## Structure

```
index.html              # storefront markup
assets/css/styles.css   # theme + layout
assets/js/products.js   # product catalogue (edit prices/items here)
assets/js/app.js         # cart, filters, checkout
```

## Wiring a backend

The catalogue lives in `assets/js/products.js` and orders are recorded in
`localStorage` (see `handleOrder` in `app.js`). To go live with a real
backend, replace the `PRODUCTS` array with a `fetch()` to your API/Supabase
and post the order payload from `handleOrder` to your endpoint.
