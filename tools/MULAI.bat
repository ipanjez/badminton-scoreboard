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
echo  ║  [1] Mulai Server  (default port 1000)          ║
echo  ║  [2] Hentikan Semua Server (Stop)               ║
echo  ║  [3] Lihat Folder Log                           ║
echo  ║  [4] Build Aplikasi Standalone (.exe)           ║
echo  ║                                                  ║
echo  ║  [0] Keluar                                      ║
echo  ╚══════════════════════════════════════════════════╝
echo.
set /p choice="  Pilih opsi [0-4]: "

if "%choice%"=="1" goto START1
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto LOGS
if "%choice%"=="4" goto BUILD
if "%choice%"=="0" exit
goto MENU

:START1
cls
:: Cek runtime
if "%HAS_NODE%"=="0" if "%HAS_EXE%"=="0" (
    echo  ⚠ Node.js tidak ditemukan dan dist\BadmintonScoreboard.exe belum dibuat.
    echo  Install Node.js dari https://nodejs.org atau jalankan opsi [2] Build dulu.
    pause
    goto MENU
)
echo  Memulai server pada port 1000...
echo  Tekan Ctrl+C untuk menghentikan.
echo.
:: Buka browser setelah 3 detik (server perlu waktu start sebentar)
start /min "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:1000/launcher"
if "%HAS_NODE%"=="1" (
    node -r dotenv/config server.js dotenv_config_path=.env.court1
) else (
    echo  [Standalone .exe mode]
    set PORT=1000
    dist\BadmintonScoreboard.exe
)
pause
goto MENU

:STOP
cls
echo  Menghentikan semua instance server...
taskkill /F /IM BadmintonScoreboard.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo  Server berhasil dihentikan.
pause
goto MENU

:LOGS
cls
if exist "%~dp0..\logs" (
    echo  Membuka folder logs...
    explorer "%~dp0..\logs"
) else (
    echo  ⚠ Folder logs belum ada.
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
