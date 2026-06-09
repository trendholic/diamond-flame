-- ============================================================
--  Diamond Flame Home Appliances — Supabase schema
--  Run this once in your project's SQL Editor.
--  Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / drops policies first.
-- ============================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  business    text,            -- wholesale business / shop name
  phone       text,
  role          text not null default 'customer',  -- 'customer' | 'dealer' | 'admin'
  dealer_status text not null default 'none',       -- none | pending | approved | rejected
  created_at    timestamptz not null default now()
);

-- Align an existing profiles table (from an earlier schema) with the app.
-- These are no-ops on a fresh table and safe to re-run.
alter table public.profiles add column if not exists email         text;
alter table public.profiles add column if not exists full_name     text;
alter table public.profiles add column if not exists business      text;
alter table public.profiles add column if not exists phone         text;
alter table public.profiles add column if not exists role          text not null default 'customer';
alter table public.profiles add column if not exists dealer_status text not null default 'none';
alter table public.profiles add column if not exists created_at    timestamptz not null default now();

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  brand           text,
  category        text not null,
  description     text,
  retail_price    numeric not null default 0,   -- PKR, shown to everyone
  wholesale_price numeric not null default 0,   -- PKR, dealers only
  cost_price      numeric not null default 0,   -- PKR, landing/cost, admin only
  moq             integer not null default 1,   -- minimum order quantity
  stock           integer not null default 0,
  emoji           text default '📦',
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Align an existing products table with the app (no-ops on a fresh table).
alter table public.products add column if not exists brand           text;
alter table public.products add column if not exists description     text;
alter table public.products add column if not exists retail_price    numeric not null default 0;
alter table public.products add column if not exists wholesale_price numeric not null default 0;
alter table public.products add column if not exists cost_price      numeric not null default 0;
alter table public.products add column if not exists moq             integer not null default 1;
alter table public.products add column if not exists stock           integer not null default 0;
alter table public.products add column if not exists emoji           text default '📦';
alter table public.products add column if not exists active          boolean not null default true;
alter table public.products add column if not exists created_at      timestamptz not null default now();

-- ---------- ORDERS ----------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  ref           text unique,
  user_id       uuid references auth.users(id) on delete set null,
  customer_name text,
  business      text,
  phone         text,
  email         text,
  address       text,
  items         jsonb not null default '[]'::jsonb,
  total         numeric not null default 0,      -- PKR
  status        text not null default 'pending', -- pending|confirmed|shipped|delivered|cancelled
  created_at    timestamptz not null default now()
);

-- Align an existing orders table with the app (no-ops on a fresh table).
alter table public.orders add column if not exists ref           text;
alter table public.orders add column if not exists user_id       uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists business      text;
alter table public.orders add column if not exists phone         text;
alter table public.orders add column if not exists email         text;
alter table public.orders add column if not exists address       text;
alter table public.orders add column if not exists items         jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists total         numeric not null default 0;
alter table public.orders add column if not exists status        text not null default 'pending';
alter table public.orders add column if not exists created_at    timestamptz not null default now();

-- ---------- DEALER PRICES (per-dealer overrides) ----------
create table if not exists public.dealer_prices (
  dealer_id  uuid not null references auth.users(id)      on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price      numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (dealer_id, product_id)
);

-- ---------- ADMIN HELPER (security definer avoids RLS recursion) ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Caller's role ('anon' when signed out) — drives three-tier pricing.
create or replace function public.viewer_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

