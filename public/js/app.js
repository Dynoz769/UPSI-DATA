(() => {
  'use strict';

  const BUCKET = 'fail-tugasan';
  const STATUS_KELAS = {
    'Belum Mula': 'st-belum',
    'Dalam Proses': 'st-proses',
    'Siap': 'st-siap',
    'Dihantar': 'st-hantar',
  };

  const $ = (s, el = document) => el.querySelector(s);
  const cfg = window.UPSI_CONFIG || {};

  let sb = null;
  let sudahMula = false;
  let pengguna = null;
  let semua = [];
  let editId = null;
  let failSedia = [];   // fail yang sudah ada pada tugasan yang sedang diedit
  let failBuang = [];   // fail sedia yang ditanda untuk dipadam
  let failBaru = [];    // File objek yang belum dimuat naik

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
    if (!b && b !== 0) return '';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(i ? 1 : 0)} ${u[i]}`;
  };

  const tarikh = (d) => d
    ? new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const bakiHari = (d) => {
    if (!d) return null;
    const hari = new Date(); hari.setHours(0, 0, 0, 0);
    return Math.round((new Date(d + 'T00:00:00') - hari) / 86400000);
  };

  const ikonFail = (nama = '', jenis = '') => {
    const ext = nama.split('.').pop().toLowerCase();
    if (jenis.startsWith('image/')) return '🖼️';
    if (ext === 'pdf') return '📕';
    if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return '📝';
    if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return '📊';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return '📈';
    if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
    if (jenis.startsWith('video/')) return '🎬';
    if (jenis.startsWith('audio/')) return '🎵';
    return '📄';
  };

  const namaSelamat = (n) => n.normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(-120);

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
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Tiada sambungan internet atau Supabase tidak dapat dicapai.';
    return m;
  };

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
    await muat();
  }

  async function muat() {
    const { data, error } = await sb.from('tugasan').select('*');
    if (error) { toast(mesejRalat(error), true); return; }
    semua = data || [];
    kemasPilihanSemester();
    papar();
  }

  // ---------- Paparan ----------
  function kemasPilihanSemester() {
    const sems = [...new Set(semua.map((t) => t.semester).filter(Boolean))].sort().reverse();
    const sel = $('#tapis-semester');
    const nilai = sel.value;
    sel.replaceChildren(el('option', { value: '' }, 'Semua semester'), ...sems.map((s) => el('option', {}, s)));
    sel.value = sems.includes(nilai) ? nilai : '';
    $('#senarai-semester').replaceChildren(...sems.map((s) => el('option', {}, s)));
  }

  function ditapis() {
    const q = $('#cari').value.trim().toLowerCase();
    const sem = $('#tapis-semester').value;
    const st = $('#tapis-status').value;
    const susun = $('#susun').value;

    const hasil = semua.filter((t) => {
      if (sem && t.semester !== sem) return false;
      if (st && t.status !== st) return false;
      if (!q) return true;
      return [t.tajuk, t.kod_kursus, t.nama_kursus, t.pensyarah, t.jenis, t.nota, ...(t.tag || []), ...(t.fail || []).map((f) => f.nama)]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });

    hasil.sort((a, b) => {
      if (susun === 'baru') return b.created_at.localeCompare(a.created_at);
      if (susun === 'kursus') return (a.kod_kursus || '~').localeCompare(b.kod_kursus || '~') || a.tajuk.localeCompare(b.tajuk);
      return (a.tarikh_hantar || '9999').localeCompare(b.tarikh_hantar || '9999');
    });
    return hasil;
  }

  function papar() {
    const jumlahFail = semua.reduce((n, t) => n + (t.fail?.length || 0), 0);
    const belum = semua.filter((t) => t.status !== 'Dihantar').length;
    const lewat = semua.filter((t) => t.status !== 'Dihantar' && bakiHari(t.tarikh_hantar) < 0).length;
    $('#statistik').replaceChildren(
      kadStat('Jumlah tugasan', semua.length),
      kadStat('Belum dihantar', belum),
      kadStat('Lewat', lewat, lewat ? 'amaran' : ''),
      kadStat('Fail disimpan', jumlahFail),
    );

    const senarai = ditapis();
    $('#senarai').replaceChildren(...senarai.map(kadTugasan));
    const k = $('#kosong');
    k.hidden = senarai.length > 0;
    k.innerHTML = semua.length
      ? 'Tiada tugasan sepadan dengan carian/tapisan.'
      : 'Tiada tugasan lagi. Tekan <b>+ Tugasan Baru</b> untuk mula.';
  }

  const kadStat = (label, nilai, kelas = '') =>
    el('div', { class: `stat ${kelas}` }, el('div', { class: 'stat-nilai' }, String(nilai)), el('div', { class: 'stat-label' }, label));

  function kadTugasan(t) {
    const baki = bakiHari(t.tarikh_hantar);
    let tarikhTeks = null;
    if (t.tarikh_hantar) {
      let ket = '';
      let kelas = '';
      if (t.status !== 'Dihantar' && baki !== null) {
        if (baki < 0) { ket = ` · lewat ${-baki} hari`; kelas = 'lewat'; }
        else if (baki === 0) { ket = ' · hari ini!'; kelas = 'dekat'; }
        else if (baki <= 3) { ket = ` · ${baki} hari lagi`; kelas = 'dekat'; }
      }
      tarikhTeks = el('span', { class: `tarikh ${kelas}` }, `📅 ${tarikh(t.tarikh_hantar)}${ket}`);
    }

    return el('article', { class: 'kad' },
      el('div', { class: 'kad-atas' },
        el('div', { class: 'lencana-baris' },
          t.kod_kursus && el('span', { class: 'lencana kursus' }, t.kod_kursus),
          el('span', { class: `lencana ${STATUS_KELAS[t.status] || ''}` }, t.status),
          t.jenis && el('span', { class: 'lencana' }, t.jenis),
        ),
        el('div', { class: 'kad-aksi' },
          el('button', { class: 'btn ikon', title: 'Edit', 'aria-label': 'Edit', onclick: () => bukaBorang(t) }, '✏️'),
          el('button', { class: 'btn ikon', title: 'Padam', 'aria-label': 'Padam', onclick: () => padam(t) }, '🗑️'),
        ),
      ),
      el('h3', {}, t.tajuk),
      el('div', { class: 'meta' },
        t.nama_kursus && el('span', {}, t.nama_kursus),
        t.semester && el('span', {}, t.semester),
        t.pensyarah && el('span', {}, `👤 ${t.pensyarah}`),
        tarikhTeks,
        t.markah && el('span', { class: 'markah' }, `🏆 ${t.markah}`),
      ),
      t.nota && el('p', { class: 'nota' }, t.nota),
      t.tag?.length ? el('div', { class: 'tag-baris' }, t.tag.map((g) => el('button', {
        class: 'tag', onclick: () => { $('#cari').value = g; papar(); },
      }, `#${g}`))) : null,
      t.fail?.length ? el('ul', { class: 'fail-senarai' }, t.fail.map((f) => el('li', {},
        el('button', { class: 'fail-nama', title: 'Buka', onclick: () => bukaFail(f) }, `${ikonFail(f.nama, f.jenis)} ${f.nama}`),
        el('span', { class: 'pudar kecil' }, saiz(f.saiz)),
        el('button', { class: 'btn ikon kecil', title: 'Muat turun', 'aria-label': 'Muat turun', onclick: () => muatTurun(f) }, '⬇️'),
      ))) : null,
    );
  }

  // ---------- Fail ----------
  async function bukaFail(f) {
    const w = window.open('', '_blank'); // buka dulu supaya tak disekat popup blocker
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(f.path, 3600);
    if (error) { w?.close(); toast(mesejRalat(error), true); return; }
    if (w) w.location.href = data.signedUrl; else location.href = data.signedUrl;
  }

  async function muatTurun(f) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(f.path, 120, { download: f.nama });
    if (error) { toast(mesejRalat(error), true); return; }
    const a = el('a', { href: data.signedUrl, download: f.nama });
    document.body.append(a); a.click(); a.remove();
  }

  function paparFailBorang() {
    const items = [
      ...failSedia.map((f) => {
        const buang = failBuang.includes(f);
        return el('li', { class: buang ? 'dibuang' : '' },
          el('span', { class: 'fail-nama' }, `${ikonFail(f.nama, f.jenis)} ${f.nama}`),
          el('span', { class: 'pudar kecil' }, buang ? 'akan dipadam' : saiz(f.saiz)),
          el('button', {
            type: 'button', class: 'btn ikon kecil', title: buang ? 'Batal padam' : 'Padam',
            onclick: () => { failBuang = buang ? failBuang.filter((x) => x !== f) : [...failBuang, f]; paparFailBorang(); },
          }, buang ? '↩️' : '✕'),
        );
      }),
      ...failBaru.map((f, i) => el('li', { class: 'baru' },
        el('span', { class: 'fail-nama' }, `${ikonFail(f.name, f.type)} ${f.name}`),
        el('span', { class: 'pudar kecil' }, `baru · ${saiz(f.size)}`),
        el('button', {
          type: 'button', class: 'btn ikon kecil', title: 'Buang',
          onclick: () => { failBaru.splice(i, 1); paparFailBorang(); },
        }, '✕'),
      )),
    ];
    $('#fail-sedia').replaceChildren(...items);
  }

  function tambahFail(list) {
    const HAD = 50 * 1024 * 1024;
    for (const f of list) {
      if (f.size > HAD) { toast(`"${f.name}" melebihi 50MB, tidak ditambah.`, true); continue; }
      failBaru.push(f);
    }
    paparFailBorang();
  }

  // ---------- Borang ----------
  function bukaBorang(t = null) {
    const b = $('#borang');
    b.reset();
    editId = t?.id || null;
    failSedia = t ? [...(t.fail || [])] : [];
    failBuang = [];
    failBaru = [];
    $('#tajuk-borang').textContent = t ? 'Edit Tugasan' : 'Tugasan Baru';
    $('#ralat-borang').hidden = true;

    if (t) {
      for (const k of ['tajuk', 'kod_kursus', 'nama_kursus', 'semester', 'pensyarah', 'jenis', 'tarikh_hantar', 'status', 'markah', 'nota']) {
        b.elements[k].value = t[k] ?? '';
      }
      b.elements.tag.value = (t.tag || []).join(', ');
    } else {
      // Isi semester terakhir digunakan untuk jimat masa
      const terkini = [...semua].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
      if (terkini?.semester) b.elements.semester.value = terkini.semester;
    }
    paparFailBorang();
    $('#dialog-borang').showModal();
    b.elements.tajuk.focus();
  }

  function dataBorang() {
    const e = $('#borang').elements;
    const v = (k) => e[k].value.trim() || null;
    return {
      tajuk: e.tajuk.value.trim(),
      kod_kursus: v('kod_kursus')?.toUpperCase() || null,
      nama_kursus: v('nama_kursus'),
      semester: v('semester'),
      pensyarah: v('pensyarah'),
      jenis: v('jenis'),
      tarikh_hantar: v('tarikh_hantar'),
      status: e.status.value,
      markah: v('markah'),
      nota: v('nota'),
      tag: [...new Set(e.tag.value.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean))],
    };
  }

  async function simpan(ev) {
    ev.preventDefault();
    const btn = $('#btn-simpan');
    const ralat = $('#ralat-borang');
    ralat.hidden = true;
    btn.disabled = true;

    try {
      const data = dataBorang();
      let id = editId;

      if (!id) {
        btn.textContent = 'Menyimpan…';
        const { data: row, error } = await sb.from('tugasan').insert(data).select('id').single();
        if (error) throw error;
        id = row.id;
        editId = id; // jika upload gagal, cubaan seterusnya kemas kini rekod yang sama
      }

      let fail = failSedia.filter((f) => !failBuang.includes(f));

      if (failBuang.length) {
        btn.textContent = 'Memadam fail…';
        const { error } = await sb.storage.from(BUCKET).remove(failBuang.map((f) => f.path));
        if (error) throw error;
        failSedia = [...fail];
        failBuang = [];
      }

      const jumlah = failBaru.length;
      while (failBaru.length) {
        const f = failBaru[0];
        btn.textContent = `Memuat naik ${jumlah - failBaru.length + 1}/${jumlah}…`;
        const path = `${pengguna.id}/${id}/${Date.now()}-${namaSelamat(f.name)}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || 'application/octet-stream' });
        if (error) throw error;
        const rekod = { nama: f.name, path, saiz: f.size, jenis: f.type || '' };
        fail.push(rekod);
        failSedia.push(rekod);
        failBaru.shift();
        paparFailBorang();
      }

      btn.textContent = 'Menyimpan…';
      const { error } = await sb.from('tugasan').update({ ...data, fail }).eq('id', id);
      if (error) throw error;

      $('#dialog-borang').close();
      toast('Tugasan disimpan ✔');
      await muat();
    } catch (e) {
      ralat.textContent = mesejRalat(e);
      ralat.hidden = false;
      await muat();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  }

  async function padam(t) {
    const n = t.fail?.length || 0;
    if (!confirm(`Padam "${t.tajuk}"${n ? ` beserta ${n} fail` : ''}? Tindakan ini tidak boleh dibatalkan.`)) return;
    if (n) {
      const { error } = await sb.storage.from(BUCKET).remove(t.fail.map((f) => f.path));
      if (error) { toast(mesejRalat(error), true); return; }
    }
    const { error } = await sb.from('tugasan').delete().eq('id', t.id);
    if (error) { toast(mesejRalat(error), true); return; }
    toast('Tugasan dipadam');
    await muat();
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
    });

    $('#btn-tambah').addEventListener('click', () => bukaBorang());
    $('#borang').addEventListener('submit', simpan);
    document.querySelectorAll('[data-tutup]').forEach((b) => b.addEventListener('click', () => $('#dialog-borang').close()));

    ['#cari', '#tapis-semester', '#tapis-status', '#susun'].forEach((s) => $(s).addEventListener('input', papar));

    $('#input-fail').addEventListener('change', (ev) => { tambahFail(ev.target.files); ev.target.value = ''; });

    const zon = $('#zon-lepas');
    ['dragenter', 'dragover'].forEach((n) => zon.addEventListener(n, (ev) => { ev.preventDefault(); zon.classList.add('aktif'); }));
    ['dragleave', 'drop'].forEach((n) => zon.addEventListener(n, () => zon.classList.remove('aktif')));
    zon.addEventListener('drop', (ev) => { ev.preventDefault(); tambahFail(ev.dataTransfer.files); });
  }

  mula();
})();
