// Ujian Code.gs sebenar (keselamatan profil, fail dan Sampah) dengan mock Apps Script.
// Jalankan: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { buatGas } from './gasmock.mjs';

const KOD = fileURLToPath(new URL('../apps-script/Code.gs', import.meta.url));
const ralat = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };
// Objek dari vm datang dari realm lain; samakan dulu sebelum deepEqual
const j = (x) => JSON.parse(JSON.stringify(x));

function sediakan() {
  const gas = buatGas(KOD);
  const C = gas.ctx;
  gas.sesiPengguna.emel = 'pemilik@moe-dl.edu.my';
  const adam = C.tambahProfil('Adam', '', '#4f46e5', '', '');
  const sara = C.tambahProfil('Sara', '', '#ec4899', '1234', '');
  return { gas, C, adam, sara, tAdam: C.masukProfil(adam.id, ''), tSara: C.masukProfil(sara.id, '1234') };
}

test('profil: PIN disimpan sebagai hash, nama berganda dan PIN tidak sah ditolak', () => {
  const { gas, C } = sediakan();
  assert.ok(!gas.props.PROFIL.includes('1234'));
  assert.equal(ralat(() => C.tambahProfil('adam', '', '#000000', '', '')), 'Nama profil tu dah wujud.');
  assert.equal(ralat(() => C.tambahProfil('Ali', '', '#000000', '12a4', '')), 'PIN mesti 4 digit nombor.');
  assert.deepEqual(j(C.senaraiProfil().map((p) => [p.nama, p.adaPin, p.dibuatOleh])), [['Adam', false, 'pemilik@moe-dl.edu.my'], ['Sara', true, 'pemilik@moe-dl.edu.my']]);
});

test('sesi: token kosong/palsu ditolak, PIN salah ditolak, kunci selepas 5 cubaan', () => {
  const { C, sara } = sediakan();
  assert.equal(ralat(() => C.senarai('')), 'SESI_TAMAT');
  assert.equal(ralat(() => C.senarai('palsu')), 'SESI_TAMAT');
  assert.equal(ralat(() => C.masukProfil(sara.id, '0000')), 'PIN salah.');
  for (let i = 0; i < 4; i++) ralat(() => C.masukProfil(sara.id, '0000'));
  assert.match(ralat(() => C.masukProfil(sara.id, '1234')), /Terlalu banyak cubaan/);
});

test('akses: profil lain tidak boleh baca, ubah, pindah atau guna sesi upload', () => {
  const { gas, C, adam, sara, tAdam, tSara } = sediakan();
  const failSara = gas.tambahFail(sara.id, 'rahsia.pdf', 'application/pdf', 'RAHSIA');
  const failAdam = gas.tambahFail(adam.id, 'a.txt', 'text/plain', 'a');
  assert.equal(ralat(() => C.bacaCebisan(tAdam, failSara, 0, 3)), 'Akses ditolak.');
  assert.equal(ralat(() => C.tukarNamaFail(tAdam, failSara, 'x')), 'Akses ditolak.');
  assert.equal(ralat(() => C.padamFail(tAdam, failSara)), 'Akses ditolak.');
  assert.equal(ralat(() => C.pindahFail(tAdam, failAdam, sara.id)), 'Akses ditolak.');
  assert.equal(Buffer.from(C.bacaCebisan(tSara, failSara, 0, 6), 'base64').toString(), 'RAHSIA');
  const sesi = C.mulaUpload(tSara, '', 'x.bin', 'application/octet-stream', 3);
  assert.equal(ralat(() => C.hantarCebisan(tAdam, sesi, 'AAAA', 0, 3)), 'Sesi upload tidak sah.');
});

test('upload bercebisan menghasilkan fail yang sama dan merekod siapa upload', () => {
  const { gas, C, tAdam } = sediakan();
  const data = Buffer.alloc(9 * 1024 * 1024 + 7, 5);
  const sesi = C.mulaUpload(tAdam, '', 'besar.bin', 'application/octet-stream', data.length);
  const C8 = 8 * 1024 * 1024;
  let hasil;
  for (let m = 0; m < data.length; m += C8) hasil = C.hantarCebisan(tAdam, sesi, data.subarray(m, m + C8).toString('base64'), m, data.length);
  assert.equal(hasil.siap, true);
  const f = gas.items.get(hasil.id);
  assert.ok(f.content.equals(data));
  assert.equal(f.props.diuploadOleh, 'pemilik@moe-dl.edu.my');
});

