# 📁 UPSI-DATA

Storan fail peribadi, macam Google Drive versi ringkas. Upload fail kerja atau fail peribadi, susun dalam folder, buka dan muat turun dari mana-mana.

- **Private**: kena log masuk. Fail hanya boleh diakses oleh akaun kau (bucket Supabase private + polisi keselamatan).
- **Upload senang**: tekan **⬆ Upload Fail**, atau seret fail ke mana-mana bahagian skrin. Banyak fail sekali gus, maks 50MB setiap satu.
- **Folder**: buat folder sendiri (cth. Kerja, Peribadi). Tukar nama atau padam folder.
- **Urus fail**: buka, muat turun, tukar nama, pindah ke folder lain, padam.
- **Pratonton gambar**, carian nama fail, dan susun ikut terbaru, nama atau saiz.
- **Meter ruang**: tunjuk berapa banyak daripada 1GB percuma dah digunakan.
- Bahasa Melayu, sesuai untuk telefon dan desktop, ada mod gelap.

## Struktur

```
public/            ← website (ini yang dihoskan)
  index.html
  css/style.css
  js/config.js     ← URL & key Supabase
  js/app.js
supabase/setup.sql ← skrip setup database + storage
.github/workflows/jekyll-gh-pages.yml ← deploy folder public/ ke GitHub Pages
```

Fail disimpan dalam Supabase Storage di `<id pengguna>/<folder>/<nama fail>`. Tiada database diperlukan untuk fail.

## Cara setup (±15 minit, semua percuma)

### 1. Buat projek Supabase
1. Daftar di <https://supabase.com> dan tekan **New project**. Pilih region **Southeast Asia (Singapore)**.
2. Lepas projek siap, pergi ke **SQL Editor → New query**, salin semua isi `supabase/setup.sql`, dan tekan **Run**.
   Skrip ni buat bucket private `fail-tugasan` dan semua polisi keselamatan.

### 2. Buat akaun kau sendiri (dan tutup pendaftaran awam)
1. **Authentication → Users → Add user → Create new user**. Masukkan emel + kata laluan, tandakan **Auto Confirm User**.
2. **Authentication → Sign In / Providers → Email**: matikan **Allow new users to sign up**.
   Lepas ni, cuma akaun kau saja boleh log masuk.

### 3. Sambungkan website ke Supabase
1. **Project Settings → API**: salin **Project URL** dan **anon public key**.
2. Masukkan dalam `public/js/config.js`.
   > Anon key memang direka untuk didedahkan dalam frontend. Fail kau dilindungi oleh login + polisi keselamatan, bukan oleh key ni.
   > **Jangan sekali-kali** letak `service_role` key di sini.

### 4. Letak online
**Pilihan A: GitHub Pages** (repo kena *public* untuk akaun GitHub percuma)
1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Setiap push ke branch `claude/determined-davinci-4kv5sx` akan deploy automatik (tukar di `.github/workflows/jekyll-gh-pages.yml` kalau nak guna branch lain). Alamat: `https://dynoz769.github.io/UPSI-DATA/`.

**Pilihan B: Cloudflare Pages / Netlify** (percuma, boleh guna repo *private*)
1. Sambungkan repo ni, tetapkan **Build command**: kosong, **Output directory**: `public`.
2. Deploy. Dapat alamat macam `upsi-data.pages.dev`.

> Kod website boleh nampak public, tapi tu tak apa: tanpa log masuk, tiada sesiapa boleh buka fail kau.

### 5. Tambah alamat website ke Supabase
**Authentication → URL Configuration → Site URL**: masukkan alamat website kau (dari langkah 4).

## Cuba di komputer sendiri
```bash
cd public
python3 -m http.server 8000
# buka http://localhost:8000
```

## Had pelan percuma Supabase
- Storage 1 GB, fail maks 50 MB setiap satu.
- Projek akan *pause* kalau tak digunakan 7 hari. Log masuk ke dashboard Supabase dan tekan **Restore** untuk hidupkan semula (fail tak hilang).
