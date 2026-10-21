(() => {
  'use strict';

  const CEBISAN_UP = 8 * 1024 * 1024;   // saiz cebisan upload (gandaan 256KB)
  const CEBISAN_TURUN = 4 * 1024 * 1024; // saiz cebisan muat turun
  const FOLDER_CADANGAN = ['Kerja', 'Peribadi', 'Dokumen', 'Gambar', 'Sijil', 'Nota'];
  const IKON_PROFIL = ['🙂', '😎', '🤓', '🦊', '🐱', '🐼', '🐯', '🦁', '🐸', '🐧', '🌸', '⭐', '🚀', '🎮', '📚', '💼'];
  const WARNA_PROFIL = ['#e50914', '#3b4fd8', '#1d8a4e', '#d97706', '#9333ea', '#0891b2', '#db2777', '#475569'];

  const $ = (s, el = document) => el.querySelector(s);
  const tidur = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const bolehGerak = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const adaHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- Galaksi 3D (canvas) ----------
  // Bintang dalam lengan lingkaran + sfera latar, diputar dalam 3D dan diunjur dengan perspektif.
  // Dilukis ikut devicePixelRatio supaya tajam di skrin 4K/Retina. Berhenti bila tab tersorok.
  const Galaksi = (() => {
    const kanvas = document.getElementById('latar-3d');
    const ctx = kanvas.getContext('2d');
    const WARNA = ['#a78bfa', '#60a5fa', '#22d3ee', '#f472b6', '#ffffff'];
    const sprite = WARNA.map((w) => {
      const n = 64;
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.12, w);
      gr.addColorStop(0.4, `${w}55`);
      gr.addColorStop(1, `${w}00`);
      g.fillStyle = gr;
      g.fillRect(0, 0, n, n);
      return c;
    });
    let w = 0;
    let h = 0;
    let bintang = [];
    let meteor = [];
    let jalan = false;
    let intensiti = 1;
    let mula = performance.now();
    // Kualiti adaptif: turunkan bintang/resolusi kalau peranti tak mampu ~40fps
    let kualiti = 1;
    let bingkai = 0;
    let masaBingkai = 0;
    let akhir = 0;
    const sasaran = { x: 0, y: 0 };
    const semasa = { x: 0, y: 0 };

    function jana() {
      const n = Math.round(Math.min(1500, Math.max(380, (w * h) / 1300)) * kualiti);
      bintang = [];
      for (let i = 0; i < n; i++) {
        if (i < n * 0.78) {
          const lengan = i % 3;
          const r = Math.pow(Math.random(), 0.65);
          const sudut = r * 5.6 + lengan * ((Math.PI * 2) / 3) + (Math.random() - 0.5) * 0.7 * (1 - r * 0.4);
          const sebar = (Math.random() - 0.5) * 0.12 * (1 - r);
          bintang.push({
            x: Math.cos(sudut) * r + sebar, y: (Math.random() - 0.5) * 0.16 * (1.15 - r), z: Math.sin(sudut) * r + sebar,
            s: 0.55 + Math.random() * 1.5, w: r < 0.22 ? 4 : (lengan + (Math.random() < 0.25 ? 1 : 0)) % 4, k: Math.random() * 6.28,
          });
        } else {
          const u = Math.random() * 2 - 1;
          const th = Math.random() * Math.PI * 2;
          const R = 1.7 + Math.random() * 1.6;
          const q = Math.sqrt(1 - u * u);
          bintang.push({ x: q * Math.cos(th) * R, y: u * R, z: q * Math.sin(th) * R, s: 0.35 + Math.random() * 0.8, w: Math.random() < 0.7 ? 4 : 1, k: Math.random() * 6.28 });
        }
      }
    }

    function saiz() {
      const dpr = Math.min(window.devicePixelRatio || 1, kualiti < 1 ? 1.25 : 2.5);
      w = innerWidth;
      h = innerHeight;
      kanvas.width = Math.round(w * dpr);
      kanvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      jana();
    }

    function lukis(masa) {
      const t = (masa - mula) / 1000;
      if (jalan && akhir && kualiti === 1) {
        masaBingkai += masa - akhir;
        if (++bingkai === 90) {
          if (masaBingkai / bingkai > 25) { kualiti = 0.55; saiz(); }
          bingkai = 0;
          masaBingkai = 0;
        }
      }
      akhir = masa;
      semasa.x += (sasaran.x - semasa.x) * 0.045;
      semasa.y += (sasaran.y - semasa.y) * 0.045;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      const putar = t * 0.03 + semasa.x * 0.35;
      const condong = 0.5 + semasa.y * 0.18;
      const cy = Math.cos(putar);
      const sy = Math.sin(putar);
      const cx = Math.cos(condong);
      const sx = Math.sin(condong);
      const skala = Math.min(w, h) * 0.7;
      const kamera = 2.4;
      const ox = w * 0.5 + semasa.x * 30;
      const oy = h * 0.52 + semasa.y * 20;

      // cahaya teras galaksi
      const teras = ctx.createRadialGradient(ox, oy, 0, ox, oy, skala * 0.45);
      teras.addColorStop(0, `rgba(196,181,253,${0.32 * intensiti})`);
      teras.addColorStop(0.35, `rgba(124,92,255,${0.12 * intensiti})`);
      teras.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = teras;
      ctx.fillRect(0, 0, w, h);

      for (const b of bintang) {
        const x = b.x * cy - b.z * sy;
        const z = b.x * sy + b.z * cy;
        const y2 = b.y * cx - z * sx;
        const z2 = b.y * sx + z * cx;
        const d = kamera + z2;
        if (d < 0.15) continue;
        const p = kamera / d;
        const px = ox + x * p * skala;
        const py = oy + y2 * p * skala;
        if (px < -20 || py < -20 || px > w + 20 || py > h + 20) continue;
        const kelip = 0.72 + 0.28 * Math.sin(t * 1.8 + b.k);
        const sz = b.s * p * 2.4 * kelip;
        ctx.globalAlpha = Math.min(1, (0.2 + p * 0.55) * intensiti);
        ctx.drawImage(sprite[b.w], px - sz * 2, py - sz * 2, sz * 4, sz * 4);
      }

      // meteor sekali-sekala
      if (bolehGerak && Math.random() < 0.006 && meteor.length < 2) {
        meteor.push({ x: Math.random() * w, y: Math.random() * h * 0.4, vx: 9 + Math.random() * 7, vy: 3 + Math.random() * 3, hayat: 1 });
      }
      meteor = meteor.filter((m) => m.hayat > 0);
      for (const m of meteor) {
        m.x += m.vx;
        m.y += m.vy;
        m.hayat -= 0.018;
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12);
        g.addColorStop(0, `rgba(255,255,255,${m.hayat * intensiti})`);
        g.addColorStop(1, 'rgba(103,232,249,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 12, m.y - m.vy * 12);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (jalan) requestAnimationFrame(lukis);
    }

    function mulakan() {
      if (jalan) return;
      jalan = bolehGerak;
      requestAnimationFrame(lukis);
    }

    saiz();
    let tundaSaiz;
    addEventListener('resize', () => { clearTimeout(tundaSaiz); tundaSaiz = setTimeout(() => { saiz(); if (!jalan) requestAnimationFrame(lukis); }, 150); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) jalan = false;
      else { akhir = 0; mulakan(); }
    });

    return {
      mulakan,
      intensiti(n) { intensiti = n; if (!jalan) requestAnimationFrame(lukis); },
      arah(x, y) { sasaran.x = x; sasaran.y = y; },
    };
  })();

  // Parallax: tetikus atau kecondongan telefon gerakkan galaksi dan gambar latar
  const latarEl = document.getElementById('latar');
  function gerakLatar(x, y) {
    Galaksi.arah(x, y);
    latarEl.style.setProperty('--px', x.toFixed(3));
    latarEl.style.setProperty('--py', y.toFixed(3));
  }
  if (bolehGerak) {
    addEventListener('pointermove', (ev) => gerakLatar((ev.clientX / innerWidth) * 2 - 1, (ev.clientY / innerHeight) * 2 - 1), { passive: true });
    addEventListener('deviceorientation', (ev) => {
      if (ev.gamma == null) return;
      gerakLatar(Math.max(-1, Math.min(1, ev.gamma / 30)), Math.max(-1, Math.min(1, (ev.beta - 45) / 30)));
    }, { passive: true });
  }

  // Kad condong 3D ikut tetikus, dengan kilauan cahaya di bawah kursor
  let kadCondong = null;
  const lepasCondong = (k) => { ['--rx', '--ry'].forEach((v) => k.style.removeProperty(v)); };
  if (bolehGerak && adaHover) {
    document.addEventListener('pointermove', (ev) => {
      const k = ev.target.closest ? ev.target.closest('.kad:not(.rangka), .kad-profil') : null;
      if (k !== kadCondong) {
        if (kadCondong) lepasCondong(kadCondong);
        kadCondong = k;
      }
      if (!k) return;
      const r = k.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;
      const kuat = k.classList.contains('kad-profil') ? 22 : 12;
      k.style.setProperty('--rx', `${((0.5 - y) * kuat).toFixed(2)}deg`);
      k.style.setProperty('--ry', `${((x - 0.5) * kuat).toFixed(2)}deg`);
      const sasaranKilau = k.querySelector('.avatar') && k.classList.contains('kad-profil') ? k.querySelector('.avatar') : k;
      sasaranKilau.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      sasaranKilau.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    }, { passive: true });
  }

  // Kesan riak pada butang
  document.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest && ev.target.closest('.btn, .tab');
    if (!b || !bolehGerak) return;
    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const riak = document.createElement('span');
    riak.className = 'riak';
    riak.style.cssText = `width:${d}px;height:${d}px;left:${ev.clientX - r.left - d / 2}px;top:${ev.clientY - r.top - d / 2}px`;
    b.append(riak);
    setTimeout(() => riak.remove(), 700);
  });

  // Letupan konfeti dari satu titik
  function letupan(x, y, n = 34) {
    if (!bolehGerak) return;
    const warna = ['#8b6cff', '#22d3ee', '#f472b6', '#facc15', '#3ee69a', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'serpih';
      s.style.background = warna[i % warna.length];
      if (i % 3 === 0) s.style.borderRadius = '50%';
      document.body.append(s);
      const sudut = Math.random() * Math.PI * 2;
      const jarak = 80 + Math.random() * 160;
      const dx = Math.cos(sudut) * jarak;
      const dy = Math.sin(sudut) * jarak - 60;
      s.animate([
        { transform: `translate(${x}px, ${y}px) scale(1) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy + 120}px) scale(.4) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
    }
  }
  const letupanDari = (elem) => {
    if (!elem) return;
    const r = elem.getBoundingClientRect();
    letupan(r.left + r.width / 2, r.top + r.height / 2);
  };

  let token = '';
  let saya = { emel: '', id: '' }; // siapa yang sedang guna website ni
  let profilAktif = null;  // { id, nama, ikon, warna, adaPin }
  let profilList = [];
  let modUrus = false;
  let akarId = '';
  let folders = [];        // { id, nama }
  let semua = [];          // { id, nama, jenis, saiz, tarikh, folderId, thumb }
  let folderAktif = '';    // id folder; '' = Semua
  let failUpload = [];
  let animasiSeterusnya = false; // mainkan animasi masuk kad pada paparan seterusnya

  // Panggil fungsi dalam Code.gs
  const panggilTerus = (fn, ...args) => new Promise((ok, gagal) => {
    google.script.run.withSuccessHandler(ok).withFailureHandler(gagal)[fn](...args);
  });

  // Panggil fungsi fail dengan token; kalau sesi tamat, kembali ke skrin pilih profil
  const panggil = async (fn, ...args) => {
    try {
      return await panggilTerus(fn, token, ...args);
    } catch (e) {
      if (/SESI_TAMAT/.test(e && e.message)) {
        keluarProfil();
        toast('Sesi tamat. Pilih profil semula.', true);
      }
      throw e;
    }
  };

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

  const tunjuk = (id) => {
    document.querySelectorAll('.skrin').forEach((s) => { s.hidden = s.id !== id; });
  };

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

  const ikonFail = (f) => {
    const ext = sambungan(f.nama);
    const j = f.jenis;
    if (j.startsWith('image/')) return '🖼️';
    if (ext === 'pdf' || j === 'application/pdf') return '📕';
    if (j.endsWith('google-apps.document') || ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext)) return '📝';
    if (j.endsWith('google-apps.presentation') || ['ppt', 'pptx', 'key', 'odp'].includes(ext)) return '📊';
    if (j.endsWith('google-apps.spreadsheet') || ['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return '📈';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
    if (j.startsWith('video/')) return '🎬';
    if (j.startsWith('audio/')) return '🎵';
    return '📄';
  };

  const avatar = (p, kelas = '') => (p.gambar
    ? el('span', { class: `avatar ada-gambar ${kelas}`, style: `--c:${p.warna};background-color:${p.warna};background-image:url("${p.gambar}")`, role: 'img', 'aria-label': p.nama || 'Gambar profil' })
    : el('span', { class: `avatar ${kelas}`, style: `--c:${p.warna};background:linear-gradient(145deg, ${p.warna}, ${p.warna}aa)` }, p.ikon));

  // Email, atau "Tanpa nama #kod" untuk akaun yang Google tak dedahkan emelnya
  const labelOleh = (o) => {
    if (!o) return '';
    const m = /^tanpa-nama-(.+)$/.exec(o);
    return m ? `Tanpa nama #${m[1]}` : o;
  };
  const olehSpan = (o) => o && el('span', { class: 'oleh', title: `Oleh ${labelOleh(o)}` }, `👤 ${labelOleh(o)}`);

  async function kenalPasti() {
    try { saya = await panggilTerus('siapaSaya'); } catch { /* biarkan kosong */ }
    const teks = saya.emel
      ? `Anda: ${saya.emel}`
      : `Anda: ${labelOleh(saya.id) || 'tidak dikenal pasti'} (Google tak dedahkan email akaun ni)`;
    $('#saya-profil').textContent = teks;
    $('#saya-header').textContent = saya.emel || labelOleh(saya.id);
    $('#saya-header').title = teks;
  }

  const namaFolder = (id) => (id === akarId ? 'Utama' : (folders.find((f) => f.id === id)?.nama || '?'));

  let toastTimer;
  const toast = (msg, ralat = false, kekal = false) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('ralat', ralat);
    t.hidden = false;
    clearTimeout(toastTimer);
    if (!kekal) toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  };

  const mesejRalat = (e) => {
    const m = (e && e.message) || String(e);
    if (/SESI_TAMAT/.test(m)) return 'Sesi tamat. Pilih profil semula.';
    if (/NetworkError|network/i.test(m)) return 'Sambungan internet terputus. Cuba lagi.';
    return m.replace(/^Exception:\s*/, '');
  };

  // ---------- Profil ----------
  async function muatProfil() {
    try {
      profilList = await panggilTerus('senaraiProfil');
    } catch (e) {
      $('#grid-profil').replaceChildren(el('p', { class: 'ralat' }, mesejRalat(e)));
      return;
    }
    if (!profilList.length) modUrus = false;
    paparProfil();
  }

  function paparProfil() {
    $('#tajuk-profil').textContent = modUrus ? 'Urus Profil' : (profilList.length ? 'Siapa yang guna?' : 'Selamat datang! Buat profil pertama kau.');
    const btnUrus = $('#btn-urus-profil');
    btnUrus.hidden = !profilList.length;
    btnUrus.textContent = modUrus ? 'Siap' : 'Urus Profil';
    btnUrus.classList.toggle('utama', modUrus);

    isi($('#grid-profil'),
      ...profilList.map((p, i) => el('button', {
        class: `kad-profil ${modUrus ? 'urus' : ''}`,
        'data-id': p.id,
        style: `--i:${i};--c:${p.warna}`,
        onclick: () => (modUrus ? bukaEditProfil(p) : masukProfil(p)),
        'aria-label': modUrus ? `Edit profil ${p.nama}` : `Masuk sebagai ${p.nama}`,
      },
        el('span', { class: 'avatar-bungkus' }, avatar(p), modUrus && el('span', { class: 'avatar-padam' }, '✏️')),
        el('span', { class: 'nama-profil' }, p.nama, p.adaPin && el('span', { class: 'kunci', title: 'Dikunci dengan PIN' }, ' 🔒')),
        modUrus && p.dibuatOleh && el('span', { class: 'oleh-profil', title: `Dibuat oleh ${labelOleh(p.dibuatOleh)}` }, labelOleh(p.dibuatOleh)),
      )),
      !modUrus && profilList.length < 10 && el('button', { class: 'kad-profil', style: `--i:${profilList.length}`, onclick: bukaTambahProfil },
        el('span', { class: 'avatar avatar-tambah' }, '+'),
        el('span', { class: 'nama-profil' }, 'Tambah Profil'),
      ),
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
      kad?.classList.remove('memuat');
      if (e !== 'batal') toast(mesejRalat(e), true);
      return;
    } finally {
      kad?.classList.remove('memuat');
    }
    // Peralihan: profil dipilih zoom ke depan, yang lain tenggelam
    if (bolehGerak) {
      kad?.classList.add('dipilih');
      $('#skrin-profil').classList.add('skrin-keluar');
      await tidur(520);
      $('#skrin-profil').classList.remove('skrin-keluar');
    }
    profilAktif = p;
    folderAktif = '';
    semua = [];
    folders = [];
    $('#avatar-kecil').replaceWith(Object.assign(avatar(p, 'avatar-kecil'), { id: 'avatar-kecil' }));
    $('#nama-profil-kecil').textContent = p.nama;
    $('#bahagian-folder').hidden = true;
    $('#tajuk-fail').hidden = true;
    $('#kosong').hidden = true;
    $('#tab-folder').replaceChildren();
    $('#tab-penunjuk').style.opacity = 0;
    // Rangka kad bergemerlapan semasa fail dimuatkan
    $('#senarai').classList.add('animasi');
    $('#senarai').replaceChildren(...Array.from({ length: 8 }, (_, i) => el('div', { class: 'kad rangka', style: `--i:${i}` },
      el('div', { class: 'rangka-gambar' }), el('div', { class: 'rangka-baris' }), el('div', { class: 'rangka-baris pendek' }))));
    tunjuk('skrin-utama');
    mainkan($('#skrin-utama'), 'skrin-masuk');
    pasangLatar(p);
    animasiSeterusnya = true;
    await muat();
  }

  function keluarProfil() {
    token = '';
    profilAktif = null;
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    pasangLatar(null);
    tunjuk('skrin-profil');
    mainkan($('#skrin-profil'), 'skrin-masuk');
    muatProfil();
  }

  // Mainkan animasi CSS sekali (buang kelas bila tamat supaya boleh diulang)
  function mainkan(elem, kelas) {
    if (!elem || !bolehGerak) return;
    elem.classList.remove(kelas);
    void elem.offsetWidth;
    elem.classList.add(kelas);
    elem.addEventListener('animationend', () => elem.classList.remove(kelas), { once: true });
  }

  async function padamProfil() {
    const p = editProfil.profil;
    if (!confirm(`Padam profil "${p.nama}" beserta SEMUA failnya?\nFail akan masuk ke Sampah Google Drive (boleh dipulihkan dalam 30 hari).`)) return;
    try {
      await panggilTerus('padamProfil', p.id, editProfil.pin);
    } catch (e) {
      toast(mesejRalat(e), true);
      return;
    }
    $('#dialog-profil').close();
    toast(`Profil ${p.nama} dipadam`);
    await muatProfil();
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
      $('#dialog-pin').showModal();
      b.elements.pin.focus();
    });
  }

  async function hantarPin(ev) {
    ev.preventDefault();
    const b = $('#borang-pin');
    const pin = b.elements.pin.value;
    const r = $('#ralat-pin');
    if (!/^\d{4}$/.test(pin)) { r.textContent = 'PIN mesti 4 digit.'; r.hidden = false; return; }
    const btn = $('#btn-pin-ok');
    btn.disabled = true;
    r.hidden = true;
    try {
      const hasil = await pinSelesai.semak(pin);
      const { ok } = pinSelesai;
      pinSelesai = null;
      $('#dialog-pin').close();
      ok(hasil);
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
      b.elements.pin.select();
      mainkan(b, 'gegar');
    } finally {
      btn.disabled = false;
    }
  }

  // Dialog tambah / edit profil
  let pilihanProfil = { ikon: IKON_PROFIL[0], warna: WARNA_PROFIL[0], gambar: '' };
  let editProfil = null; // { profil, pin } bila edit; null bila tambah
  let gambarBerubah = false;

  function bukaDialogProfil(p) {
    const b = $('#borang-profil');
    b.reset();
    gambarBerubah = false;
    pilihanProfil = p
      ? { ikon: p.ikon, warna: p.warna, gambar: p.gambar || '' }
      : { ikon: IKON_PROFIL[profilList.length % IKON_PROFIL.length], warna: WARNA_PROFIL[profilList.length % WARNA_PROFIL.length], gambar: '' };
    if (p) b.elements.nama.value = p.nama;
    $('#tajuk-dialog-profil').textContent = p ? 'Edit Profil' : 'Tambah Profil';
    $('#btn-simpan-profil').textContent = p ? 'Simpan' : 'Tambah';
    $('#btn-padam-profil').hidden = !p;
    $('#bahagian-pin-profil').hidden = !!p;
    const info = $('#info-dibuat');
    info.hidden = !(p && (p.dibuatOleh || p.dibuatPada));
    if (!info.hidden) {
      info.textContent = `Dibuat${p.dibuatOleh ? ` oleh ${labelOleh(p.dibuatOleh)}` : ''}${p.dibuatPada ? ` pada ${tarikh(p.dibuatPada)}` : ''}`;
    }
    $('#ralat-profil').hidden = true;
    paparPilihanProfil();
    $('#dialog-profil').showModal();
    b.elements.nama.focus();
  }

  function bukaTambahProfil() {
    editProfil = null;
    bukaDialogProfil(null);
  }

  async function bukaEditProfil(p) {
    let pin = '';
    if (p.adaPin) {
      try {
        pin = await mintaPin(`Masukkan PIN ${p.nama} untuk edit`, async (v) => { await panggilTerus('sahPin', p.id, v); return v; });
      } catch (e) {
        if (e !== 'batal') toast(mesejRalat(e), true);
        return;
      }
    }
    editProfil = { profil: p, pin };
    bukaDialogProfil(p);
  }

  function paparPilihanProfil() {
    const pratonton = avatar({ ...pilihanProfil, nama: $('#borang-profil').elements.nama.value });
    pratonton.id = 'avatar-pratonton';
    $('#avatar-pratonton').replaceWith(pratonton);
    $('#btn-buang-gambar').hidden = !pilihanProfil.gambar;
    $('#btn-pilih-gambar').textContent = pilihanProfil.gambar ? '🖼️ Tukar gambar' : '🖼️ Upload gambar';
    $('#pilih-ikon').replaceChildren(...IKON_PROFIL.map((i) => el('button', {
      type: 'button', class: `pilihan ${!pilihanProfil.gambar && i === pilihanProfil.ikon ? 'aktif' : ''}`, 'aria-label': `Ikon ${i}`,
      onclick: () => { pilihanProfil.ikon = i; if (pilihanProfil.gambar) { pilihanProfil.gambar = ''; gambarBerubah = true; } paparPilihanProfil(); },
    }, i)));
    $('#pilih-warna').replaceChildren(...WARNA_PROFIL.map((w) => el('button', {
      type: 'button', class: `pilihan warna ${w === pilihanProfil.warna ? 'aktif' : ''}`, style: `background:${w}`, 'aria-label': `Warna ${w}`,
      onclick: () => { pilihanProfil.warna = w; paparPilihanProfil(); },
    })));
  }

  // Potong gambar jadi segi empat di tengah dan kecilkan ke 256px (JPEG), supaya ringan untuk disimpan
  async function kecilkanGambar(fail, sisi = 256) {
    const url = URL.createObjectURL(fail);
    try {
      const img = await new Promise((ok, gagal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => gagal(new Error('Fail ni bukan gambar yang boleh dibaca.'));
        i.src = url;
      });
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = sisi;
      c.height = sisi;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, sisi, sisi);
      return c.toDataURL('image/jpeg', 0.85);
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
      paparPilihanProfil();
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
    if (!editProfil && pin && !/^\d{4}$/.test(pin)) { r.textContent = 'PIN mesti 4 digit nombor.'; r.hidden = false; return; }
    const btn = $('#btn-simpan-profil');
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    r.hidden = true;
    try {
      if (editProfil) {
        await panggilTerus('kemasProfil', editProfil.profil.id, editProfil.pin, {
          nama, ikon: pilihanProfil.ikon, warna: pilihanProfil.warna,
          gambar: gambarBerubah ? pilihanProfil.gambar : null,
        });
      } else {
        await panggilTerus('tambahProfil', nama, pilihanProfil.ikon, pilihanProfil.warna, pin, pilihanProfil.gambar);
      }
      $('#dialog-profil').close();
      await muatProfil();
      if (!editProfil) {
        const baru = profilList.find((x) => x.nama.toLowerCase() === nama.toLowerCase());
        if (baru) setTimeout(() => letupanDari(document.querySelector(`.kad-profil[data-id="${baru.id}"] .avatar`)), 700);
      }
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = editProfil ? 'Simpan' : 'Tambah';
    }
  }

  // ---------- Muat fail ----------
  async function muat() {
    let d;
    try {
      d = await panggil('senarai');
    } catch (e) {
      if (!token) return;
      $('#kosong').hidden = false;
      $('#kosong').replaceChildren(el('div', { class: 'kosong-ikon' }, '⚠️'), el('p', {}, mesejRalat(e)));
      return;
    }
    akarId = d.akarId;
    folders = d.folders;
    semua = d.fail;

    $('#ruang-guna').textContent = `${semua.length} fail · ${saiz(semua.reduce((n, f) => n + f.saiz, 0))}`;
    $('#ruang-had').textContent = d.guna
      ? ` · Drive: ${saiz(d.guna)} digunakan${d.had > 0 && d.had < 1e15 ? ` daripada ${saiz(d.had)}` : ''}`
      : '';
    const peratus = d.had > 0 && d.had < 1e15 ? Math.min(100, (d.guna / d.had) * 100) : 0;
    $('.ruang-bar').hidden = !peratus;
    $('#ruang-isi').style.width = `${Math.max(peratus, 0.5)}%`;
    $('#ruang-isi').classList.toggle('penuh', peratus > 85);

    if (folderAktif && folderAktif !== akarId && !folders.some((f) => f.id === folderAktif)) folderAktif = '';
    $('#senarai-folder').replaceChildren(
      ...[...new Set([...folders.map((f) => f.nama), ...FOLDER_CADANGAN])].map((f) => el('option', {}, f)),
    );
    papar();
  }

  // ---------- Paparan ----------
  const susunFail = (list) => {
    const susun = $('#susun').value;
    return list.sort((a, b) => {
      if (susun === 'nama') return a.nama.localeCompare(b.nama, 'ms', { numeric: true });
      if (susun === 'saiz') return b.saiz - a.saiz;
      return (b.tarikh || '').localeCompare(a.tarikh || '');
    });
  };

  // folderAktif '' = halaman utama: kad folder (dengan pratonton) + fail yang tiada folder
  function papar() {
    const bil = (id) => semua.filter((x) => x.folderId === id).length;
    const tab = (id, label, n) => el('button', {
      class: `tab ${folderAktif === id ? 'aktif' : ''}`,
      onclick: () => bukaPaparan(id),
    }, label, n != null && el('span', { class: 'tab-bil' }, String(n)));
    const tersusun = [...folders].sort((a, b) => a.nama.localeCompare(b.nama, 'ms', { numeric: true }));
    isi($('#tab-folder'),
      tab('', '🏠 Utama', null),
      ...tersusun.map((f) => tab(f.id, `📁 ${f.nama}`, bil(f.id))),
      el('button', { class: 'tab tab-baru', onclick: folderBaru }, '+ Folder Baru'),
    );

    const dalamFolder = folderAktif && folderAktif !== akarId;
    $('#tajuk-folder').hidden = !dalamFolder;
    if (dalamFolder) $('#nama-folder').textContent = `📁 ${namaFolder(folderAktif)}`;

    const q = $('#cari').value.trim().toLowerCase();
    const diUtama = !folderAktif && !q;

    // Kad folder: di halaman utama, atau folder yang namanya sepadan dengan carian
    const kadFolderList = !folderAktif
      ? tersusun.filter((f) => !q || f.nama.toLowerCase().includes(q))
      : [];
    $('#bahagian-folder').hidden = !kadFolderList.length;
    $('#grid-folder').replaceChildren(...kadFolderList.map(kadFolder));

    const senarai = susunFail(semua.filter((f) => {
      if (q) return (!folderAktif || f.folderId === folderAktif) && `${f.nama} ${namaFolder(f.folderId)}`.toLowerCase().includes(q);
      return f.folderId === (folderAktif || akarId);
    }));
    $('#tajuk-fail').hidden = !(senarai.length && kadFolderList.length);
    $('#senarai').replaceChildren(...senarai.map(kadFail));

    // Kad masuk berperingkat (hanya bila tukar paparan, bukan setiap kali menaip carian)
    const anim = animasiSeterusnya;
    animasiSeterusnya = false;
    let indeks = 0;
    for (const bekas of [$('#grid-folder'), $('#senarai')]) {
      bekas.classList.toggle('animasi', anim);
      for (const k of bekas.children) k.style.setProperty('--i', indeks++);
    }
    requestAnimationFrame(gerakPenunjuk);

    const k = $('#kosong');
    k.hidden = senarai.length > 0 || kadFolderList.length > 0;
    if (!k.hidden) {
      isi(k,
        el('div', { class: 'kosong-ikon' }, q ? '🔍' : '📂'),
        el('p', {}, q ? 'Tiada fail atau folder sepadan.' : diUtama ? 'Belum ada fail lagi.' : 'Folder ni kosong.'),
        !q && el('p', { class: 'pudar' }, 'Tekan ⬆ Upload Fail atau 📁 Upload Folder, atau seret ke sini.'),
      );
    }
  }

  function bukaPaparan(id) {
    folderAktif = id;
    animasiSeterusnya = true;
    papar();
    window.scrollTo({ top: 0, behavior: bolehGerak ? 'smooth' : 'auto' });
  }

  // Penunjuk tab menggelongsor ke tab aktif
  function gerakPenunjuk() {
    const pen = $('#tab-penunjuk');
    const a = $('#tab-folder .tab.aktif');
    if (!a || $('#skrin-utama').hidden) { pen.style.opacity = 0; return; }
    const mulaKali = pen.style.opacity !== '1';
    if (mulaKali) pen.style.transition = 'none';
    pen.style.width = `${a.offsetWidth}px`;
    pen.style.height = `${a.offsetHeight}px`;
    pen.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
    pen.style.opacity = 1;
    if (mulaKali) { void pen.offsetWidth; pen.style.transition = ''; }
    const bungkus = pen.parentElement;
    if (a.offsetLeft < bungkus.scrollLeft || a.offsetLeft + a.offsetWidth > bungkus.scrollLeft + bungkus.clientWidth) {
      bungkus.scrollTo({ left: a.offsetLeft - 24, behavior: bolehGerak ? 'smooth' : 'auto' });
    }
  }
  addEventListener('resize', () => requestAnimationFrame(gerakPenunjuk));

  // ---------- Pratonton gambar ----------
  // Keutamaan: salinan tempatan (baru diupload) → thumbnail Google → gambar kecil dari server
  const thumbLokal = new Map();  // id fail -> object URL
  const thumbServer = new Map(); // id fail -> Promise<dataUrl | ''>
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

  function gambarPratonton(f, ikonGanti) {
    const ganti = () => el('span', { class: 'kad-ikon' }, ikonGanti);
    const img = el('img', { alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', decoding: 'async' });
    img.addEventListener('load', () => img.classList.add('dimuat'));
    const dariServer = () => {
      ambilThumbServer(f).then((url) => {
        if (url) img.src = url;
        else img.replaceWith(ganti());
      });
    };
    if (thumbLokal.has(f.id)) {
      img.src = thumbLokal.get(f.id);
    } else if (f.thumb) {
      img.addEventListener('error', dariServer, { once: true });
      img.src = f.thumb;
    } else if (f.jenis.startsWith('image/')) {
      dariServer();
    } else {
      return ganti();
    }
    return img;
  }

  function kadFolder(folder) {
    const isiFolder = semua.filter((f) => f.folderId === folder.id);
    const gambar = susunFail(isiFolder.filter(bolehPratonton)).slice(0, 4);
    const jumlah = isiFolder.reduce((n, f) => n + f.saiz, 0);
    const kulit = gambar.length
      ? el('div', { class: `mozek mozek-${gambar.length}` }, gambar.map((f) => el('div', { class: 'mozek-sel' }, gambarPratonton(f, ikonFail(f)))))
      : el('span', { class: 'kad-ikon folder-ikon' }, isiFolder.length ? '📁' : '📂');

    return el('article', { class: 'kad kad-folder' },
      el('button', { class: 'kad-pratonton', title: `Buka folder ${folder.nama}`, onclick: () => bukaPaparan(folder.id) },
        kulit,
        el('span', { class: 'lencana-folder' }, '📁'),
      ),
      el('div', { class: 'kad-badan' },
        el('button', { class: 'kad-nama', title: folder.nama, onclick: () => bukaPaparan(folder.id) }, folder.nama),
        el('div', { class: 'kad-meta pudar' },
          el('span', {}, `${isiFolder.length} fail`),
          jumlah > 0 && el('span', {}, saiz(jumlah)),
          olehSpan(folder.oleh),
        ),
      ),
    );
  }

  function kadFail(f) {
    return el('article', { class: 'kad' },
      el('button', { class: 'kad-pratonton', title: 'Buka', onclick: () => bukaFail(f) }, gambarPratonton(f, ikonFail(f))),
      el('div', { class: 'kad-badan' },
        el('button', { class: 'kad-nama', title: f.nama, onclick: () => bukaFail(f) }, f.nama),
        el('div', { class: 'kad-meta pudar' },
          f.folderId !== (folderAktif || akarId) && el('span', {}, `📁 ${namaFolder(f.folderId)}`),
          f.saiz > 0 && el('span', {}, saiz(f.saiz)),
          el('span', {}, tarikh(f.tarikh)),
          olehSpan(f.oleh),
        ),
        el('div', { class: 'kad-aksi' },
          el('button', { class: 'btn ikon', title: 'Muat turun', 'aria-label': 'Muat turun', onclick: () => muatTurun(f) }, '⬇️'),
          el('button', { class: 'btn ikon', title: 'Tukar nama', 'aria-label': 'Tukar nama', onclick: () => tukarNamaFail(f) }, '✏️'),
          el('button', { class: 'btn ikon', title: 'Pindah folder', 'aria-label': 'Pindah folder', onclick: () => pindahFail(f) }, '📁'),
          el('button', { class: 'btn ikon', title: 'Padam', 'aria-label': 'Padam', onclick: () => padamFail(f) }, '🗑️'),
        ),
      ),
    );
  }

  // ---------- Buka / muat turun (fail diambil melalui server dalam cebisan) ----------
  const base64KeBait = (b64) => {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };

  async function ambilFail(f) {
    if (isGoogleDoc(f)) {
      toast('Menyediakan PDF…', false, true);
      const r = await panggil('eksportPdf', f.id);
      return { blob: new Blob([base64KeBait(r.b64)], { type: 'application/pdf' }), nama: r.nama };
    }
    const bahagian = [];
    for (let mula = 0; mula < f.saiz; mula += CEBISAN_TURUN) {
      toast(`Memuatkan ${f.nama}… ${Math.round((mula / f.saiz) * 100)}%`, false, true);
      bahagian.push(base64KeBait(await panggil('bacaCebisan', f.id, mula, Math.min(CEBISAN_TURUN, f.saiz - mula))));
    }
    return { blob: new Blob(bahagian, { type: f.jenis || 'application/octet-stream' }), nama: f.nama };
  }

  async function bukaFail(f) {
    const w = window.open('', '_blank'); // buka dulu supaya tak disekat popup blocker
    if (w) w.document.write('<p style="font-family:system-ui;padding:20px">Memuatkan…</p>');
    try {
      const { blob } = await ambilFail(f);
      const url = URL.createObjectURL(blob);
      if (w) w.location.href = url; else window.open(url, '_blank');
      $('#toast').hidden = true;
    } catch (e) {
      w?.close();
      toast(mesejRalat(e), true);
    }
  }

  async function muatTurun(f) {
    try {
      const { blob, nama } = await ambilFail(f);
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: nama });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast(`${nama} dimuat turun ✔`);
    } catch (e) {
      toast(mesejRalat(e), true);
    }
  }

  // ---------- Latar belakang profil ----------
  const cacheLatar = new Map(); // latarId -> object URL
  let giliranLatar = 0;
  let latarBaru; // undefined = tiada perubahan, '' = galaksi lalai, dataUrl = gambar baru

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

  // Pasang latar profil (gambar sendiri) atau kembali ke galaksi 3D lalai
  async function pasangLatar(p) {
    const giliran = ++giliranLatar;
    if (!p || !p.latarId) {
      latarEl.classList.remove('ada-gambar');
      Galaksi.intensiti(1);
      return;
    }
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
    $('#latar-gambar-isi').style.backgroundImage = `url("${url}")`;
    latarEl.classList.add('ada-gambar');
    Galaksi.intensiti(0.55);
  }

  // Kecilkan ke maksimum 3840px (4K) dan mampatkan sehingga muat had server
  async function kecilkanLatar(fail) {
    const url = URL.createObjectURL(fail);
    try {
      const img = await muatImej(url);
      for (const [maks, kualiti] of [[3840, 0.88], [3840, 0.76], [2560, 0.8], [1920, 0.78]]) {
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
    k.replaceChildren(el('span', {}, label || (url ? '🖼️ Gambar sendiri' : '✨ Galaksi 3D (lalai)')));
    mainkan(k, 'skrin-masuk');
  }

  function bukaDialogLatar() {
    latarBaru = undefined;
    $('#ralat-latar').hidden = true;
    const id = profilAktif?.latarId;
    paparPratontonLatar(id ? cacheLatar.get(id) : '', id && !cacheLatar.get(id) ? '🖼️ Gambar sendiri' : '');
    $('#dialog-latar').showModal();
  }

  async function pilihLatar(ev) {
    const fail = ev.target.files[0];
    ev.target.value = '';
    if (!fail) return;
    const r = $('#ralat-latar');
    r.hidden = true;
    paparPratontonLatar('', '⏳ Menyediakan gambar 4K…');
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
    if (latarBaru === undefined) { $('#dialog-latar').close(); return; }
    const btn = $('#btn-simpan-latar');
    const r = $('#ralat-latar');
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    r.hidden = true;
    try {
      const { latarId } = await panggil('tukarLatar', latarBaru);
      profilAktif.latarId = latarId;
      const dalamSenarai = profilList.find((x) => x.id === profilAktif.id);
      if (dalamSenarai) dalamSenarai.latarId = latarId;
      if (latarId) cacheLatar.set(latarId, dataUrlKeBlobUrl(latarBaru));
      letupanDari(btn);
      await pasangLatar(profilAktif);
      $('#dialog-latar').close();
      toast(latarId ? 'Latar belakang ditukar ✨' : 'Kembali ke galaksi 3D ✨');
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
      tajuk: 'Folder baru', label: 'Nama folder', nilai: '',
      ok: async (v) => {
        if (folders.some((f) => f.nama.toLowerCase() === v.toLowerCase())) throw new Error('Folder tu dah wujud.');
        folderAktif = await idFolder(v);
      },
    });
  }

  function tukarNamaFolder() {
    const id = folderAktif;
    mintaTeks({
      tajuk: 'Tukar nama folder', label: 'Nama baru', nilai: namaFolder(id),
      ok: async (v) => {
        if (folders.some((f) => f.id !== id && f.nama.toLowerCase() === v.toLowerCase())) throw new Error('Folder tu dah wujud.');
        await panggil('tukarNamaFolder', id, v);
        toast('Nama folder ditukar');
      },
    });
  }

  async function padamFolder() {
    const id = folderAktif;
    const n = semua.filter((x) => x.folderId === id).length;
    if (!confirm(`Padam folder "${namaFolder(id)}"${n ? ` dan ${n} fail di dalamnya` : ''}?\nIa akan masuk ke Sampah Google Drive (boleh dipulihkan dalam 30 hari).`)) return;
    try {
      await panggil('padamFolder', id);
    } catch (e) { toast(mesejRalat(e), true); return; }
    folderAktif = '';
    toast('Folder dipindah ke Sampah');
    await muat();
  }

  // ---------- Fail ----------
  function tukarNamaFail(f) {
    const titik = f.nama.lastIndexOf('.');
    mintaTeks({
      tajuk: 'Tukar nama fail', label: 'Nama baru', nilai: f.nama,
      pilih: titik > 0 ? [0, titik] : null,
      ok: async (v) => {
        await panggil('tukarNamaFail', f.id, v);
        toast('Nama ditukar');
      },
    });
  }

  function pindahFail(f) {
    mintaTeks({
      tajuk: 'Pindah ke folder', label: 'Folder', nilai: '', senarai: true,
      ok: async (v) => {
        const id = await idFolder(v);
        if (id === f.folderId) return;
        await panggil('pindahFail', f.id, id);
        toast(`Dipindah ke ${namaFolder(id)}`);
      },
    });
  }

  async function padamFail(f) {
    if (!confirm(`Padam "${f.nama}"?\nIa akan masuk ke Sampah Google Drive (boleh dipulihkan dalam 30 hari).`)) return;
    try {
      await panggil('padamFail', f.id);
    } catch (e) { toast(mesejRalat(e), true); return; }
    semua = semua.filter((x) => x.id !== f.id);
    papar();
    toast('Fail dipindah ke Sampah');
  }

  // ---------- Dialog teks ----------
  let tindakanTeks = null;
  function mintaTeks({ tajuk, label, nilai, ok, senarai = false, pilih = null }) {
    const b = $('#borang-teks');
    $('#teks-tajuk').textContent = tajuk;
    $('#teks-label').textContent = label;
    $('#ralat-teks').hidden = true;
    b.elements.nilai.value = nilai;
    if (senarai) b.elements.nilai.setAttribute('list', 'senarai-folder');
    else b.elements.nilai.removeAttribute('list');
    tindakanTeks = ok;
    $('#dialog-teks').showModal();
    b.elements.nilai.focus();
    if (pilih) b.elements.nilai.setSelectionRange(...pilih);
    else b.elements.nilai.select();
  }

  async function hantarTeks(ev) {
    ev.preventDefault();
    const btn = $('#btn-teks-ok');
    const r = $('#ralat-teks');
    const v = $('#borang-teks').elements.nilai.value.trim();
    if (!v) return;
    btn.disabled = true;
    btn.textContent = 'Sekejap…';
    r.hidden = true;
    try {
      await tindakanTeks(v);
      await muat();
      $('#dialog-teks').close();
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'OK';
    }
  }

  // ---------- Upload ----------
  // Setiap item: { fail, folder, nama }. folder = nama folder asal (upload folder) atau null (ikut pilihan dialog)
  const itemFail = (fail) => ({ fail, folder: null, nama: fail.name });

  // Fail dari folder: folder teratas jadi folder dalam profil; subfolder diratakan ke dalam nama fail
  const itemDariLaluan = (fail, laluan) => {
    const bahagian = laluan.split('/').filter(Boolean);
    if (bahagian.length < 2) return itemFail(fail);
    return { fail, folder: bahagian[0], nama: bahagian.slice(1).join(' - ') };
  };

  function bukaUpload(items) {
    failUpload = [];
    tambahItemUpload(items);
    if (!failUpload.length) return;
    $('#borang-upload').elements.folder.value = folderAktif && folderAktif !== akarId ? namaFolder(folderAktif) : 'Utama';
    $('#ralat-upload').hidden = true;
    $('#kemajuan-upload').hidden = true;
    if (!$('#dialog-upload').open) $('#dialog-upload').showModal();
  }

  function tambahItemUpload(items) {
    failUpload.push(...items);
    paparUpload();
  }

  function paparUpload() {
    $('#senarai-upload').replaceChildren(...failUpload.map((it, i) => el('li', {},
      el('span', { class: 'fail-nama' }, `${ikonFail({ nama: it.nama, jenis: it.fail.type || '' })} `,
        it.folder && el('b', {}, `${it.folder} / `), it.nama),
      el('span', { class: 'pudar kecil' }, saiz(it.fail.size)),
      el('button', {
        type: 'button', class: 'btn ikon kecil', title: 'Buang', 'aria-label': 'Buang',
        onclick: () => { failUpload.splice(i, 1); paparUpload(); if (!failUpload.length) $('#dialog-upload').close(); },
      }, '✕'),
    )));
    // Pilihan folder hanya perlu untuk fail yang bukan dari folder
    const adaLepas = failUpload.some((it) => !it.folder);
    $('#label-folder-upload').hidden = !adaLepas;
    $('#nota-folder-upload').hidden = !failUpload.some((it) => it.folder);
    const jumlahFolder = new Set(failUpload.filter((it) => it.folder).map((it) => it.folder)).size;
    $('#btn-mula-upload').textContent = jumlahFolder
      ? `Upload ${failUpload.length} fail (${jumlahFolder} folder)`
      : `Upload ${failUpload.length} fail`;
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
    const btn = $('#btn-mula-upload');
    const r = $('#ralat-upload');
    r.hidden = true;
    btn.disabled = true;
    const jumlah = failUpload.length;
    const jumlahBait = failUpload.reduce((n, it) => n + it.fail.size, 0) || 1;
    let baitSiap = 0;
    const bar = $('#kemajuan-upload');
    const isiBar = bar.firstElementChild;
    isiBar.style.width = '0%';
    bar.hidden = false;
    const folderDibuat = new Set();
    let berjaya = 0;
    let folderTerakhir = '';
    try {
      btn.textContent = 'Sekejap…';
      const pilihan = $('#borang-upload').elements.folder.value.trim() || 'Utama';
      while (failUpload.length) {
        const it = failUpload[0];
        const folderId = await idFolder(it.folder || pilihan);
        if (it.folder) folderDibuat.add(it.folder);
        const label = `Upload ${berjaya + 1}/${jumlah}`;
        btn.textContent = `${label}…`;
        const id = await uploadSatu(it, folderId, (p) => {
          btn.textContent = `${label} · ${Math.round(p * 100)}%`;
          isiBar.style.width = `${Math.min(100, ((baitSiap + it.fail.size * p) / jumlahBait) * 100)}%`;
        });
        baitSiap += it.fail.size;
        isiBar.style.width = `${Math.min(100, (baitSiap / jumlahBait) * 100)}%`;
        // Pratonton terus dari fail tempatan, sebab Google ambil masa untuk buat thumbnail
        if (id && (it.fail.type || '').startsWith('image/')) thumbLokal.set(id, URL.createObjectURL(it.fail));
        folderTerakhir = folderId;
        failUpload.shift();
        berjaya++;
        paparUpload();
      }
      letupanDari(btn);
      await tidur(bolehGerak ? 350 : 0);
      $('#dialog-upload').close();
      animasiSeterusnya = true;
      if (folderDibuat.size) {
        folderAktif = '';
        toast(`${berjaya} fail diupload ke ${[...folderDibuat].join(', ')} ✔`);
      } else {
        if (folderAktif) folderAktif = folderTerakhir === akarId ? '' : folderTerakhir;
        toast(`${berjaya} fail diupload ke ${namaFolder(folderTerakhir)} ✔`);
      }
    } catch (e) {
      r.textContent = `${berjaya ? `${berjaya} fail berjaya. ` : ''}Gagal: ${mesejRalat(e)}`;
      r.hidden = false;
    } finally {
      btn.disabled = false;
      paparUpload();
      if (berjaya && token) await muat();
    }
  }

  // ---------- Acara ----------
  $('#btn-urus-profil').addEventListener('click', () => { modUrus = !modUrus; paparProfil(); });
  $('#btn-tukar-profil').addEventListener('click', keluarProfil);
  $('#borang-profil').addEventListener('submit', simpanProfil);
  $('#borang-profil').elements.nama.addEventListener('input', () => { if (pilihanProfil.gambar) paparPilihanProfil(); });
  $('#btn-pilih-gambar').addEventListener('click', () => $('#input-gambar-profil').click());
  $('#input-gambar-profil').addEventListener('change', pilihGambarProfil);
  $('#btn-buang-gambar').addEventListener('click', () => { pilihanProfil.gambar = ''; gambarBerubah = true; paparPilihanProfil(); });
  $('#btn-padam-profil').addEventListener('click', padamProfil);
  $('#btn-latar').addEventListener('click', bukaDialogLatar);
  $('#btn-pilih-latar').addEventListener('click', () => $('#input-latar').click());
  $('#input-latar').addEventListener('change', pilihLatar);
  $('#btn-lalai-latar').addEventListener('click', () => { latarBaru = ''; paparPratontonLatar(''); });
  $('#borang-latar').addEventListener('submit', simpanLatar);
  $('#borang-pin').addEventListener('submit', hantarPin);
  $('#dialog-pin').addEventListener('close', () => { if (pinSelesai) { pinSelesai.gagal('batal'); pinSelesai = null; } });
  $('#btn-upload').addEventListener('click', () => $('#input-fail').click());
  $('#btn-upload-folder').addEventListener('click', () => $('#input-folder').click());
  $('#input-fail').addEventListener('change', (ev) => { bukaUpload([...ev.target.files].map(itemFail)); ev.target.value = ''; });
  $('#input-folder').addEventListener('change', (ev) => {
    bukaUpload([...ev.target.files].map((f) => itemDariLaluan(f, f.webkitRelativePath || f.name)));
    ev.target.value = '';
  });
  $('#input-fail-tambah').addEventListener('change', (ev) => { tambahItemUpload([...ev.target.files].map(itemFail)); ev.target.value = ''; });
  $('#borang-upload').addEventListener('submit', mulaUpload);
  $('#borang-teks').addEventListener('submit', hantarTeks);
  $('#btn-nama-folder').addEventListener('click', tukarNamaFolder);
  $('#btn-padam-folder').addEventListener('click', padamFolder);
  document.querySelectorAll('[data-tutup]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  ['#cari', '#susun'].forEach((s) => $(s).addEventListener('input', papar));

  // Seret & lepas fail ke mana-mana bahagian skrin (hanya bila dalam profil)
  const lapisan = $('#lapisan-seret');
  let kiraSeret = 0;
  const bolehSeret = (ev) => token && [...(ev.dataTransfer?.types || [])].includes('Files');
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
      toast(mesejRalat(e), true);
      return;
    }
    if ($('#dialog-upload').open) tambahItemUpload(items);
    else bukaUpload(items);
  });

  Galaksi.mulakan();
  kenalPasti();
  muatProfil();
})();
