-- ============================================================
--  Diamond Flame — Dealer verification: WhatsApp + shop documents
--  Run once in the SQL Editor. Safe to re-run.
-- ============================================================

-- 1) Profile fields for dealer verification
alter table public.profiles add column if not exists whatsapp      text;
alter table public.profiles add column if not exists shop_card_url text;
alter table public.profiles add column if not exists shop_photos   jsonb not null default '[]'::jsonb;

-- 2) Public storage bucket for dealer documents
insert into storage.buckets (id, name, public)
values ('dealer-docs', 'dealer-docs', true)
on conflict (id) do nothing;

-- 3) Storage policies: public read; uploads allowed (onboarding happens before
--    a session may exist). Scoped to this bucket only.
drop policy if exists dealer_docs_read   on storage.objects;
drop policy if exists dealer_docs_insert on storage.objects;
create policy dealer_docs_read on storage.objects
  for select using (bucket_id = 'dealer-docs');
create policy dealer_docs_insert on storage.objects
  for insert with check (bucket_id = 'dealer-docs');

-- 4) Signup trigger captures WhatsApp + shop docs from signup metadata,
--    so they land on the profile even before email confirmation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id, email, full_name, business, phone, whatsapp,
    shop_card_url, shop_photos, dealer_status)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'whatsapp', ''),
    coalesce(new.raw_user_meta_data->>'shop_card_url', ''),
    coalesce(new.raw_user_meta_data->'shop_photos', '[]'::jsonb),
    case when coalesce(new.raw_user_meta_data->>'dealer_apply','') = 'true'
         then 'pending' else 'none' end)
  on conflict (id) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';
