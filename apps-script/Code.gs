/**
 * UPSI-DATA: storan fail dalam Google Drive dengan profil macam Netflix (Google Apps Script)
 *
 * Struktur dalam My Drive akaun yang deploy:
 *   UPSI-DATA/<profil>/<folder>/<fail>
 *
 * Web app di-deploy "Execute as: Me" + "Who has access: Anyone", jadi tiada login.
 * Semua fungsi fail perlukan token sesi yang hanya diberi oleh masukProfil()
 * (selepas PIN disemak, kalau profil ada PIN). Token hanya boleh akses folder profilnya.
 */

const NAMA_AKAR = 'UPSI-DATA';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const MAKS_PROFIL = 10;
const MAKS_CUBA_PIN = 5;
const KUNCI_SAAT = 300;        // kunci profil 5 minit selepas terlalu banyak PIN salah
const SESI_SAAT = 6 * 60 * 60; // token sesi tamat selepas 6 jam
const NAMA_FOLDER_GAMBAR = '_gambar-profil';
const MAKS_GAMBAR_PROFIL = 300 * 1024;   // gambar profil dikecilkan di browser, biasanya < 50KB
const MAKS_GAMBAR_PENUH = 3 * 1024 * 1024; // had gambar penuh sebagai ganti thumbnail
const MAKS_LATAR = 5 * 1024 * 1024;        // gambar latar (sehingga 3840px / 4K, dimampatkan di browser)

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('UPSI-DATA')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Utiliti ----------

function akar_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('AKAR_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* folder dah dipadam, buat semula */ }
  }
  const ada = DriveApp.getRootFolder().getFoldersByName(NAMA_AKAR);
  const f = ada.hasNext() ? ada.next() : DriveApp.createFolder(NAMA_AKAR);
  props.setProperty('AKAR_ID', f.getId());
  return f;
}

function api_(method, url, opts) {
  opts = opts || {};
  const params = {
    method: method,
    headers: Object.assign({ Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, opts.headers || {}),
    muteHttpExceptions: true,
  };
  if (opts.contentType) params.contentType = opts.contentType;
  if (opts.payload != null) params.payload = opts.payload;
  const res = UrlFetchApp.fetch(url, params);
  const kod = res.getResponseCode();
  if (kod >= 400) throw new Error('Google Drive (' + kod + '): ' + res.getContentText().slice(0, 300));
  return res;
}

function qs_(o) {
  return Object.keys(o)
    .filter(function (k) { return o[k] !== '' && o[k] != null; })
    .map(function (k) { return k + '=' + encodeURIComponent(o[k]); })
    .join('&');
}

function namaBersih_(nama) {
  nama = String(nama || '').replace(/[\\/]/g, '_').replace(/\s+/g, ' ').trim();
  if (!nama) throw new Error('Nama tidak sah.');
  return nama.slice(0, 200);
}

function hash_(teks) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, teks, Utilities.Charset.UTF_8));
}

function cache_() {
  return CacheService.getScriptCache();
}

// ---------- Siapa pengguna ni? ----------
// Google hanya beri email pelawat bila dia pemilik script atau dari domain yang sama
// (cth. semua @moe-dl.edu.my kalau script di-deploy dengan akaun MOE). Untuk akaun lain,
// guna kunci tanpa nama yang tetap untuk orang yang sama, supaya masih boleh dibezakan.
function pengguna_() {
  let emel = '';
  let kunci = '';
  try { emel = Session.getActiveUser().getEmail() || ''; } catch (e) { /* tiada akses */ }
  if (!emel) {
    try { kunci = Session.getTemporaryActiveUserKey() || ''; } catch (e) { /* tiada akses */ }
  }
  return { emel: emel, id: kunci ? 'tanpa-nama-' + hash_(kunci).replace(/[^A-Za-z0-9]/g, '').slice(0, 6) : '' };
}

