-- UPSI-DATA: setup database & storage Supabase
-- Jalankan sekali dalam Supabase Dashboard > SQL Editor > New query > Run

-- 1. Jadual tugasan
create table if not exists public.tugasan (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tajuk         text not null,
  kod_kursus    text,
  nama_kursus   text,
  semester      text,
  pensyarah     text,
  jenis         text,
  tarikh_hantar date,
  status        text not null default 'Belum Mula'
                check (status in ('Belum Mula', 'Dalam Proses', 'Siap', 'Dihantar')),
  markah        text,
  nota          text,
  tag           text[] not null default '{}',
  fail          jsonb  not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tugasan_user_idx on public.tugasan (user_id);

-- Kemas kini updated_at secara automatik
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tugasan_updated_at on public.tugasan;
create trigger tugasan_updated_at
  before update on public.tugasan
  for each row execute function public.set_updated_at();

-- 2. Row Level Security: setiap pengguna hanya nampak data sendiri
alter table public.tugasan enable row level security;

drop policy if exists "Baca tugasan sendiri" on public.tugasan;
create policy "Baca tugasan sendiri" on public.tugasan
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Tambah tugasan sendiri" on public.tugasan;
create policy "Tambah tugasan sendiri" on public.tugasan
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Kemas kini tugasan sendiri" on public.tugasan;
create policy "Kemas kini tugasan sendiri" on public.tugasan
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Padam tugasan sendiri" on public.tugasan;
create policy "Padam tugasan sendiri" on public.tugasan
  for delete to authenticated using (auth.uid() = user_id);

-- 3. Storage bucket PRIVATE untuk fail
insert into storage.buckets (id, name, public)
values ('fail-tugasan', 'fail-tugasan', false)
on conflict (id) do nothing;

-- Fail disimpan di <user_id>/<id_tugasan>/<nama_fail>; hanya pemilik folder boleh akses
drop policy if exists "Baca fail sendiri" on storage.objects;
create policy "Baca fail sendiri" on storage.objects
  for select to authenticated
  using (bucket_id = 'fail-tugasan' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Upload fail sendiri" on storage.objects;
create policy "Upload fail sendiri" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fail-tugasan' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Kemas kini fail sendiri" on storage.objects;
create policy "Kemas kini fail sendiri" on storage.objects
  for update to authenticated
  using (bucket_id = 'fail-tugasan' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Padam fail sendiri" on storage.objects;
create policy "Padam fail sendiri" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fail-tugasan' and (storage.foldername(name))[1] = auth.uid()::text);
