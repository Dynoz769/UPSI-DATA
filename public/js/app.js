(() => {
  'use strict';

  // Fail disimpan terus dalam Supabase Storage: <user_id>/<folder>/<nama fail>
  const BUCKET = 'fail-tugasan';
  const PLACEHOLDER = '.emptyFolderPlaceholder';
  const HAD_FAIL = 50 * 1024 * 1024;
  const HAD_RUANG = 1024 * 1024 * 1024; // pelan percuma Supabase: 1 GB
  const FOLDER_CADANGAN = ['Kerja', 'Peribadi', 'Dokumen', 'Gambar', 'Sijil', 'Nota'];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const $ = (s, el = document) => el.querySelector(s);
  const cfg = window.UPSI_CONFIG || {};

  let sb = null;
  let sudahMula = false;
  let pengguna = null;
  let folders = [];        // nama folder (sebenar dalam storage)
  let semua = [];          // { folder, nama, path, saiz, jenis, tarikh }
  let labelLama = {};      // folder UUID dari versi lama -> tajuk tugasan
  let folderAktif = '';
  let failUpload = [];
  const thumb = new Map(); // path -> signed URL gambar kecil

  try { folderAktif = localStorage.getItem('upsi-folder') || ''; } catch { /* tiada storage */ }

  // ---------- Utiliti ----------
  const el = (tag, attrs = {}, ...anak) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const a of anak.flat()) if (a != null && a !== false) n.append(a);
    return n;
  };

  const tunjuk = (id) => {
    document.querySelectorAll('.skrin').forEach((s) => { s.hidden = s.id !== id; });
  };

  const saiz = (b) => {
    if (b == null) return '';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(i ? 1 : 0)} ${u[i]}`;
  };

  const tarikh = (d) => d
    ? new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const sambungan = (nama) => (nama.includes('.') ? nama.split('.').pop().toLowerCase() : '');

  const isGambar = (f) => f.jenis.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'].includes(sambungan(f.nama));

  const ikonFail = (f) => {
    const ext = sambungan(f.nama);
    if (isGambar(f)) return '🖼️';
    if (ext === 'pdf') return '📕';
    if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext)) return '📝';
    if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return '📊';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return '📈';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
    if (f.jenis.startsWith('video/') || ['mp4', 'mov', 'mkv', 'avi'].includes(ext)) return '🎬';
    if (f.jenis.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(ext)) return '🎵';
    return '📄';
  };

  // Supabase Storage hanya terima huruf/nombor ASCII dan beberapa simbol dalam nama
  const namaSelamat = (n) => n
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w !\-.*'()&$@=;:+,]/g, '_')
    .replace(/\s+/g, ' ').trim()
    .slice(0, 150) || 'fail';

  const namaFolderSelamat = (n) => namaSelamat(n).replace(/^\.+/, '').trim();

  const labelFolder = (f) => labelLama[f] || (UUID.test(f) ? 'Fail lama' : f);

  let toastTimer;
  const toast = (msg, ralat = false) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('ralat', ralat);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  };

  const mesejRalat = (e) => {
    const m = (e && (e.message || e.error_description)) || String(e);
    if (/Invalid login credentials/i.test(m)) return 'Emel atau kata laluan salah.';
    if (/Email not confirmed/i.test(m)) return 'Emel belum disahkan. Semak inbox kau.';
    if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return 'Fail terlalu besar (had 50MB).';
    if (/already exists|Duplicate/i.test(m)) return 'Nama tu dah wujud dalam folder ni.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Tiada sambungan internet atau Supabase tidak dapat dicapai.';
    return m;
  };

  const store = () => sb.storage.from(BUCKET);

  // ---------- Mula ----------
  function mula() {
    if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.startsWith('ISI_') || !window.supabase) {
      tunjuk('skrin-setup');
      return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    sb.auth.onAuthStateChange((_ev, session) => {
      const baru = session?.user || null;
      if (sudahMula && baru?.id === pengguna?.id) return;
      sudahMula = true;
      pengguna = baru;
      // Elak panggil Supabase terus dalam callback auth
      setTimeout(() => (pengguna ? masuk() : tunjuk('skrin-login')), 0);
    });

    pasangAcara();
  }

  async function masuk() {
    $('#emel-pengguna').textContent = pengguna.email || '';
    tunjuk('skrin-utama');
    $('#kosong').hidden = false;
    $('#kosong').textContent = 'Memuatkan…';
    await muat();
  }

  async function senaraiSemua(prefix) {
    const hasil = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await store().list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      hasil.push(...data);
      if (data.length < 1000) return hasil;
    }
  }

  async function muat() {
    try {
      const akar = await senaraiSemua(pengguna.id);
      folders = akar.filter((e) => e.id === null).map((e) => e.name);
      const isi = await Promise.all(folders.map((f) => senaraiSemua(`${pengguna.id}/${f}`)));
      semua = isi.flatMap((list, i) => list
        .filter((e) => e.id !== null && !e.name.startsWith('.'))
        .map((e) => ({
          folder: folders[i],
          nama: e.name,
          path: `${pengguna.id}/${folders[i]}/${e.name}`,
          saiz: e.metadata?.size ?? 0,
          jenis: e.metadata?.mimetype || '',
          tarikh: e.created_at || e.updated_at,
        })));
    } catch (e) {
      toast(mesejRalat(e), true);
      return;
    }

    // Folder dari versi lama dinamakan dengan ID tugasan; guna tajuknya sebagai label
    const lama = folders.filter((f) => UUID.test(f) && !labelLama[f]);
    if (lama.length) {
      const { data } = await sb.from('tugasan').select('id,tajuk').in('id', lama);
      for (const r of data || []) labelLama[r.id] = r.tajuk;
    }

    if (folderAktif && !folders.includes(folderAktif)) folderAktif = '';
    $('#senarai-folder').replaceChildren(
      ...[...new Set([...folders.filter((f) => !UUID.test(f)), ...FOLDER_CADANGAN])].map((f) => el('option', {}, f)),
    );
    papar();
  }

  // ---------- Paparan ----------
  function pilihFolder(f) {
    folderAktif = f;
    try { localStorage.setItem('upsi-folder', f); } catch { /* tiada storage */ }
    papar();
  }

  function papar() {
    const jumlah = semua.reduce((n, f) => n + f.saiz, 0);
    $('#ruang-guna').textContent = `${semua.length} fail · ${saiz(jumlah)}`;
    $('#ruang-had').textContent = ` daripada ${saiz(HAD_RUANG)}`;
    const peratus = Math.min(100, (jumlah / HAD_RUANG) * 100);
    $('#ruang-isi').style.width = `${Math.max(peratus, jumlah ? 0.5 : 0)}%`;
    $('#ruang-isi').classList.toggle('penuh', peratus > 85);

    const bil = (f) => semua.filter((x) => x.folder === f).length;
    const tab = (nilai, label, n) => el('button', {
      class: `tab ${folderAktif === nilai ? 'aktif' : ''}`,
      onclick: () => pilihFolder(nilai),
    }, label, n != null && el('span', { class: 'tab-bil' }, String(n)));
    const tersusun = [...folders].sort((a, b) => labelFolder(a).localeCompare(labelFolder(b)));
    $('#tab-folder').replaceChildren(
      tab('', '🗂️ Semua', semua.length),
      ...tersusun.map((f) => tab(f, `📁 ${labelFolder(f)}`, bil(f))),
      el('button', { class: 'tab tab-baru', onclick: folderBaru }, '+ Folder Baru'),
    );

    $('#tajuk-folder').hidden = !folderAktif;
    if (folderAktif) $('#nama-folder').textContent = `📁 ${labelFolder(folderAktif)}`;

    const q = $('#cari').value.trim().toLowerCase();
    const susun = $('#susun').value;
    const senarai = semua
      .filter((f) => (!folderAktif || f.folder === folderAktif)
        && (!q || `${f.nama} ${labelFolder(f.folder)}`.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (susun === 'nama') return a.nama.localeCompare(b.nama, 'ms', { numeric: true });
        if (susun === 'saiz') return b.saiz - a.saiz;
        return (b.tarikh || '').localeCompare(a.tarikh || '');
      });

    $('#senarai').replaceChildren(...senarai.map(kadFail));
    const k = $('#kosong');
    k.hidden = senarai.length > 0;
    if (!senarai.length) {
      k.replaceChildren(
        el('div', { class: 'kosong-ikon' }, q ? '🔍' : '📂'),
        el('p', {}, q ? 'Tiada fail sepadan.' : folderAktif ? 'Folder ni kosong.' : 'Belum ada fail lagi.'),
        !q && el('p', { class: 'pudar' }, 'Tekan ⬆ Upload Fail, atau seret fail ke sini.'),
      );
    }
    muatThumb(senarai.filter(isGambar));
  }

  function kadFail(f) {
    const gambar = isGambar(f);
    const pratonton = el('button', { class: 'kad-pratonton', title: 'Buka', onclick: () => bukaFail(f) },
      gambar && thumb.has(f.path)
        ? el('img', { src: thumb.get(f.path), alt: '', loading: 'lazy' })
        : el('span', { class: 'kad-ikon', 'data-path': gambar ? f.path : null }, ikonFail(f)));

    return el('article', { class: 'kad' },
      pratonton,
      el('div', { class: 'kad-badan' },
        el('button', { class: 'kad-nama', title: f.nama, onclick: () => bukaFail(f) }, f.nama),
        el('div', { class: 'kad-meta pudar' },
          !folderAktif && el('span', {}, `📁 ${labelFolder(f.folder)}`),
          el('span', {}, saiz(f.saiz)),
          el('span', {}, tarikh(f.tarikh)),
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

  async function muatThumb(list) {
    const perlu = list.filter((f) => !thumb.has(f.path)).map((f) => f.path);
    if (!perlu.length) return;
    const { data } = await store().createSignedUrls(perlu, 3600);
    for (const d of data || []) {
      if (!d.signedUrl) continue;
      thumb.set(d.path, d.signedUrl);
      document.querySelectorAll('.kad-ikon[data-path]').forEach((s) => {
        if (s.dataset.path === d.path) s.replaceWith(el('img', { src: d.signedUrl, alt: '', loading: 'lazy' }));
      });
    }
  }

  // ---------- Tindakan fail ----------
  async function bukaFail(f) {
    const w = window.open('', '_blank'); // buka dulu supaya tak disekat popup blocker
    const { data, error } = await store().createSignedUrl(f.path, 3600);
    if (error) { w?.close(); toast(mesejRalat(error), true); return; }
    if (w) w.location.href = data.signedUrl; else location.href = data.signedUrl;
  }

  async function muatTurun(f) {
    const { data, error } = await store().createSignedUrl(f.path, 120, { download: f.nama });
    if (error) { toast(mesejRalat(error), true); return; }
    const a = el('a', { href: data.signedUrl, download: f.nama });
    document.body.append(a); a.click(); a.remove();
  }

  // Cari nama yang belum digunakan dalam folder: "laporan.pdf" -> "laporan (1).pdf"
  function namaUnik(folder, nama, kecuali = null) {
    const ada = new Set(semua.filter((f) => f.folder === folder && f.path !== kecuali).map((f) => f.nama.toLowerCase()));
    if (!ada.has(nama.toLowerCase())) return nama;
    const titik = nama.lastIndexOf('.');
    const asas = titik > 0 ? nama.slice(0, titik) : nama;
    const ext = titik > 0 ? nama.slice(titik) : '';
    for (let i = 1; ; i++) {
      const cuba = `${asas} (${i})${ext}`;
      if (!ada.has(cuba.toLowerCase())) return cuba;
    }
  }

  async function alih(f, folderBaru, namaBaru) {
    const ke = `${pengguna.id}/${folderBaru}/${namaBaru}`;
    if (ke === f.path) return;
    const { error } = await store().move(f.path, ke);
    if (error) throw error;
    if (thumb.has(f.path)) thumb.delete(f.path);
  }

  function tukarNamaFail(f) {
    mintaTeks({
      tajuk: 'Tukar nama fail', label: 'Nama baru', nilai: f.nama,
      pilih: f.nama.lastIndexOf('.') > 0 ? [0, f.nama.lastIndexOf('.')] : null,
      ok: async (v) => {
        const nama = namaSelamat(v);
        if (nama !== f.nama && namaUnik(f.folder, nama, f.path) !== nama) throw new Error('Nama tu dah wujud dalam folder ni.');
        await alih(f, f.folder, nama);
        toast('Nama ditukar');
      },
    });
  }

  function pindahFail(f) {
    mintaTeks({
      tajuk: 'Pindah ke folder', label: 'Folder', nilai: f.folder === folderAktif ? '' : f.folder, senarai: true,
      ok: async (v) => {
        const folder = namaFolderSelamat(v);
        if (!folder) throw new Error('Nama folder tidak sah.');
        if (folder === f.folder) return;
        await alih(f, folder, namaUnik(folder, f.nama));
        toast(`Dipindah ke ${folder}`);
      },
    });
  }

  async function padamFail(f) {
    if (!confirm(`Padam "${f.nama}"? Tindakan ini tidak boleh dibatalkan.`)) return;
    const { error } = await store().remove([f.path]);
    if (error) { toast(mesejRalat(error), true); return; }
    toast('Fail dipadam');
    await muat();
  }

  // ---------- Folder ----------
  function folderBaru() {
    mintaTeks({
      tajuk: 'Folder baru', label: 'Nama folder', nilai: '',
      ok: async (v) => {
        const nama = namaFolderSelamat(v);
        if (!nama) throw new Error('Nama folder tidak sah.');
        if (folders.some((f) => f.toLowerCase() === nama.toLowerCase())) throw new Error('Folder tu dah wujud.');
        const { error } = await store().upload(`${pengguna.id}/${nama}/${PLACEHOLDER}`, new Blob([''], { type: 'text/plain' }));
        if (error) throw error;
        folderAktif = nama;
        try { localStorage.setItem('upsi-folder', nama); } catch { /* tiada storage */ }
      },
    });
  }

  async function isiFolder(folder) {
    return (await senaraiSemua(`${pengguna.id}/${folder}`))
      .filter((e) => e.id !== null)
      .map((e) => `${pengguna.id}/${folder}/${e.name}`);
  }

  function tukarNamaFolder() {
    const lama = folderAktif;
    mintaTeks({
      tajuk: 'Tukar nama folder', label: 'Nama baru', nilai: labelFolder(lama),
      ok: async (v) => {
        const nama = namaFolderSelamat(v);
        if (!nama) throw new Error('Nama folder tidak sah.');
        if (nama === lama) return;
        if (folders.some((f) => f !== lama && f.toLowerCase() === nama.toLowerCase())) throw new Error('Folder tu dah wujud.');
        for (const p of await isiFolder(lama)) {
          const { error } = await store().move(p, `${pengguna.id}/${nama}/${p.split('/').pop()}`);
          if (error) throw error;
          thumb.delete(p);
        }
        folderAktif = nama;
        try { localStorage.setItem('upsi-folder', nama); } catch { /* tiada storage */ }
        toast('Nama folder ditukar');
      },
    });
  }

  async function padamFolder() {
    const f = folderAktif;
    const n = semua.filter((x) => x.folder === f).length;
    if (!confirm(`Padam folder "${labelFolder(f)}"${n ? ` dan ${n} fail di dalamnya` : ''}? Tindakan ini tidak boleh dibatalkan.`)) return;
    try {
      const paths = await isiFolder(f);
      if (paths.length) {
        const { error } = await store().remove(paths);
        if (error) throw error;
      }
    } catch (e) { toast(mesejRalat(e), true); return; }
    folderAktif = '';
    toast('Folder dipadam');
    await muat();
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
    r.hidden = true;
    try {
      await tindakanTeks(v);
      $('#dialog-teks').close();
      await muat();
    } catch (e) {
      r.textContent = mesejRalat(e);
      r.hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- Upload ----------
  function bukaUpload(fileList) {
    failUpload = [];
    tambahFailUpload(fileList);
    if (!failUpload.length) return;
    const b = $('#borang-upload');
    b.elements.folder.value = folderAktif ? folderAktif : (folders.find((f) => !UUID.test(f)) || 'Kerja');
    $('#ralat-upload').hidden = true;
    if (!$('#dialog-upload').open) $('#dialog-upload').showModal();
  }

  function tambahFailUpload(fileList) {
    for (const f of fileList) {
      if (f.size > HAD_FAIL) { toast(`"${f.name}" melebihi 50MB, tidak ditambah.`, true); continue; }
      failUpload.push(f);
    }
    paparUpload();
  }

  function paparUpload() {
    $('#senarai-upload').replaceChildren(...failUpload.map((f, i) => el('li', {},
      el('span', { class: 'fail-nama' }, `${ikonFail({ nama: f.name, jenis: f.type || '' })} ${f.name}`),
      el('span', { class: 'pudar kecil' }, saiz(f.size)),
      el('button', {
        type: 'button', class: 'btn ikon kecil', title: 'Buang', 'aria-label': 'Buang',
        onclick: () => { failUpload.splice(i, 1); paparUpload(); if (!failUpload.length) $('#dialog-upload').close(); },
      }, '✕'),
    )));
    $('#btn-mula-upload').textContent = `Upload ${failUpload.length} fail`;
  }

  async function mulaUpload(ev) {
    ev.preventDefault();
    const btn = $('#btn-mula-upload');
    const r = $('#ralat-upload');
    const folder = namaFolderSelamat($('#borang-upload').elements.folder.value);
    if (!folder) { r.textContent = 'Nama folder tidak sah.'; r.hidden = false; return; }
    r.hidden = true;
    btn.disabled = true;
    const jumlah = failUpload.length;
    let berjaya = 0;
    try {
      while (failUpload.length) {
        const f = failUpload[0];
        btn.textContent = `Upload ${berjaya + 1}/${jumlah}…`;
        const nama = namaUnik(folder, namaSelamat(f.name));
        const path = `${pengguna.id}/${folder}/${nama}`;
        const { error } = await store().upload(path, f, { contentType: f.type || 'application/octet-stream' });
        if (error) throw error;
        // Simpan dalam senarai tempatan supaya fail seterusnya yang sama nama dapat nombor
        semua.push({ folder, nama, path, saiz: f.size, jenis: f.type || '', tarikh: new Date().toISOString() });
        failUpload.shift();
        berjaya++;
        paparUpload();
      }
      $('#dialog-upload').close();
      if (folderAktif) folderAktif = folder;
      toast(`${berjaya} fail diupload ke ${folder} ✔`);
    } catch (e) {
      r.textContent = `${berjaya ? `${berjaya} fail berjaya. ` : ''}Gagal: ${mesejRalat(e)}`;
      r.hidden = false;
    } finally {
      btn.disabled = false;
      paparUpload();
      await muat();
    }
  }

  // ---------- Acara ----------
  function pasangAcara() {
    $('#borang-login').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      const btn = f.querySelector('button');
      const r = $('#ralat-login');
      r.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Sedang log masuk…';
      const { error } = await sb.auth.signInWithPassword({
        email: f.emel.value.trim(),
        password: f.katalaluan.value,
      });
      btn.disabled = false;
      btn.textContent = 'Log Masuk';
      if (error) { r.textContent = mesejRalat(error); r.hidden = false; }
      else f.reset();
    });

    $('#btn-keluar').addEventListener('click', async () => {
      await sb.auth.signOut();
      semua = [];
      folders = [];
      thumb.clear();
    });

    $('#btn-upload').addEventListener('click', () => $('#input-fail').click());
    $('#input-fail').addEventListener('change', (ev) => { bukaUpload(ev.target.files); ev.target.value = ''; });
    $('#input-fail-tambah').addEventListener('change', (ev) => { tambahFailUpload(ev.target.files); ev.target.value = ''; });
    $('#borang-upload').addEventListener('submit', mulaUpload);
    $('#borang-teks').addEventListener('submit', hantarTeks);
    $('#btn-nama-folder').addEventListener('click', tukarNamaFolder);
    $('#btn-padam-folder').addEventListener('click', padamFolder);
    document.querySelectorAll('[data-tutup]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    ['#cari', '#susun'].forEach((s) => $(s).addEventListener('input', papar));

    // Seret & lepas fail ke mana-mana bahagian skrin
    const lapisan = $('#lapisan-seret');
    let kiraSeret = 0;
    const adaFail = (ev) => [...(ev.dataTransfer?.types || [])].includes('Files');
    window.addEventListener('dragenter', (ev) => {
      if (!adaFail(ev) || $('#skrin-utama').hidden) return;
      ev.preventDefault();
      kiraSeret++;
      if (!$('#dialog-upload').open) lapisan.hidden = false;
    });
    window.addEventListener('dragover', (ev) => { if (adaFail(ev)) ev.preventDefault(); });
    window.addEventListener('dragleave', () => { if (--kiraSeret <= 0) { kiraSeret = 0; lapisan.hidden = true; } });
    window.addEventListener('drop', (ev) => {
      if (!adaFail(ev)) return;
      ev.preventDefault();
      kiraSeret = 0;
      lapisan.hidden = true;
      if ($('#skrin-utama').hidden) return;
      if ($('#dialog-upload').open) tambahFailUpload(ev.dataTransfer.files);
      else bukaUpload(ev.dataTransfer.files);
    });
  }

  mula();
})();