// Label untuk disimpan: email, atau kod tanpa nama
function labelPengguna_() {
  const u = pengguna_();
  return u.emel || u.id || 'tidak diketahui';
}

function siapaSaya() {
  return pengguna_();
}

// ---------- Profil ----------

function profilSemua_() {
  return JSON.parse(PropertiesService.getScriptProperties().getProperty('PROFIL') || '[]');
}

function simpanProfil_(list) {
  PropertiesService.getScriptProperties().setProperty('PROFIL', JSON.stringify(list));
}

function awam_(p) {
  return {
    id: p.id, nama: p.nama, ikon: p.ikon, warna: p.warna, adaPin: !!p.pin,
    gambar: p.gambarId ? dataGambar_(p.gambarId) : '',
    dibuatOleh: p.dibuatOleh || '', dibuatPada: p.dibuatPada || '',
    latarId: p.latarId || '',
  };
}

// ---------- Gambar profil (disimpan dalam UPSI-DATA/_gambar-profil) ----------

function folderGambar_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('GAMBAR_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* buat semula */ }
  }
  const f = akar_().createFolder(NAMA_FOLDER_GAMBAR);
  props.setProperty('GAMBAR_ID', f.getId());
  return f;
}

// dataUrl: 'data:image/jpeg;base64,...' (sudah dikecilkan di browser)
function simpanGambar_(dataUrl, nama, maks) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Gambar tidak sah.');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > (maks || MAKS_GAMBAR_PROFIL)) throw new Error('Gambar terlalu besar.');
  return folderGambar_().createFile(Utilities.newBlob(bytes, m[1], nama)).getId();
}

function dataGambar_(id) {
  const kunci = 'gb_' + id;
  const ada = cache_().get(kunci);
  if (ada) return ada;
  try {
    const blob = DriveApp.getFileById(id).getBlob();
    const data = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    if (data.length < 100000) cache_().put(kunci, data, SESI_SAAT);
    return data;
  } catch (e) {
    return '';
  }
}

function buangGambar_(id) {
  if (!id) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* dah tiada */ }
  cache_().remove('gb_' + id);
}

function cariProfil_(id) {
  const p = profilSemua_().filter(function (x) { return x.id === id; })[0];
  if (!p) throw new Error('Profil tidak dijumpai.');
  return p;
}

function folderProfilWujud_(p) {
  try { return !DriveApp.getFolderById(p.id).isTrashed(); } catch (e) { return false; }
}

function semakPin_(p, pin) {
  if (!p.pin) return;
  const kunci = 'cuba_' + p.id;
  const cuba = Number(cache_().get(kunci) || 0);
  if (cuba >= MAKS_CUBA_PIN) throw new Error('Terlalu banyak cubaan PIN salah. Cuba lagi dalam 5 minit.');
  if (hash_(p.salt + ':' + String(pin || '')) !== p.pin) {
    cache_().put(kunci, String(cuba + 1), KUNCI_SAAT);
    throw new Error('PIN salah.');
  }
  cache_().remove(kunci);
}

function senaraiProfil() {
  akar_();
  return profilSemua_().filter(folderProfilWujud_).map(awam_);
}

function tambahProfil(nama, ikon, warna, pin, gambar) {
  nama = namaBersih_(nama).slice(0, 30);
  pin = String(pin || '');
  if (pin && !/^\d{4}$/.test(pin)) throw new Error('PIN mesti 4 digit nombor.');
  ikon = String(ikon || '🙂').slice(0, 8);
  warna = /^#[0-9a-f]{6}$/i.test(warna) ? warna : '#3b4fd8';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const list = profilSemua_().filter(folderProfilWujud_);
    if (list.length >= MAKS_PROFIL) throw new Error('Maksimum ' + MAKS_PROFIL + ' profil.');
    if (list.some(function (p) { return p.nama.toLowerCase() === nama.toLowerCase(); })) throw new Error('Nama profil tu dah wujud.');
    const oleh = labelPengguna_();
    const folder = akar_().createFolder(nama);
    folder.setDescription('Profil UPSI-DATA dibuat oleh ' + oleh);
    const salt = Utilities.getUuid();
    const p = {
      id: folder.getId(), nama: nama, ikon: ikon, warna: warna, salt: salt, pin: pin ? hash_(salt + ':' + pin) : '', gambarId: '',
      dibuatOleh: oleh, dibuatPada: new Date().toISOString(),
    };
    if (gambar) p.gambarId = simpanGambar_(gambar, p.id + '.jpg');
    list.push(p);
    simpanProfil_(list);
    return awam_(p);
  } finally {
    lock.releaseLock();
  }
}

