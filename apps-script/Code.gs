/**
 * UPSI-DATA: storan fail peribadi dalam Google Drive (Google Apps Script)
 *
 * Semua fail disimpan dalam folder "UPSI-DATA" di My Drive akaun yang deploy script ni.
 * Setiap subfolder di dalamnya dipaparkan sebagai satu folder dalam website.
 */

const NAMA_AKAR = 'UPSI-DATA';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('UPSI-DATA')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Utiliti ----------

function akar_() {
  const props = PropertiesService.getUserProperties();
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

// Pastikan fail/folder berada di dalam folder UPSI-DATA (terus, atau dalam subfolder satu peringkat)
function pastikanDalam_(item) {
  const akarId = akar_().getId();
  const parents = item.getParents();
  while (parents.hasNext()) {
    const p = parents.next();
    if (p.getId() === akarId) return;
    const atas = p.getParents();
    while (atas.hasNext()) if (atas.next().getId() === akarId) return;
  }
  throw new Error('Item ini bukan dalam folder ' + NAMA_AKAR + '.');
}

function folderDalamAkar_(folderId) {
  const akar = akar_();
  if (!folderId || folderId === akar.getId()) return akar;
  const f = DriveApp.getFolderById(folderId);
  pastikanDalam_(f);
  return f;
}

// ---------- Senarai ----------

function senarai() {
  const akar = akar_();
  const folders = [];
  const it = akar.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    folders.push({ id: f.getId(), nama: f.getName() });
  }

  const ids = [akar.getId()].concat(folders.map(function (f) { return f.id; }));
  const fail = [];
  for (let i = 0; i < ids.length; i += 40) {
    const kump = ids.slice(i, i + 40);
    const q = '(' + kump.map(function (id) { return "'" + id + "' in parents"; }).join(' or ') + ')'
      + " and trashed = false and mimeType != 'application/vnd.google-apps.folder'";
    let token = '';
    do {
      const url = DRIVE_API + '?' + qs_({
        q: q,
        pageSize: 1000,
        pageToken: token,
        fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,parents,thumbnailLink,webViewLink)',
      });
      const data = JSON.parse(api_('get', url).getContentText());
      (data.files || []).forEach(function (f) {
        fail.push({
          id: f.id,
          nama: f.name,
          jenis: f.mimeType || '',
          saiz: Number(f.size || 0),
          tarikh: f.createdTime,
          folderId: (f.parents || []).filter(function (p) { return kump.indexOf(p) >= 0; })[0] || akar.getId(),
          thumb: f.thumbnailLink || '',
          url: f.webViewLink || '',
        });
      });
      token = data.nextPageToken || '';
    } while (token);
  }

  let guna = 0;
  let had = 0;
  try { guna = DriveApp.getStorageUsed(); had = DriveApp.getStorageLimit(); } catch (e) { /* tak semua akaun benarkan */ }

  return {
    akarId: akar.getId(),
    akarUrl: akar.getUrl(),
    emel: Session.getActiveUser().getEmail(),
    folders: folders,
    fail: fail,
    guna: guna,
    had: had,
  };
}

// ---------- Upload (resumable, dihantar dalam cebisan) ----------

function mulaUpload(folderId, nama, jenis, saiz) {
  const folder = folderDalamAkar_(folderId);
  const res = api_('post', UPLOAD_API + '?uploadType=resumable&fields=id', {
    contentType: 'application/json; charset=UTF-8',
    headers: {
      'X-Upload-Content-Type': jenis || 'application/octet-stream',
      'X-Upload-Content-Length': String(saiz),
    },
    payload: JSON.stringify({ name: namaBersih_(nama), parents: [folder.getId()] }),
  });
  const h = res.getAllHeaders();
  const sesi = h.Location || h.location;
  if (!sesi) throw new Error('Google Drive tidak memberi URL upload.');
  return sesi;
}

function hantarCebisan(sesi, b64, mula, jumlah) {
  if (!/^https:\/\/www\.googleapis\.com\/upload\/drive\//.test(sesi)) throw new Error('URL upload tidak sah.');
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

// ---------- Fail ----------

function tukarNamaFail(id, nama) {
  const f = DriveApp.getFileById(id);
  pastikanDalam_(f);
  f.setName(namaBersih_(nama));
}

function pindahFail(id, folderId) {
  const f = DriveApp.getFileById(id);
  pastikanDalam_(f);
  f.moveTo(folderDalamAkar_(folderId));
}

// Fail dipadam masuk ke Sampah Google Drive (boleh dipulihkan dalam 30 hari)
function padamFail(id) {
  const f = DriveApp.getFileById(id);
  pastikanDalam_(f);
  f.setTrashed(true);
}

// ---------- Folder ----------

function folderBaru(nama) {
  nama = namaBersih_(nama);
  const akar = akar_();
  const ada = akar.getFoldersByName(nama);
  return (ada.hasNext() ? ada.next() : akar.createFolder(nama)).getId();
}

function tukarNamaFolder(id, nama) {
  const f = folderDalamAkar_(id);
  if (f.getId() === akar_().getId()) throw new Error('Folder utama tidak boleh ditukar nama.');
  f.setName(namaBersih_(nama));
}

function padamFolder(id) {
  const f = folderDalamAkar_(id);
  if (f.getId() === akar_().getId()) throw new Error('Folder utama tidak boleh dipadam.');
  f.setTrashed(true);
}
