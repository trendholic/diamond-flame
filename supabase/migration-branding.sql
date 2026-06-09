-- ============================================================
--  Diamond Flame — store branding & images (logo, hero, banners, collections)
--  Run once in the SQL Editor. Safe to re-run.
-- ============================================================

-- 1) Key/value settings store (public read, admin write)
create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
drop policy if exists settings_public_read on public.settings;
drop policy if exists settings_admin_write on public.settings;
create policy settings_public_read on public.settings
  for select using (true);
create policy settings_admin_write on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Public bucket for site images (logo, hero, banners, collection art)
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists site_assets_read  on storage.objects;
drop policy if exists site_assets_write on storage.objects;
create policy site_assets_read on storage.objects
  for select using (bucket_id = 'site-assets');
create policy site_assets_write on storage.objects
  for insert to authenticated with check (bucket_id = 'site-assets');

notify pgrst, 'reload schema';
