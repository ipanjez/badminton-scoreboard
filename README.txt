╔══════════════════════════════════════════════════════════════════════════╗
║          BADMINTON SCOREBOARD & MATCH MANAGER  —  v1.0.0               ║
║                  Sistem Pencatatan Skor Bulutangkis                     ║
╚══════════════════════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  APA INI?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Aplikasi ini adalah sistem pencatatan skor pertandingan bulutangkis
  berbasis web yang berjalan di jaringan Wi-Fi lokal (tanpa internet).

  Satu laptop/PC bertindak sebagai "server". Semua perangkat lain
  (tablet wasit, TV, HP penonton) cukup membuka browser dan mengetik
  alamat IP server — skor langsung tersinkron secara real-time.

  Fitur utama:
  ✓ Skor live otomatis tersinkron ke TV dan HP penonton
  ✓ Aturan BWF lengkap (Rally Point 21, Deuce 30, Interval 11)
  ✓ Service Over otomatis — bola pindah sendiri tanpa input manual
  ✓ Tombol Undo untuk koreksi poin yang salah
  ✓ Export PDF score sheet resmi format BWF (tanda tangan wasit)
  ✓ Database nama pemain & klub (tersimpan di file Excel)
  ✓ Mendukung hingga 6 lapangan berjalan bersamaan
  ✓ Bisa dijadikan aplikasi .exe standalone (tidak perlu install Node.js)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SYARAT SEBELUM MULAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Node.js sudah terinstall di laptop/PC server
     → Download gratis di: https://nodejs.org  (pilih versi LTS)
     → Setelah install, restart komputer jika diminta

  2. Dependensi aplikasi sudah terinstall
     → Buka PowerShell atau CMD di folder ini
     → Ketik:  npm install
     → Tunggu hingga selesai (hanya perlu sekali)

  3. Semua perangkat (laptop, tablet, TV, HP) terhubung ke Wi-Fi YANG SAMA
     → Bisa pakai hotspot dari laptop server
     → Atau router Wi-Fi yang sama di gedung


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CARA MENJALANKAN  (PALING MUDAH)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Klik dua kali file:  MULAI.bat

  Akan muncul menu:
  ┌──────────────────────────────────────────────────────────────┐
  │  [1] Mulai Server (1 Lapangan)                               │
  │  [2] Mulai 3 Lapangan Sekaligus                              │
  │  [3] Hentikan Semua Server                                   │
  │  [4] Buka Panel Admin (browser)                              │
  │  [5] Buka Database Excel (database.xlsx)                     │
  │  [6] Edit Konfigurasi / PIN (.env)                           │
  │  [7] Build Aplikasi Standalone (.exe)                        │
  │  [8] Panduan Penggunaan                                       │
  └──────────────────────────────────────────────────────────────┘

  Pilih [1] untuk mulai. Server akan jalan dan browser terbuka otomatis.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HALAMAN-HALAMAN YANG TERSEDIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Setelah server jalan, buka browser di perangkat mana saja dan
  ketik alamat berikut (ganti 192.168.1.43 dengan IP laptop Anda):

  ┌─────────────────┬──────────────────────────────────────────────────┐
  │ Perangkat       │ Alamat yang dibuka di browser                    │
  ├─────────────────┼──────────────────────────────────────────────────┤
  │ 📺 TV/Proyektor │ http://192.168.1.43:3000/display                 │
  │                 │ (tampilan skor besar, hitam, seperti LED)         │
  ├─────────────────┼──────────────────────────────────────────────────┤
  │ 🎮 Tablet Wasit │ http://192.168.1.43:3000/controller              │
  │                 │ (butuh login PIN, tombol besar)                   │
  ├─────────────────┼──────────────────────────────────────────────────┤
  │ 📱 HP Penonton  │ http://192.168.1.43:3000/viewer                  │
  │                 │ (tampilan skor live, read-only)                   │
  ├─────────────────┼──────────────────────────────────────────────────┤
  │ ⚙  Panel Admin  │ http://192.168.1.43:3000/manage                  │
  │                 │ (kelola database, PIN, konfigurasi court)         │
  ├─────────────────┼──────────────────────────────────────────────────┤
  │ 📖 Tutorial     │ http://192.168.1.43:3000/tutorial                │
  │                 │ (panduan cetak untuk wasit)                       │
  └─────────────────┴──────────────────────────────────────────────────┘

  Catatan: IP laptop bisa dilihat saat server pertama kali dijalankan,
  atau ketik "ipconfig" di CMD dan lihat "IPv4 Address".


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PIN DAN KEAMANAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PIN default untuk Controller & Panel Admin:  1234

  Untuk mengganti PIN:
  1. Buka file  .env  dengan Notepad
  2. Ubah angka setelah  CONTROLLER_PIN=
  3. Simpan file
  4. Restart server (jalankan ulang MULAI.bat)

  Atau bisa diubah dari Panel Admin (/manage) → tab "Ubah PIN"
  (tetap perlu restart server setelah menyimpan PIN baru).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DATABASE NAMA PEMAIN, KLUB & WASIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Data disimpan di file:  database.xlsx

  Cara edit:
  A. Buka database.xlsx di Microsoft Excel atau Google Sheets
     → Ada 3 sheet: Pemain | Klub | Wasit
     → Tambah/hapus nama, lalu simpan (Ctrl+S)
     → Server membaca ulang OTOMATIS — tidak perlu restart!

  B. Atau lewat Panel Admin di browser (/manage → tab "Database Nama")
     → Tambah/hapus nama langsung dari browser

  Nama yang pernah diisi di form Setup juga tersimpan otomatis.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MULTI COURT (LEBIH DARI 1 LAPANGAN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Setiap lapangan berjalan sebagai server terpisah di port berbeda.

  Konfigurasi ada di file:
    .env.court1  →  Lapangan 1  (PORT 3001)
    .env.court2  →  Lapangan 2  (PORT 3002)
    .env.court3  →  Lapangan 3  (PORT 3003)

  Edit file .env.courtN dengan Notepad untuk mengatur PORT dan PIN.
  Atau kelola dari Panel Admin → tab "Konfigurasi Court".

  Cara menjalankan semua court sekaligus:
  → Buka MULAI.bat → pilih [2]
  → Atau jalankan:  tools\start-all-courts.ps1

  Akses masing-masing lapangan:
    Court 1 → http://[IP]:3001/display  |  /controller  |  /viewer
    Court 2 → http://[IP]:3002/display  |  /controller  |  /viewer
    Court 3 → http://[IP]:3003/display  |  /controller  |  /viewer


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CARA MENGGUNAKAN CONTROLLER (UNTUK WASIT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Buka /controller di tablet, masukkan PIN
  2. Klik ⚙ Setup → isi info pertandingan → Simpan & Terapkan
  3. Klik + biru (Tim L) atau + oranye (Tim R) saat tim itu menang reli
     → Perpindahan servis terjadi OTOMATIS
  4. Saat skor 11 → banner INTERVAL muncul → istirahat 60 detik
     → Klik "Lanjutkan ▶" untuk melanjutkan
  5. Setelah game selesai → klik "Game ▶ Lanjut"
  6. Setelah pertandingan selesai → klik "📄 PDF" untuk cetak score sheet
  7. Untuk memulai pertandingan baru → klik "🔄 Reset"

  Tombol ❓ Panduan di controller menampilkan ringkasan ini di layar.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STRUKTUR FILE & FOLDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Badminton/
  ├── MULAI.bat            ← Klik ini untuk memulai (pintu masuk utama)
  ├── server.js            ← Program utama server (jangan diedit)
  ├── database.xlsx        ← Database nama pemain/klub/wasit (bisa diedit)
  ├── .env                 ← Konfigurasi PIN & Port (bisa diedit)
  ├── .env.example         ← Contoh konfigurasi
  ├── .env.court1/2/3      ← Konfigurasi tiap lapangan
  ├── package.json         ← Daftar dependensi (jangan diedit)
  ├── public/              ← Halaman web (HTML/CSS/JS)
  │   ├── display.html     ← Tampilan TV
  │   ├── viewer.html      ← Tampilan HP penonton
  │   ├── controller.html  ← Panel wasit
  │   ├── manage.html      ← Panel admin
  │   ├── tutorial.html    ← Panduan cetak
  │   └── js/
  │       └── pdf-export.js  ← Generator PDF score sheet
  └── tools/               ← Alat bantu (batch files)
      ├── MULAI.bat           ← Menu utama lengkap
      ├── start-server.bat    ← Jalankan 1 server
      ├── stop-server.bat     ← Hentikan server
      ├── start-hidden.vbs    ← Jalankan tanpa terminal
      ├── start-all-courts.ps1 ← Jalankan 3 court
      └── build-exe.bat       ← Build standalone .exe


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TROUBLESHOOTING (MASALAH UMUM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ "Port 3000 sudah dipakai"
     → Ada server yang masih jalan. Buka MULAI.bat → pilih [3] Hentikan.

  ❌ Browser tidak bisa membuka alamat dari perangkat lain
     → Pastikan semua perangkat di Wi-Fi yang SAMA
     → Coba matikan Windows Firewall sementara
     → Pastikan IP yang diketik sudah benar (lihat saat server start)

  ❌ Skor di TV tidak berubah
     → Tekan F5 di browser TV untuk refresh
     → Periksa koneksi Wi-Fi TV

  ❌ "npm install" gagal atau error
     → Pastikan Node.js sudah terinstall: buka CMD, ketik  node --version
     → Jika belum, download dari https://nodejs.org

  ❌ PDF tidak bisa dibuat
     → Pastikan pernah menjalankan "npm install" minimal sekali
     → Refresh halaman controller lalu coba lagi

  ❌ Database.xlsx tidak terbaca
     → Pastikan file tidak sedang dibuka di Excel saat server start
     → Jika error, hapus database.xlsx dan biarkan server membuatnya ulang


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEKNOLOGI YANG DIGUNAKAN  (Informasi Teknis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Backend  : Node.js + Express + Socket.io
  Frontend : HTML5 + Tailwind CSS + Vanilla JavaScript
  Database : Excel (.xlsx) via SheetJS
  PDF      : jsPDF (manual drawing, bukan template)
  Auth     : express-session + PIN statis
  Realtime : WebSocket (Socket.io) — update tanpa refresh halaman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
