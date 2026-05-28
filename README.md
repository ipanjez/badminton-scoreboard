# Badminton Scoreboard Local

Aplikasi scoreboard bulutangkis lokal tanpa internet. Sistem ini dipakai di satu jaringan Wi-Fi/LAN untuk menghubungkan tablet operator, server lokal, dan layar TV secara real-time.

## Gambaran Singkat

- `server.js` menjalankan server lokal di port `3000`.
- Halaman controller ada di `/controller/`.
- Halaman display ada di `/display/`.
- Semua perubahan skor dikirim lewat Socket.io supaya layar TV langsung ikut berubah.
- Export PDF menghasilkan lembar skor resmi dari data pertandingan dan riwayat poin.

## Cara Menjalankan

1. Pastikan Node.js LTS sudah terpasang.
2. Buka terminal di folder proyek ini.
3. Instal semua library:

```bash
npm install
```

4. Jalankan server:

```bash
npm start
```

5. Lihat alamat IP lokal yang muncul di terminal, misalnya `http://192.168.1.7:3000`.

## Cara Memakai

1. Buka halaman controller dari tablet atau HP operator:

```text
http://IP_LOKAL:3000/controller/
```

2. Buka halaman display di laptop/PC yang terhubung ke proyektor atau TV:

```text
http://IP_LOKAL:3000/display/
```

3. Isi data pertandingan di controller:
- Nama turnamen
- Kategori
- Nomor lapangan
- Nama pemain/tim A dan B

4. Atur servis dengan tombol `S A` atau `S B`.
5. Tekan tombol `+` di sisi pemain yang menang reli untuk menambah poin.
6. Gunakan tombol bawah jika perlu:
- `Undo` untuk membatalkan input terakhir
- `Reset / Game Baru` untuk memulai pertandingan baru
- `Export PDF` untuk membuat lembar skor PDF

## Alur Kerja

1. Operator mengisi identitas pertandingan di controller.
2. Operator menekan tombol poin sesuai hasil reli.
3. Server menyimpan state pertandingan dan history poin.
4. Display menerima update real-time dan menampilkan skor tanpa refresh.
5. Saat export PDF ditekan, browser membuat file score sheet dari data pertandingan yang sedang aktif.

## Fitur Utama

- Skor bulutangkis sistem rally point 21.
- Deuce otomatis saat 20-20.
- Interval otomatis saat salah satu pemain mencapai 11 poin.
- Perpindahan servis otomatis.
- Undo berbasis history log.
- Export PDF bergaya lembar skor manual.

## Struktur Folder

```text
Badminton/
├─ package.json
├─ README.md
├─ server.js
├─ .gitignore
├─ public/
│  ├─ controller.html
│  ├─ display.html
│  ├─ controller/
│  │  └─ index.html
│  ├─ display/
│  │  └─ index.html
│  └─ assets/
├─ reports/
├─ src/
│  ├─ server/
│  │  └─ index.js
│  └─ shared/
│     ├─ badmintonLogic.js
│     └─ constants.js
```

## Library yang Dipakai

- `express` untuk server lokal.
- `socket.io` untuk sinkronisasi real-time via Wi-Fi/LAN.
- `jspdf` dan `jspdf-autotable` untuk export PDF score sheet.
- `pdfmake` tetap ada sebagai opsi PDF tambahan jika dibutuhkan nanti.

## Troubleshooting

- Jika halaman controller masih menampilkan versi lama, pastikan membuka `/controller/` dan bukan file `public/controller/index.html`.
- Jika display tidak berubah, cek apakah controller dan display sama-sama membuka alamat IP server yang sama.
- Jika perintah `npm start` gagal, pastikan semua dependency sudah terpasang dengan `npm install`.
- Jika PDF tidak muncul, pastikan tombol `Export PDF` ditekan dari browser yang mendukung download file.

## Catatan

- File hasil export PDF bisa disimpan otomatis oleh browser, bukan ke folder `reports/`.
- Folder `reports/` tetap bisa dipakai kalau nanti ingin menambahkan penyimpanan server-side.
