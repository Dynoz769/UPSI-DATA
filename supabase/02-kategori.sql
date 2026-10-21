-- UPSI-DATA: tambah kategori supaya boleh simpan barang selain assignment
-- Jalankan sekali dalam Supabase Dashboard > SQL Editor > New query > Run
-- (Selamat dijalankan lebih dari sekali. Data sedia ada kekal sebagai kategori 'Tugasan'.)

alter table public.tugasan
  add column if not exists kategori text not null default 'Tugasan';

-- Status hanya relevan untuk tugasan; item lain boleh tiada status
alter table public.tugasan
  alter column status drop not null;

create index if not exists tugasan_kategori_idx on public.tugasan (user_id, kategori);
