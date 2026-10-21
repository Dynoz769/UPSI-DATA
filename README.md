# 📁 UPSI-DATA

Storan fail peribadi, macam Google Drive versi ringkas. Upload fail kerja atau fail peribadi, susun dalam folder, buka dan muat turun dari mana-mana.

- **Profil macam Netflix** (versi Google Drive): tiada login. Pilih profil dulu, tambah, edit atau padam profil, letak **gambar profil** sendiri, dan kunci profil dengan PIN 4 digit kalau nak.
- **Upload senang**: tekan **⬆ Upload Fail** atau **📁 Upload Folder**, atau seret fail/folder ke mana-mana bahagian skrin.
- **Pratonton folder**: halaman utama tunjuk setiap folder sebagai kad dengan pratonton sehingga 4 gambar di dalamnya.
- **Folder**: buat folder sendiri (cth. Kerja, Peribadi). Tukar nama atau padam folder.
- **Urus fail**: buka, muat turun, tukar nama, pindah ke folder lain, padam.
- **Pratonton gambar**, carian nama fail, dan susun ikut terbaru, nama atau saiz.
- Bahasa Melayu, sesuai untuk telefon dan desktop.
- **Reka bentuk profesional & ringan** (versi Google Drive): ikon SVG, lencana jenis fail (PDF, DOC, XLS…), paparan **Grid / Senarai**, menu ⋯ untuk setiap fail dan folder, butang **+ Baru**, laluan navigasi, mod cerah/gelap ikut peranti.
- **Animasi halus**: peralihan skrin, kad masuk berperingkat, menu & dialog buka/tutup beranimasi, status upload setiap fail, rangka semasa memuat. Hanya guna `transform`/`opacity` supaya ringan.
- **Latar belakang sendiri**: setiap profil boleh upload gambar latar (sehingga 4K / 3840px) melalui menu profil → *Latar belakang*.

Ada dua versi:

| | **Google Drive (Apps Script)** ← utama | Supabase (versi lama) |
|---|---|---|
| Folder | `apps-script/` | `public/lama/`, `supabase/` |
| Ruang | Ikut kuota Google Drive akaun kau | 1 GB percuma |
| Saiz fail | Tiada had praktikal (dihantar dalam cebisan 8MB) | 50 MB |
| Alamat | [Web app](https://script.google.com/macros/s/AKfycbwyjEeiiLCLWmnDWMh_CVKp81ZiwsTlP8GgzsFzNrTnFCP6WkCdL9aIVKnlOl-ShXzW1g/exec) (juga `dynoz769.github.io/UPSI-DATA`, yang terus bawa ke sini) | `dynoz769.github.io/UPSI-DATA/lama/` |

---

# Versi Google Drive (Apps Script)

Fail disimpan dalam Google Drive akaun yang deploy script ni:

```
UPSI-DATA/
  Adam/            ← satu folder untuk setiap profil
    Kerja/         ← folder dalam profil
      laporan.pdf
  Sara/
    ...
  _gambar-profil/  ← gambar profil (256px) dan latar belakang profil (sehingga 3840px)
```

### Kod sumber
`Index.html` **dijana** daripada `apps-script/src/` (`body.html`, `gaya.css`, `app.js`). Untuk ubah rupa atau fungsi, edit fail dalam `src/`, kemudian jalankan:

```bash
python3 apps-script/bina.py
```

Tampal `Index.html` yang baru ke Apps Script seperti biasa.

### Keserasian peranti
- Telefon kecil (320px) hingga skrin 4K; menu jadi helaian bawah di telefon; sasaran sentuh ≥ 40px; input 16px (elak zum iOS); kawasan notch iPhone (`safe-area-inset`).
- Mod cerah/gelap ikut tetapan peranti.
- Pelayar tanpa `<dialog>` atau `backdrop-filter` tetap berfungsi (ada fallback).
- Pengguna yang set *Kurangkan gerakan* (prefers-reduced-motion) dapat paparan tanpa animasi.

Bila website dibuka, skrin **"Siapa yang guna?"** keluar dan kau pilih profil. Setiap profil hanya nampak fail sendiri. Tekan **Tambah profil** untuk buat profil baru (nama, foto pilihan, warna, PIN pilihan). Tekan **Urus Profil** dan pilih profil untuk tukar nama/gambar atau padam profil (perlu PIN kalau profil berkunci).

**Upload Folder**: folder yang dipilih atau diseret jadi folder dengan nama sama dalam profil. Subfolder diratakan, cth. `hari2/hutan.png` jadi `hari2 - hutan.png`.

### 👤 Siapa buat / upload
Setiap profil, folder dan fail direkod **siapa yang buat atau upload**. Rekod ni dipaparkan dalam website (👤 pada kad, "Dibuat oleh" dalam Edit Profil) dan juga disimpan dalam *description* fail/folder di Google Drive.

Disebabkan web app berjalan sebagai "Execute as: Me", Google **hanya dedahkan email** untuk:
- pemilik script, dan
- akaun dari **domain yang sama** dengan pemilik (cth. semua `@moe-dl.edu.my` kalau di-deploy dengan akaun MOE).

Untuk akaun lain (cth. Gmail biasa), email disorok oleh Google. Website rekod **"Tanpa nama #kod"**: kod yang sama untuk orang yang sama, jadi masih boleh dibezakan siapa upload apa. Fail lama sebelum ciri ni tiada rekod.

### 🔒 Keselamatan
- Website ni **tiada login**. Sesiapa yang ada link website boleh buka skrin profil.
- Profil **tanpa PIN** boleh dibuka sesiapa yang ada link. Untuk fail peribadi, **letak PIN**.
- PIN disemak di server Google, bukan di browser, dan disimpan sebagai hash. Selepas 5 kali PIN salah, profil dikunci 5 minit.
- Jangan kongsi link website dengan orang yang kau tak percaya.

## Cara setup (±5 minit)

1. Buka <https://script.google.com> dan log masuk dengan akaun Google yang nak digunakan (cth. akaun MOE).
2. Tekan **New project**. Tukar nama projek (atas kiri) kepada `UPSI-DATA`.
3. Dalam fail **`Code.gs`**: padam semua isi, kemudian salin dan tampal isi [`apps-script/Code.gs`](apps-script/Code.gs).
4. Tekan **+** di sebelah *Files* → **HTML** → namakan **`Index`** (tanpa `.html`). Padam isi, kemudian salin dan tampal isi [`apps-script/Index.html`](apps-script/Index.html).
5. Tekan 💾 **Save**.
6. Tekan **Deploy → New deployment** → ikon ⚙️ → **Web app**, dan tetapkan:
   - **Execute as**: *Me*
   - **Who has access**: *Anyone* (supaya tiada login; profil dan PIN yang mengawal akses)
7. Tekan **Deploy** → **Authorize access** → pilih akaun kau.
   Kalau keluar *"Google hasn't verified this app"*: tekan **Advanced → Go to UPSI-DATA (unsafe)** → **Allow**. Ini normal sebab app ni kau buat sendiri.
8. Salin **Web app URL** (`https://script.google.com/macros/s/.../exec`) dan **bookmark**. Itulah website kau.
9. Buka URL tu dan tekan **Tambah Profil** untuk buat profil pertama.

### Bila kod dikemas kini
Tampal kod baru → **Save** → **Deploy → Manage deployments** → ✏️ → **Version: New version** → **Deploy**. URL kekal sama.

## Masalah biasa
- **"Maaf, tidak dapat membuka fail pada masa ini"**: buka URL dalam tetingkap Incognito.
- **Pilihan "Anyone" tiada**, cuma ada *Anyone within MOE*: admin sekat akses awam. Pilih pilihan tu. Orang perlu login akaun MOE untuk buka, tapi profil tetap berfungsi.
- **"Sesi tamat"**: sesi profil tamat selepas 6 jam. Pilih profil semula.
- **Akses disekat / "app is blocked"**: admin akaun sekolah/organisasi mungkin sekat Apps Script. Cuba guna akaun Gmail peribadi.
- **Upload/muat turun lambat untuk fail besar**: fail dihantar dalam cebisan melalui Google. Fail ratusan MB boleh ambil beberapa minit.

## ⚠️ Nota akaun MOE / DELIMa
- Akaun ni milik KPM. Admin boleh akses fail, dan akaun mungkin **dipadam bila kau tamat sekolah**. Simpan salinan fail penting di tempat lain juga.
- Kuota ruang ditetapkan oleh admin. Semak di <https://drive.google.com/settings/storage>.
- Fail yang dipadam masuk **Sampah Google Drive** dan boleh dipulihkan dalam 30 hari.

---

# Versi Supabase (lama)

## Struktur

```
public/
  index.html       ← halaman yang terus bawa ke web app Apps Script
  lama/            ← website versi Supabase
    index.html
    css/style.css
    js/config.js   ← URL & key Supabase
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
2. Masukkan dalam `public/lama/js/config.js`.
   > Anon key memang direka untuk didedahkan dalam frontend. Fail kau dilindungi oleh login + polisi keselamatan, bukan oleh key ni.
   > **Jangan sekali-kali** letak `service_role` key di sini.

### 4. Letak online
**Pilihan A: GitHub Pages** (repo kena *public* untuk akaun GitHub percuma)
1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Setiap push ke branch `claude/determined-davinci-4kv5sx` akan deploy automatik (tukar di `.github/workflows/jekyll-gh-pages.yml` kalau nak guna branch lain). Alamat: `https://dynoz769.github.io/UPSI-DATA/`.

**Pilihan B: Cloudflare Pages / Netlify** (percuma, boleh guna repo *private*)
1. Sambungkan repo ni, tetapkan **Build command**: kosong, **Output directory**: `public/lama`.
2. Deploy. Dapat alamat macam `upsi-data.pages.dev`.

> Kod website boleh nampak public, tapi tu tak apa: tanpa log masuk, tiada sesiapa boleh buka fail kau.

### 5. Tambah alamat website ke Supabase
**Authentication → URL Configuration → Site URL**: masukkan alamat website kau (dari langkah 4).

## Cuba di komputer sendiri
```bash
cd public/lama
python3 -m http.server 8000
# buka http://localhost:8000
```

## Had pelan percuma Supabase
- Storage 1 GB, fail maks 50 MB setiap satu.
- Projek akan *pause* kalau tak digunakan 7 hari. Log masuk ke dashboard Supabase dan tekan **Restore** untuk hidupkan semula (fail tak hilang).