test('sampah: padam fail, senarai, pulihkan', () => {
  const { gas, C, adam, tAdam } = sediakan();
  const f = gas.tambahFail(adam.id, 'nota.pdf', 'application/pdf', 'x');
  C.padamFail(tAdam, f);
  assert.equal(C.senarai(tAdam).fail.length, 0);
  const s = C.senaraiSampah(tAdam);
  assert.deepEqual(j(s.map((x) => [x.nama, x.folder, x.lokasi])), [['nota.pdf', false, '']]);
  assert.deepEqual(j(C.pulihkan(tAdam, f)), { keUtama: false });
  assert.deepEqual(j(C.senarai(tAdam).fail.map((x) => x.nama)), ['nota.pdf']);
  assert.equal(C.senaraiSampah(tAdam).length, 0);
});

test('sampah: folder dipadam muncul sebagai satu item dengan bilangan fail, dan dipulihkan bersama isinya', () => {
  const { gas, C, tAdam } = sediakan();
  const fid = C.folderBaru(tAdam, 'Kerja');
  gas.tambahFail(fid, 'a.pdf', 'application/pdf', 'a');
  gas.tambahFail(fid, 'b.pdf', 'application/pdf', 'b');
  C.padamFolder(tAdam, fid);
  assert.equal(C.senarai(tAdam).folders.length, 0);
  assert.deepEqual(j(C.senaraiSampah(tAdam).map((x) => [x.nama, x.folder, x.bil])), [['Kerja', true, 2]]);
  C.pulihkan(tAdam, fid);
  const s = C.senarai(tAdam);
  assert.deepEqual(j(s.folders.map((x) => x.nama)), ['Kerja']);
  assert.equal(s.fail.length, 2);
});

test('sampah: fail yang folder asalnya masih dalam Sampah dipulihkan ke Utama', () => {
  const { gas, C, adam, tAdam } = sediakan();
  const fid = C.folderBaru(tAdam, 'Lama');
  const f = gas.tambahFail(fid, 'penting.docx', 'application/msword', 'p');
  C.padamFail(tAdam, f);
  C.padamFolder(tAdam, fid);
  const s = C.senaraiSampah(tAdam);
  assert.deepEqual(j(s.map((x) => [x.nama, x.lokasi]).sort()), [['Lama', ''], ['penting.docx', 'Lama']]);
  assert.deepEqual(j(C.pulihkan(tAdam, f)), { keUtama: true });
  const fail = C.senarai(tAdam).fail;
  assert.deepEqual(j(fail.map((x) => [x.nama, x.folderId])), [['penting.docx', adam.id]]);
});

test('sampah: padam kekal hanya untuk item dalam Sampah dan milik profil sendiri', () => {
  const { gas, C, adam, sara, tAdam, tSara } = sediakan();
  const f = gas.tambahFail(adam.id, 'x.pdf', 'application/pdf', 'x');
  assert.match(ralat(() => C.padamKekal(tAdam, f)), /Hanya item dalam Sampah/);
  C.padamFail(tAdam, f);
  assert.equal(ralat(() => C.padamKekal(tSara, f)), 'Akses ditolak.');
  assert.equal(ralat(() => C.pulihkan(tSara, f)), 'Akses ditolak.');
  assert.equal(ralat(() => C.senaraiSampah('palsu')), 'SESI_TAMAT');
  C.padamKekal(tAdam, f);
  assert.equal(gas.items.has(f), false);
  const g = gas.tambahFail(sara.id, 'y.pdf', 'application/pdf', 'y');
  C.padamFail(tSara, g);
  const fid = C.folderBaru(tSara, 'Z');
  gas.tambahFail(fid, 'z.pdf', 'application/pdf', 'z');
  C.padamFolder(tSara, fid);
  assert.equal(C.kosongkanSampah(tSara), 2);
  assert.equal(C.senaraiSampah(tSara).length, 0);
  assert.equal(gas.items.has(fid), false);
});

test('profil: padam profil berPIN perlukan PIN dan buang folder ke Sampah', () => {
  const { gas, C, sara } = sediakan();
  assert.equal(ralat(() => C.padamProfil(sara.id, '1111')), 'PIN salah.');
  C.padamProfil(sara.id, '1234');
  assert.deepEqual(j(C.senaraiProfil().map((p) => p.nama)), ['Adam']);
  assert.equal(gas.items.get(sara.id).trashed, true);
});
