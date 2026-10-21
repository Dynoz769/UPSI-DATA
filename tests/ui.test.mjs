// Ujian antara muka: Index.html sebenar dalam Chromium, dengan Code.gs sebenar di belakang (melalui mock).
// Jalankan: npm test   (perlu `npx playwright install chromium` sekali)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buatGas } from './gasmock.mjs';

const akar = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const HTML = fs.readFileSync(akar('apps-script/Index.html'), 'utf8');

// Meta viewport (Apps Script menambahnya dalam doGet) + google.script.run palsu:
// setiap panggilan dihantar ke Code.gs dalam Node
const SHIM = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>
window.google = { script: { run: (function buat(ok, gagal) {
  return new Proxy({}, { get: (_, k) => {
    if (k === 'withSuccessHandler') return (f) => buat(f, gagal);
    if (k === 'withFailureHandler') return (f) => buat(ok, f);
    return (...a) => window.__gas(k, JSON.stringify(a)).then((r) => {
      r = JSON.parse(r);
      if ('e' in r) gagal && gagal(new Error(r.e)); else ok && ok(r.v);
    });
  } });
})() } };
</script>`;

// PNG sah satu warna (untuk ujian pratonton gambar)
function png(w, h, [r, g, b]) {
  const ketul = (jenis, data) => {
    const panjang = Buffer.alloc(4);
    panjang.writeUInt32BE(data.length);
    const isi = Buffer.concat([Buffer.from(jenis), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(isi));
    return Buffer.concat([panjang, isi, crc]);
  };
  const baris = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) baris.set([r, g, b], 1 + x * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ketul('IHDR', ihdr), ketul('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => baris)))), ketul('IEND', Buffer.alloc(0)),
  ]);
}

// Baca ZIP (direktori pusat + pengepala tempatan) dan sahkan CRC setiap fail
function bacaZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, 'tiada penghujung direktori pusat');
  const bil = buf.readUInt16LE(eocd + 10);
  let o = buf.readUInt32LE(eocd + 16);
  const hasil = {};
  for (let i = 0; i < bil; i++) {
    assert.equal(buf.readUInt32LE(o), 0x02014b50);
    const crc = buf.readUInt32LE(o + 16);
    const saiz = buf.readUInt32LE(o + 20);
    const pn = buf.readUInt16LE(o + 28);
    const lokal = buf.readUInt32LE(o + 42);
    const nama = buf.toString('utf8', o + 46, o + 46 + pn);
    assert.equal(buf.readUInt32LE(lokal), 0x04034b50);
    const mula = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28);
    const data = buf.subarray(mula, mula + saiz);
    assert.equal(zlib.crc32(data), crc, `CRC ${nama}`);
    hasil[nama] = data.toString();
    o += 46 + pn + buf.readUInt16LE(o + 30) + buf.readUInt16LE(o + 32);
  }
  return hasil;
}

let pelayar;
let folderUji;
before(async () => {
  pelayar = await chromium.launch();
  folderUji = fs.mkdtempSync(path.join(os.tmpdir(), 'upsi-ujian-'));
});
after(async () => {
  await pelayar?.close();
  fs.rmSync(folderUji, { recursive: true, force: true });
});

// Halaman baru dengan Drive palsu yang kosong; sedia(gas) boleh isi data dahulu
async function buka({ sedia, ...pilihanKonteks } = {}) {
  const gas = buatGas(akar('apps-script/Code.gs'));
  gas.sesiPengguna.emel = 'adam@moe-dl.edu.my';
  const data = sedia ? sedia(gas.ctx, gas) : {};
  const konteks = await pelayar.newContext({ viewport: { width: 1280, height: 860 }, ...pilihanKonteks });
  const p = await konteks.newPage();
  const ralat = [];
  p.on('pageerror', (e) => ralat.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.exposeFunction('__gas', (fn, a) => {
    try {
      return JSON.stringify({ v: gas.ctx[fn](...JSON.parse(a)) ?? null });
    } catch (e) {
      return JSON.stringify({ e: e.message });
    }
  });
  const html = HTML.replace('<base target="_top">', `<base target="_top">${SHIM}`);
  await p.route('**/*', (r) => (r.request().url().startsWith('http://ujian.local/') ? r.fulfill({ body: html, contentType: 'text/html' }) : r.abort()));
  await p.goto('http://ujian.local/');
  return { gas, p, ralat, data, tutup: () => konteks.close() };
}

async function masuk(p, nama) {
  await p.click(`.kad-profil:has-text("${nama}")`);
  await p.waitForSelector('#skrin-utama:not([hidden])');
  await p.waitForSelector('#senarai .kad:not(.rangka), #kosong:not([hidden])');
}

const nama = (p, s) => p.locator(`${s} .kad-nama`).allTextContents();
const bilPilih = (p) => p.textContent('#bil-pilih');
async function muatTurun(p, klik) {
  const [d] = await Promise.all([p.waitForEvent('download'), klik()]);
  return { nama: d.suggestedFilename(), isi: fs.readFileSync(await d.path()) };
}

test('upload fail, pemapar dengan navigasi dan muat turun dari pemapar', async () => {
  const { p, ralat, tutup } = await buka({ sedia: (C) => C.tambahProfil('Adam', '', '#4f46e5', '', '') });
  const fail = {
    'gambar1.png': png(40, 30, [220, 40, 40]),
    'gambar2.png': png(30, 40, [40, 90, 220]),
    'nota.txt': Buffer.from('Salam dari UPSI-DATA ✓'),
    'data.bin': Buffer.from([0, 1, 2, 3, 254, 255]),
  };
  for (const [n, isi] of Object.entries(fail)) fs.writeFileSync(path.join(folderUji, n), isi);

  await masuk(p, 'Adam');
  await p.setInputFiles('#input-fail', Object.keys(fail).map((n) => path.join(folderUji, n)));
  await p.waitForSelector('#dialog-upload[open]');
  await p.click('#btn-mula-upload');
  await p.waitForSelector('#dialog-upload', { state: 'hidden' });
  await p.selectOption('#susun', 'nama');
  await p.waitForFunction(() => document.querySelectorAll('#senarai .kad-fail').length === 4);
  assert.deepEqual(await nama(p, '#senarai'), ['data.bin', 'gambar1.png', 'gambar2.png', 'nota.txt']);

  // Klik kad membuka pemapar dalam website (bukan tab baru)
  await p.click('.kad-fail:has-text("gambar1.png") .kad-pratonton');
  await p.waitForSelector('#pemapar[open] #pemapar-isi img');
  assert.ok(await p.$eval('#pemapar-isi img', (i) => i.complete && i.naturalWidth === 40));
  assert.match(await p.textContent('#pemapar-info'), /^2 \/ 4/);

  await p.keyboard.press('ArrowRight');
  await p.waitForFunction(() => document.querySelector('#pemapar-nama').textContent === 'gambar2.png' && document.querySelector('#pemapar-isi img')?.naturalWidth === 30);
  await p.click('#pemapar-seterus');
  await p.waitForSelector('#pemapar-isi pre');
  assert.equal(await p.textContent('#pemapar-isi pre'), 'Salam dari UPSI-DATA ✓');
  assert.equal(await p.isDisabled('#pemapar-seterus'), true);

  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowLeft');
  await p.waitForFunction(() => document.querySelector('#pemapar-nama').textContent === 'data.bin');
  assert.match(await p.textContent('#pemapar-isi .pemapar-kad'), /Pratonton tidak tersedia/);
  assert.equal(await p.isDisabled('#pemapar-sebelum'), true);

  const turun = await muatTurun(p, () => p.click('#pemapar-muat-turun'));
  assert.equal(turun.nama, 'data.bin');
  assert.ok(turun.isi.equals(fail['data.bin']));

  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !document.querySelector('#pemapar').open);
  assert.equal(await p.$eval('#pemapar-isi', (e) => e.childElementCount), 0);
  assert.deepEqual(ralat, []);
  await tutup();
});

test('Sampah: padam, lihat, pulihkan dan kosongkan', async () => {
  const { p, gas, ralat, tutup, data } = await buka({
    sedia: (C, g) => {
      const adam = C.tambahProfil('Adam', '', '#4f46e5', '', '');
      const t = C.masukProfil(adam.id, '');
      g.tambahFail(adam.id, 'a.txt', 'text/plain', 'a');
      const kerja = C.folderBaru(t, 'Kerja');
      g.tambahFail(kerja, 'b.txt', 'text/plain', 'b');
      return { kerja };
    },
  });
  await masuk(p, 'Adam');
  await p.click('#senarai .kad:has-text("a.txt") .kad-menu');
  await p.click('#menu .menu-item:has-text("Padam")');
  await p.waitForSelector('#senarai .kad:has-text("a.txt")', { state: 'detached' });
  await p.click('#grid-folder .kad:has-text("Kerja") .kad-menu');
  await p.click('#menu .menu-item:has-text("Padam folder")');
  await p.waitForSelector('#kosong:not([hidden])');

  await p.click('#btn-sampah');
  await p.waitForSelector('#nota-sampah:not([hidden])');
  await p.waitForSelector('.kad-sampah');
  assert.match(await p.textContent('#serbuk'), /Sampah/);
  assert.equal(await p.isHidden('#btn-baru'), true);
  assert.equal(await p.isVisible('#btn-kosongkan'), true);
  assert.deepEqual(await nama(p, '#grid-folder'), ['Kerja']);
  assert.deepEqual(await nama(p, '#senarai'), ['a.txt']);
  assert.match(await p.textContent('#grid-folder .kad-sampah'), /1 fail/);

  // Klik item dalam Sampah buka menu Pulihkan / Padam kekal
  await p.click('#senarai .kad-sampah .kad-pratonton');
  assert.deepEqual(await p.locator('#menu .menu-item').allTextContents(), ['Pulihkan', 'Pilih', 'Padam kekal']);
  await p.click('#menu .menu-item:has-text("Pulihkan")');
  await p.waitForSelector('#senarai .kad-sampah', { state: 'detached' });

  // Kembali ke Utama: fail yang dipulihkan muncul semula
  await p.click('#btn-sampah');
  await p.waitForSelector('#senarai .kad:has-text("a.txt")');
  assert.equal(await p.isVisible('#btn-baru'), true);

  await p.click('#btn-sampah');
  await p.waitForSelector('#grid-folder .kad-sampah');
  await p.click('#btn-kosongkan');
  await p.waitForSelector('#kosong:not([hidden]) >> text=Sampah kosong');
  assert.equal(gas.items.has(data.kerja), false);
  assert.deepEqual(ralat, []);
  await tutup();
});

test('pilih banyak: ZIP, pindah, padam dan padam kekal', async () => {
  const { p, ralat, tutup } = await buka({
    sedia: (C, g) => {
      const adam = C.tambahProfil('Adam', '', '#4f46e5', '', '');
      const t = C.masukProfil(adam.id, '');
      g.tambahFail(adam.id, 'x.txt', 'text/plain', 'XXX');
      g.tambahFail(adam.id, 'y.txt', 'text/plain', 'YYY');
      const foto = C.folderBaru(t, 'Foto');
      g.tambahFail(foto, 'p.txt', 'text/plain', 'PPP');
      g.tambahFail(foto, 'p2.txt', 'text/plain', 'P2');
    },
  });
  await masuk(p, 'Adam');
  await p.selectOption('#susun', 'nama');

  await p.click('#btn-pilih');
  await p.waitForSelector('#bar-pilih:not([hidden])');
  assert.equal(await bilPilih(p), 'Pilih item');
  // Dalam mod pilih, klik kad memilihnya (bukan membuka)
  await p.click('#senarai .kad:has-text("x.txt") .kad-pratonton');
  await p.click('#grid-folder .kad:has-text("Foto") .kad-nama');
  assert.equal(await bilPilih(p), '2 dipilih');
  assert.equal(await p.$eval('#pemapar', (d) => d.open), false);
  assert.equal(await p.isDisabled('#tindakan-pilih button:has-text("Pindah")'), true);

  const zip = await muatTurun(p, () => p.click('#tindakan-pilih button:has-text("Muat turun")'));
  assert.match(zip.nama, /^UPSI-DATA \d{4}-\d{2}-\d{2}\.zip$/);
  assert.deepEqual(bacaZip(zip.isi), { 'Foto/p.txt': 'PPP', 'Foto/p2.txt': 'P2', 'x.txt': 'XXX' });

  // ZIP satu folder melalui menu folder
  await p.click('#btn-batal-pilih');
  await p.waitForSelector('#bar-pilih', { state: 'hidden' });
  await p.click('#grid-folder .kad:has-text("Foto") .kad-menu');
  const zipFolder = await muatTurun(p, () => p.click('#menu .menu-item:has-text("Muat turun (ZIP)")'));
  assert.equal(zipFolder.nama, 'Foto.zip');
  assert.deepEqual(Object.keys(bacaZip(zipFolder.isi)), ['Foto/p.txt', 'Foto/p2.txt']);

  // Pindah dua fail sekali gus (kotak pilih pada kad)
  await p.click('#senarai .kad:has-text("x.txt") .kad-pilih');
  await p.click('#senarai .kad:has-text("y.txt") .kad-pilih');
  assert.equal(await bilPilih(p), '2 dipilih');
  await p.click('#tindakan-pilih button:has-text("Pindah")');
  await p.waitForSelector('#dialog-teks[open]');
  await p.fill('#borang-teks [name=nilai]', 'Foto');
  await p.click('#btn-teks-ok');
  await p.waitForSelector('#dialog-teks', { state: 'hidden' });
  await p.waitForSelector('#bar-pilih', { state: 'hidden' });
  assert.deepEqual(await nama(p, '#senarai'), []);
  assert.match(await p.textContent('#grid-folder .kad'), /4 fail/);

  // Padam semua dalam folder
  await p.click('#grid-folder .kad:has-text("Foto") .kad-pratonton');
  await p.waitForFunction(() => document.querySelectorAll('#senarai .kad-fail').length === 4);
  await p.click('#btn-pilih');
  await p.click('#btn-pilih-semua');
  assert.equal(await bilPilih(p), '4 dipilih');
  assert.equal(await p.textContent('#btn-pilih-semua'), 'Nyahpilih semua');
  await p.click('#tindakan-pilih button:has-text("Padam")');
  await p.waitForSelector('#kosong:not([hidden]) >> text=Folder ni kosong');

  // Padam kekal semua dari Sampah
  await p.click('#btn-sampah');
  await p.waitForFunction(() => document.querySelectorAll('.kad-sampah').length === 4);
  await p.click('#btn-pilih');
  await p.click('#btn-pilih-semua');
  await p.click('#tindakan-pilih button:has-text("Padam kekal")');
  await p.waitForSelector('#kosong:not([hidden]) >> text=Sampah kosong');
  assert.deepEqual(ralat, []);
  await tutup();
});

test('profil diingat selepas refresh, dan dilupakan selepas tukar profil', async () => {
  const { p, ralat, tutup } = await buka({
    sedia: (C, g) => {
      const sara = C.tambahProfil('Sara', '', '#ec4899', '1234', '');
      const kerja = C.folderBaru(C.masukProfil(sara.id, '1234'), 'Kerja');
      g.tambahFail(kerja, 'tugasan.txt', 'text/plain', 't');
    },
  });
  await p.click('.kad-profil:has-text("Sara")');
  await p.waitForSelector('#dialog-pin[open]');
  await p.fill('#borang-pin [name=pin]', '1234');
  await p.click('#btn-pin-ok');
  await p.waitForSelector('#grid-folder .kad:has-text("Kerja")');
  await p.click('#grid-folder .kad:has-text("Kerja") .kad-pratonton');
  await p.waitForSelector('#senarai .kad:has-text("tugasan.txt")');

  await p.reload();
  await p.waitForSelector('#skrin-utama:not([hidden])');
  await p.waitForSelector('#senarai .kad:has-text("tugasan.txt")');
  assert.match(await p.textContent('#serbuk'), /Kerja/);
  assert.equal(await p.$eval('#dialog-pin', (d) => d.open), false);
  assert.equal(await p.isHidden('#skrin-profil'), true);

  await p.click('#btn-profil-menu');
  await p.click('#menu .menu-item:has-text("Tukar profil")');
  await p.waitForSelector('#skrin-profil:not([hidden])');
  await p.reload();
  await p.waitForSelector('#skrin-profil:not([hidden]) .kad-profil');
  assert.equal(await p.isHidden('#skrin-utama'), true);

  // Token yang tamat/palsu tidak dibuka; terus ke skrin profil
  await p.evaluate(() => sessionStorage.setItem('upsi-sesi', JSON.stringify({ token: 'palsu', id: 'x', folder: '' })));
  await p.reload();
  await p.waitForSelector('#skrin-profil:not([hidden]) .kad-profil');
  assert.deepEqual(ralat, []);
  await tutup();
});

test('telefon: tekan lama pada kad mula memilih tanpa membuka fail', async () => {
  const { p, ralat, tutup } = await buka({
    viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true,
    sedia: (C, g) => {
      const adam = C.tambahProfil('Adam', '', '#4f46e5', '', '');
      g.tambahFail(adam.id, 'nota.txt', 'text/plain', 'n');
      g.tambahFail(adam.id, 'lagi.txt', 'text/plain', 'l');
    },
  });
  await masuk(p, 'Adam');
  const kotak = await p.locator('#senarai .kad:has-text("nota.txt") .kad-pratonton').boundingBox();
  const titik = [{ x: kotak.x + kotak.width / 2, y: kotak.y + kotak.height / 2 }];
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: titik });
  await p.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForSelector('#bar-pilih:not([hidden])');
  assert.equal(await bilPilih(p), '1 dipilih');
  assert.equal(await p.$eval('#senarai .kad:has-text("nota.txt")', (k) => k.classList.contains('dipilih')), true);
  await p.waitForTimeout(300);
  assert.equal(await p.$eval('#pemapar', (d) => d.open), false);

  // Ketik kad lain menambah pilihan; buang semua pilihan menamatkan mod pilih
  await p.tap('#senarai .kad:has-text("lagi.txt") .kad-pratonton');
  assert.equal(await bilPilih(p), '2 dipilih');
  await p.tap('#senarai .kad:has-text("lagi.txt") .kad-pratonton');
  await p.tap('#senarai .kad:has-text("nota.txt") .kad-pratonton');
  await p.waitForSelector('#bar-pilih', { state: 'hidden' });
  assert.deepEqual(ralat, []);
  await tutup();
});
