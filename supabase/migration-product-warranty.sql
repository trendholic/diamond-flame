-- ============================================================
-- Diamond Flame — optional per-product warranty.
-- Adds a free-text `warranty` column to products and returns it from
-- catalogue() so the storefront can show a warranty ONLY when the admin
-- sets one for that product.
--
-- HOW TO RUN (one time):
--   Supabase Dashboard → SQL Editor → New query → paste this → Run.
--   Safe to run more than once.
-- ============================================================

alter table public.products add column if not exists warranty text;

drop function if exists public.catalogue();
create function public.catalogue()
returns table (
  id uuid, name text, brand text, category text, description text,
  emoji text, image_url text, images jsonb, moq integer, stock integer,
  retail_price numeric, wholesale_price numeric, cost_price numeric,
  variants jsonb, warranty text
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
         end,
         p.warranty
  from   public.products p
  where  p.active = true
  order  by p.category, p.name;
$$;

grant execute on function public.catalogue() to anon, authenticated;

notify pgrst, 'reload schema';