// Semak PIN sebelum buka skrin edit profil
function sahPin(id, pin) {
  semakPin_(cariProfil_(id), pin);
  return true;
}

// data: { nama, ikon, warna, gambar } — gambar: undefined = kekal, '' = buang, dataUrl = baru
function kemasProfil(id, pin, data) {
  data = data || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const list = profilSemua_();
    const p = list.filter(function (x) { return x.id === id; })[0];
    if (!p) throw new Error('Profil tidak dijumpai.');
    semakPin_(p, pin);
    if (data.nama != null) {
      const nama = namaBersih_(data.nama).slice(0, 30);
      if (list.some(function (x) { return x.id !== id && x.nama.toLowerCase() === nama.toLowerCase(); })) throw new Error('Nama profil tu dah wujud.');
      p.nama = nama;
      try { DriveApp.getFolderById(id).setName(nama); } catch (e) { /* folder tetap dikenal pasti ikut ID */ }
    }
    if (data.ikon != null) p.ikon = String(data.ikon).slice(0, 8);
    if (data.warna != null && /^#[0-9a-f]{6}$/i.test(data.warna)) p.warna = data.warna;
    if (data.gambar !== undefined && data.gambar !== null) {
      const lama = p.gambarId;
      p.gambarId = data.gambar ? simpanGambar_(data.gambar, p.id + '.jpg') : '';
      buangGambar_(lama);
    }
    simpanProfil_(list);
    return awam_(p);
  } finally {
    lock.releaseLock();
  }
}

function masukProfil(id, pin) {
  const p = cariProfil_(id);
  semakPin_(p, pin);
  const token = Utilities.getUuid();
  cache_().put('t_' + token, p.id, SESI_SAAT);
  return token;
}

// Profil dipadam beserta semua failnya (masuk Sampah Google Drive, boleh dipulihkan 30 hari)
function padamProfil(id, pin) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = cariProfil_(id);
    semakPin_(p, pin);
    try { DriveApp.getFolderById(p.id).setTrashed(true); } catch (e) { /* folder dah tiada */ }
    buangGambar_(p.gambarId);
    buangGambar_(p.latarId);
    simpanProfil_(profilSemua_().filter(function (x) { return x.id !== id; }));
  } finally {
    lock.releaseLock();
  }
}

// Folder profil untuk token sesi; ralat SESI_TAMAT buat website kembali ke skrin pilih profil
function profil_(token) {
  const id = token ? cache_().get('t_' + token) : null;
  if (!id) throw new Error('SESI_TAMAT');
  if (!profilSemua_().some(function (p) { return p.id === id; })) throw new Error('SESI_TAMAT');
  return DriveApp.getFolderById(id);
}

// ---------- Latar belakang profil ----------

// Gambar latar sendiri untuk profil token ini. '' = guna latar 3D lalai
function tukarLatar(token, dataUrl) {
  const asas = profil_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const list = profilSemua_();
    const p = list.filter(function (x) { return x.id === asas.getId(); })[0];
    if (!p) throw new Error('SESI_TAMAT');
    const lama = p.latarId;
    p.latarId = dataUrl ? simpanGambar_(dataUrl, p.id + '-latar.jpg', MAKS_LATAR) : '';
    simpanProfil_(list);
    buangGambar_(lama);
    return { latarId: p.latarId || '' };
  } finally {
    lock.releaseLock();
  }
}

