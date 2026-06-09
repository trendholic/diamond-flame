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
  whatsapp      text,
  shop_card_url text,
  shop_photos   jsonb not null default '[]'::jsonb,
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
alter table public.profiles add column if not exists whatsapp      text;
alter table public.profiles add column if not exists shop_card_url text;
alter table public.profiles add column if not exists shop_photos   jsonb not null default '[]'::jsonb;
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
  emoji           text default '🍳',
  image_url       text,
  images          jsonb not null default '[]'::jsonb,
  variants        jsonb not null default '[]'::jsonb,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Align an existing products table with the app (no-ops on a fresh table).
alter table public.products add column if not exists brand           text;
alter table public.products add column if not exists description     text;
alter table public.products add column if not exists retail_price    numeric not null default 0;
alter table public.products add column if not exists wholesale_price numeric not null default 0;
alter table public.products add column if not exists cost_price      numeric not null default 0;
alter table public.products add column if not exists image_url       text;
alter table public.products add column if not exists images          jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists variants        jsonb not null default '[]'::jsonb;
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

-- Public catalogue API: returns only the prices the caller may see, plus image
-- and variants (variant wholesale stripped for non-dealers).
drop function if exists public.catalogue();
create function public.catalogue()
returns table (
  id uuid, name text, brand text, category text, description text,
  emoji text, image_url text, images jsonb, moq integer, stock integer,
  retail_price numeric, wholesale_price numeric, cost_price numeric,
  variants jsonb
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.brand, p.category, p.description, p.emoji, p.image_url,
         coalesce(p.images, '[]'::jsonb), p.moq, p.stock,
         p.retail_price,
         case when public.viewer_role() in ('dealer','admin') then
           coalesce(
             (select dp.price from public.dealer_prices dp
              where dp.dealer_id = auth.uid() and dp.product_id = p.id),
             p.wholesale_price)
         end,
         case when public.viewer_role() = 'admin' then p.cost_price end,
         case when public.viewer_role() in ('dealer','admin') then coalesce(p.variants, '[]'::jsonb)
              else coalesce((
                select jsonb_agg(jsonb_build_object(
                  'name', v->>'name', 'retail_price', v->'retail_price', 'stock', v->'stock'))
                from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) v), '[]'::jsonb)
         end
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
  insert into public.profiles (
    id, email, full_name, business, phone, whatsapp,
    shop_card_url, shop_photos, dealer_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'whatsapp', ''),
    coalesce(new.raw_user_meta_data->>'shop_card_url', ''),
    coalesce(new.raw_user_meta_data->'shop_photos', '[]'::jsonb),
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
--  STORAGE — dealer documents (shop card + shop photos)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('dealer-docs', 'dealer-docs', true)
on conflict (id) do nothing;

drop policy if exists dealer_docs_read   on storage.objects;
drop policy if exists dealer_docs_insert on storage.objects;
create policy dealer_docs_read on storage.objects
  for select using (bucket_id = 'dealer-docs');
create policy dealer_docs_insert on storage.objects
  for insert with check (bucket_id = 'dealer-docs');

-- product images (admins upload while signed in; public read)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
drop policy if exists product_images_read  on storage.objects;
drop policy if exists product_images_write on storage.objects;
create policy product_images_read on storage.objects
  for select using (bucket_id = 'product-images');
create policy product_images_write on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

-- ============================================================
--  SEED CATALOGUE (Diamond Flame kitchen products, PKR)
--  Runs only once — skipped if products already exist.
-- ============================================================
insert into public.products
  (name, brand, category, description, retail_price, wholesale_price, cost_price, moq, stock, emoji, variants)
select * from (values
  ('Apex Kitchen Sink', 'Stainless Steel', 'Kitchen Sinks',
   'Satin-finish 304 stainless steel sink with sound-dampening pads and basket waste.',
   16000, 13500, 10800, 2, 65, '🪣',
   '[{"name":"Single bowl","retail_price":16000,"wholesale_price":13500,"stock":40},{"name":"Double bowl","retail_price":26000,"wholesale_price":22000,"stock":25}]'::jsonb),
  ('Flushline Undermount Sink', 'Stainless Steel', 'Kitchen Sinks',
   'Sleek undermount sink, brushed finish, with overflow and waste kit.',
   21000, 17500, 14000, 2, 38, '🪣',
   '[{"name":"Single bowl","retail_price":21000,"wholesale_price":17500,"stock":22},{"name":"1.5 bowl","retail_price":28000,"wholesale_price":23500,"stock":16}]'::jsonb),
  ('Ember 3-Burner Gas Hob', 'Tempered Glass', 'Gas Hobs',
   'Built-in glass gas hob, auto-ignition, cast-iron pan supports.',
   24000, 20000, 16000, 3, 50, '🔥',
   '[{"name":"60 cm","retail_price":24000,"wholesale_price":20000,"stock":30},{"name":"75 cm","retail_price":29000,"wholesale_price":24000,"stock":20}]'::jsonb),
  ('Titan 5-Burner Gas Hob', 'Stainless Steel', 'Gas Hobs',
   'Heavy-duty 5-burner stainless hob with FFD safety and brass burners.',
   38000, 32000, 26000, 2, 28, '🔥',
   '[{"name":"86 cm","retail_price":38000,"wholesale_price":32000,"stock":18},{"name":"90 cm","retail_price":42000,"wholesale_price":35500,"stock":10}]'::jsonb),
  ('Aura Built-in Electric Hob', 'Ceramic Glass', 'Electric Hobs',
   'Frameless ceramic hob with touch controls and residual-heat indicators.',
   34000, 28500, 23000, 2, 24, '⚡',
   '[{"name":"2 zone","retail_price":34000,"wholesale_price":28500,"stock":14},{"name":"4 zone","retail_price":52000,"wholesale_price":44000,"stock":10}]'::jsonb),
  ('Volt Domino Electric Hob', 'Ceramic Glass', 'Electric Hobs',
   'Slim 2-zone domino hob, ideal for compact kitchens and islands.',
   22000, 18000, 14500, 3, 30, '⚡', '[]'::jsonb),
  ('Cyclone Chimney Hood', 'Stainless Steel', 'Kitchen Hoods',
   'Auto-clean chimney hood, 1200 m³/h suction, LED lighting, touch panel.',
   32000, 27000, 21500, 2, 26, '🌀',
   '[{"name":"60 cm","retail_price":32000,"wholesale_price":27000,"stock":16},{"name":"90 cm","retail_price":39000,"wholesale_price":33000,"stock":10}]'::jsonb),
  ('Slimline Curved Hood', 'Glass & Steel', 'Kitchen Hoods',
   'Curved tempered-glass hood with whisper-quiet motor and washable filters.',
   28000, 23000, 18500, 2, 22, '🌀',
   '[{"name":"60 cm","retail_price":28000,"wholesale_price":23000,"stock":12},{"name":"90 cm","retail_price":34000,"wholesale_price":28500,"stock":10}]'::jsonb)
) as seed(name, brand, category, description, retail_price, wholesale_price, cost_price, moq, stock, emoji, variants)
where not exists (select 1 from public.products);

-- ============================================================
--  MAKE YOURSELF ADMIN
--  1) Sign up on the live site with your email + password.
--  2) Then run (replace the email):
--     update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================

-- Force PostgREST to refresh its schema/function cache so new RPCs are callable immediately.
notify pgrst, 'reload schema';
