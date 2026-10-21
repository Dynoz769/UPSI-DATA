# 📁 UPSI-DATA

Storan fail peribadi, macam Google Drive versi ringkas. Upload fail kerja atau fail peribadi, susun dalam folder, buka dan muat turun dari mana-mana.

- **Upload senang**: tekan **⬆ Upload Fail**, atau seret fail ke mana-mana bahagian skrin. Banyak fail sekali gus.
- **Folder**: buat folder sendiri (cth. Kerja, Peribadi). Tukar nama atau padam folder.
- **Urus fail**: buka, muat turun, tukar nama, pindah ke folder lain, padam.
- **Pratonton gambar**, carian nama fail, dan susun ikut terbaru, nama atau saiz.
- Bahasa Melayu, sesuai untuk telefon dan desktop, ada mod gelap.

Ada dua versi:

| | **Google Drive (Apps Script)** ← utama | Supabase (versi lama) |
|---|---|---|
| Folder | `apps-script/` | `public/`, `supabase/` |
| Ruang | Ikut kuota Google Drive akaun kau | 1 GB percuma |
| Saiz fail | Tiada had praktikal (dihantar dalam cebisan 8MB) | 50 MB |
| Alamat | `script.google.com/macros/s/.../exec` | `dynoz769.github.io/UPSI-DATA` |

---

# Versi Google Drive (Apps Script)

Fail disimpan dalam folder **`UPSI-DATA`** di My Drive akaun Google kau. Setiap subfolder di dalamnya ialah satu folder dalam website. Kau juga boleh buka folder tu terus dalam Google Drive.

Website ni berjalan sebagai **akaun kau sendiri** dan ditetapkan **"Only myself"**, jadi hanya kau yang boleh buka.

## Cara setup (±5 minit)

1. Buka <https://script.google.com> dan log masuk dengan akaun Google yang nak digunakan (cth. akaun MOE).
2. Tekan **New project**. Tukar nama projek (atas kiri) kepada `UPSI-DATA`.
3. Dalam fail **`Code.gs`**: padam semua isi, kemudian salin dan tampal isi [`apps-script/Code.gs`](apps-script/Code.gs).
4. Tekan **+** di sebelah *Files* → **HTML** → namakan **`Index`** (tanpa `.html`). Padam isi, kemudian salin dan tampal isi [`apps-script/Index.html`](apps-script/Index.html).
5. Tekan 💾 **Save**.
6. Tekan **Deploy → New deployment** → ikon ⚙️ → **Web app**, dan tetapkan:
   - **Execute as**: *Me*
   - **Who has access**: *Only myself*
7. Tekan **Deploy** → **Authorize access** → pilih akaun kau.
   Kalau keluar *"Google hasn't verified this app"*: tekan **Advanced → Go to UPSI-DATA (unsafe)** → **Allow**. Ini normal sebab app ni kau buat sendiri.
8. Salin **Web app URL** (`https://script.google.com/macros/s/.../exec`) dan **bookmark**. Itulah website kau.

### Bila kod dikemas kini
Tampal kod baru → **Save** → **Deploy → Manage deployments** → ✏️ → **Version: New version** → **Deploy**. URL kekal sama.

## Masalah biasa
- **"Maaf, tidak dapat membuka fail pada masa ini"**: browser kau login lebih dari satu akaun Google. Buka URL dalam tetingkap Incognito dan login akaun tu sahaja, atau guna profil Chrome berasingan.
- **Akses disekat / "app is blocked"**: admin akaun sekolah/organisasi mungkin sekat Apps Script. Cuba guna akaun Gmail peribadi.
- **Upload lambat untuk fail besar**: fail dihantar dalam cebisan 8MB melalui Google. Fail ratusan MB boleh ambil beberapa minit.

## ⚠️ Nota akaun MOE / DELIMa
- Akaun ni milik KPM. Admin boleh akses fail, dan akaun mungkin **dipadam bila kau tamat sekolah**. Simpan salinan fail penting di tempat lain juga.
- Kuota ruang ditetapkan oleh admin. Semak di <https://drive.google.com/settings/storage>.
- Fail yang dipadam masuk **Sampah Google Drive** dan boleh dipulihkan dalam 30 hari.

---

# Versi Supabase (lama)

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
