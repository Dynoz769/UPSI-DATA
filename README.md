# 📚 UPSI-DATA

Website peribadi untuk simpan dan urus semua assignment UPSI: tajuk, kursus, semester, tarikh hantar, status, markah dan fail (PDF, Word, slide, gambar, zip).

- **Private**: kena log masuk. Data dan fail hanya boleh diakses oleh akaun kau (Supabase Row Level Security + bucket private).
- **Upload terus dari website**: seret dan lepas fail, banyak fail sekali gus (maks 50MB setiap satu).
- **Carian & tapisan**: ikut semester, status, kod kursus, tag, nama fail.
- **Peringatan tarikh**: tugasan yang lewat atau tinggal ≤ 3 hari ditanda.
- Bahasa Melayu, sesuai untuk telefon dan desktop, ada mod gelap.

## Struktur

```
public/            ← website (ini yang dihoskan)
  index.html
  css/style.css
  js/config.js     ← isi URL & key Supabase di sini
  js/app.js
supabase/setup.sql ← skrip database + storage
.github/workflows/pages.yml ← deploy automatik ke GitHub Pages
```

## Cara setup (±15 minit, semua percuma)

### 1. Buat projek Supabase
1. Daftar di <https://supabase.com> dan tekan **New project**. Pilih region **Southeast Asia (Singapore)**.
2. Lepas projek siap, pergi ke **SQL Editor → New query**, salin semua isi `supabase/setup.sql`, dan tekan **Run**.
   Skrip ni buat jadual `tugasan`, bucket private `fail-tugasan` dan semua polisi keselamatan.

### 2. Buat akaun kau sendiri (dan tutup pendaftaran awam)
1. **Authentication → Users → Add user → Create new user**. Masukkan emel + kata laluan, tandakan **Auto Confirm User**.
2. **Authentication → Sign In / Providers → Email**: matikan **Allow new users to sign up**.
   Lepas ni, cuma akaun kau saja boleh log masuk.

### 3. Sambungkan website ke Supabase
1. **Project Settings → API**: salin **Project URL** dan **anon public key**.
2. Buka `public/js/config.js` dan gantikan `ISI_SUPABASE_URL` dan `ISI_SUPABASE_ANON_KEY`.
   > Anon key memang direka untuk didedahkan dalam frontend. Data kau dilindungi oleh login + RLS, bukan oleh key ni.
   > **Jangan sekali-kali** letak `service_role` key di sini.
3. Commit dan push ke branch `main`.

### 4. Letak online
**Pilihan A: GitHub Pages** (repo kena *public* untuk akaun GitHub percuma)
1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Setiap push ke `main` akan deploy automatik. Alamat: `https://dynoz769.github.io/UPSI-DATA/`.

**Pilihan B: Cloudflare Pages / Netlify** (percuma, boleh guna repo *private*)
1. Sambungkan repo ni, tetapkan **Build command**: kosong, **Output directory**: `public`.
2. Deploy. Dapat alamat macam `upsi-data.pages.dev`.

> Kod website boleh nampak public, tapi tu tak apa: tanpa log masuk, tiada sesiapa boleh baca tugasan atau fail kau.

### 5. Tambah alamat website ke Supabase
**Authentication → URL Configuration → Site URL**: masukkan alamat website kau (dari langkah 4).

## Cuba di komputer sendiri
```bash
cd public
python3 -m http.server 8000
# buka http://localhost:8000
```

## Had pelan percuma Supabase
- Storage 1 GB, database 500 MB, fail maks 50 MB setiap satu.
- Projek akan *pause* kalau tak digunakan 7 hari. Log masuk ke dashboard Supabase dan tekan **Restore** untuk hidupkan semula (data tak hilang).
