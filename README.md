# 📁 UPSI-DATA

Storan fail peribadi, macam Google Drive versi ringkas. Upload fail kerja atau fail peribadi, susun dalam folder, buka dan muat turun dari mana-mana.

- **Profil macam Netflix**: tiada login. Pilih profil dulu, tambah, edit atau padam profil, letak **gambar profil** sendiri, dan kunci profil dengan PIN 4 digit kalau nak.
- **Upload senang**: tekan **+ Baru → Upload fail / Upload folder**, atau seret fail/folder ke mana-mana bahagian skrin.
- **Pratonton folder**: halaman utama tunjuk setiap folder sebagai kad dengan pratonton sehingga 4 gambar di dalamnya.
- **Folder**: buat folder sendiri (cth. Kerja, Peribadi). Tukar nama atau padam folder.
- **Urus fail**: buka, muat turun, tukar nama, pindah ke folder lain, padam.
- **Pemapar fail dalam website**: gambar, PDF (termasuk Google Docs/Sheets/Slides), video, audio dan fail teks dibuka dalam skrin penuh, bukan tab baru. Guna anak panah ← → atau leret untuk fail seterusnya.
- **Sampah**: butang **Sampah** tunjuk fail dan folder yang dipadam. Pulihkan, padam kekal, atau kosongkan semua. Fail yang folder asalnya masih dalam Sampah dipulihkan ke Utama.
- **Pilih banyak item**: tekan **Pilih** (atau tekan lama pada kad di telefon), kemudian muat turun, pindah atau padam semuanya sekali gus.
- **Muat turun ZIP**: muat turun satu folder (menu ⋯ → *Muat turun (ZIP)*) atau item yang dipilih sebagai satu fail ZIP.
- **Ingat profil**: refresh halaman tak perlu pilih profil atau masukkan PIN semula (selagi tab tak ditutup).
- **Ikon di skrin utama telefon**: menu profil → *Pasang di skrin utama* tunjuk langkah untuk iPhone dan Android.
- Carian nama fail, dan susun ikut terbaru, nama atau saiz.
- Bahasa Melayu, sesuai untuk telefon dan desktop.
- **Reka bentuk profesional & ringan**: ikon SVG, lencana jenis fail (PDF, DOC, XLS…), paparan **Grid / Senarai**, menu ⋯ untuk setiap fail dan folder, butang **+ Baru**, laluan navigasi, mod cerah/gelap ikut peranti.
- **Animasi halus**: peralihan skrin, kad masuk berperingkat, menu & dialog buka/tutup beranimasi, status upload setiap fail, rangka semasa memuat. Hanya guna `transform`/`opacity` supaya ringan.
- **Latar belakang sendiri**: setiap profil boleh upload gambar latar (sehingga 4K / 3840px) melalui menu profil → *Latar belakang*.

**Alamat website**: <https://dynoz769.github.io/UPSI-DATA/> (terus bawa ke [web app Apps Script](https://script.google.com/macros/s/AKfycbwyjEeiiLCLWmnDWMh_CVKp81ZiwsTlP8GgzsFzNrTnFCP6WkCdL9aIVKnlOl-ShXzW1g/exec)). Fail disimpan dalam Google Drive, jadi ruang ikut kuota Drive akaun kau dan tiada had saiz praktikal (fail dihantar dalam cebisan 8MB).

---

# Cara ia berfungsi

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

### Struktur repo
```
apps-script/
  Code.gs          ← kod server (tampal ke Apps Script)
  Index.html       ← antara muka (DIJANA, tampal ke Apps Script)
  src/             ← sumber Index.html: body.html, gaya.css, app.js
  bina.py          ← gabungkan src/ jadi Index.html
public/            ← dynoz769.github.io/UPSI-DATA (bawa ke web app, ikon skrin utama)
tests/             ← ujian automatik
.github/workflows/ ← ujian.yml (ujian setiap push) dan deploy GitHub Pages
```

### Kod sumber
`Index.html` **dijana** daripada `apps-script/src/`. Untuk ubah rupa atau fungsi, edit fail dalam `src/`, kemudian jalankan:

```bash
python3 apps-script/bina.py
```

Tampal `Index.html` yang baru ke Apps Script seperti biasa.

### Ujian automatik
Ujian menjalankan `Code.gs` sebenar dengan Google Drive palsu (`tests/gasmock.mjs`), dan `Index.html` sebenar dalam Chromium (Playwright): profil & PIN, akses antara profil, upload bercebisan, Sampah, pemapar, pilih banyak, ZIP, dan sesi selepas refresh.

```bash
npm install
npx playwright install chromium   # sekali sahaja
npm test
```

Ujian yang sama berjalan automatik di GitHub (tab **Actions → Ujian**) untuk setiap push dan pull request. Ia juga gagal kalau `Index.html` tidak dijana semula selepas `src/` diubah.

### Keserasian peranti
- Telefon kecil (320px) hingga skrin 4K; menu jadi helaian bawah di telefon; sasaran sentuh ≥ 40px; input 16px (elak zum iOS); kawasan notch iPhone (`safe-area-inset`).
- Mod cerah/gelap ikut tetapan peranti.
- Pelayar tanpa `<dialog>` atau `backdrop-filter` tetap berfungsi (ada fallback).
- Pengguna yang set *Kurangkan gerakan* (prefers-reduced-motion) dapat paparan tanpa animasi.

Bila website dibuka, skrin **"Siapa yang guna?"** keluar dan kau pilih profil. Profil diingat sehingga tab ditutup (sesi tamat selepas 6 jam). Setiap profil hanya nampak fail sendiri. Tekan **Tambah profil** untuk buat profil baru (nama, foto pilihan, warna, PIN pilihan). Tekan **Urus Profil** dan pilih profil untuk tukar nama/gambar atau padam profil (perlu PIN kalau profil berkunci).

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
- Fail yang dipadam masuk **Sampah** dan boleh dipulihkan dari website (butang **Sampah**) dalam 30 hari. Selepas itu Google memadamnya secara kekal.
