@echo off
:: ════════════════════════════════════════════════════════
::   BADMINTON SCOREBOARD — KONSOL MANAJEMEN
::   Jalankan file ini dari folder Badminton/
:: ════════════════════════════════════════════════════════
cd /d "%~dp0.."
title Badminton Scoreboard — Konsol Manajemen
:: ── Deteksi runtime: Node.js atau .exe ──
set "HAS_NODE=0"
set "HAS_EXE=0"
where node >nul 2>&1 && set "HAS_NODE=1"
if exist "dist\BadmintonScoreboard.exe" set "HAS_EXE=1"
:MENU
cls
color 0B
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   🏸  BADMINTON SCOREBOARD  ^|  Konsol           ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║                                                  ║
echo  ║  [1] Mulai Server  (1 Lapangan, default .env)   ║
echo  ║  [2] Mulai Beberapa Lapangan (Custom)            ║
echo  ║  [3] Hentikan Semua Server                      ║
echo  ║  ──────────────────────────────────────────     ║
echo  ║  [4] Buka Panel Admin (browser)                 ║
echo  ║  [5] Buka Database Excel (database.xlsx)        ║
echo  ║  [6] Edit Konfigurasi / PIN (.env)              ║
echo  ║  ──────────────────────────────────────────     ║
echo  ║  [7] Build Aplikasi Standalone (.exe)           ║
echo  ║  [8] Panduan Penggunaan                         ║
echo  ║                                                  ║
echo  [0] Keluar                                     ║
echo  ╚══════════════════════════════════════════════════╝
echo.
set /p choice="  Pilih opsi [0-8]: "

if "%choice%"=="1" goto START1
if "%choice%"=="2" goto STARTMULTI
if "%choice%"=="3" goto STOP
if "%choice%"=="4" goto ADMIN
if "%choice%"=="5" goto EXCEL
if "%choice%"=="6" goto EDITENV
if "%choice%"=="7" goto BUILD
if "%choice%"=="8" goto TUTORIAL
if "%choice%"=="0" exit
goto MENU

:START1
cls
:: Cek runtime
if "%HAS_NODE%"=="0" if "%HAS_EXE%"=="0" (
    echo  ⚠ Node.js tidak ditemukan dan dist\BadmintonScoreboard.exe belum dibuat.
    echo  Install Node.js dari https://nodejs.org atau jalankan opsi [7] Build dulu.
    pause
    goto MENU
)
echo  Memulai server (1 lapangan)...
echo  Tekan Ctrl+C untuk menghentikan.
echo.
:: Baca PIN dari .env jika ada
set "MAIN_PIN=1234"
for /f "tokens=2 delims==" %%p in ('type ".env" 2^>nul ^| findstr /i "CONTROLLER_PIN"') do set "MAIN_PIN=%%p"
:: Cari IP LAN
set "LAN_IP="
for /f "delims=" %%i in ('powershell -nologo -noprofile -command "try{(Get-NetIPAddress -AddressFamily IPv4 -Type Unicast | Where-Object {$_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169*'})[0].IPAddress}catch{''}" 2^>nul') do set "LAN_IP=%%i"
echo  ╔════════════════════════════════════════════╗
echo  ║  Akses Scoreboard                         ║
echo  ╠════════════════════════════════════════════╣
echo  ║  Display (TV):  http://localhost:3000/display
echo  ║  Controller  :  http://localhost:3000/controller
echo  ║  PIN         :  %MAIN_PIN%
if defined LAN_IP echo  ║  LAN Display :  http://%LAN_IP%:3000/display
if defined LAN_IP echo  ║  LAN Control :  http://%LAN_IP%:3000/controller
echo  ╚════════════════════════════════════════════╝
echo.
:: Buka browser setelah 3 detik (server perlu waktu start sebentar)
start /min "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000/launcher"
if "%HAS_NODE%"=="1" (
    node server.js
) else (
    echo  [Standalone .exe mode]
    dist\BadmintonScoreboard.exe
)
pause
goto MENU

:STARTMULTI
cls
:: Cek runtime
if "%HAS_NODE%"=="0" if "%HAS_EXE%"=="0" (
    echo  ⚠ Node.js tidak ditemukan dan dist\BadmintonScoreboard.exe belum dibuat.
    echo  Install Node.js dari https://nodejs.org atau jalankan opsi [7] Build dulu.
    pause
    goto MENU
)
echo  Mulai beberapa lapangan sekaligus.
echo  (Lapangan 1 = port 3001, Lapangan 2 = port 3002, dst.)
echo.
set "ncourts="
set /p ncourts="  Berapa lapangan yang ingin dijalankan [1-6]: "
if not defined ncourts goto STARTMULTI
if "%ncourts%"=="1" goto SMok
if "%ncourts%"=="2" goto SMok
if "%ncourts%"=="3" goto SMok
if "%ncourts%"=="4" goto SMok
if "%ncourts%"=="5" goto SMok
if "%ncourts%"=="6" goto SMok
echo  ⚠ Masukkan angka antara 1 sampai 6.
pause
goto STARTMULTI