-- Public catalogue API: returns only the prices the caller may see.
create or replace function public.catalogue()
returns table (
  id uuid, name text, brand text, category text, description text,
  emoji text, moq integer, stock integer,
  retail_price numeric, wholesale_price numeric, cost_price numeric
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.brand, p.category, p.description, p.emoji, p.moq, p.stock,
         p.retail_price,
         case when public.viewer_role() in ('dealer','admin') then
           coalesce(
             (select dp.price from public.dealer_prices dp
              where dp.dealer_id = auth.uid() and dp.product_id = p.id),
             p.wholesale_price)
         end,
         case when public.viewer_role() = 'admin' then p.cost_price end
  from   public.products p
  where  p.active = true
  order  by p.category, p.name;
$$;

grant execute on function public.viewer_role() to anon, authenticated;
grant execute on function public.catalogue()   to anon, authenticated;

-- ---------- AUTO-CREATE PROFILE ON SIGNUP ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, business, phone, dealer_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when coalesce(new.raw_user_meta_data->>'dealer_apply', '') = 'true'
         then 'pending' else 'none' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.dealer_prices enable row level security;

-- profiles: a user sees/edits their own; admins manage all
drop policy if exists profiles_select_own  on public.profiles;
drop policy if exists profiles_insert_own  on public.profiles;
drop policy if exists profiles_update_own  on public.profiles;
drop policy if exists profiles_admin_all   on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- products: only admins read the raw table directly (protects wholesale & cost);
-- everyone else reads via catalogue(), which filters columns by role.
drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_read  on public.products;
drop policy if exists products_admin_write on public.products;
create policy products_admin_read on public.products
  for select using (public.is_admin());
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- orders: anyone may place one; customers read their own; admins manage all
drop policy if exists orders_insert_any on public.orders;
drop policy if exists orders_select_own on public.orders;
drop policy if exists orders_admin_all  on public.orders;
create policy orders_insert_any on public.orders
  for insert with check (true);
create policy orders_select_own on public.orders
  for select using (auth.uid() = user_id);
create policy orders_admin_all on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- dealer_prices: a dealer reads their own; admins manage all
drop policy if exists dealer_prices_own   on public.dealer_prices;
drop policy if exists dealer_prices_admin on public.dealer_prices;
create policy dealer_prices_own on public.dealer_prices
  for select using (auth.uid() = dealer_id);
create policy dealer_prices_admin on public.dealer_prices
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  SEED CATALOGUE (realistic PKR wholesale prices)
--  Runs only once — skipped if products already exist.
-- ============================================================
insert into public.products (name, brand, category, description, retail_price, wholesale_price, moq, stock, emoji)
select * from (values
  ('Inverter Refrigerator 15 cu.ft', 'Dawlance',  'Refrigerators',    'Frost-free double-door inverter fridge, energy-efficient compressor.',            145000, 128000,  4,  60, '🧊'),
  ('Deep Freezer 12 cu.ft',          'Haier',     'Refrigerators',    'Single-door chest freezer with fast-freeze and lock.',                            98000,  86000,   4,  45, '🧊'),
  ('Side-by-Side Refrigerator',      'Samsung',   'Refrigerators',    'Twin-cooling side-by-side with water dispenser, 600L.',                          285000, 262000,  2,  18, '🧊'),
  ('Inverter AC 1.5 Ton',            'Gree',      'Air Conditioners', 'DC inverter split AC, heat & cool, low-voltage start.',                          172000, 154000,  3,  50, '❄️'),
  ('Inverter AC 1.0 Ton',            'Haier',     'Air Conditioners', 'Energy-saving 1 ton inverter, turbo cooling.',                                   138000, 123000,  3,  40, '❄️'),
  ('Floor Standing AC 2.0 Ton',      'Orient',    'Air Conditioners', 'Cabinet inverter AC for halls and showrooms.',                                   268000, 245000,  2,  15, '❄️'),
  ('Fully Automatic Washer 9kg',     'Dawlance',  'Washing Machines', 'Front-load automatic, 9kg, multiple wash programs.',                              92000,  81000,   4,  55, '🌀'),
  ('Twin-Tub Washing Machine',       'PEL',       'Washing Machines', 'Semi-automatic twin tub, 10kg wash + spin.',                                      38000,  32500,   6,  80, '🌀'),
  ('Top-Load Washer 8kg',            'Haier',     'Washing Machines', 'Fully automatic top-load with quick-wash.',                                       74000,  65000,   4,  42, '🌀'),
  ('Microwave Oven 30L',             'Dawlance',  'Kitchen',          'Grill + convection microwave, 30 litre cavity.',                                 36000,  31000,   6,  70, '🍳'),
  ('5-Burner Gas Stove',             'Kenwood',   'Kitchen',          'Tempered glass top auto-ignition cooking range.',                                 28000,  23500,   8, 100, '🍳'),
  ('Electric Kettle 1.8L',           'Westpoint', 'Kitchen',          'Concealed element stainless kettle, auto cut-off.',                                4500,   3600,  20, 200, '🍳'),
  ('Water Dispenser 3-Tap',          'Orient',    'Water',            'Hot, normal & cold dispenser with refrigerated cabinet.',                         44000,  38000,   4,  48, '🚰'),
  ('Instant Electric Geyser 15L',    'PEL',       'Water Heating',    'Fast-heating electric storage geyser, 15 litre.',                                 26000,  22000,   6,  64, '🔥'),
  ('Gas Geyser 35 Gallon',           'Canon',     'Water Heating',    'Dual-valve gas water heater, 35 gallon tank.',                                    31000,  26500,   5,  38, '🔥'),
  ('LED TV 43" Full HD',             'TCL',       'Televisions',      'Slim-bezel Full HD LED panel, dual HDMI.',                                        62000,  54000,   5,  52, '📺'),
  ('Smart LED TV 55" 4K',            'Samsung',   'Televisions',      'Crystal 4K UHD smart TV, built-in streaming.',                                   135000, 121000,  3,  24, '📺'),
  ('Air Cooler 70L',                 'Super Asia','Cooling',          'Large-tank room air cooler with ice box.',                                        34000,  28500,   6,  90, '💨'),
  ('Pedestal Fan 24"',               'GFC',       'Cooling',          'High-velocity pedestal fan, copper winding.',                                      9500,   7800,  12, 150, '💨'),
  ('Ceiling Fan 56" (pack)',         'Royal',     'Cooling',          'AC ceiling fan, energy-saver — sold per single unit.',                             7200,   5900,  15, 220, '💨'),
  ('Microwave + Air Fryer Combo',    'Haier',     'Kitchen',          'Convection microwave with air-fry basket, 25L.',                                  42000,  36000,   5,  30, '🍳')
) as seed(name, brand, category, description, retail_price, wholesale_price, moq, stock, emoji)
where not exists (select 1 from public.products);

-- Seed a landing/cost price (~88% of wholesale) so margins show immediately.
update public.products
set    cost_price = round(wholesale_price * 0.88)
where  cost_price = 0 and wholesale_price > 0;

-- ============================================================
--  MAKE YOURSELF ADMIN
--  1) Sign up on the live site with your email + password.
--  2) Then run (replace the email):
--     update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================