function latarProfil(token) {
  const asas = profil_(token);
  const p = profilSemua_().filter(function (x) { return x.id === asas.getId(); })[0];
  if (!p || !p.latarId) return '';
  try {
    const blob = DriveApp.getFileById(p.latarId).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return '';
  }
}

// Pastikan fail/folder berada dalam folder profil (terus, atau dalam subfolder satu peringkat)
function pastikanDalam_(item, asas) {
  const asasId = asas.getId();
  const parents = item.getParents();
  while (parents.hasNext()) {
    const p = parents.next();
    if (p.getId() === asasId) return;
    const atas = p.getParents();
    while (atas.hasNext()) if (atas.next().getId() === asasId) return;
  }
  throw new Error('Akses ditolak.');
}

function folderDalam_(asas, folderId) {
  if (!folderId || folderId === asas.getId()) return asas;
  const f = DriveApp.getFolderById(folderId);
  pastikanDalam_(f, asas);
  return f;
}

function failDalam_(asas, id) {
  const f = DriveApp.getFileById(id);
  pastikanDalam_(f, asas);
  return f;
}

// ---------- Senarai ----------

function senarai(token) {
  const asas = profil_(token);
  const folders = [];
  const it = asas.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    const m = /dibuat oleh (\S+)/i.exec(f.getDescription() || '');
    folders.push({ id: f.getId(), nama: f.getName(), oleh: m ? m[1] : '' });
  }

  const ids = [asas.getId()].concat(folders.map(function (f) { return f.id; }));
  const fail = [];
  for (let i = 0; i < ids.length; i += 40) {
    const kump = ids.slice(i, i + 40);
    const q = '(' + kump.map(function (id) { return "'" + id + "' in parents"; }).join(' or ') + ')'
      + " and trashed = false and mimeType != 'application/vnd.google-apps.folder'";
    let halaman = '';
    do {
      const url = DRIVE_API + '?' + qs_({
        q: q,
        pageSize: 1000,
        pageToken: halaman,
        fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,parents,thumbnailLink,properties)',
      });
      const data = JSON.parse(api_('get', url).getContentText());
      (data.files || []).forEach(function (f) {
        fail.push({
          id: f.id,
          nama: f.name,
          jenis: f.mimeType || '',
          saiz: Number(f.size || 0),
          tarikh: f.createdTime,
          folderId: (f.parents || []).filter(function (p) { return kump.indexOf(p) >= 0; })[0] || asas.getId(),
          thumb: f.thumbnailLink || '',
          oleh: (f.properties && f.properties.diuploadOleh) || '',
        });
      });
      halaman = data.nextPageToken || '';
    } while (halaman);
  }

  let guna = 0;
  let had = 0;
  try { guna = DriveApp.getStorageUsed(); had = DriveApp.getStorageLimit(); } catch (e) { /* tak semua akaun benarkan */ }

  return { akarId: asas.getId(), folders: folders, fail: fail, guna: guna, had: had };
}

// ---------- Upload (resumable, dihantar dalam cebisan) ----------

function mulaUpload(token, folderId, nama, jenis, saiz) {
  const asas = profil_(token);
  const folder = folderDalam_(asas, folderId);
  const oleh = labelPengguna_();
  const res = api_('post', UPLOAD_API + '?uploadType=resumable&fields=id', {
    contentType: 'application/json; charset=UTF-8',
    headers: {
      'X-Upload-Content-Type': jenis || 'application/octet-stream',
      'X-Upload-Content-Length': String(saiz),
    },
    payload: JSON.stringify({
      name: namaBersih_(nama),
      parents: [folder.getId()],
      description: 'Diupload melalui UPSI-DATA oleh ' + oleh,
      properties: { diuploadOleh: oleh.slice(0, 100) },
    }),
  });
  const h = res.getAllHeaders();
  const sesi = h.Location || h.location;
  if (!sesi) throw new Error('Google Drive tidak memberi URL upload.');
  cache_().put('up_' + hash_(sesi), asas.getId(), SESI_SAAT);
  return sesi;
}

