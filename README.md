# Diamond Flame — Home Appliances Wholesale

A wholesale storefront **and** admin dashboard for **Diamond Flame Home Appliances**.
Refrigerators, ACs, washing machines, TVs and more — bulk pricing in **PKR (Rs)**,
backed by Supabase (auth + database). Plain HTML/CSS/JS, no build step.

```
index.html              storefront (browse, search, bulk cart, checkout, dealer auth)
admin.html              dealer dashboard (orders, products CRUD, customers, stats)
css/styles.css          flame theme, shared
js/config.js            Supabase URL + anon key + currency  ← your settings
js/core.js              shared client + helpers
js/store.js             storefront logic
js/admin.js             dashboard logic
supabase/schema.sql     tables, RLS policies, triggers, seed catalogue
```

## 1. Set up the backend (one time)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates the `profiles`, `products`, `orders` tables, Row Level Security
   policies, the signup trigger, and seeds ~21 sample appliances with realistic
   PKR wholesale prices.
3. In **Project Settings → API**, copy the **Project URL** and **anon public key**
   into `js/config.js` (already filled in for the current project).

## 2. Become an admin

1. Open the live site and **Create dealer account** (or use the Sign in modal).
2. Back in Supabase **SQL Editor**, run (with your email). This joins
   `auth.users`, so it works even if an older `profiles` table is missing an
   `email` column:

   ```sql
   update public.profiles p
   set    role = 'admin'
   from   auth.users u
   where  p.id = u.id and u.email = 'you@example.com';
   ```

3. Open `admin.html`, sign in — you now have the dashboard.

## 3. Deploy (GitHub Pages)

1. Push this branch.
2. Repo **Settings → Pages → Source: Deploy from a branch** → pick this branch →
   `/(root)` → **Save**.
3. Live at `https://<user>.github.io/diamond-flame/` (dashboard at `…/admin.html`).

## Run locally

```bash
python3 -m http.server 8000
# storefront  http://localhost:8000
# dashboard   http://localhost:8000/admin.html
```

## Pricing tiers

Three prices per product, all managed in the dashboard product form:

| Price | Visible to | Notes |
|-------|------------|-------|
| **Retail** | everyone (public) | the regular customer price |
| **Wholesale** | dealers + admins | requires sign-in with a `dealer` role |
| **Landing / cost** | admins only | never sent to the browser for anyone else |

Visibility is enforced in the database by the `catalogue()` security-definer
RPC (see `supabase/schema.sql`), which returns `NULL` for prices the caller
isn't allowed to see — so it's not just hidden in the UI. The dashboard product
form shows **live profit margins** as you type. Approve a dealer from
**Dashboard → Customers → role dropdown** (or `update public.profiles set role
= 'dealer' where email = '…'`).

If you set the project up before this feature, run `supabase/migration-pricing.sql` once.

## Security notes

- The anon key is meant to be public; all access is gated by **RLS** in
  `schema.sql`. Anyone can read the active catalogue and place an order; only
  signed-in users see their own profile/orders; only `admin` accounts can write
  products or manage every order.
- The `is_admin()` and signup functions are `security definer` with a pinned
  `search_path` to avoid RLS recursion and search-path hijacking.
- All user/DB strings are HTML-escaped before rendering (`DF.esc`).
