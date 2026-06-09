-- ============================================================
--  Diamond Flame — payment methods (Cash on Delivery + Bank Transfer)
--  Run once in the SQL Editor. Safe to re-run.
-- ============================================================

-- 1) Order payment fields
alter table public.orders add column if not exists payment_method    text not null default 'cod';     -- cod | bank_transfer
alter table public.orders add column if not exists payment_status    text not null default 'unpaid';  -- unpaid | paid | refunded
alter table public.orders add column if not exists payment_ref       text;
alter table public.orders add column if not exists payment_proof_url text;

-- 2) Public bucket for bank-transfer receipts (uploads happen at checkout,
--    which may be anonymous — so insert is open, scoped to this bucket).
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

drop policy if exists payment_proofs_read   on storage.objects;
drop policy if exists payment_proofs_insert on storage.objects;
create policy payment_proofs_read on storage.objects
  for select using (bucket_id = 'payment-proofs');
create policy payment_proofs_insert on storage.objects
  for insert with check (bucket_id = 'payment-proofs');

notify pgrst, 'reload schema';