:SMok
echo.
echo  Memulai %ncourts% lapangan...
echo.
:: Cari IP LAN sekali saja
set "LAN_IP="
for /f "delims=" %%i in ('powershell -nologo -noprofile -command "try{(Get-NetIPAddress -AddressFamily IPv4 -Type Unicast | Where-Object {$_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169*'})[0].IPAddress}catch{''}" 2^>nul') do set "LAN_IP=%%i"
for /L %%i in (1,1,%ncourts%) do (
    if "%HAS_NODE%"=="1" (
        call :LaunchCourt %%i
    ) else (
        call :LaunchCourtExe %%i
    )
)
echo.
echo  ✅ %ncourts% server diluncurkan!
if defined LAN_IP (
    echo  LAN IP Anda : %LAN_IP%
    echo  Contoh akses: http://%LAN_IP%:3001/display
)
echo  Panel Admin : http://localhost:3001/manage
pause
goto MENU

:STOP
cls
echo  Menghentikan semua server...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im BadmintonScoreboard.exe >nul 2>&1
echo  ✅ Semua server dihentikan.
pause
goto MENU

:ADMIN
start "" http://localhost:3000/manage
echo  Membuka Panel Admin di browser...
echo  (Pastikan server sudah berjalan terlebih dahulu)
pause
goto MENU

:EXCEL
if exist database.xlsx (
    start "" database.xlsx
    echo  ✅ database.xlsx dibuka.
) else (
    echo  ⚠ database.xlsx belum ada. Jalankan server sekali dulu agar file terbuat.
)
pause
goto MENU

:EDITENV
echo.
echo  File konfigurasi yang tersedia:
echo.
if exist .env           echo    .env           (server default)
if exist .env.court1    echo    .env.court1    (Court 1)
if exist .env.court2    echo    .env.court2    (Court 2)
if exist .env.court3    echo    .env.court3    (Court 3)
echo.
set /p envfile="  Nama file yang ingin diedit (contoh: .env): "
if exist "%envfile%" (
    start notepad "%envfile%"
) else (
    echo  ⚠ File '%envfile%' tidak ditemukan. Buat dulu atau periksa nama file.
)
pause
goto MENU

:BUILD
cls
echo  Build aplikasi standalone (.exe)...
echo  Proses ini mungkin memakan waktu beberapa menit.
echo.
call "%~dp0build-exe.bat"
if %errorlevel% neq 0 (
    echo.
    echo  ⚠ Build gagal. Pastikan 'npm install' sudah dijalankan.
    pause
    goto MENU
)
goto MENU

:TUTORIAL
echo.
echo  ⚠ Panduan hanya dapat diakses setelah server dijalankan.
echo  Pastikan opsi [1] atau [2] sudah dijalankan terlebih dahulu.
echo.
start "" http://localhost:3000/tutorial
echo  Membuka Panduan di browser: http://localhost:3000/tutorial
pause
goto MENU

:: ─────────────────────────────────────────────────────
:: Subroutine: Jalankan 1 lapangan (mode Node.js)
:: Parameter: %1 = nomor lapangan (1-6)
:: ─────────────────────────────────────────────────────
:LaunchCourt
:: Auto-buat .env.court%1 jika belum ada (mencegah semua court pakai port 3000)
if not exist ".env.court%1" (
    echo  ⚠  .env.court%1 belum ada — dibuat otomatis dengan PIN: 1234, PORT: 300%1
    (
        echo # Lapangan %1 ^(dibuat otomatis oleh MULAI.bat^)
        echo CONTROLLER_PIN=1234
        echo PORT=300%1
        echo SESSION_SECRET=court%1-%RANDOM%
    ) > ".env.court%1"
)
:: Pastikan PORT ada di file (bisa saja file ada tapi tanpa PORT)
findstr /i "PORT=" ".env.court%1" >nul 2>&1
if errorlevel 1 (
    echo PORT=300%1>> ".env.court%1"
    echo  ⚠  PORT ditambahkan ke .env.court%1: PORT=300%1
)
:: Baca PIN
set "COURT_PIN="
for /f "tokens=2 delims==" %%p in ('type ".env.court%1" 2^>nul ^| findstr /i "CONTROLLER_PIN"') do set "COURT_PIN=%%p"
if not defined COURT_PIN set "COURT_PIN=1234"
start "Court %1 (Port 300%1)" cmd /k "cd /d "%~dp0.." && node -r dotenv/config server.js dotenv_config_path=.env.court%1"
timeout /t 1 /nobreak >nul
echo  Court %1 : http://localhost:300%1   PIN: %COURT_PIN%
if defined LAN_IP echo           http://%LAN_IP%:300%1   ^(LAN^)
exit /b

:: ─────────────────────────────────────────────────────
:: Subroutine: Jalankan 1 lapangan (mode .exe tanpa Node.js)
:: Parameter: %1 = nomor lapangan (1-6)
:: ─────────────────────────────────────────────────────
:LaunchCourtExe
set "COURT_PIN=1234"
if exist ".env.court%1" (
    for /f "tokens=2 delims==" %%p in ('type ".env.court%1" 2^>nul ^| findstr /i "CONTROLLER_PIN"') do set "COURT_PIN=%%p"
)
start "Court %1 (Port 300%1)" cmd /k "cd /d "%~dp0..\dist" && set PORT=300%1& set CONTROLLER_PIN=%COURT_PIN%& BadmintonScoreboard.exe"
timeout /t 1 /nobreak >nul
echo  Court %1 : http://localhost:300%1   PIN: %COURT_PIN%
if defined LAN_IP echo           http://%LAN_IP%:300%1   ^(LAN^)
exit /b
