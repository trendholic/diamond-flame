-- ============================================================
--  Diamond Flame — Dealer approval queue + per-dealer pricing
--  CONSOLIDATED & self-contained. Run once in the SQL Editor.
--  Safe to re-run. Includes the three-tier pricing pieces too, so
--  this single file brings any earlier setup fully up to date.
-- ============================================================

-- ---- columns ------------------------------------------------
alter table public.products  add column if not exists cost_price    numeric not null default 0;  -- landing/cost, admin only
alter table public.profiles  add column if not exists dealer_status text not null default 'none'; -- none|pending|approved|rejected

-- seed a landing cost (~88% of wholesale) where unset, so margins show
update public.products
set    cost_price = round(wholesale_price * 0.88)
where  cost_price = 0 and wholesale_price > 0;

-- ---- per-dealer custom prices -------------------------------
create table if not exists public.dealer_prices (
  dealer_id  uuid not null references auth.users(id)      on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price      numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (dealer_id, product_id)
);

alter table public.dealer_prices enable row level security;
drop policy if exists dealer_prices_own   on public.dealer_prices;
drop policy if exists dealer_prices_admin on public.dealer_prices;
create policy dealer_prices_own on public.dealer_prices
  for select using (auth.uid() = dealer_id);
create policy dealer_prices_admin on public.dealer_prices
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- role helper -------------------------------------------
create or replace function public.viewer_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

-- ---- signup trigger records a dealer application -----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, business, phone, dealer_status)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when coalesce(new.raw_user_meta_data->>'dealer_apply','') = 'true'
         then 'pending' else 'none' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---- catalogue API: tier- and dealer-aware pricing ---------
create or replace function public.catalogue()
returns table (
  id uuid, name text, brand text, category text, description text,
  emoji text, moq integer, stock integer,
  retail_price numeric, wholesale_price numeric, cost_price numeric
)
language sql stable security definer set search_path = public as $$
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

-- ---- lock raw products table (only admins read directly) ---
drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_read  on public.products;
create policy products_admin_read on public.products
  for select using (public.is_admin());
