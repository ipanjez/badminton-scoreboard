@echo off
cd /d "%~dp0"
echo Build standalone executable (.exe)...
node build-exe.js
if %errorlevel% neq 0 (
  echo.
  echo ⚠ Build gagal. Pastikan Node.js dan dependensi sudah terinstall.
  pause
  exit /b %errorlevel%
)
echo.
echo ✅ Build selesai. Lihat folder dist\ untuk executable standalone.
pause
