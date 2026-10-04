# HTML Paint

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<a href="README.fr.md">🇫🇷 Français</a> ·
<a href="README.ar.md">🇸🇦 العربية</a> ·
<a href="README.bn.md">🇧🇩 বাংলা</a> ·
<a href="README.pt.md">🇧🇷 Português</a> ·
<a href="README.ru.md">🇷🇺 Русский</a> ·
<a href="README.ur.md">🇵🇰 اردو</a> ·
<b>🇮🇩 Bahasa Indonesia</b> ·
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Editor gambar ala Paint.NET, sebagai **satu berkas HTML mandiri**. Lapisan, seleksi,
penyesuaian, dan efek, serta riwayat yang bisa ditelusuri mundur — dan tidak ada yang
meninggalkan halaman: berkas ini dibuka dari disk, berfungsi tanpa koneksi internet, dan
tidak memuat apa pun dari jaringan.

Antarmuka tersedia dalam 17 bahasa (Tampilan → Bahasa…) — Inggris, Mandarin, Hindi, Spanyol,
Prancis, Arab, Bengali, Portugis, Rusia, Urdu, Indonesia, Jerman, Jepang, Marathi, Telugu,
Turki, dan Ukraina; Arab dan Urdu ditulis dari kanan ke kiri. Tersedia tema terang atau
gelap, dan tampilannya menyesuaikan baik di layar ponsel maupun desktop.

## Gunakan

Unduh `paint-v<version>.html` dari halaman
[rilis](https://github.com/MarketKernel/html-paint/releases), atau build sendiri (lihat di
bawah), lalu buka di peramban — Chrome, Edge, Firefox, atau Safari. Satu berkas itu adalah
seluruh programnya: salin ke mana saja, kirim lewat email, atau simpan di flashdisk.

