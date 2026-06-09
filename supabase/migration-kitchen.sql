-- ============================================================
--  Diamond Flame — Kitchen catalogue + product images + variants
--  Run once in the SQL Editor. Safe to re-run.
--  NOTE: this REPLACES the sample catalogue with kitchen products.
-- ============================================================

-- 1) New columns
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists variants  jsonb not null default '[]'::jsonb;

-- 2) Public bucket for product images (admins upload while signed in)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_read  on storage.objects;
drop policy if exists product_images_write on storage.objects;
create policy product_images_read on storage.objects
  for select using (bucket_id = 'product-images');
create policy product_images_write on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

-- 3) catalogue() — now returns image_url + variants. Variant wholesale prices
--    are stripped for non-dealers (retail + stock only). Return type changed,
--    so drop first.
drop function if exists public.catalogue();
create function public.catalogue()
returns table (
  id uuid, name text, brand text, category text, description text,
  emoji text, image_url text, moq integer, stock integer,
  retail_price numeric, wholesale_price numeric, cost_price numeric,
  variants jsonb
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.brand, p.category, p.description, p.emoji, p.image_url, p.moq, p.stock,
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

-- 4) Replace the catalogue with kitchen products (brand column = material/type).
delete from public.products;
insert into public.products
  (name, brand, category, description, retail_price, wholesale_price, cost_price, moq, stock, emoji, variants)
values
  ('Apex Kitchen Sink', 'Stainless Steel', 'Kitchen Sinks',
   'Satin-finish 304 stainless steel sink with sound-dampening pads and basket waste.',
   16000, 13500, 10800, 2, 65, '🪣',
   '[{"name":"Single bowl","retail_price":16000,"wholesale_price":13500,"stock":40},
     {"name":"Double bowl","retail_price":26000,"wholesale_price":22000,"stock":25}]'::jsonb),

  ('Flushline Undermount Sink', 'Stainless Steel', 'Kitchen Sinks',
   'Sleek undermount sink, brushed finish, with overflow and waste kit.',
   21000, 17500, 14000, 2, 38, '🪣',
   '[{"name":"Single bowl","retail_price":21000,"wholesale_price":17500,"stock":22},
     {"name":"1.5 bowl","retail_price":28000,"wholesale_price":23500,"stock":16}]'::jsonb),

  ('Ember 3-Burner Gas Hob', 'Tempered Glass', 'Gas Hobs',
   'Built-in glass gas hob, auto-ignition, cast-iron pan supports.',
   24000, 20000, 16000, 3, 50, '🔥',
   '[{"name":"60 cm","retail_price":24000,"wholesale_price":20000,"stock":30},
     {"name":"75 cm","retail_price":29000,"wholesale_price":24000,"stock":20}]'::jsonb),

  ('Titan 5-Burner Gas Hob', 'Stainless Steel', 'Gas Hobs',
   'Heavy-duty 5-burner stainless hob with FFD safety and brass burners.',
   38000, 32000, 26000, 2, 28, '🔥',
   '[{"name":"86 cm","retail_price":38000,"wholesale_price":32000,"stock":18},
     {"name":"90 cm","retail_price":42000,"wholesale_price":35500,"stock":10}]'::jsonb),

  ('Aura Built-in Electric Hob', 'Ceramic Glass', 'Electric Hobs',
   'Frameless ceramic hob with touch controls, residual-heat indicators.',
   34000, 28500, 23000, 2, 24, '⚡',
   '[{"name":"2 zone","retail_price":34000,"wholesale_price":28500,"stock":14},
     {"name":"4 zone","retail_price":52000,"wholesale_price":44000,"stock":10}]'::jsonb),

  ('Volt Domino Electric Hob', 'Ceramic Glass', 'Electric Hobs',
   'Slim 2-zone domino hob, ideal for compact kitchens and islands.',
   22000, 18000, 14500, 3, 30, '⚡', '[]'::jsonb),

  ('Cyclone Chimney Hood', 'Stainless Steel', 'Kitchen Hoods',
   'Auto-clean chimney hood, 1200 m³/h suction, LED lighting, touch panel.',
   32000, 27000, 21500, 2, 26, '🌀',
   '[{"name":"60 cm","retail_price":32000,"wholesale_price":27000,"stock":16},
     {"name":"90 cm","retail_price":39000,"wholesale_price":33000,"stock":10}]'::jsonb),

  ('Slimline Curved Hood', 'Glass & Steel', 'Kitchen Hoods',
   'Curved tempered-glass hood with whisper-quiet motor and washable filters.',
   28000, 23000, 18500, 2, 22, '🌀',
   '[{"name":"60 cm","retail_price":28000,"wholesale_price":23000,"stock":12},
     {"name":"90 cm","retail_price":34000,"wholesale_price":28500,"stock":10}]'::jsonb);

notify pgrst, 'reload schema';
