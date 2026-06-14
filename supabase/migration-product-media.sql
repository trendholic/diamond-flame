-- ============================================================
-- Diamond Flame — fix "Could not find the 'image_url' column of
-- 'products' in the schema cache" when saving a product.
--
-- Your live database is on an older schema that is missing the
-- product media/variant columns the app now writes. This adds them
-- and refreshes the catalogue() reader so the storefront can show
-- product photos and variants.
--
-- HOW TO RUN (one time):
--   Supabase Dashboard → your project → SQL Editor → New query →
--   paste this whole file → Run. Safe to run more than once.
-- ============================================================

-- 1) Add every column the product editor saves (no-ops if already present).
alter table public.products add column if not exists brand           text;
alter table public.products add column if not exists description     text;
alter table public.products add column if not exists image_url       text;
alter table public.products add column if not exists images          jsonb   not null default '[]'::jsonb;
alter table public.products add column if not exists variants        jsonb   not null default '[]'::jsonb;
alter table public.products add column if not exists emoji           text    default '🍳';
alter table public.products add column if not exists active          boolean not null default true;

-- 2) Refresh the catalogue() reader so it returns image_url, images & variants
--    (the storefront reads product photos from here).
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

grant execute on function public.catalogue() to anon, authenticated;

-- 3) Make PostgREST pick up the new columns immediately (clears the schema cache).
notify pgrst, 'reload schema';
