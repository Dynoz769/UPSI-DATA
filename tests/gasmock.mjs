// Mock ringkas persekitaran Google Apps Script + Drive API untuk menjalankan Code.gs sebenar dalam Node.
// Disokong: DriveApp, PropertiesService, CacheService, LockService, Session, Utilities, UrlFetchApp
// (senarai/metadata/upload resumable/muat turun/eksport/patch/padam Drive API v3).
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

const JENIS_FOLDER = 'application/vnd.google-apps.folder';
const bertanda = (buf) => [...buf].map((b) => (b > 127 ? b - 256 : b));
const keBuffer = (bait) => Buffer.from((bait || []).map((b) => b & 255));

export function buatGas(laluanKod) {
  let seq = 0;
  const id = (p) => `${p}${++seq}`;
  // id -> { id, name, folder, parents[], trashed (eksplisit), content: Buffer, mime, created, desc, props }
  const items = new Map();
  const root = { id: 'ROOT', name: 'My Drive', folder: true, parents: [], trashed: false };
  items.set(root.id, root);

  // Item dianggap dalam Sampah kalau ia sendiri, atau mana-mana induknya, dipadam
  const dalamSampah = (it) => !!it && (it.trashed || it.parents.some((p) => dalamSampah(items.get(p))));
  const anak = (fid) => [...items.values()].filter((x) => x.parents.includes(fid) && !x.trashed);
  const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };

  const bungkus = (it) => {
    if (!it) throw new Error('No item with the given ID could be found.');
    const o = {
      getId: () => it.id,
      getName: () => it.name,
      setName: (n) => { it.name = n; return o; },
      isTrashed: () => it.trashed,
      setTrashed: (t) => { it.trashed = t; return o; },
      getParents: () => iter(it.parents.map((p) => bungkus(items.get(p)))),
      getUrl: () => `https://drive.google.com/${it.id}`,
      getDescription: () => it.desc || null,
      setDescription: (d) => { it.desc = d; return o; },
    };
    if (it.folder) {
      Object.assign(o, {
        getFolders: () => iter(anak(it.id).filter((x) => x.folder).map(bungkus)),
        getFoldersByName: (n) => iter(anak(it.id).filter((x) => x.folder && x.name === n).map(bungkus)),
        createFolder: (n) => {
          const f = { id: id('fold'), name: n, folder: true, parents: [it.id], trashed: false, created: new Date().toISOString() };
          items.set(f.id, f);
          return bungkus(f);
        },
        createFile: (blob) => {
          const f = { id: id('file'), name: blob.name, folder: false, parents: [it.id], trashed: false, content: keBuffer(blob.bytes), mime: blob.type, created: new Date().toISOString() };
          items.set(f.id, f);
          return bungkus(f);
        },
      });
    } else {
      Object.assign(o, {
        moveTo: (d) => { it.parents = [d.getId()]; return o; },
        getMimeType: () => it.mime,
        getSize: () => it.content.length,
        getThumbnail: () => null,
        getBlob: () => ({ getContentType: () => it.mime, getBytes: () => bertanda(it.content) }),
      });
    }
    return o;
  };
  const ambil = (i, folder) => {
    const it = items.get(i);
    if (!it || !!it.folder !== folder) throw new Error('No item with the given ID could be found.');
    return bungkus(it);
  };

  const props = {};
  const cache = {};
  const sesiUpload = {};
  const sesiPengguna = { emel: '', kunci: '' };
  const panggilan = [];

  const respons = (kod, badan, kepala = {}) => ({
    getResponseCode: () => kod,
    getContentText: () => (Buffer.isBuffer(badan) ? badan.toString() : badan),
    getContent: () => bertanda(Buffer.isBuffer(badan) ? badan : Buffer.from(badan)),
    getAllHeaders: () => kepala,
  });
  const metaJson = (x) => ({
    id: x.id, name: x.name, mimeType: x.folder ? JENIS_FOLDER : x.mime, parents: x.parents,
    trashed: dalamSampah(x), explicitlyTrashed: !!x.trashed,
    size: x.folder ? undefined : String(x.content.length),
    createdTime: x.created, modifiedTime: x.created, properties: x.props,
  });

  function fetch(url, p) {
    const kaedah = (p.method || 'get').toLowerCase();
    panggilan.push(`${kaedah} ${url.slice(0, 70)}`);
    const u = new URL(url);
    // Upload resumable: hantar cebisan
    if (u.searchParams.get('upload_id')) {
      const s = sesiUpload[u.searchParams.get('upload_id')];
      const cebisan = keBuffer(p.payload);
      const m = /bytes (\d+)-(\d+)\/(\d+)/.exec(p.headers['Content-Range']);
      if (m && Number(m[1]) !== s.buf.length) return respons(400, 'offset salah');
      s.buf = Buffer.concat([s.buf, cebisan]);
      if (s.buf.length < s.panjang) return respons(308, '');
      const f = { id: id('file'), name: s.meta.name, folder: false, parents: s.meta.parents, trashed: false, content: s.buf, mime: s.jenis, created: new Date().toISOString(), desc: s.meta.description, props: s.meta.properties };
      items.set(f.id, f);
      return respons(200, JSON.stringify({ id: f.id }));
    }
    // Upload resumable: mula sesi
    if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable')) {
      const s = id('up');
      sesiUpload[s] = { meta: JSON.parse(p.payload), jenis: p.headers['X-Upload-Content-Type'], panjang: Number(p.headers['X-Upload-Content-Length']), buf: Buffer.alloc(0) };
      return respons(200, '', { Location: `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=${s}` });
    }
    // Senarai (files.list)
    if (url.startsWith('https://www.googleapis.com/drive/v3/files?')) {
      const q = u.searchParams.get('q');
      const induk = [...q.matchAll(/'([^']+)' in parents/g)].map((m) => m[1]);
      const sampah = /trashed = true/.test(q) ? true : /trashed = false/.test(q) ? false : null;
      const folderSahaja = q.includes(`mimeType = '${JENIS_FOLDER}'`);
      const tanpaFolder = q.includes(`mimeType != '${JENIS_FOLDER}'`);
      const files = [...items.values()]
        .filter((x) => x.id !== 'ROOT' && x.parents.some((pp) => induk.includes(pp)))
        .filter((x) => sampah === null || dalamSampah(x) === sampah)
        .filter((x) => (!folderSahaja || x.folder) && (!tanpaFolder || !x.folder))
        .map(metaJson);
      return respons(200, JSON.stringify({ files }));
    }
    const m = /files\/([^/?]+)(\/export)?/.exec(url);
    if (m) {
      const it = items.get(decodeURIComponent(m[1]));
      if (!it) return respons(404, 'tiada');
      if (kaedah === 'delete') {
        const buang = (x) => { for (const c of [...items.values()].filter((y) => y.parents.includes(x.id))) buang(c); items.delete(x.id); };
        buang(it);
        return respons(204, '');
      }
      if (kaedah === 'patch') {
        const badan = JSON.parse(p.payload || '{}');
        if ('trashed' in badan) it.trashed = !!badan.trashed;
        const tambah = u.searchParams.get('addParents');
        const buangInduk = u.searchParams.get('removeParents');
        if (tambah || buangInduk) it.parents = [...it.parents.filter((x) => x !== buangInduk), ...(tambah ? [tambah] : [])];
        return respons(200, JSON.stringify({ id: it.id }));
      }
      if (m[2]) return respons(200, Buffer.from(`%PDF eksport ${it.name}`));
      if (u.searchParams.get('alt') === 'media') {
        const r = /bytes=(\d+)-(\d+)/.exec(p.headers.Range);
        return respons(206, it.content.subarray(Number(r[1]), Number(r[2]) + 1));
      }
      return respons(200, JSON.stringify(metaJson(it)));
    }
    return respons(404, `tiada laluan ${url}`);
  }

  const ctx = {
    console,
    HtmlService: {},
    Session: {
      getActiveUser: () => ({ getEmail: () => sesiPengguna.emel }),
      getTemporaryActiveUserKey: () => sesiPengguna.kunci,
    },
    DriveApp: {
      getFolderById: (i) => ambil(i, true),
      getFileById: (i) => ambil(i, false),
      getRootFolder: () => bungkus(root),
      createFolder: (n) => bungkus(root).createFolder(n),
      getStorageUsed: () => 5e9,
      getStorageLimit: () => 0,
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cache[k] ?? null,
        put: (k, v) => { if (k.length > 250) throw new Error('kunci terlalu panjang'); cache[k] = String(v); },
        remove: (k) => { delete cache[k]; },
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getOAuthToken: () => 'token-palsu' },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_a, t) => bertanda(crypto.createHash('sha256').update(t, 'utf8').digest()),
      base64Encode: (bait) => keBuffer(bait).toString('base64'),
      base64Decode: (s) => bertanda(Buffer.from(s, 'base64')),
      newBlob: (bytes, type, name) => ({ bytes, type, name }),
    },
    UrlFetchApp: { fetch },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(laluanKod, 'utf8'), ctx);

  return {
    ctx,
    items,
    props,
    cache,
    sesiPengguna,
    panggilan,
    dalamSampah: (i) => dalamSampah(items.get(i)),
    tambahFail(induk, name, mime, isi) {
      const f = { id: id('file'), name, folder: false, parents: [induk], trashed: false, content: Buffer.from(isi), mime, created: '2026-10-01T00:00:00Z' };
      items.set(f.id, f);
      return f.id;
    },
  };
}
