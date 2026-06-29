@echo off
:: ════════════════════════════════════════════════════════
::   BADMINTON SCOREBOARD — KONSOL MANAJEMEN
::   Jalankan file ini dari folder Badminton/
:: ════════════════════════════════════════════════════════
cd /d "%~dp0.."
title Badminton Scoreboard — Konsol Manajemen

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
echo  ║  [0] Keluar                                     ║
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
start "" http://localhost:3000/display
node server.js
pause
goto MENU

:STARTMULTI
cls
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
    call :LaunchCourt %%i
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
echo  Menghentikan semua proses node.exe...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo  ✅ Server berhasil dihentikan.
) else (
    echo  ℹ Server tidak sedang berjalan.
)
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
if not exist dist mkdir dist
call npx pkg server.js --targets node18-win-x64 --output dist\BadmintonScoreboard.exe
if %errorlevel% neq 0 (
    echo.
    echo  ⚠ Build gagal. Pastikan 'npm install' sudah dijalankan.
    pause
    goto MENU
)
echo.
echo  Menyalin file pendukung ke dist\...
if exist dist\public rmdir /s /q dist\public
xcopy /e /i /q public dist\public
if not exist dist\node_modules\jspdf\dist mkdir dist\node_modules\jspdf\dist
xcopy /e /i /q node_modules\jspdf\dist dist\node_modules\jspdf\dist
copy /y .env.example dist\.env.example >nul
if exist database.xlsx copy /y database.xlsx dist\database.xlsx >nul
copy /y tools\start-server.bat dist\start-server.bat >nul 2>&1
echo.
echo  ✅ Build selesai! File ada di folder: dist\
echo  Distribusikan seluruh folder dist\ — tidak perlu install Node.js di target.
pause
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
:: Subroutine: Jalankan 1 lapangan
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
