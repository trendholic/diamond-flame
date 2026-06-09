-- ============================================================
--  Diamond Flame — multiple images per product (gallery)
--  Run once in the SQL Editor. Safe to re-run.
-- ============================================================

-- 1) Gallery column (array of public image URLs; first is the cover)
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;

-- Backfill: seed the gallery from the existing single cover image where empty.
update public.products
set    images = jsonb_build_array(image_url)
where  (images is null or images = '[]'::jsonb) and coalesce(image_url,'') <> '';

-- 2) catalogue() now also returns the gallery. Return type changed -> drop first.
drop function if exists public.catalogue();
create function public.catalogue()
returns table (
  id uuid, name text, brand text, category text, description text,
  emoji text, image_url text, images jsonb, moq integer, stock integer,
  retail_price numeric, wholesale_price numeric, cost_price numeric,
  variants jsonb
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.brand, p.category, p.description, p.emoji, p.image_url,
         coalesce(p.images, '[]'::jsonb), p.moq, p.stock,
         p.retail_price,
         case when public.viewer_role() in ('dealer','admin') then
           coalesce((select dp.price from public.dealer_prices dp
                     where dp.dealer_id = auth.uid() and dp.product_id = p.id),
                    p.wholesale_price) end,
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

notify pgrst, 'reload schema';