Atau buka di [GitHub Pages](https://marketkernel.github.io/html-paint/) dan pasang sebagai
aplikasi (tombol instal di bilah alamat; Share → Add to Home Screen di iPhone). Setelah itu
aplikasi berfungsi tanpa koneksi internet, dan memperbarui dirinya sendiri saat dibuka lagi
setelah ada deploy baru.

Seret gambar ke jendela untuk membukanya, atau untuk menambahkannya sebagai lapisan.

## Yang bisa dilakukan

**Alat** — masing-masing satu tombol; menekannya lagi berpindah ke alat berikutnya pada
tombol yang sama.

| Alat | Tombol | |
|---|---|---|
| Seleksi persegi, elips, dan laso | S | Shift menambah ke seleksi, Alt mengurangi, keduanya berpotongan |
| Tongkat ajaib | W | Warna serupa, bersebelahan atau di seluruh gambar, berdasarkan toleransi |
| Pindahkan piksel terpilih | M | Seret untuk memindahkan, gagang untuk mengubah skala, di luar untuk memutar; Enter menerapkan, Esc mengembalikan |
| Pindahkan seleksi | M | Hanya garis tepinya; tombol panah menggeser sedikit demi sedikit |
| Zoom, geser | Z, H | Spasi atau tombol tengah menggeser dengan alat apa pun; ⌘/Ctrl + roda gulir atau cubit untuk zoom |
| Kuas | B | Lebar, kekerasan, opasitas, antialiasing; tekanan pena |
| Pensil | P | Piksel satu per satu |
| Penghapus | E | |
| Semprot | A | Menyemprot selama tombol ditekan |
| Ember cat | F | Toleransi, bersebelahan atau global, lapisan atau seluruh gambar |
| Gradien | G | Linear, refleksi, radial, konis; warna utama → sekunder |
| Pengambil warna | K | Dari lapisan atau gambar; bisa kembali ke alat sebelumnya |
| Stempel klon | L | Ctrl+klik (⌘+klik) memilih sumber |
| Teks | T | Diketik langsung di tempat; font, ukuran, tebal, miring, garis bawah, perataan |
| Garis, persegi, elips | O | Garis tepi, isi, atau keduanya; pola garis, sudut membulat, panah; Shift membatasi bentuk |
| Kurva | O | Kurva Bézier: seret garis keluar, lengkungkan dengan dua titik kontrolnya; Enter menerapkan |

Tombol kiri melukis dengan warna utama, tombol kanan dengan warna sekunder. X menukar
keduanya, D mengembalikannya ke hitam dan putih, `[` dan `]` mengubah ukuran kuas.

**Lapisan** — tambah, hapus, gandakan, gabung ke bawah, atur ulang urutan (seret di panel),
sembunyikan, ganti nama; opasitas dan 17 mode campuran (kali, layar, tumpang tindih, cahaya
lembut, selisih, rona…).

**Sunting** — urungkan dan ulangi setiap langkah, dengan panel Riwayat untuk melompat ke
langkah mana pun; potong, salin, salin gabungan; tempel ke lapisan (mengambang, untuk
ditempatkan), ke lapisan baru, atau sebagai gambar baru — juga dari papan klip sistem; pilih
semua, batalkan seleksi, balikkan seleksi; hapus atau isi seleksi.

**Gambar** — pangkas ke seleksi, ubah ukuran (halus atau tetangga terdekat), ukuran kanvas
dengan jangkar, balik, putar, ratakan lapisan.

**Penyesuaian** — level otomatis, hitam putih, kecerahan dan kontras, rona dan saturasi,
balikkan warna, posterisasi, sepia, ambang.

**Efek** — blur Gaussian, blur gerakan, pertajam, derau, pikselasi, timbul, deteksi tepi,
lukisan cat minyak, vinyet. Efek yang memiliki pengaturan menampilkan pratinjau langsung di
gambar saat diubah. Penyesuaian dan efek hanya berlaku pada seleksi jika ada seleksi aktif.

**Berkas** — PNG, JPEG, WebP, GIF, BMP, SVG, dan lainnya bisa dibuka; PNG, JPEG, dan WebP
menyimpan gambar yang sudah diratakan. **OpenRaster (.ora)** menyimpan lapisan beserta nama,
opasitas, visibilitas, dan mode campurannya — GIMP, Krita, dan MyPaint juga bisa membukanya.
Jika peramban mengizinkan halaman menulis berkas (Chrome, Edge), ⌘S / Ctrl+S menyimpan
kembali ke berkas yang dibuka; di peramban lain, simpan berarti mengunduh.

## Build

```sh
npm install
npm run build        # → build/paint.html
npm run watch        # build ulang setiap ada perubahan, tanpa minifikasi
npm run check        # typecheck, unit test, build, uji peramban
npm run shots        # tangkapan layar tiap layar utama ke shots/
```

Node 20 atau lebih baru. Uji peramban menjalankan halaman hasil build di Chrome lokal lewat
protokol DevTools; atur `CHROME=/path/to/chrome` jika lokasinya tidak standar.

Build juga menghasilkan `build/pages/`: halaman yang sama sebagai PWA — manifest, ikon, dan
service worker. Ikon PNG-nya disimpan di `assets/pwa/`; setelah ikon di `src/app/icons.ts`
berubah, `node tools/icons.mjs` menggambarnya ulang (dengan Chrome).

## Rilis

GitHub Actions yang menangani penerbitan:

- setiap push ke `main` diuji dan di-deploy ke GitHub Pages (Settings → Pages → Source:
  GitHub Actions, sekali saja);
- tag `v<version>` melakukan build, uji, dan menerbitkan rilis dengan `paint-v<version>.html`
  beserta `SHA256SUMS.txt`-nya. Tag harus sesuai dengan versi di `package.json`:

  ```sh
  npm version 0.2.0      # menulis package.json, commit, memberi tag v0.2.0
  git push --follow-tags
  ```

## Tata letak

```
src/
  core/            tanpa DOM, berjalan di Node untuk pengujian
    color.ts       RGB, HSV, HSL, hex; jarak warna; palet
    raster.ts      flood fill (ember, tongkat ajaib), garis pensil, kontur mask, persegi
    filters.ts     penyesuaian dan efek, pada larik piksel biasa
    zip.ts, ora.ts ZIP dan stack.xml milik OpenRaster
    i18n.ts        t(), tn(), N_()
  app/             halamannya
    template.html, styles.css
    main.ts        menjalankan semuanya
    app.ts         state: dokumen, riwayat, warna, pengaturan, pratinjau langsung
    document.ts    gambar dan lapisannya
    selection.ts   seleksi sebagai mask
    history.ts     urungkan dan ulangi
    view.ts        area kerja: zoom, gulir, menggambar, input penunjuk
    tools/         satu berkas per jenis alat
    commands.ts    menu dan pintasan keyboard
    ops.ts         perintah Sunting, Gambar, dan Lapisan
    effects.ts     menu Penyesuaian dan Efek
    io.ts          membuka dan menyimpan
    prompts.ts     dialog di balik perintah
    ui/            bilah menu, kotak alat, panel, dialog
  locales/         ru.json, uk.json — berkunci teks bahasa Inggris
  pwa/sw.js        service worker dari build GitHub Pages
assets/pwa/        ikon PNG milik PWA
tests/             unit test (Node) dan uji peramban (tests/app.mjs)
tools/             load.mjs (meng-compile src/ untuk pengujian), i18n.mjs (mencari string),
                   icons.mjs (menggambar assets/pwa/)
build.mjs          menggabungkan semuanya menjadi build/paint.html dan build/pages/
.github/workflows/ pengujian, deploy GitHub Pages, rilis dari tag v*
```

## Terjemahan

Setiap string yang ditampilkan berbentuk `t('English text')` (atau `N_('…')` jika tabelnya
dibuat sebelum bahasa diketahui) dengan literal string biasa. `node tools/i18n.mjs`
menampilkan apa yang kurang atau sudah tidak diperlukan lagi di tiap kamus; `npm test` gagal
sampai semuanya cocok. Nilai untuk bentuk jamak berupa objek dengan satu bentuk untuk tiap
kategori jamak bahasa tersebut (`one`, `few`, `many`, `other`…). Bahasa baru berarti berkas
`src/locales/<code>.json` baru dan satu baris di `src/app/language.ts`.

README ini diterjemahkan di `docs/readme/README.<code>.md`; daftar bahasa di antara penanda
`<!-- languages -->` sama di setiap berkas.

## Lisensi

MIT
