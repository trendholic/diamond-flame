-- ============================================================
--  Diamond Flame — Three-tier pricing upgrade
--  Run once in the Supabase SQL Editor. Safe to re-run.
--
--  Tiers:
--    retail_price    → shown to EVERYONE (public)
--    wholesale_price → shown only to DEALERS (role 'dealer') and admins
--    cost_price      → the landing/cost price, ADMIN ONLY (never leaves the DB
--                      for anyone else — enforced below, not just hidden in UI)
-- ============================================================

-- 1) Landing / cost price column
alter table public.products add column if not exists cost_price numeric not null default 0;

-- Seed a sensible landing cost for existing rows (~88% of wholesale) where unset,
-- so profit margins show up immediately in the dashboard.
update public.products
set    cost_price = round(wholesale_price * 0.88)
where  cost_price = 0 and wholesale_price > 0;

-- 2) Who is asking? Returns the caller's role, or 'anon' when signed out.
create or replace function public.viewer_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

-- 3) Public catalogue API — returns ONLY the prices the caller may see.
--    Non-dealers get NULL wholesale; non-admins get NULL cost.
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
         case when public.viewer_role() in ('dealer','admin') then p.wholesale_price end,
         case when public.viewer_role() = 'admin' then p.cost_price end
  from   public.products p
  where  p.active = true
  order  by p.category, p.name;
$$;

grant execute on function public.viewer_role() to anon, authenticated;
grant execute on function public.catalogue()   to anon, authenticated;

-- 4) Lock the raw table: only admins may read it directly (protects wholesale &
--    cost). Everyone else must go through catalogue(), which filters columns.
drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_read  on public.products;
create policy products_admin_read on public.products
  for select using (public.is_admin());
-- products_admin_write (for all, admin) stays in place for inserts/updates/deletes.

-- ============================================================
--  Approve a dealer (lets them see wholesale prices):
--    update public.profiles set role = 'dealer' where email = 'dealer@example.com';
--  You can also do this from the dashboard → Customers → role dropdown.
-- ============================================================