function hantarCebisan(token, sesi, b64, mula, jumlah) {
  const asas = profil_(token);
  if (cache_().get('up_' + hash_(sesi)) !== asas.getId()) throw new Error('Sesi upload tidak sah.');
  const bytes = b64 ? Utilities.base64Decode(b64) : [];
  const julat = jumlah === 0 ? 'bytes */0' : 'bytes ' + mula + '-' + (mula + bytes.length - 1) + '/' + jumlah;
  const res = UrlFetchApp.fetch(sesi, {
    method: 'put',
    contentType: 'application/octet-stream',
    payload: bytes,
    headers: { 'Content-Range': julat, Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  const kod = res.getResponseCode();
  if (kod === 308) return { siap: false };
  if (kod === 200 || kod === 201) return { siap: true, id: JSON.parse(res.getContentText()).id };
  throw new Error('Upload gagal (' + kod + '): ' + res.getContentText().slice(0, 300));
}

// ---------- Muat turun (dihantar dalam cebisan sebab fail tidak dikongsi secara awam) ----------

function bacaCebisan(token, id, mula, panjang) {
  const asas = profil_(token);
  failDalam_(asas, id);
  const res = api_('get', DRIVE_API + '/' + encodeURIComponent(id) + '?alt=media', {
    headers: { Range: 'bytes=' + mula + '-' + (mula + panjang - 1) },
  });
  return Utilities.base64Encode(res.getContent());
}

// Google Docs/Sheets/Slides asli dieksport sebagai PDF (had Google: 10MB)
function eksportPdf(token, id) {
  const asas = profil_(token);
  const f = failDalam_(asas, id);
  const res = api_('get', DRIVE_API + '/' + encodeURIComponent(id) + '/export?mimeType=application%2Fpdf');
  return { b64: Utilities.base64Encode(res.getContent()), nama: f.getName() + '.pdf' };
}

// Gambar kecil untuk pratonton bila thumbnailLink Google tidak boleh dimuat
function gambarKecil(token, id) {
  const f = failDalam_(profil_(token), id);
  let blob = null;
  try { blob = f.getThumbnail(); } catch (e) { /* tiada thumbnail */ }
  if (!blob && /^image\//.test(f.getMimeType()) && f.getSize() <= MAKS_GAMBAR_PENUH) blob = f.getBlob();
  if (!blob) return '';
  return 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

// ---------- Fail ----------

function tukarNamaFail(token, id, nama) {
  failDalam_(profil_(token), id).setName(namaBersih_(nama));
}

function pindahFail(token, id, folderId) {
  const asas = profil_(token);
  failDalam_(asas, id).moveTo(folderDalam_(asas, folderId));
}

// Fail dipadam masuk ke Sampah Google Drive (boleh dipulihkan dalam 30 hari)
function padamFail(token, id) {
  failDalam_(profil_(token), id).setTrashed(true);
}

// ---------- Folder ----------

function folderBaru(token, nama) {
  nama = namaBersih_(nama);
  const asas = profil_(token);
  const ada = asas.getFoldersByName(nama);
  if (ada.hasNext()) return ada.next().getId();
  const f = asas.createFolder(nama);
  f.setDescription('Folder UPSI-DATA dibuat oleh ' + labelPengguna_());
  return f.getId();
}

function tukarNamaFolder(token, id, nama) {
  const asas = profil_(token);
  if (id === asas.getId()) throw new Error('Folder utama tidak boleh ditukar nama.');
  folderDalam_(asas, id).setName(namaBersih_(nama));
}

function padamFolder(token, id) {
  const asas = profil_(token);
  if (id === asas.getId()) throw new Error('Folder utama tidak boleh dipadam.');
  folderDalam_(asas, id).setTrashed(true);
}
