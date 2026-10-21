(() => {
  'use strict';

  const CEBISAN_UP = 8 * 1024 * 1024;    // saiz cebisan upload (gandaan 256KB)
  const CEBISAN_TURUN = 4 * 1024 * 1024; // saiz cebisan muat turun
  const URL_PASANG = 'https://dynoz769.github.io/UPSI-DATA/?pasang'; // cara letak ikon di skrin utama
  const FOLDER_CADANGAN = ['Kerja', 'Peribadi', 'Dokumen', 'Gambar', 'Sijil', 'Nota'];
  const WARNA_PROFIL = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];

  const $ = (s, el = document) => el.querySelector(s);
  const tidur = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const bolehGerak = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const simpanTempatan = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storan disekat */ } };
  const bacaTempatan = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  // Sesi profil disimpan dalam sessionStorage: kekal bila refresh, hilang bila tab ditutup
  const simpanSesi = (data) => { try { if (data) sessionStorage.setItem('upsi-sesi', JSON.stringify(data)); else sessionStorage.removeItem('upsi-sesi'); } catch { /* storan disekat */ } };
  const bacaSesi = () => { try { return JSON.parse(sessionStorage.getItem('upsi-sesi') || 'null'); } catch { return null; } };

  // ---------- Ikon SVG (gaya garis, 24x24) ----------
  // 'c:x,y,r' = bulatan, 'r:x,y,w,h,rx' = segi empat, lain-lain = laluan
  const IKON = {
    cari: ['c:11,11,7', 'm20 20-4-4'],
    tambah: ['M12 5v14', 'M5 12h14'],
    bawah: ['m6 9 6 6 6-6'],
    kanan: ['m9 6 6 6-6 6'],
    rumah: ['M3 10.5 12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'],
    grid: ['r:3,3,7,7,1.5', 'r:14,3,7,7,1.5', 'r:3,14,7,7,1.5', 'r:14,14,7,7,1.5'],
    senarai: ['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
    lagi: ['c:5,12,1.2', 'c:12,12,1.2', 'c:19,12,1.2'],
    folder: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
    folderBaru: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', 'M12 11v6', 'M9 14h6'],
    pindah: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', 'M9 14h6', 'm13 11 3 3-3 3'],
    fail: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z', 'M14 3v5h5'],
    upload: ['M12 15V4', 'm7 9 5-5 5 5', 'M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3'],
    uploadFolder: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', 'M12 17v-6', 'm9 13 3-3 3 3'],
    muatTurun: ['M12 4v11', 'm7 10 5 5 5-5', 'M5 19h14'],
    buka: ['M14 4h6v6', 'M20 4 10 14', 'M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4'],
    pensel: ['M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z'],
    sampah: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12', 'M9 7V4h6v3'],
    tutup: ['M18 6 6 18', 'm6 6 12 12'],
    kunci: ['r:5,11,14,10,2', 'M8 11V8a4 4 0 0 1 8 0v3'],
    gambar: ['r:3,3,18,18,2', 'c:9,9,2', 'm21 15-4-4L5 21'],
    keluar: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'm10 16-4-4 4-4', 'M6 12h11'],
    betul: ['M20 6 9 17l-5-5'],
    amaran: ['c:12,12,9', 'M12 8v5', 'M12 16h.01'],
    info: ['c:12,12,9', 'M12 11v5', 'M12 8h.01'],
    awan: ['M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8', 'M12 12v8', 'm9 15 3-3 3 3'],
    kiri: ['m15 6-6 6 6 6'],
    pilih: ['r:3,3,18,18,4', 'm8 12 3 3 5-6'],
    pulih: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
    telefon: ['r:6,2,12,20,3', 'M11 18h2'],
    zip: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z', 'M14 3v5h5', 'M10 5h1', 'M10 8h1', 'M10 11h1', 'r:9,14,3,4,1'],
  };
  const NS = 'http://www.w3.org/2000/svg';
  function lukisIkon(svg, nama) {
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    while (svg.firstChild) svg.firstChild.remove();
    for (const s of IKON[nama] || []) {
      let n;
      if (s.startsWith('c:')) {
        const [cx, cy, r] = s.slice(2).split(',');
        n = document.createElementNS(NS, 'circle');
        n.setAttribute('cx', cx); n.setAttribute('cy', cy); n.setAttribute('r', r);
      } else if (s.startsWith('r:')) {
        const [x, y, w, h, rx] = s.slice(2).split(',');
        n = document.createElementNS(NS, 'rect');
        n.setAttribute('x', x); n.setAttribute('y', y); n.setAttribute('width', w); n.setAttribute('height', h); n.setAttribute('rx', rx);
      } else {
        n = document.createElementNS(NS, 'path');
        n.setAttribute('d', s);
      }
      svg.append(n);
    }
    return svg;
  }
  const ikon = (nama, kelas = '') => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', `ik ${kelas}`.trim());
    return lukisIkon(svg, nama);
  };
  document.querySelectorAll('svg[data-ikon]').forEach((s) => lukisIkon(s, s.dataset.ikon));

  // ---------- Utiliti ----------
  const el = (tag, attrs = {}, ...anak) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const a of anak.flat()) if (a != null && a !== false) n.append(a);
    return n;
  };
  // replaceChildren tanpa nilai kosong/false (untuk anak bersyarat)
  const isi = (node, ...anak) => node.replaceChildren(...anak.flat().filter((a) => a != null && a !== false));

  // Mainkan animasi CSS sekali (buang kelas bila tamat supaya boleh diulang)
  function mainkan(elem, kelas) {
    if (!elem || !bolehGerak) return;
    elem.classList.remove(kelas);
    void elem.offsetWidth;
    elem.classList.add(kelas);
    elem.addEventListener('animationend', () => elem.classList.remove(kelas), { once: true });
  }

  async function tukarSkrin(id) {
    const kini = document.querySelector('.skrin:not([hidden])');
    if (kini && kini.id !== id && bolehGerak) {
      kini.classList.add('skrin-keluar');
      await tidur(170);
      kini.classList.remove('skrin-keluar');
    }
    document.querySelectorAll('.skrin').forEach((s) => { s.hidden = s.id !== id; });
    window.scrollTo(0, 0);
    mainkan($(`#${id}`), 'skrin-masuk');
  }

  const saiz = (b) => {
    if (b == null) return '';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(i ? 1 : 0)} ${u[i]}`;
  };

  const tarikh = (d) => d
    ? new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const sambungan = (nama) => (nama.includes('.') ? nama.split('.').pop().toLowerCase() : '');
  const isGoogleDoc = (f) => f.jenis.startsWith('application/vnd.google-apps.');

  function jenisFail(f) {
    const ext = sambungan(f.nama);
    const j = f.jenis || '';
    if (j.startsWith('image/')) return ['img', 'IMG'];
    if (ext === 'pdf' || j === 'application/pdf') return ['pdf', 'PDF'];
    if (j.endsWith('google-apps.document') || ['doc', 'docx', 'odt', 'rtf'].includes(ext)) return ['doc', 'DOC'];
    if (j.endsWith('google-apps.spreadsheet') || ['xls', 'xlsx', 'ods'].includes(ext)) return ['xls', 'XLS'];
    if (ext === 'csv') return ['xls', 'CSV'];
    if (j.endsWith('google-apps.presentation') || ['ppt', 'pptx', 'key', 'odp'].includes(ext)) return ['ppt', 'PPT'];
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return ['zip', ext.toUpperCase().slice(0, 3)];
    if (j.startsWith('video/')) return ['vid', 'VID'];
    if (j.startsWith('audio/')) return ['aud', 'AUD'];
    if (['txt', 'md'].includes(ext) || j.startsWith('text/')) return ['txt', 'TXT'];
    return ['lain', (ext || 'fail').toUpperCase().slice(0, 4)];
  }
  const lencanaFail = (f) => {
    const [k, label] = jenisFail(f);
    return el('span', { class: `lencana-fail jenis-${k}` }, ikon('fail'), el('span', { class: 'lencana-label' }, label));
  };

  // Huruf awal nama (sokong emoji / aksara berganda)
  const inisial = (nama = '') => nama.trim().split(/\s+/).slice(0, 2).map((w) => Array.from(w)[0] || '').join('').toUpperCase() || '?';
  const avatar = (p, kelas = '') => (p.gambar
    ? el('span', { class: `avatar ada-gambar ${kelas}`, style: `--c:${p.warna};background-image:url("${p.gambar}")`, role: 'img', 'aria-label': p.nama || 'Foto profil' })
    : el('span', { class: `avatar ${kelas}`, style: `--c:${p.warna}`, 'aria-hidden': 'true' }, inisial(p.nama)));

  // Email, atau "Tanpa nama #kod" untuk akaun yang Google tak dedahkan emelnya
  const labelOleh = (o) => {
    if (!o) return '';
    const m = /^tanpa-nama-(.+)$/.exec(o);
    return m ? `Tanpa nama #${m[1]}` : o;
  };

  // Toast: satu mesej pada satu masa; jenis 'ok' | 'ralat' | 'info' | 'muat'
  let toastTimer;
  let toastGiliran = 0;
  function toast(msg, jenis = 'info', kekal = false) {
    if (jenis === true) jenis = 'ralat';
    const t = $('#toast');
    const giliran = ++toastGiliran;
    isi(t, jenis === 'muat' ? el('span', { class: 'pemusing' }) : ikon(jenis === 'ralat' ? 'amaran' : jenis === 'ok' ? 'betul' : 'info'), el('span', {}, msg));
    t.className = `toast toast-${jenis}`;
    if (t.hidden) {
      t.hidden = false;
      mainkan(t, 'toast-masuk');
    }
    clearTimeout(toastTimer);
    if (!kekal) toastTimer = setTimeout(() => tutupToast(giliran), jenis === 'ralat' ? 5000 : 3000);
  }
  function tutupToast(giliran) {
    const t = $('#toast');
    if (t.hidden || (giliran && giliran !== toastGiliran)) return;
    if (!bolehGerak) { t.hidden = true; return; }
    t.classList.add('toast-keluar');
    setTimeout(() => { if (!giliran || giliran === toastGiliran) t.hidden = true; t.classList.remove('toast-keluar'); }, 180);
  }

  const mesejRalat = (e) => {
    const m = (e && e.message) || String(e);
    if (/SESI_TAMAT/.test(m)) return 'Sesi tamat. Pilih profil semula.';
    if (/NetworkError|network/i.test(m)) return 'Sambungan internet terputus. Cuba lagi.';
    return m.replace(/^Exception:\s*/, '');
  };

  // ---------- Keadaan ----------
  let token = '';
  let saya = { emel: '', id: '' };
  let profilAktif = null;
  let profilList = [];
  let modUrus = false;
  let akarId = '';
  let folders = [];        // { id, nama, oleh }
  let semua = [];          // { id, nama, jenis, saiz, tarikh, folderId, thumb, oleh }
  let folderAktif = '';    // id folder; '' = halaman utama
  let failUpload = [];
  let animasiSeterusnya = false;
  let paparanSampah = false;  // sedang lihat Sampah
  let sampah = [];            // item dalam Sampah
  let senaraiSemasa = [];     // fail yang dipaparkan (untuk navigasi pemapar)
  let modPaparan = bacaTempatan('upsi-paparan') === 'senarai' ? 'senarai' : 'grid';

  // Panggil fungsi dalam Code.gs
  const panggilTerus = (fn, ...args) => new Promise((ok, gagal) => {
    google.script.run.withSuccessHandler(ok).withFailureHandler(gagal)[fn](...args);
  });
  // Panggil fungsi fail dengan token; kalau sesi tamat, kembali ke skrin pilih profil
  const panggil = async (fn, ...args) => {
    try {
      return await panggilTerus(fn, token, ...args);
    } catch (e) {
      if (/SESI_TAMAT/.test(e && e.message) && token) {
        keluarProfil();
        toast('Sesi tamat. Pilih profil semula.', 'ralat');
      }
      throw e;
    }
  };

  // ---------- Dialog (buka/tutup beranimasi, dengan sokongan pelayar lama) ----------
  if (typeof HTMLDialogElement !== 'function' || !HTMLDialogElement.prototype.showModal) {
    document.querySelectorAll('dialog').forEach((d) => {
      d.showModal = () => { d.setAttribute('open', ''); document.documentElement.classList.add('ada-modal'); };
      d.close = () => {
        d.removeAttribute('open');
        if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('ada-modal');
        d.dispatchEvent(new Event('close'));
      };
      try { Object.defineProperty(d, 'open', { get: () => d.hasAttribute('open') }); } catch { /* abaikan */ }
    });
  }
  function bukaDialog(d) {
    tutupMenu(true);
    if (!d.open) d.showModal();
    const medan = d.querySelector('input:not([type=hidden]):not([hidden]), select');
    if (medan && innerWidth > 720) setTimeout(() => medan.focus(), 30);
  }
  function tutupDialog(d) {
    if (!d.open || d.classList.contains('menutup')) return;
    if (d.dataset.sibuk) { toast('Tunggu sehingga upload selesai.', 'info'); return; }
    if (!bolehGerak) { d.close(); return; }
    d.classList.add('menutup');
    setTimeout(() => { d.classList.remove('menutup'); d.close(); }, 150);
  }
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('cancel', (ev) => { ev.preventDefault(); tutupDialog(d); });
    let mulaLuar = false;
    d.addEventListener('pointerdown', (ev) => { mulaLuar = ev.target === d; });
    d.addEventListener('click', (ev) => { if (mulaLuar && ev.target === d) tutupDialog(d); });
  });
  document.querySelectorAll('[data-tutup]').forEach((b) => b.addEventListener('click', () => tutupDialog(b.closest('dialog'))));

  // ---------- Menu timbul (lungsur di desktop, helaian bawah di telefon) ----------
  const menuEl = $('#menu');
  let menuPencetus = null;
  function bukaMenu(pencetus, items, tajuk) {
    if (menuPencetus === pencetus && !menuEl.hidden) { tutupMenu(); return; }
    tutupMenu(true);
    menuPencetus = pencetus;
    pencetus.setAttribute('aria-expanded', 'true');
    isi(menuEl,
      tajuk && el('div', { class: 'menu-tajuk' }, tajuk),
      ...items.filter(Boolean).map((it) => (it === '-'
        ? el('div', { class: 'menu-pemisah', role: 'separator' })
        : el('button', {
          type: 'button', role: 'menuitem', class: `menu-item ${it.bahaya ? 'bahaya' : ''}`,
          onclick: () => { tutupMenu(true); it.tindakan(); },
        }, ikon(it.ikon), el('span', {}, it.label)))));
    const helaian = innerWidth < 600;
    menuEl.classList.toggle('helaian', helaian);
    menuEl.style.left = '';
    menuEl.style.top = '';
    menuEl.hidden = false;
    $('#menu-latar').hidden = !helaian;
    if (!helaian) {
      const r = pencetus.getBoundingClientRect();
      const m = menuEl.getBoundingClientRect();
      const kiri = Math.min(innerWidth - m.width - 8, Math.max(8, r.right - m.width));
      let atas = r.bottom + 6;
      let asal = 'top';
      if (atas + m.height > innerHeight - 8) { atas = Math.max(8, r.top - m.height - 6); asal = 'bottom'; }
      menuEl.style.left = `${kiri}px`;
      menuEl.style.top = `${atas}px`;
      menuEl.style.transformOrigin = `${Math.round(r.left + r.width / 2 - kiri)}px ${asal}`;
    }
    mainkan(menuEl, 'menu-masuk');
  }
  function tutupMenu(segera) {
    if (menuEl.hidden) return;
    menuPencetus?.setAttribute('aria-expanded', 'false');
    menuPencetus = null;
    $('#menu-latar').hidden = true;
    if (segera || !bolehGerak) { menuEl.hidden = true; return; }
    menuEl.classList.add('menu-keluar');
    setTimeout(() => { menuEl.hidden = true; menuEl.classList.remove('menu-keluar'); }, menuEl.classList.contains('helaian') ? 170 : 110);
  }
  document.addEventListener('pointerdown', (ev) => {
    if (!menuEl.hidden && !menuEl.contains(ev.target) && !(menuPencetus && menuPencetus.contains(ev.target))) tutupMenu();
  });
  document.addEventListener('keydown', (ev) => {
    if (menuEl.hidden) return;
    if (ev.key === 'Escape') { const p = menuPencetus; tutupMenu(); p?.focus(); ev.preventDefault(); return; }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      const item = [...menuEl.querySelectorAll('.menu-item')];
      const i = item.indexOf(document.activeElement);
      const j = ev.key === 'ArrowDown' ? (i + 1) % item.length : (i - 1 + item.length) % item.length;
      item[j]?.focus();
      ev.preventDefault();
    }
  });
  addEventListener('resize', () => tutupMenu(true));
  addEventListener('scroll', () => { if (!menuEl.classList.contains('helaian')) tutupMenu(true); }, { passive: true });

  // ---------- Siapa pengguna ----------
  async function kenalPasti() {
    try { saya = await panggilTerus('siapaSaya'); } catch { /* biarkan kosong */ }
    $('#saya-profil').textContent = saya.emel
      ? `Log masuk sebagai ${saya.emel}`
      : saya.id ? `Anda: ${labelOleh(saya.id)}` : '';
  }

  // ---------- Profil ----------
  async function muatProfil() {
    try {
      profilList = await panggilTerus('senaraiProfil');
    } catch (e) {
      isi($('#grid-profil'), el('p', { class: 'ralat' }, mesejRalat(e)));
      return;
    }
    if (!profilList.length) modUrus = false;
    paparProfil();
  }

  function paparProfil() {
    $('#tajuk-profil').textContent = modUrus ? 'Urus profil' : profilList.length ? 'Siapa yang guna?' : 'Selamat datang';
    $('#sub-profil').textContent = modUrus
      ? 'Pilih profil untuk edit atau padam'
      : profilList.length ? 'Pilih profil untuk teruskan' : 'Buat profil pertama untuk mula menyimpan fail';
    const btnUrus = $('#btn-urus-profil');
    btnUrus.hidden = !profilList.length;
    btnUrus.lastElementChild.textContent = modUrus ? 'Selesai' : 'Urus profil';
    lukisIkon(btnUrus.querySelector('svg'), modUrus ? 'betul' : 'pensel');
    btnUrus.classList.toggle('btn-utama', modUrus);
    btnUrus.classList.toggle('btn-garis', !modUrus);

    isi($('#grid-profil'),
      ...profilList.map((p, i) => el('button', {
        type: 'button', class: `kad-profil ${modUrus ? 'urus' : ''}`, 'data-id': p.id, style: `--i:${i};--c:${p.warna}`,
        onclick: () => (modUrus ? bukaEditProfil(p) : masukProfil(p)),
        'aria-label': modUrus ? `Edit profil ${p.nama}` : `Masuk sebagai ${p.nama}${p.adaPin ? ' (berkunci)' : ''}`,
      },
        el('span', { class: 'avatar-bungkus' },
          avatar(p, 'avatar-besar'),
          modUrus ? el('span', { class: 'lencana-edit' }, ikon('pensel')) : p.adaPin && el('span', { class: 'lencana-kunci', title: 'Dikunci dengan PIN' }, ikon('kunci'))),
        el('span', { class: 'nama-profil' }, p.nama),
        modUrus && p.dibuatOleh && el('span', { class: 'oleh-profil', title: `Dibuat oleh ${labelOleh(p.dibuatOleh)}` }, labelOleh(p.dibuatOleh)),
      )),
      !modUrus && profilList.length < 10 && el('button', {
        type: 'button', class: 'kad-profil', style: `--i:${profilList.length}`, onclick: bukaTambahProfil,
      }, el('span', { class: 'avatar avatar-besar avatar-tambah' }, ikon('tambah')), el('span', { class: 'nama-profil' }, 'Tambah profil')),
    );
  }

  async function masukProfil(p) {
    const kad = document.querySelector(`.kad-profil[data-id="${p.id}"]`);
    kad?.classList.add('memuat');
    try {
      token = p.adaPin
        ? await mintaPin(`Masukkan PIN untuk ${p.nama}`, (pin) => panggilTerus('masukProfil', p.id, pin))
        : await panggilTerus('masukProfil', p.id, '');
    } catch (e) {
      if (e !== 'batal') toast(mesejRalat(e), 'ralat');
      return;
    } finally {
      kad?.classList.remove('memuat');
    }
    kad?.classList.add('dipilih');
    await bukaProfil(p, '');
    kad?.classList.remove('dipilih');
  }

  // Tunjuk skrin fail untuk profil p (token sudah sah)
  async function bukaProfil(p, folder) {
    profilAktif = p;
    folderAktif = folder || '';
    paparanSampah = false;
    semua = [];
    folders = [];
    kosongkanPilihan();
    simpanSesi({ token, id: p.id, folder: folderAktif });
    $('#cari').value = '';
    const kecil = avatar(p, 'avatar-kecil');
    kecil.id = 'avatar-kecil';
    $('#avatar-kecil').replaceWith(kecil);
    $('#nama-profil-kecil').textContent = p.nama;
    tunjukRangka();
    pasangLatar(p);
    await tukarSkrin('skrin-utama');
    animasiSeterusnya = true;
    await muat();
  }

  // Selepas refresh: guna semula sesi dalam tab ini kalau token masih sah
  async function pulihSesi(s, sah) {
    const p = s && profilList.find((x) => x.id === s.id);
    if (!p || !(await sah)) { simpanSesi(null); return false; }
    token = s.token;
    await bukaProfil(p, s.folder);
    return true;
  }

  function keluarProfil() {
    token = '';
    profilAktif = null;
    simpanSesi(null);
    kosongkanPilihan();
    paparanSampah = false;
    tutupMenu(true);
    document.querySelectorAll('dialog[open]').forEach((d) => { delete d.dataset.sibuk; d.close(); });
    pasangLatar(null);
    modUrus = false;
    tukarSkrin('skrin-profil');
    muatProfil();
  }

  // Dialog PIN: semak(pin) dipanggil di server; dialog kekal terbuka kalau PIN salah
  let pinSelesai = null;
  function mintaPin(teks, semak) {
    return new Promise((ok, gagal) => {
      const b = $('#borang-pin');
      b.reset();
      $('#pin-teks').textContent = teks;
      $('#ralat-pin').hidden = true;
      pinSelesai = { ok, gagal, semak };
      bukaDialog($('#dialog-pin'));
      setTimeout(() => b.elements.pin.focus(), 40);
    });
  }

  async function hantarPin(ev) {
    ev.preventDefault();
    const b = $('#borang-pin');
    const pin = b.elements.pin.value;
    const r = $('#ralat-pin');
    if (!/^\d{4}$/.test(pin)) { r.textContent = 'PIN mesti 4 digit.'; r.hidden = false; mainkan(b.elements.pin, 'gegar'); return; }
    const btn = $('#btn-pin-ok');
    btn.disabled = true;
    r.hidden = true;
    try {
      const hasil = await pinSelesai.semak(pin);
      const { ok } = pinSelesai;
      pinSelesai = null;
      tutupDialog($('#dialog-pin'));
      ok(hasil);
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
      b.elements.pin.select();
      mainkan(b.elements.pin, 'gegar');
    } finally {
      btn.disabled = false;
    }
  }

  // Dialog tambah / edit profil
  let pilihanProfil = { warna: WARNA_PROFIL[0], gambar: '' };
  let editProfil = null; // { profil, pin } bila edit; null bila tambah
  let gambarBerubah = false;

  function bukaDialogProfil(p) {
    const b = $('#borang-profil');
    b.reset();
    gambarBerubah = false;
    pilihanProfil = p
      ? { warna: p.warna, gambar: p.gambar || '' }
      : { warna: WARNA_PROFIL[profilList.length % WARNA_PROFIL.length], gambar: '' };
    if (p) b.elements.nama.value = p.nama;
    $('#tajuk-dialog-profil').textContent = p ? 'Edit profil' : 'Tambah profil';
    $('#btn-simpan-profil').textContent = p ? 'Simpan' : 'Tambah profil';
    $('#btn-padam-profil').hidden = !p;
    $('#bahagian-pin-profil').hidden = !!p;
    const info = $('#info-dibuat');
    info.hidden = !(p && (p.dibuatOleh || p.dibuatPada));
    if (!info.hidden) info.textContent = `Dibuat${p.dibuatOleh ? ` oleh ${labelOleh(p.dibuatOleh)}` : ''}${p.dibuatPada ? ` pada ${tarikh(p.dibuatPada)}` : ''}`;
    $('#ralat-profil').hidden = true;
    paparPilihanProfil(true);
    bukaDialog($('#dialog-profil'));
  }

  function bukaTambahProfil() {
    editProfil = null;
    bukaDialogProfil(null);
  }

  async function bukaEditProfil(p) {
    let pin = '';
    if (p.adaPin) {
      try {
        pin = await mintaPin(`Masukkan PIN ${p.nama} untuk edit profil`, async (v) => { await panggilTerus('sahPin', p.id, v); return v; });
      } catch (e) {
        if (e !== 'batal') toast(mesejRalat(e), 'ralat');
        return;
      }
      await tidur(160);
    }
    editProfil = { profil: p, pin };
    bukaDialogProfil(p);
  }

  function paparPilihanProfil(animasi) {
    const b = $('#borang-profil');
    const pratonton = avatar({ ...pilihanProfil, nama: b.elements.nama.value || '?' }, 'avatar-besar');
    pratonton.id = 'avatar-pratonton';
    if (!animasi) pratonton.style.animation = 'none';
    $('#avatar-pratonton').replaceWith(pratonton);
    $('#btn-buang-gambar').hidden = !pilihanProfil.gambar;
    $('#btn-pilih-gambar').lastElementChild.textContent = pilihanProfil.gambar ? 'Tukar foto' : 'Upload foto';
    isi($('#pilih-warna'), ...WARNA_PROFIL.map((w) => el('button', {
      type: 'button', class: 'pilihan-warna', role: 'radio', style: `--c:${w}`, 'aria-label': `Warna ${w}`,
      'aria-checked': String(w === pilihanProfil.warna),
      onclick: () => { pilihanProfil.warna = w; paparPilihanProfil(false); },
    })));
  }

  // Potong gambar jadi segi empat di tengah dan kecilkan ke 256px (JPEG), supaya ringan untuk disimpan
  async function kecilkanGambar(fail, sisi = 256) {
    const url = URL.createObjectURL(fail);
    try {
      const img = await muatImej(url);
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = sisi;
      c.height = sisi;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, sisi, sisi);
      return c.toDataURL('image/jpeg', 0.86);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function pilihGambarProfil(ev) {
    const fail = ev.target.files[0];
    ev.target.value = '';
    if (!fail) return;
    try {
      pilihanProfil.gambar = await kecilkanGambar(fail);
      gambarBerubah = true;
      paparPilihanProfil(true);
    } catch (e) {
      $('#ralat-profil').textContent = mesejRalat(e);
      $('#ralat-profil').hidden = false;
    }
  }

  async function simpanProfil(ev) {
    ev.preventDefault();
    const b = $('#borang-profil');
    const r = $('#ralat-profil');
    const nama = b.elements.nama.value.trim();
    const pin = b.elements.pin.value.trim();
    if (!nama) { r.textContent = 'Masukkan nama profil.'; r.hidden = false; return; }
    if (!editProfil && pin && !/^\d{4}$/.test(pin)) { r.textContent = 'PIN mesti 4 digit nombor.'; r.hidden = false; return; }
    const btn = $('#btn-simpan-profil');
    const asal = btn.textContent;
    btn.disabled = true;
    isi(btn, el('span', { class: 'pemusing' }), el('span', {}, 'Menyimpan…'));
    r.hidden = true;
    try {
      if (editProfil) {
        await panggilTerus('kemasProfil', editProfil.profil.id, editProfil.pin, {
          nama, warna: pilihanProfil.warna, gambar: gambarBerubah ? pilihanProfil.gambar : null,
        });
      } else {
        await panggilTerus('tambahProfil', nama, '', pilihanProfil.warna, pin, pilihanProfil.gambar);
      }
      tutupDialog($('#dialog-profil'));
      toast(editProfil ? 'Profil dikemas kini' : `Profil ${nama} dibuat`, 'ok');
      await muatProfil();
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = asal;
    }
  }

  async function padamProfil() {
    const p = editProfil.profil;
    if (!confirm(`Padam profil "${p.nama}" beserta SEMUA failnya?\n\nFail akan masuk ke Sampah Google Drive dan boleh dipulihkan dalam 30 hari.`)) return;
    const btn = $('#btn-padam-profil');
    btn.disabled = true;
    try {
      await panggilTerus('padamProfil', p.id, editProfil.pin);
    } catch (e) {
      toast(mesejRalat(e), 'ralat');
      return;
    } finally {
      btn.disabled = false;
    }
    tutupDialog($('#dialog-profil'));
    toast(`Profil ${p.nama} dipadam`, 'ok');
    await muatProfil();
  }

  function menuProfil(pencetus) {
    bukaMenu(pencetus, [
      { ikon: 'gambar', label: 'Latar belakang', tindakan: bukaDialogLatar },
      { ikon: 'telefon', label: 'Pasang di skrin utama', tindakan: () => window.open(URL_PASANG, '_blank', 'noopener') },
      '-',
      { ikon: 'keluar', label: 'Tukar profil', tindakan: keluarProfil },
    ], el('span', {}, el('strong', {}, profilAktif?.nama || ''), saya.emel || labelOleh(saya.id)));
  }

  // ---------- Muat fail ----------
  let teksRuang = '';
  let kelihatan = []; // [id, jenis, item] untuk kad yang sedang dipaparkan (untuk "Pilih semua")

  const serbukUtama = (bolehKlik) => el(bolehKlik ? 'button' : 'span', {
    type: bolehKlik ? 'button' : null,
    class: `serbuk-item ${bolehKlik ? '' : 'kini'}`,
    onclick: bolehKlik ? () => { $('#cari').value = ''; bukaPaparan(''); } : null,
  }, ikon('rumah'), el('span', {}, 'Utama'));
  const serbukSampah = () => [ikon('kanan', 'serbuk-pemisah'), el('span', { class: 'serbuk-item kini' }, el('span', {}, 'Sampah'))];

  // Butang kepala halaman berbeza untuk paparan biasa dan Sampah
  function aturKepala() {
    const s = paparanSampah;
    $('#btn-sampah').setAttribute('aria-pressed', String(s));
    $('#btn-baru').hidden = s;
    $('#btn-kosongkan').hidden = !s;
    $('#btn-kosongkan').disabled = !sampah.length;
    $('#nota-sampah').hidden = !s;
    $('#cari').placeholder = s ? 'Cari dalam Sampah' : 'Cari fail atau folder';
  }

  function tunjukRangka() {
    aturKepala();
    $('#bahagian-folder').hidden = true;
    $('#tajuk-fail').hidden = true;
    $('#kosong').hidden = true;
    $('#ruang').textContent = '';
    isi($('#serbuk'), serbukUtama(paparanSampah), paparanSampah && serbukSampah());
    const s = $('#senarai');
    s.classList.add('masuk');
    isi(s, ...Array.from({ length: modPaparan === 'senarai' ? 6 : 8 }, (_, i) => el('div', { class: 'kad rangka', style: `--i:${i}` },
      el('div', { class: 'rangka-gambar' }), el('div', {}, el('div', { class: 'rangka-baris' }), el('div', { class: 'rangka-baris pendek' })))));
  }

  function tunjukRalat(e, cubaLagi) {
    $('#senarai').replaceChildren();
    $('#bahagian-folder').hidden = true;
    $('#kosong').hidden = false;
    isi($('#kosong'), el('div', { class: 'kosong-ikon' }, ikon('amaran')), el('h3', {}, 'Tak dapat memuatkan'), el('p', {}, mesejRalat(e)),
      el('button', { type: 'button', class: 'btn btn-garis', onclick: () => { tunjukRangka(); cubaLagi(); } }, 'Cuba lagi'));
  }

  async function muat() {
    let d;
    try {
      d = await panggil('senarai');
    } catch (e) {
      if (!token || paparanSampah) return;
      tunjukRalat(e, muat);
      return;
    }
    akarId = d.akarId;
    folders = d.folders;
    semua = d.fail;
    const jumlah = semua.reduce((n, f) => n + f.saiz, 0);
    teksRuang = `${semua.length} fail · ${saiz(jumlah)}${d.guna ? ` · Drive: ${saiz(d.guna)} digunakan${d.had > 0 && d.had < 1e15 ? ` daripada ${saiz(d.had)}` : ''}` : ''}`;
    if (folderAktif && folderAktif !== akarId && !folders.some((f) => f.id === folderAktif)) folderAktif = '';
    isi($('#senarai-folder'), ...[...new Set([...folders.map((f) => f.nama), ...FOLDER_CADANGAN])].map((f) => el('option', {}, f)));
    segarkanPilihan();
    papar();
  }

  async function muatSampah() {
    try {
      sampah = await panggil('senaraiSampah');
    } catch (e) {
      if (!token || !paparanSampah) return;
      tunjukRalat(e, muatSampah);
      return;
    }
    if (!paparanSampah) return;
    segarkanPilihan();
    papar();
  }

  // ---------- Paparan ----------
  const namaFolder = (id) => (id === akarId ? 'Utama' : (folders.find((f) => f.id === id)?.nama || '?'));

  const susunFail = (list) => {
    const susun = $('#susun').value;
    return list.sort((a, b) => {
      if (susun === 'nama') return a.nama.localeCompare(b.nama, 'ms', { numeric: true });
      if (susun === 'saiz') return b.saiz - a.saiz;
      return (b.tarikh || '').localeCompare(a.tarikh || '');
    });
  };

  function bukaPaparan(id) {
    const dariSampah = paparanSampah;
    folderAktif = id;
    paparanSampah = false;
    kosongkanPilihan();
    if (token && profilAktif) simpanSesi({ token, id: profilAktif.id, folder: id });
    animasiSeterusnya = true;
    if (dariSampah) {
      // Item mungkin baru dipulihkan, jadi muat semula senarai fail
      tunjukRangka();
      muat();
    } else papar();
    window.scrollTo({ top: 0, behavior: bolehGerak ? 'smooth' : 'auto' });
  }

  function bukaSampah() {
    paparanSampah = true;
    sampah = [];
    kosongkanPilihan();
    $('#cari').value = '';
    animasiSeterusnya = true;
    tunjukRangka();
    window.scrollTo(0, 0);
    muatSampah();
  }

  function aturMod() {
    const senarai = modPaparan === 'senarai';
    $('#isi').classList.toggle('mod-senarai', senarai);
    $('#grid-folder').classList.toggle('mod-senarai', senarai);
    $('#senarai').classList.toggle('mod-senarai', senarai);
    const segmen = $('.segmen');
    segmen.dataset.mod = modPaparan;
    segmen.querySelectorAll('.segmen-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.paparan === modPaparan)));
  }

  // Kad masuk berperingkat (hanya bila tukar paparan, bukan setiap kali menaip carian)
  function animasiKad() {
    const anim = animasiSeterusnya;
    animasiSeterusnya = false;
    let indeks = 0;
    for (const bekas of [$('#grid-folder'), $('#senarai')]) {
      bekas.classList.toggle('masuk', anim);
      for (const k of bekas.children) k.style.setProperty('--i', indeks++);
    }
  }

  function papar() {
    aturKepala();
    if (paparanSampah) { paparSampah(); return; }
    const q = $('#cari').value.trim().toLowerCase();
    const dalamFolder = folderAktif && folderAktif !== akarId;
    $('#ruang').textContent = teksRuang;

    // Laluan (breadcrumb)
    isi($('#serbuk'),
      serbukUtama(dalamFolder || q),
      dalamFolder && !q && [
        ikon('kanan', 'serbuk-pemisah'),
        el('span', { class: 'serbuk-item kini' }, el('span', {}, namaFolder(folderAktif))),
        el('button', { type: 'button', class: 'btn-ikon kecil', 'aria-label': 'Pilihan folder', 'aria-haspopup': 'menu', onclick: (ev) => menuFolder(ev.currentTarget, folderAktif, false) }, ikon('lagi')),
      ],
      q && [ikon('kanan', 'serbuk-pemisah'), el('span', { class: 'serbuk-item kini' }, el('span', {}, `Carian: “${$('#cari').value.trim()}”`))],
    );

    const tersusun = [...folders].sort((a, b) => a.nama.localeCompare(b.nama, 'ms', { numeric: true }));
    const kadFolderList = !dalamFolder ? tersusun.filter((f) => !q || f.nama.toLowerCase().includes(q)) : [];
    $('#bahagian-folder').hidden = !kadFolderList.length;
    $('#grid-folder').replaceChildren(...kadFolderList.map(kadFolder));

    const senarai = susunFail(semua.filter((f) => {
      if (q) return (!dalamFolder || f.folderId === folderAktif) && `${f.nama} ${namaFolder(f.folderId)}`.toLowerCase().includes(q);
      return f.folderId === (dalamFolder ? folderAktif : akarId);
    }));
    senaraiSemasa = senarai;
    kelihatan = [...kadFolderList.map((f) => [f.id, 'folder', f]), ...senarai.map((f) => [f.id, 'fail', f])];
    $('#tajuk-fail').hidden = !(senarai.length && kadFolderList.length);
    $('#senarai').replaceChildren(...senarai.map(kadFail));
    animasiKad();

    const k = $('#kosong');
    k.hidden = senarai.length > 0 || kadFolderList.length > 0;
    if (!k.hidden) {
      isi(k,
        el('div', { class: 'kosong-ikon' }, ikon(q ? 'cari' : 'folder')),
        el('h3', {}, q ? 'Tiada hasil' : dalamFolder ? 'Folder ni kosong' : 'Belum ada fail'),
        el('p', {}, q ? 'Cuba cari dengan perkataan lain.' : 'Seret fail atau folder ke sini, atau tekan butang di bawah.'),
        !q && el('button', { type: 'button', class: 'btn btn-utama', onclick: () => $('#input-fail').click() }, ikon('upload'), el('span', {}, 'Upload fail')),
      );
    }
    kemasPilihan();
  }

  function paparSampah() {
    const q = $('#cari').value.trim().toLowerCase();
    isi($('#serbuk'), serbukUtama(true), serbukSampah());
    const list = susunFail(sampah.filter((x) => !q || x.nama.toLowerCase().includes(q)));
    const fol = list.filter((x) => x.folder);
    const fail = list.filter((x) => !x.folder);
    $('#bahagian-folder').hidden = !fol.length;
    $('#grid-folder').replaceChildren(...fol.map(kadSampah));
    $('#tajuk-fail').hidden = !(fail.length && fol.length);
    $('#senarai').replaceChildren(...fail.map(kadSampah));
    senaraiSemasa = [];
    kelihatan = [...fol, ...fail].map((x) => [x.id, 'sampah', x]);
    const jumlah = sampah.reduce((n, x) => n + x.saiz, 0);
    $('#ruang').textContent = `${sampah.length} item${jumlah ? ` · ${saiz(jumlah)}` : ''}`;
    animasiKad();
    const k = $('#kosong');
    k.hidden = list.length > 0;
    if (!k.hidden) {
      isi(k,
        el('div', { class: 'kosong-ikon' }, ikon(q ? 'cari' : 'sampah')),
        el('h3', {}, q ? 'Tiada hasil' : 'Sampah kosong'),
        el('p', {}, q ? 'Cuba cari dengan perkataan lain.' : 'Fail dan folder yang dipadam akan muncul di sini.'),
      );
    }
    kemasPilihan();
  }

  // ---------- Pratonton gambar ----------
  // Keutamaan: salinan tempatan (baru diupload) → thumbnail Google → gambar kecil dari server
  const thumbLokal = new Map();
  const thumbServer = new Map();
  let barisanThumb = Promise.resolve();
  const bolehPratonton = (f) => !!f.thumb || thumbLokal.has(f.id) || f.jenis.startsWith('image/');

  function ambilThumbServer(f) {
    if (!thumbServer.has(f.id)) {
      // satu demi satu supaya tak banjiri server dengan panggilan serentak
      const p = barisanThumb.then(() => panggil('gambarKecil', f.id)).catch(() => '');
      barisanThumb = p;
      thumbServer.set(f.id, p);
    }
    return thumbServer.get(f.id);
  }

  function gambarPratonton(f, bolehServer = true) {
    const ganti = () => lencanaFail(f);
    const img = el('img', { alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', decoding: 'async' });
    img.addEventListener('load', () => img.classList.add('dimuat'));
    const dariServer = () => {
      if (!bolehServer) { img.replaceWith(ganti()); return; }
      ambilThumbServer(f).then((url) => {
        if (url) img.src = url;
        else img.replaceWith(ganti());
      });
    };
    if (thumbLokal.has(f.id)) img.src = thumbLokal.get(f.id);
    else if (f.thumb) {
      img.addEventListener('error', dariServer, { once: true });
      img.src = f.thumb;
    } else if (f.jenis.startsWith('image/') && bolehServer) dariServer();
    else return ganti();
    return img;
  }

  // ---------- Pilih banyak item ----------
  const pilihan = new Map(); // id -> { jenis: 'fail' | 'folder' | 'sampah', item }
  let modPilih = false;      // false | 'butang' (dibuka dengan butang Pilih) | 'auto' (tamat bila tiada pilihan)

  function kosongkanPilihan() {
    pilihan.clear();
    modPilih = false;
    kemasPilihan();
  }

  function togolPilih(id, jenis, item) {
    if (pilihan.has(id)) pilihan.delete(id);
    else pilihan.set(id, { jenis, item });
    if (!modPilih && pilihan.size) modPilih = 'auto';
    else if (modPilih === 'auto' && !pilihan.size) modPilih = false;
    kemasPilihan();
  }

  function pilihSemua() {
    const semuaDipilih = kelihatan.length > 0 && kelihatan.every(([id]) => pilihan.has(id));
    for (const [id, jenis, item] of kelihatan) {
      if (semuaDipilih) pilihan.delete(id);
      else pilihan.set(id, { jenis, item });
    }
    if (!modPilih) modPilih = 'butang';
    kemasPilihan();
  }

  // Selepas muat semula: buang item yang dah tiada, guna data terkini untuk yang masih ada
  function segarkanPilihan() {
    const terkini = new Map((paparanSampah ? sampah : [...folders, ...semua]).map((x) => [x.id, x]));
    for (const [id, p] of [...pilihan]) {
      if (terkini.has(id)) p.item = terkini.get(id);
      else pilihan.delete(id);
    }
  }

  function kemasPilihan() {
    $('#isi').classList.toggle('mod-pilih', !!modPilih);
    $('#btn-pilih').setAttribute('aria-pressed', String(!!modPilih));
    document.querySelectorAll('#isi .kad[data-id]').forEach((k) => {
      const d = pilihan.has(k.dataset.id);
      k.classList.toggle('dipilih', d);
      k.querySelector('.kad-pilih')?.setAttribute('aria-checked', String(d));
    });
    const bar = $('#bar-pilih');
    document.body.classList.toggle('ada-bar-pilih', !!modPilih);
    if (modPilih) {
      $('#bil-pilih').textContent = pilihan.size ? `${pilihan.size} dipilih` : 'Pilih item';
      const semuaDipilih = kelihatan.length > 0 && kelihatan.every(([id]) => pilihan.has(id));
      $('#btn-pilih-semua').textContent = semuaDipilih ? 'Nyahpilih semua' : 'Pilih semua';
      $('#btn-pilih-semua').hidden = !kelihatan.length;
      isi($('#tindakan-pilih'), ...butangTindakanPilih());
      bar.classList.remove('keluar');
      bar.hidden = false;
    } else if (!bar.hidden) {
      if (!bolehGerak) { bar.hidden = true; return; }
      bar.classList.add('keluar');
      setTimeout(() => { if (!modPilih) bar.hidden = true; bar.classList.remove('keluar'); }, 180);
    }
  }

  function butangTindakanPilih() {
    const dipilih = [...pilihan.values()];
    const tiada = !dipilih.length;
    const butang = (nama, label, tindakan, { bahaya = false, lumpuh = tiada, tajuk = null } = {}) => el('button', {
      type: 'button', class: `btn ${bahaya ? 'btn-bahaya' : 'btn-teks'}`, disabled: lumpuh, title: tajuk, onclick: tindakan,
    }, ikon(nama), el('span', {}, label));
    if (paparanSampah) {
      const items = dipilih.map((x) => x.item);
      return [
        butang('pulih', 'Pulihkan', () => pulihkanItem(items)),
        butang('sampah', 'Padam kekal', () => padamKekalItem(items), { bahaya: true }),
      ];
    }
    const adaFolder = dipilih.some((x) => x.jenis === 'folder');
    return [
      butang('muatTurun', 'Muat turun', muatTurunPilihan),
      butang('pindah', 'Pindah', pindahPilihan, { lumpuh: tiada || adaFolder, tajuk: adaFolder ? 'Hanya fail boleh dipindah' : null }),
      butang('sampah', 'Padam', padamPilihan, { bahaya: true }),
    ];
  }

  const kotakPilih = (id, jenis, item) => el('button', {
    type: 'button', class: 'kad-pilih', role: 'checkbox', 'aria-checked': String(pilihan.has(id)), 'aria-label': `Pilih ${item.nama}`,
    onclick: () => togolPilih(id, jenis, item),
  }, ikon('betul'));

  // Dalam mod pilih, klik di mana-mana pada kad memilihnya. Tekan lama (sentuhan) mula memilih.
  function pasangKad(kad, togol) {
    kad.addEventListener('click', (ev) => { if (modPilih && !ev.target.closest('button')) togol(); });
    let pemasa = null;
    let mula = null;
    let sentuh = false;
    const batal = () => { clearTimeout(pemasa); pemasa = null; kad.classList.remove('ditekan'); };
    const tekanLama = () => {
      batal();
      kad.dataset.tekanLama = '1';
      if (navigator.vibrate) navigator.vibrate(12);
      togol();
    };
    kad.addEventListener('pointerdown', (ev) => {
      delete kad.dataset.tekanLama; // sesetengah pelayar tak hantar klik selepas tekan lama
      sentuh = ev.pointerType === 'touch';
      if (!sentuh) return;
      mula = { x: ev.clientX, y: ev.clientY };
      kad.classList.add('ditekan');
      pemasa = setTimeout(tekanLama, 480);
    });
    kad.addEventListener('pointermove', (ev) => { if (pemasa && Math.hypot(ev.clientX - mula.x, ev.clientY - mula.y) > 10) batal(); });
    kad.addEventListener('pointerup', batal);
    kad.addEventListener('pointercancel', batal);
    kad.addEventListener('contextmenu', (ev) => {
      if (!sentuh) return;
      ev.preventDefault();
      if (pemasa) tekanLama();
    });
    // Klik yang menyusul tekan lama tidak membuka fail
    kad.addEventListener('click', (ev) => {
      if (!kad.dataset.tekanLama) return;
      delete kad.dataset.tekanLama;
      ev.stopPropagation();
      ev.preventDefault();
    }, true);
  }

  function kadFolder(folder) {
    const isiFolder = semua.filter((f) => f.folderId === folder.id);
    const gambar = susunFail(isiFolder.filter(bolehPratonton)).slice(0, 4);
    const jumlah = isiFolder.reduce((n, f) => n + f.saiz, 0);
    const togol = () => togolPilih(folder.id, 'folder', folder);
    const buka = () => (modPilih ? togol() : bukaPaparan(folder.id));
    const kad = el('article', { class: `kad kad-folder ${pilihan.has(folder.id) ? 'dipilih' : ''}`, 'data-id': folder.id },
      kotakPilih(folder.id, 'folder', folder),
      el('button', { type: 'button', class: 'kad-pratonton', 'aria-label': `Buka folder ${folder.nama}`, onclick: buka },
        gambar.length
          ? el('div', { class: `mozek mozek-${gambar.length}` }, gambar.map((f) => el('div', { class: 'mozek-sel' }, gambarPratonton(f))))
          : ikon('folder', 'folder-besar'),
        gambar.length > 0 && ikon('folder', 'folder-besar folder-senarai'),
      ),
      el('div', { class: 'kad-badan' },
        el('button', { type: 'button', class: 'kad-nama', title: folder.nama, onclick: buka }, ikon('folder', 'ik-folder'), el('span', {}, folder.nama)),
        el('div', { class: 'kad-meta' },
          el('span', { class: 'meta-oleh' }, labelOleh(folder.oleh)),
          el('span', { class: 'meta-tarikh' }, `${isiFolder.length} fail`),
          el('span', { class: 'meta-saiz' }, jumlah > 0 ? saiz(jumlah) : ''),
        ),
      ),
      el('button', { type: 'button', class: 'btn-ikon kad-menu', 'aria-label': `Pilihan untuk ${folder.nama}`, 'aria-haspopup': 'menu', onclick: (ev) => menuFolder(ev.currentTarget, folder.id, true) }, ikon('lagi')),
    );
    pasangKad(kad, togol);
    return kad;
  }

  function kadFail(f) {
    const lokasiLain = f.folderId !== (folderAktif && folderAktif !== akarId ? folderAktif : akarId);
    const togol = () => togolPilih(f.id, 'fail', f);
    const buka = () => (modPilih ? togol() : bukaPemapar(f));
    const kad = el('article', { class: `kad kad-fail ${pilihan.has(f.id) ? 'dipilih' : ''}`, 'data-id': f.id },
      kotakPilih(f.id, 'fail', f),
      el('button', { type: 'button', class: 'kad-pratonton', 'aria-label': `Buka ${f.nama}`, onclick: buka }, gambarPratonton(f)),
      el('div', { class: 'kad-badan' },
        el('button', { type: 'button', class: 'kad-nama', title: f.nama, onclick: buka }, el('span', {}, f.nama)),
        lokasiLain && el('span', { class: 'nama-lokasi' }, namaFolder(f.folderId)),
        el('div', { class: 'kad-meta' },
          el('span', { class: 'meta-oleh', title: f.oleh ? `Diupload oleh ${labelOleh(f.oleh)}` : null }, labelOleh(f.oleh)),
          el('span', { class: 'meta-tarikh' }, tarikh(f.tarikh)),
          el('span', { class: 'meta-saiz' }, f.saiz > 0 ? saiz(f.saiz) : ''),
        ),
      ),
      el('button', { type: 'button', class: 'btn-ikon kad-menu', 'aria-label': `Pilihan untuk ${f.nama}`, 'aria-haspopup': 'menu', onclick: (ev) => menuFail(ev.currentTarget, f) }, ikon('lagi')),
    );
    pasangKad(kad, togol);
    return kad;
  }

  function kadSampah(x) {
    const togol = () => togolPilih(x.id, 'sampah', x);
    const tindakan = (ev) => (modPilih ? togol() : menuSampah(ev.currentTarget, x));
    const kad = el('article', { class: `kad kad-sampah ${x.folder ? 'kad-folder' : 'kad-fail'} ${pilihan.has(x.id) ? 'dipilih' : ''}`, 'data-id': x.id },
      kotakPilih(x.id, 'sampah', x),
      el('button', { type: 'button', class: 'kad-pratonton', 'aria-label': `Pilihan untuk ${x.nama}`, 'aria-haspopup': 'menu', onclick: tindakan },
        x.folder ? ikon('folder', 'folder-besar') : gambarPratonton(x, false)),
      el('div', { class: 'kad-badan' },
        el('button', { type: 'button', class: 'kad-nama', title: x.nama, onclick: tindakan }, x.folder && ikon('folder', 'ik-folder'), el('span', {}, x.nama)),
        el('span', { class: 'nama-lokasi' }, `Dari ${x.lokasi || 'Utama'}`),
        el('div', { class: 'kad-meta' },
          el('span', { class: 'meta-tarikh' }, x.folder ? `${x.bil} fail` : tarikh(x.tarikh)),
          el('span', { class: 'meta-saiz' }, x.saiz > 0 ? saiz(x.saiz) : ''),
        ),
      ),
      el('button', { type: 'button', class: 'btn-ikon kad-menu', 'aria-label': `Pilihan untuk ${x.nama}`, 'aria-haspopup': 'menu', onclick: (ev) => menuSampah(ev.currentTarget, x) }, ikon('lagi')),
    );
    pasangKad(kad, togol);
    return kad;
  }

  function menuFail(pencetus, f) {
    bukaMenu(pencetus, [
      { ikon: 'buka', label: 'Buka', tindakan: () => bukaPemapar(f) },
      { ikon: 'muatTurun', label: 'Muat turun', tindakan: () => muatTurun(f) },
      { ikon: 'pilih', label: 'Pilih', tindakan: () => togolPilih(f.id, 'fail', f) },
      '-',
      { ikon: 'pensel', label: 'Tukar nama', tindakan: () => tukarNamaFail(f) },
      { ikon: 'pindah', label: 'Pindah ke folder', tindakan: () => pindahFail(f) },
      '-',
      { ikon: 'sampah', label: 'Padam', bahaya: true, tindakan: () => padamFail(f) },
    ], innerWidth < 600 ? el('span', {}, el('strong', {}, f.nama), `${saiz(f.saiz)} · ${tarikh(f.tarikh)}`) : null);
  }

  function menuFolder(pencetus, id, adaBuka) {
    const folder = folders.find((f) => f.id === id);
    bukaMenu(pencetus, [
      adaBuka && { ikon: 'buka', label: 'Buka', tindakan: () => bukaPaparan(id) },
      { ikon: 'zip', label: 'Muat turun (ZIP)', tindakan: () => muatTurunFolder(id) },
      adaBuka && folder && { ikon: 'pilih', label: 'Pilih', tindakan: () => togolPilih(id, 'folder', folder) },
      '-',
      { ikon: 'pensel', label: 'Tukar nama', tindakan: () => tukarNamaFolder(id) },
      { ikon: 'sampah', label: 'Padam folder', bahaya: true, tindakan: () => padamFolder(id) },
    ], innerWidth < 600 ? el('span', {}, el('strong', {}, namaFolder(id))) : null);
  }

  function menuSampah(pencetus, x) {
    bukaMenu(pencetus, [
      { ikon: 'pulih', label: 'Pulihkan', tindakan: () => pulihkanItem([x]) },
      { ikon: 'pilih', label: 'Pilih', tindakan: () => togolPilih(x.id, 'sampah', x) },
      '-',
      { ikon: 'sampah', label: 'Padam kekal', bahaya: true, tindakan: () => padamKekalItem([x]) },
    ], innerWidth < 600 ? el('span', {}, el('strong', {}, x.nama), x.folder ? `Folder · ${x.bil} fail` : `${saiz(x.saiz)} · Dari ${x.lokasi || 'Utama'}`) : null);
  }

  function menuBaru(pencetus) {
    bukaMenu(pencetus, [
      { ikon: 'upload', label: 'Upload fail', tindakan: () => $('#input-fail').click() },
      { ikon: 'uploadFolder', label: 'Upload folder', tindakan: () => $('#input-folder').click() },
      '-',
      { ikon: 'folderBaru', label: 'Folder baru', tindakan: folderBaru },
    ]);
  }

  // ---------- Buka / muat turun (fail diambil melalui server dalam cebisan) ----------
  const base64KeBait = (b64) => {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };

  // Fail kecil yang baru dibuka disimpan sementara supaya buka semula / muat turun tak perlu ambil lagi
  const HAD_CACHE = 40 * 1024 * 1024;
  const cacheBlob = new Map(); // id -> { blob, nama }
  const sedangAmbil = new Map(); // id -> Promise (elak ambil fail yang sama dua kali serentak)

  // kemajuan(p): p = 0..1, atau null semasa Google Docs ditukar ke PDF
  function ambilFail(f, kemajuan, simpan = true) {
    const ada = cacheBlob.get(f.id);
    if (ada) {
      cacheBlob.delete(f.id);
      cacheBlob.set(f.id, ada);
      return Promise.resolve(ada);
    }
    if (sedangAmbil.has(f.id)) return sedangAmbil.get(f.id);
    const lapor = kemajuan || ((p) => toast(p == null ? 'Menyediakan PDF…' : `Memuatkan ${f.nama} · ${Math.round(p * 100)}%`, 'muat', true));
    const janji = (async () => {
      let hasil;
      if (isGoogleDoc(f)) {
        lapor(null);
        const r = await panggil('eksportPdf', f.id);
        hasil = { blob: new Blob([base64KeBait(r.b64)], { type: 'application/pdf' }), nama: r.nama };
      } else {
        const bahagian = [];
        for (let mula = 0; mula < f.saiz; mula += CEBISAN_TURUN) {
          lapor(mula / f.saiz);
          bahagian.push(base64KeBait(await panggil('bacaCebisan', f.id, mula, Math.min(CEBISAN_TURUN, f.saiz - mula))));
        }
        hasil = { blob: new Blob(bahagian, { type: f.jenis || 'application/octet-stream' }), nama: f.nama };
      }
      if (simpan && hasil.blob.size <= HAD_CACHE) {
        cacheBlob.set(f.id, hasil);
        while (cacheBlob.size > 6) cacheBlob.delete(cacheBlob.keys().next().value);
      }
      return hasil;
    })().finally(() => sedangAmbil.delete(f.id));
    sedangAmbil.set(f.id, janji);
    return janji;
  }

  function simpanBlob(blob, nama) {
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: nama });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function bukaTabBaru(f) {
    const w = window.open('', '_blank'); // buka dulu supaya tak disekat popup blocker
    if (w) w.document.write('<p style="font-family:system-ui,sans-serif;padding:24px;color:#475467">Memuatkan…</p>');
    try {
      const { blob } = await ambilFail(f);
      // HTML/SVG dibuka sebagai teks supaya skrip dalam fail tidak berjalan
      const selamat = /html|svg|xml|javascript/i.test(blob.type) ? new Blob([blob], { type: 'text/plain' }) : blob;
      const url = URL.createObjectURL(selamat);
      if (w) w.location.href = url; else window.open(url, '_blank');
      tutupToast();
    } catch (e) {
      w?.close();
      toast(mesejRalat(e), 'ralat');
    }
  }

  async function muatTurun(f) {
    try {
      const { blob, nama } = await ambilFail(f);
      simpanBlob(blob, nama);
      toast(`${nama} dimuat turun`, 'ok');
    } catch (e) {
      toast(mesejRalat(e), 'ralat');
    }
  }

  // ---------- Pemapar fail (gambar, PDF, video, audio, teks) ----------
  const pemapar = $('#pemapar');
  const HAD_PEMAPAR = 150 * 1024 * 1024; // fail lebih besar perlu dimuat turun dulu
  const HAD_TEKS = 2 * 1024 * 1024;
  const EXT_TEKS = ['txt', 'md', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'sql', 'log', 'yml', 'yaml', 'ini', 'sh', 'gs', 'tex', 'srt'];
  const GOOGLE_BOLEH_PDF = ['document', 'spreadsheet', 'presentation', 'drawing'];
  let pemaparFail = null;
  let pemaparUrl = '';
  let giliranPemapar = 0;

  function caraPapar(f) {
    const j = f.jenis || '';
    const ext = sambungan(f.nama);
    if (isGoogleDoc(f)) return GOOGLE_BOLEH_PDF.some((t) => j.endsWith(`.${t}`)) ? 'pdf' : null;
    if (j.startsWith('image/') && !/heic|heif|tiff|photoshop/.test(j)) return 'gambar';
    if (j === 'application/pdf' || ext === 'pdf') return navigator.pdfViewerEnabled === false ? null : 'pdf';
    if (j.startsWith('video/')) return 'video';
    if (j.startsWith('audio/')) return 'audio';
    if ((j.startsWith('text/') || j === 'application/json' || EXT_TEKS.includes(ext)) && f.saiz <= HAD_TEKS) return 'teks';
    return null;
  }

  function gambarKadPemapar(f) {
    if (!f.thumb) return lencanaFail(f);
    const img = el('img', { class: 'pemapar-thumb', src: f.thumb, alt: '', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => img.replaceWith(lencanaFail(f)), { once: true });
    return img;
  }

  const kadPemapar = (f, mesej) => el('div', { class: 'pemapar-kad' },
    gambarKadPemapar(f),
    el('strong', {}, f.nama),
    el('p', {}, mesej),
    el('button', { type: 'button', class: 'btn btn-utama', onclick: () => muatTurun(f) }, ikon('muatTurun'), el('span', {}, 'Muat turun')));

  function lepasUrlPemapar() {
    if (pemaparUrl) URL.revokeObjectURL(pemaparUrl);
    pemaparUrl = '';
  }

  function bukaPemapar(f) {
    if (!pemapar.open) bukaDialog(pemapar);
    paparDalamPemapar(f);
  }

  async function paparDalamPemapar(f) {
    const giliran = ++giliranPemapar;
    pemaparFail = f;
    const i = senaraiSemasa.findIndex((x) => x.id === f.id);
    $('#pemapar-nama').textContent = f.nama;
    $('#pemapar-info').textContent = [
      i >= 0 && senaraiSemasa.length > 1 ? `${i + 1} / ${senaraiSemasa.length}` : '',
      f.saiz > 0 ? saiz(f.saiz) : '', tarikh(f.tarikh), labelOleh(f.oleh),
    ].filter(Boolean).join(' · ');
    $('#pemapar-sebelum').disabled = i <= 0;
    $('#pemapar-seterus').disabled = i < 0 || i >= senaraiSemasa.length - 1;
    const kotak = $('#pemapar-isi');
    const cara = caraPapar(f);
    if (!cara || (f.saiz > HAD_PEMAPAR && !isGoogleDoc(f))) {
      isi(kotak, kadPemapar(f, cara ? `Fail ni besar (${saiz(f.saiz)}). Muat turun untuk membukanya.` : 'Pratonton tidak tersedia untuk fail jenis ni.'));
      lepasUrlPemapar();
      return;
    }
    const teksMuat = el('span', {}, 'Memuatkan…');
    isi(kotak, el('div', { class: 'pemapar-muat' }, el('span', { class: 'pemusing' }), teksMuat));
    lepasUrlPemapar();
    let data;
    try {
      data = await ambilFail(f, (p) => {
        if (giliran === giliranPemapar) teksMuat.textContent = p == null ? 'Menyediakan PDF…' : `Memuatkan… ${Math.round(p * 100)}%`;
      });
    } catch (e) {
      if (giliran === giliranPemapar && pemapar.open) isi(kotak, kadPemapar(f, mesejRalat(e)));
      return;
    }
    if (giliran !== giliranPemapar || !pemapar.open) return;
    const gagal = () => { if (giliran === giliranPemapar) isi(kotak, kadPemapar(f, 'Pelayar ni tak dapat memaparkan fail ni.')); };
    let n;
    if (cara === 'teks') {
      n = el('pre', { tabindex: '0' }, await data.blob.text());
      if (giliran !== giliranPemapar) return;
    } else {
      pemaparUrl = URL.createObjectURL(data.blob);
      if (cara === 'gambar') n = el('img', { src: pemaparUrl, alt: f.nama });
      else if (cara === 'pdf') n = el('iframe', { src: pemaparUrl, title: f.nama });
      else if (cara === 'video') n = el('video', { src: pemaparUrl, controls: true, playsinline: true, autoplay: true });
      else n = el('audio', { src: pemaparUrl, controls: true, autoplay: true });
      n.addEventListener('error', gagal);
    }
    isi(kotak, n);
    if (i >= 0) pramuat(i + 1);
  }

  // Ambil gambar seterusnya lebih awal supaya navigasi terasa segera
  function pramuat(i) {
    const f = senaraiSemasa[i];
    if (f && caraPapar(f) === 'gambar' && f.saiz <= 15 * 1024 * 1024) ambilFail(f, () => {}).catch(() => {});
  }

  function navPemapar(arah) {
    const i = senaraiSemasa.findIndex((x) => x.id === pemaparFail?.id);
    const f = i >= 0 && senaraiSemasa[i + arah];
    if (f) paparDalamPemapar(f);
  }

  // ---------- ZIP (tanpa mampatan; fail disimpan seperti asal) ----------
  const JADUAL_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (bait) => {
    let c = 0xffffffff;
    for (let i = 0; i < bait.length; i++) c = JADUAL_CRC[(c ^ bait[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  // entri: [{ nama, blob, tarikh }] → Blob ZIP
  async function binaZip(entri) {
    const enc = new TextEncoder();
    const bahagian = [];
    const pusat = [];
    let ofset = 0;
    for (const e of entri) {
      const nama = enc.encode(e.nama);
      const saizData = e.blob.size;
      const crc = crc32(new Uint8Array(await e.blob.arrayBuffer()));
      const d = new Date(e.tarikh || Date.now());
      const masa = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      const hari = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      const lokal = new DataView(new ArrayBuffer(30));
      lokal.setUint32(0, 0x04034b50, true);
      lokal.setUint16(4, 20, true);
      lokal.setUint16(6, 0x0800, true); // nama dalam UTF-8
      lokal.setUint16(10, masa, true);
      lokal.setUint16(12, hari, true);
      lokal.setUint32(14, crc, true);
      lokal.setUint32(18, saizData, true);
      lokal.setUint32(22, saizData, true);
      lokal.setUint16(26, nama.length, true);
      bahagian.push(lokal, nama, e.blob);
      const p = new DataView(new ArrayBuffer(46));
      p.setUint32(0, 0x02014b50, true);
      p.setUint16(4, 20, true);
      p.setUint16(6, 20, true);
      p.setUint16(8, 0x0800, true);
      p.setUint16(12, masa, true);
      p.setUint16(14, hari, true);
      p.setUint32(16, crc, true);
      p.setUint32(20, saizData, true);
      p.setUint32(24, saizData, true);
      p.setUint16(28, nama.length, true);
      p.setUint32(42, ofset, true);
      pusat.push(p, nama);
      ofset += 30 + nama.length + saizData;
    }
    const saizPusat = pusat.reduce((n, x) => n + x.byteLength, 0);
    const akhir = new DataView(new ArrayBuffer(22));
    akhir.setUint32(0, 0x06054b50, true);
    akhir.setUint16(8, entri.length, true);
    akhir.setUint16(10, entri.length, true);
    akhir.setUint32(12, saizPusat, true);
    akhir.setUint32(16, ofset, true);
    return new Blob([...bahagian, ...pusat, akhir], { type: 'application/zip' });
  }

  const namaSelamat = (s) => s.replace(/[\\/:*?"<>|]/g, '-').trim() || 'fail';
  // Elak nama berganda dalam ZIP: "a.pdf", "a (2).pdf", ...
  function namaUnik(laluan, dipakai) {
    const titik = laluan.lastIndexOf('.');
    const [asas, ext] = titik > laluan.lastIndexOf('/') + 1 ? [laluan.slice(0, titik), laluan.slice(titik)] : [laluan, ''];
    let calon = laluan;
    for (let n = 2; dipakai.has(calon.toLowerCase()); n++) calon = `${asas} (${n})${ext}`;
    dipakai.add(calon.toLowerCase());
    return calon;
  }

  // senarai: [{ f, laluan }] (laluan = nama folder dalam ZIP, atau '')
  async function muatTurunZip(senarai, namaZip) {
    if (!senarai.length) { toast('Tiada fail untuk dimuat turun.', 'info'); return; }
    const jumlah = senarai.reduce((n, x) => n + (x.f.saiz || 0), 0);
    if (jumlah > 2 * 1024 ** 3) { toast('Terlalu besar untuk satu ZIP (maksimum 2 GB). Muat turun sebahagian dahulu.', 'ralat'); return; }
    if (jumlah > 500 * 1024 * 1024 && !confirm(`Jumlah saiz ${saiz(jumlah)}. Muat turun mungkin ambil masa yang lama. Teruskan?`)) return;
    const entri = [];
    const dipakai = new Set();
    let siap = 0;
    try {
      for (const [i, { f, laluan }] of senarai.entries()) {
        const lapor = (p) => toast(`Menyediakan ZIP · fail ${i + 1}/${senarai.length} · ${Math.round(((siap + (p || 0) * (f.saiz || 0)) / (jumlah || 1)) * 100)}%`, 'muat', true);
        lapor(0);
        const { blob, nama } = await ambilFail(f, lapor, false);
        siap += f.saiz || 0;
        entri.push({ nama: namaUnik(laluan ? `${namaSelamat(laluan)}/${namaSelamat(nama)}` : namaSelamat(nama), dipakai), blob, tarikh: f.tarikh });
      }
      toast('Menyediakan ZIP…', 'muat', true);
      simpanBlob(await binaZip(entri), namaZip);
      toast(`${namaZip} dimuat turun`, 'ok');
    } catch (e) {
      toast(mesejRalat(e), 'ralat');
    }
  }

  function muatTurunFolder(id) {
    const nama = namaFolder(id);
    const fail = semua.filter((f) => f.folderId === id);
    if (!fail.length) { toast('Folder ni kosong.', 'info'); return; }
    muatTurunZip(susunFail(fail).map((f) => ({ f, laluan: nama })), `${namaSelamat(nama)}.zip`);
  }

  // ---------- Tindakan untuk item dipilih ----------
  function bahagikanPilihan() {
    const dipilih = [...pilihan.values()];
    const folderDipilih = dipilih.filter((x) => x.jenis === 'folder').map((x) => x.item);
    const idFolder = new Set(folderDipilih.map((f) => f.id));
    // Fail dalam folder yang turut dipilih sudah termasuk bersama folder
    const failDipilih = dipilih.filter((x) => x.jenis === 'fail' && !idFolder.has(x.item.folderId)).map((x) => x.item);
    return { folderDipilih, failDipilih, idFolder };
  }

  function muatTurunPilihan() {
    const { folderDipilih, failDipilih } = bahagikanPilihan();
    if (!folderDipilih.length && failDipilih.length === 1) { muatTurun(failDipilih[0]); return; }
    const senarai = [
      ...folderDipilih.flatMap((fo) => susunFail(semua.filter((f) => f.folderId === fo.id)).map((f) => ({ f, laluan: fo.nama }))),
      ...failDipilih.map((f) => ({ f, laluan: '' })),
    ];
    const nama = folderDipilih.length === 1 && !failDipilih.length ? folderDipilih[0].nama : `UPSI-DATA ${new Date().toISOString().slice(0, 10)}`;
    muatTurunZip(senarai, `${namaSelamat(nama)}.zip`);
  }

  async function padamPilihan() {
    const { folderDipilih, failDipilih, idFolder } = bahagikanPilihan();
    const n = folderDipilih.length + failDipilih.length;
    const dalamFolder = semua.filter((f) => idFolder.has(f.folderId)).length;
    if (!confirm(`Padam ${n} item${dalamFolder ? ` (termasuk ${dalamFolder} fail dalam folder)` : ''}?\n\nIa akan masuk ke Sampah dan boleh dipulihkan dalam 30 hari.`)) return;
    let siap = 0;
    try {
      for (const fo of folderDipilih) {
        toast(`Memadam ${siap + 1}/${n}…`, 'muat', true);
        await panggil('padamFolder', fo.id);
        siap++;
      }
      for (const f of failDipilih) {
        toast(`Memadam ${siap + 1}/${n}…`, 'muat', true);
        await panggil('padamFail', f.id);
        siap++;
      }
      toast(`${siap} item dipindah ke Sampah`, 'ok');
    } catch (e) {
      toast(`${siap ? `${siap} item dipadam. ` : ''}Gagal: ${mesejRalat(e)}`, 'ralat');
    }
    if (!token) return;
    kosongkanPilihan();
    if (idFolder.has(folderAktif)) folderAktif = '';
    animasiSeterusnya = true;
    await muat();
  }

  function pindahPilihan() {
    const fail = bahagikanPilihan().failDipilih;
    mintaTeks({
      tajuk: `Pindah ${fail.length} fail`, label: 'Folder (pilih atau taip nama baru)', nilai: '', senarai: true, butang: 'Pindah',
      ok: async (v) => {
        const id = await idFolder(v);
        let n = 0;
        for (const f of fail) {
          if (f.folderId === id) continue;
          await panggil('pindahFail', f.id, id);
          n++;
        }
        kosongkanPilihan();
        toast(`${n} fail dipindah ke ${namaFolder(id)}`, 'ok');
      },
    });
  }

  // ---------- Sampah ----------
  async function pulihkanItem(items) {
    let berjaya = 0;
    let keUtama = 0;
    try {
      for (const x of items) {
        toast(items.length > 1 ? `Memulihkan ${berjaya + 1}/${items.length}…` : `Memulihkan ${x.nama}…`, 'muat', true);
        const r = await panggil('pulihkan', x.id);
        if (r && r.keUtama) keUtama++;
        berjaya++;
        sampah = sampah.filter((y) => y.id !== x.id);
      }
      const mesej = items.length > 1 ? `${berjaya} item dipulihkan` : `${items[0].nama} dipulihkan`;
      toast(keUtama ? `${mesej}. ${keUtama} fail diletak di Utama kerana folder asalnya masih dalam Sampah.` : mesej, 'ok');
    } catch (e) {
      toast(`${berjaya ? `${berjaya} item dipulihkan. ` : ''}Gagal: ${mesejRalat(e)}`, 'ralat');
    }
    if (!token) return;
    kosongkanPilihan();
    if (paparanSampah) papar();
  }

  async function padamKekalItem(items) {
    const apa = items.length > 1 ? `${items.length} item` : `"${items[0].nama}"`;
    if (!confirm(`Padam kekal ${apa}?\n\nTindakan ni tidak boleh dibatalkan.`)) return;
    let berjaya = 0;
    try {
      for (const x of items) {
        toast(items.length > 1 ? `Memadam ${berjaya + 1}/${items.length}…` : 'Memadam…', 'muat', true);
        await panggil('padamKekal', x.id);
        berjaya++;
        sampah = sampah.filter((y) => y.id !== x.id);
      }
      toast(items.length > 1 ? `${berjaya} item dipadam kekal` : `${items[0].nama} dipadam kekal`, 'ok');
    } catch (e) {
      toast(`${berjaya ? `${berjaya} item dipadam. ` : ''}Gagal: ${mesejRalat(e)}`, 'ralat');
    }
    if (!token) return;
    kosongkanPilihan();
    if (paparanSampah) papar();
  }

  async function kosongkanSampah() {
    if (!sampah.length) return;
    if (!confirm(`Padam kekal SEMUA ${sampah.length} item dalam Sampah?\n\nTindakan ni tidak boleh dibatalkan.`)) return;
    $('#btn-kosongkan').disabled = true;
    toast('Mengosongkan Sampah…', 'muat', true);
    try {
      const n = await panggil('kosongkanSampah');
      sampah = [];
      kosongkanPilihan();
      animasiSeterusnya = true;
      toast(`${n} item dipadam kekal`, 'ok');
    } catch (e) {
      toast(mesejRalat(e), 'ralat');
    }
    if (paparanSampah) papar();
  }

  // ---------- Latar belakang profil ----------
  const cacheLatar = new Map(); // latarId -> object URL
  let giliranLatar = 0;
  let latarBaru; // undefined = tiada perubahan, '' = latar lalai, dataUrl = gambar baru

  const dataUrlKeBlobUrl = (dataUrl) => {
    const [kepala, b64] = dataUrl.split(',');
    const jenis = (/data:([^;]+)/.exec(kepala) || [])[1] || 'image/jpeg';
    return URL.createObjectURL(new Blob([base64KeBait(b64)], { type: jenis }));
  };

  const muatImej = (url) => new Promise((ok, gagal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => gagal(new Error('Fail ni bukan gambar yang boleh dibaca.'));
    i.src = url;
  });

  async function pasangLatar(p) {
    const giliran = ++giliranLatar;
    const latar = $('#latar');
    if (!p || !p.latarId) { latar.classList.remove('ada-imej'); return; }
    let url = cacheLatar.get(p.latarId);
    if (!url) {
      try {
        const data = await panggil('latarProfil');
        if (!data) return;
        url = dataUrlKeBlobUrl(data);
        cacheLatar.set(p.latarId, url);
      } catch {
        return;
      }
    }
    try { await muatImej(url); } catch { return; }
    if (giliran !== giliranLatar) return; // pengguna dah tukar profil
    $('#latar-imej').style.backgroundImage = `url("${url}")`;
    latar.classList.add('ada-imej');
  }

  // Kecilkan ke maksimum 3840px (4K) dan mampatkan sehingga muat had server
  async function kecilkanLatar(fail) {
    const url = URL.createObjectURL(fail);
    try {
      const img = await muatImej(url);
      for (const [maks, kualiti] of [[3840, 0.86], [3840, 0.74], [2560, 0.8], [1920, 0.78]]) {
        const sk = Math.min(1, maks / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * sk);
        c.height = Math.round(img.naturalHeight * sk);
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/jpeg', kualiti);
        if (data.length * 0.75 < 4.8 * 1024 * 1024) return data;
      }
      throw new Error('Gambar terlalu besar.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function paparPratontonLatar(url, label) {
    const k = $('#pratonton-latar');
    k.classList.toggle('lalai', !url);
    k.style.backgroundImage = url ? `url("${url}")` : '';
    isi(k, el('span', {}, label || (url ? 'Gambar sendiri' : 'Latar lalai')));
    mainkan(k, 'tukar');
  }

  function bukaDialogLatar() {
    latarBaru = undefined;
    $('#ralat-latar').hidden = true;
    const id = profilAktif?.latarId;
    paparPratontonLatar(id ? cacheLatar.get(id) : '', id && !cacheLatar.get(id) ? 'Gambar sendiri' : '');
    bukaDialog($('#dialog-latar'));
  }

  async function pilihLatar(ev) {
    const fail = ev.target.files[0];
    ev.target.value = '';
    if (!fail) return;
    const r = $('#ralat-latar');
    r.hidden = true;
    paparPratontonLatar('', 'Menyediakan gambar…');
    try {
      latarBaru = await kecilkanLatar(fail);
      paparPratontonLatar(dataUrlKeBlobUrl(latarBaru));
    } catch (e) {
      latarBaru = undefined;
      paparPratontonLatar(profilAktif?.latarId ? cacheLatar.get(profilAktif.latarId) : '');
      r.textContent = mesejRalat(e);
      r.hidden = false;
    }
  }

  async function simpanLatar(ev) {
    ev.preventDefault();
    if (latarBaru === undefined) { tutupDialog($('#dialog-latar')); return; }
    const btn = $('#btn-simpan-latar');
    const r = $('#ralat-latar');
    btn.disabled = true;
    isi(btn, el('span', { class: 'pemusing' }), el('span', {}, 'Menyimpan…'));
    r.hidden = true;
    try {
      const { latarId } = await panggil('tukarLatar', latarBaru);
      profilAktif.latarId = latarId;
      const dalamSenarai = profilList.find((x) => x.id === profilAktif.id);
      if (dalamSenarai) dalamSenarai.latarId = latarId;
      if (latarId) cacheLatar.set(latarId, dataUrlKeBlobUrl(latarBaru));
      await pasangLatar(profilAktif);
      tutupDialog($('#dialog-latar'));
      toast(latarId ? 'Latar belakang ditukar' : 'Kembali ke latar lalai', 'ok');
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  }

  // ---------- Folder ----------
  // Cari folder ikut nama (abaikan huruf besar/kecil); buat baru kalau belum ada
  async function idFolder(nama) {
    nama = nama.trim();
    if (!nama) throw new Error('Nama folder tidak sah.');
    if (nama.toLowerCase() === 'utama') return akarId;
    const ada = folders.find((f) => f.nama.toLowerCase() === nama.toLowerCase());
    if (ada) return ada.id;
    const id = await panggil('folderBaru', nama);
    folders.push({ id, nama });
    return id;
  }

  function folderBaru() {
    mintaTeks({
      tajuk: 'Folder baru', label: 'Nama folder', nilai: '', butang: 'Buat folder',
      ok: async (v) => {
        if (folders.some((f) => f.nama.toLowerCase() === v.toLowerCase())) throw new Error('Folder tu dah wujud.');
        const id = await idFolder(v);
        folderAktif = id;
        animasiSeterusnya = true;
        toast(`Folder ${v} dibuat`, 'ok');
      },
    });
  }

  function tukarNamaFolder(id) {
    mintaTeks({
      tajuk: 'Tukar nama folder', label: 'Nama baru', nilai: namaFolder(id),
      ok: async (v) => {
        if (folders.some((f) => f.id !== id && f.nama.toLowerCase() === v.toLowerCase())) throw new Error('Folder tu dah wujud.');
        await panggil('tukarNamaFolder', id, v);
        toast('Nama folder ditukar', 'ok');
      },
    });
  }

  async function padamFolder(id) {
    const n = semua.filter((x) => x.folderId === id).length;
    if (!confirm(`Padam folder "${namaFolder(id)}"${n ? ` dan ${n} fail di dalamnya` : ''}?\n\nIa akan masuk ke Sampah dan boleh dipulihkan dalam 30 hari.`)) return;
    toast('Memadam folder…', 'muat', true);
    try {
      await panggil('padamFolder', id);
    } catch (e) { toast(mesejRalat(e), 'ralat'); return; }
    if (folderAktif === id) folderAktif = '';
    animasiSeterusnya = true;
    toast('Folder dipindah ke Sampah', 'ok');
    await muat();
  }

  // ---------- Fail ----------
  function tukarNamaFail(f) {
    const titik = f.nama.lastIndexOf('.');
    mintaTeks({
      tajuk: 'Tukar nama fail', label: 'Nama baru', nilai: f.nama, pilih: titik > 0 ? [0, titik] : null,
      ok: async (v) => {
        await panggil('tukarNamaFail', f.id, v);
        cacheBlob.delete(f.id);
        toast('Nama fail ditukar', 'ok');
      },
    });
  }

  function pindahFail(f) {
    mintaTeks({
      tajuk: 'Pindah ke folder', label: 'Folder (pilih atau taip nama baru)', nilai: '', senarai: true, butang: 'Pindah',
      ok: async (v) => {
        const id = await idFolder(v);
        if (id === f.folderId) return;
        await panggil('pindahFail', f.id, id);
        toast(`Dipindah ke ${namaFolder(id)}`, 'ok');
      },
    });
  }

  async function padamFail(f) {
    if (!confirm(`Padam "${f.nama}"?\n\nIa akan masuk ke Sampah dan boleh dipulihkan dalam 30 hari.`)) return;
    try {
      await panggil('padamFail', f.id);
    } catch (e) { toast(mesejRalat(e), 'ralat'); return; }
    semua = semua.filter((x) => x.id !== f.id);
    papar();
    toast('Fail dipindah ke Sampah', 'ok');
  }

  // ---------- Dialog teks ----------
  let tindakanTeks = null;
  function mintaTeks({ tajuk, label, nilai, ok, senarai = false, pilih = null, butang = 'Simpan' }) {
    const b = $('#borang-teks');
    $('#teks-tajuk').textContent = tajuk;
    $('#teks-label').textContent = label;
    $('#btn-teks-ok').textContent = butang;
    $('#ralat-teks').hidden = true;
    b.elements.nilai.value = nilai;
    if (senarai) b.elements.nilai.setAttribute('list', 'senarai-folder');
    else b.elements.nilai.removeAttribute('list');
    tindakanTeks = ok;
    bukaDialog($('#dialog-teks'));
    setTimeout(() => {
      b.elements.nilai.focus();
      if (pilih) b.elements.nilai.setSelectionRange(...pilih);
      else b.elements.nilai.select();
    }, 40);
  }

  async function hantarTeks(ev) {
    ev.preventDefault();
    const btn = $('#btn-teks-ok');
    const r = $('#ralat-teks');
    const v = $('#borang-teks').elements.nilai.value.trim();
    if (!v) return;
    const asal = btn.textContent;
    btn.disabled = true;
    isi(btn, el('span', { class: 'pemusing' }), el('span', {}, 'Sekejap…'));
    r.hidden = true;
    try {
      await tindakanTeks(v);
      await muat();
      tutupDialog($('#dialog-teks'));
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = asal;
    }
  }

  // ---------- Upload ----------
  // Setiap item: { fail, folder, nama, status }. folder = nama folder asal (upload folder) atau null
  const itemFail = (fail) => ({ fail, folder: null, nama: fail.name });
  // Fail dari folder: folder teratas jadi folder dalam profil; subfolder diratakan ke dalam nama fail
  const itemDariLaluan = (fail, laluan) => {
    const bahagian = laluan.split('/').filter(Boolean);
    if (bahagian.length < 2) return itemFail(fail);
    return { fail, folder: bahagian[0], nama: bahagian.slice(1).join(' - ') };
  };

  function bukaUpload(items) {
    if (!items.length) return;
    if (paparanSampah) bukaPaparan('');
    const d = $('#dialog-upload');
    if (d.open) { tambahItemUpload(items); return; }
    failUpload = [];
    $('#senarai-upload').replaceChildren();
    tambahItemUpload(items);
    $('#borang-upload').elements.folder.value = folderAktif && folderAktif !== akarId ? namaFolder(folderAktif) : 'Utama';
    $('#ralat-upload').hidden = true;
    $('#kemajuan-upload').hidden = true;
    bukaDialog(d);
  }

  function tambahItemUpload(items) {
    for (const it of items) {
      it.status = 'tunggu';
      it.p = 0;
      failUpload.push(it);
      $('#senarai-upload').append(barisUpload(it));
    }
    paparUpload();
  }

  function barisUpload(it) {
    it.elStatus = el('span', { class: 'upload-status' });
    it.li = el('li', { class: 'upload-baris' },
      lencanaFail({ nama: it.nama, jenis: it.fail.type || '' }),
      el('div', { class: 'upload-info' },
        el('span', { class: 'upload-nama', title: it.nama }, it.folder && el('span', { class: 'pudar' }, `${it.folder} / `), it.nama),
        el('span', { class: 'upload-saiz' }, saiz(it.fail.size))),
      it.elStatus,
      el('button', { type: 'button', class: 'btn-ikon kecil upload-buang', 'aria-label': `Buang ${it.nama}`, onclick: () => buangItem(it) }, ikon('tutup')),
    );
    kemasStatus(it);
    return it.li;
  }

  function kemasStatus(it) {
    it.li.dataset.status = it.status;
    if (it.status === 'naik') isi(it.elStatus, `${Math.round(it.p * 100)}%`);
    else if (it.status === 'siap') isi(it.elStatus, ikon('betul'));
    else if (it.status === 'gagal') isi(it.elStatus, ikon('amaran'));
    else it.elStatus.replaceChildren();
  }

  function buangItem(it) {
    if ($('#dialog-upload').dataset.sibuk) return;
    failUpload = failUpload.filter((x) => x !== it);
    it.li.remove();
    if (!failUpload.length) tutupDialog($('#dialog-upload'));
    else paparUpload();
  }

  function paparUpload() {
    const lepas = failUpload.some((it) => !it.folder);
    $('#label-folder-upload').hidden = !lepas;
    $('#nota-folder-upload').hidden = !failUpload.some((it) => it.folder);
    const baki = failUpload.filter((it) => it.status !== 'siap').length;
    const jumlahFolder = new Set(failUpload.filter((it) => it.folder).map((it) => it.folder)).size;
    $('#tajuk-upload').textContent = jumlahFolder ? `Upload ${jumlahFolder} folder` : 'Upload fail';
    if (!$('#dialog-upload').dataset.sibuk) $('#btn-mula-upload').textContent = `Upload ${baki} fail`;
  }

  // Baca isi folder yang diseret masuk (termasuk subfolder)
  async function itemDariSeret(dt) {
    const entri = [...(dt.items || [])].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
    if (!entri.some((e) => e.isDirectory)) return [...dt.files].map(itemFail);
    const hasil = [];
    const jalan = async (e, laluan) => {
      if (e.isFile) {
        const fail = await new Promise((ok, gagal) => e.file(ok, gagal));
        hasil.push(laluan ? itemDariLaluan(fail, `${laluan}/${fail.name}`) : itemFail(fail));
      } else if (e.isDirectory) {
        const pembaca = e.createReader();
        for (;;) {
          const kump = await new Promise((ok, gagal) => pembaca.readEntries(ok, gagal));
          if (!kump.length) break;
          for (const anak of kump) await jalan(anak, laluan ? `${laluan}/${e.name}` : e.name);
        }
      }
    };
    for (const e of entri) await jalan(e, '');
    return hasil;
  }

  const bacaBase64 = (blob) => new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => gagal(r.error);
    r.readAsDataURL(blob);
  });

  async function uploadSatu(it, folderId, kemajuan) {
    const f = it.fail;
    const sesi = await panggil('mulaUpload', folderId, it.nama, f.type || 'application/octet-stream', f.size);
    if (f.size === 0) return (await panggil('hantarCebisan', sesi, '', 0, 0)).id;
    let hasil = null;
    for (let mula = 0; mula < f.size; mula += CEBISAN_UP) {
      const b64 = await bacaBase64(f.slice(mula, mula + CEBISAN_UP));
      hasil = await panggil('hantarCebisan', sesi, b64, mula, f.size);
      kemajuan(Math.min(f.size, mula + CEBISAN_UP) / f.size);
    }
    return hasil && hasil.id;
  }

  async function mulaUpload(ev) {
    ev.preventDefault();
    const d = $('#dialog-upload');
    if (d.dataset.sibuk || !failUpload.length) return;
    const btn = $('#btn-mula-upload');
    const r = $('#ralat-upload');
    const bar = $('#kemajuan-upload');
    const isiBar = bar.firstElementChild;
    const jumlahBait = failUpload.reduce((n, it) => n + it.fail.size, 0) || 1;
    const kemasBar = (semasa) => {
      const siap = failUpload.reduce((n, it) => n + (it.status === 'siap' ? it.fail.size : 0), 0);
      isiBar.style.width = `${Math.min(100, ((siap + (semasa ? semasa.fail.size * semasa.p : 0)) / jumlahBait) * 100)}%`;
    };
    d.dataset.sibuk = '1';
    btn.disabled = true;
    r.hidden = true;
    bar.hidden = false;
    kemasBar();
    const folderDibuat = new Set();
    let berjaya = 0;
    let folderTerakhir = '';
    let it = null;
    try {
      const pilihan = $('#borang-upload').elements.folder.value.trim() || 'Utama';
      const jumlah = failUpload.filter((x) => x.status !== 'siap').length;
      while ((it = failUpload.find((x) => x.status !== 'siap'))) {
        isi(btn, el('span', { class: 'pemusing' }), el('span', {}, `Memuat naik ${berjaya + 1}/${jumlah}`));
        const folderId = await idFolder(it.folder || pilihan);
        it.status = 'naik';
        it.p = 0;
        kemasStatus(it);
        if (it.li.scrollIntoView) it.li.scrollIntoView({ block: 'nearest' });
        const semasa = it;
        const id = await uploadSatu(it, folderId, (p) => { semasa.p = p; kemasStatus(semasa); kemasBar(semasa); });
        it.status = 'siap';
        kemasStatus(it);
        kemasBar();
        // Pratonton terus dari fail tempatan, sebab Google ambil masa untuk buat thumbnail
        if (id && (it.fail.type || '').startsWith('image/')) thumbLokal.set(id, URL.createObjectURL(it.fail));
        if (it.folder) folderDibuat.add(it.folder);
        folderTerakhir = folderId;
        berjaya++;
      }
      it = null;
      await tidur(bolehGerak ? 450 : 0);
      delete d.dataset.sibuk;
      tutupDialog(d);
      animasiSeterusnya = true;
      if (folderDibuat.size) {
        folderAktif = '';
        toast(`${berjaya} fail diupload ke ${[...folderDibuat].join(', ')}`, 'ok');
      } else {
        if (folderAktif) folderAktif = folderTerakhir === akarId ? '' : folderTerakhir;
        toast(`${berjaya} fail diupload ke ${namaFolder(folderTerakhir)}`, 'ok');
      }
    } catch (e) {
      if (it) { it.status = 'gagal'; kemasStatus(it); }
      r.textContent = `${berjaya ? `${berjaya} fail berjaya. ` : ''}Gagal: ${mesejRalat(e)}`;
      r.hidden = false;
    } finally {
      delete d.dataset.sibuk;
      btn.disabled = false;
      const baki = failUpload.filter((x) => x.status !== 'siap').length;
      btn.textContent = baki ? `Cuba lagi (${baki} fail)` : 'Upload';
      if (berjaya && token) await muat();
    }
  }

  // ---------- Acara ----------
  $('#btn-urus-profil').addEventListener('click', () => { modUrus = !modUrus; paparProfil(); });
  $('#btn-profil-menu').addEventListener('click', (ev) => menuProfil(ev.currentTarget));
  $('#btn-logo').addEventListener('click', () => { $('#cari').value = ''; bukaPaparan(''); });
  $('#btn-baru').addEventListener('click', (ev) => menuBaru(ev.currentTarget));
  $('#btn-sampah').addEventListener('click', () => (paparanSampah ? bukaPaparan('') : bukaSampah()));
  $('#btn-kosongkan').addEventListener('click', kosongkanSampah);
  $('#btn-pilih').addEventListener('click', () => {
    if (modPilih) { kosongkanPilihan(); return; }
    modPilih = 'butang';
    kemasPilihan();
  });
  $('#btn-batal-pilih').addEventListener('click', kosongkanPilihan);
  $('#btn-pilih-semua').addEventListener('click', pilihSemua);
  $('#pemapar-sebelum').addEventListener('click', () => navPemapar(-1));
  $('#pemapar-seterus').addEventListener('click', () => navPemapar(1));
  $('#pemapar-muat-turun').addEventListener('click', () => { if (pemaparFail) muatTurun(pemaparFail); });
  $('#pemapar-tab').addEventListener('click', () => { if (pemaparFail) bukaTabBaru(pemaparFail); });
  pemapar.addEventListener('close', () => {
    giliranPemapar++;
    pemaparFail = null;
    $('#pemapar-isi').replaceChildren();
    lepasUrlPemapar();
  });
  // Leret kiri/kanan (sentuhan) untuk fail seterusnya; klik di ruang kosong untuk tutup
  {
    const kotak = $('#pemapar-isi');
    let leret = null;
    let baruLeret = false;
    kotak.addEventListener('pointerdown', (ev) => { leret = ev.isPrimary && ev.pointerType !== 'mouse' ? { x: ev.clientX, y: ev.clientY } : null; });
    kotak.addEventListener('pointercancel', () => { leret = null; });
    kotak.addEventListener('pointerup', (ev) => {
      if (!leret) return;
      const dx = ev.clientX - leret.x;
      const dy = ev.clientY - leret.y;
      leret = null;
      const dizum = window.visualViewport && visualViewport.scale > 1.01;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || dizum) return;
      baruLeret = true;
      setTimeout(() => { baruLeret = false; }, 350);
      navPemapar(dx < 0 ? 1 : -1);
    });
    kotak.addEventListener('click', (ev) => { if (ev.target === kotak && !baruLeret) tutupDialog(pemapar); });
  }
  $('#borang-profil').addEventListener('submit', simpanProfil);
  $('#borang-profil').elements.nama.addEventListener('input', () => { if (!pilihanProfil.gambar) paparPilihanProfil(false); });
  $('#btn-pilih-gambar').addEventListener('click', () => $('#input-gambar-profil').click());
  $('#input-gambar-profil').addEventListener('change', pilihGambarProfil);
  $('#btn-buang-gambar').addEventListener('click', () => { pilihanProfil.gambar = ''; gambarBerubah = true; paparPilihanProfil(true); });
  $('#btn-padam-profil').addEventListener('click', padamProfil);
  $('#btn-pilih-latar').addEventListener('click', () => $('#input-latar').click());
  $('#input-latar').addEventListener('change', pilihLatar);
  $('#btn-lalai-latar').addEventListener('click', () => { latarBaru = ''; paparPratontonLatar(''); });
  $('#borang-latar').addEventListener('submit', simpanLatar);
  $('#borang-pin').addEventListener('submit', hantarPin);
  $('#dialog-pin').addEventListener('close', () => { if (pinSelesai) { pinSelesai.gagal('batal'); pinSelesai = null; } });
  $('#input-fail').addEventListener('change', (ev) => { bukaUpload([...ev.target.files].map(itemFail)); ev.target.value = ''; });
  $('#input-folder').addEventListener('change', (ev) => {
    bukaUpload([...ev.target.files].map((f) => itemDariLaluan(f, f.webkitRelativePath || f.name)));
    ev.target.value = '';
  });
  $('#input-fail-tambah').addEventListener('change', (ev) => { tambahItemUpload([...ev.target.files].map(itemFail)); ev.target.value = ''; });
  $('#borang-upload').addEventListener('submit', mulaUpload);
  $('#borang-teks').addEventListener('submit', hantarTeks);
  $('#susun').addEventListener('change', () => { animasiSeterusnya = true; papar(); });
  let tundaCari;
  $('#cari').addEventListener('input', () => { clearTimeout(tundaCari); tundaCari = setTimeout(papar, 120); });
  $('#cari').addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.target.value = ''; papar(); } });
  document.querySelectorAll('.segmen-btn').forEach((b) => b.addEventListener('click', () => {
    if (modPaparan === b.dataset.paparan) return;
    modPaparan = b.dataset.paparan;
    simpanTempatan('upsi-paparan', modPaparan);
    aturMod();
    animasiSeterusnya = true;
    if (token && semua) papar();
  }));
  // Pintasan papan kekunci: "/" untuk cari
  document.addEventListener('keydown', (ev) => {
    if (ev.key === '/' && !$('#skrin-utama').hidden && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
      ev.preventDefault();
      $('#cari').focus();
    }
    if (ev.key === 'Escape' && document.documentElement.classList.contains('ada-modal')) {
      const d = [...document.querySelectorAll('dialog[open]')].pop();
      if (d) tutupDialog(d);
    }
    if (pemapar.open && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && !/VIDEO|AUDIO|INPUT/.test(document.activeElement.tagName)) {
      ev.preventDefault();
      navPemapar(ev.key === 'ArrowLeft' ? -1 : 1);
    }
    if (ev.key === 'Escape' && modPilih && !ev.defaultPrevented && !document.querySelector('dialog[open]') && menuEl.hidden) kosongkanPilihan();
  });

  // Seret & lepas fail ke mana-mana bahagian skrin (hanya bila dalam profil)
  const lapisan = $('#lapisan-seret');
  let kiraSeret = 0;
  const bolehSeret = (ev) => token && [...((ev.dataTransfer && ev.dataTransfer.types) || [])].includes('Files');
  window.addEventListener('dragenter', (ev) => {
    if (!bolehSeret(ev)) return;
    ev.preventDefault();
    kiraSeret++;
    if (!$('#dialog-upload').open) lapisan.hidden = false;
  });
  window.addEventListener('dragover', (ev) => { if (bolehSeret(ev)) ev.preventDefault(); });
  window.addEventListener('dragleave', () => { if (--kiraSeret <= 0) { kiraSeret = 0; lapisan.hidden = true; } });
  window.addEventListener('drop', async (ev) => {
    if (!bolehSeret(ev)) return;
    ev.preventDefault();
    kiraSeret = 0;
    lapisan.hidden = true;
    let items;
    try {
      items = await itemDariSeret(ev.dataTransfer);
    } catch (e) {
      toast(mesejRalat(e), 'ralat');
      return;
    }
    if ($('#dialog-upload').open) tambahItemUpload(items);
    else bukaUpload(items);
  });

  aturMod();
  kenalPasti();
  (async () => {
    // Semak sesi lama serentak dengan memuat profil supaya refresh lebih pantas
    const s = bacaSesi();
    const sah = s && s.token ? panggilTerus('semakSesi', s.token).then(() => true, () => false) : Promise.resolve(false);
    await muatProfil();
    if (!(await pulihSesi(s, sah))) tukarSkrin('skrin-profil');
  })();
})();
