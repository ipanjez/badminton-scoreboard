const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function rmDir(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function ensureDir(target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

console.log('Cleaning dist folder...');
rmDir(dist);
ensureDir(dist);

console.log('Building standalone executable with pkg...');
execSync('npx pkg server.js --config pkg.config.json --targets node18-win-x64 --output dist/BadmintonScoreboard.exe', {
  cwd: root,
  stdio: 'inherit'
});

console.log('Copying public/ files...');
copyDir(path.join(root, 'public'), path.join(dist, 'public'));

console.log('Copying jspdf runtime files...');
copyDir(path.join(root, 'node_modules', 'jspdf', 'dist'), path.join(dist, 'node_modules', 'jspdf', 'dist'));

console.log('Copying configuration samples and database...');
copyFile(path.join(root, '.env.example'), path.join(dist, '.env.example'));
copyFile(path.join(root, 'database.xlsx'), path.join(dist, 'database.xlsx'));
copyFile(path.join(root, '.env'), path.join(dist, '.env'));

// Copy any per-court env files (.env.court1, .env.court2, ...)
const files = fs.readdirSync(root);
for (const f of files) {
  if (/^\.env\.court\d+$/.test(f)) {
    copyFile(path.join(root, f), path.join(dist, f));
    console.log(`Copied ${f} -> dist/${f}`);
  }
}

// Create helper run-courtN.bat scripts in dist to start packaged EXE with DOTENV_CONFIG_PATH
for (let i = 1; i <= 6; i++) {
  const fname = `.env.court${i}`;
  const src = path.join(root, fname);
  const dest = path.join(dist, fname);
  if (fs.existsSync(src) || fs.existsSync(dest)) {
    const bat = path.join(dist, `run-court${i}.bat`);
    const content = `@echo off\r\ncd /d "%~dp0"\r\nset "DOTENV_CONFIG_PATH=%~dp0${fname}"\r\nstart "Court ${i}" "%~dp0\\BadmintonScoreboard.exe"\r\n`;
    try {
      fs.writeFileSync(bat, content, 'utf8');
      console.log(`Wrote helper script: dist\\run-court${i}.bat`);
    } catch (e) { /* ignore */ }
  }
}

console.log('\nBuild complete!\n- File: dist\\BadmintonScoreboard.exe\n- Folder: dist\\public\n- Config/template: dist\\.env.example\n- Database (if present): dist\\database.xlsx');
console.log('Distribusikan folder dist sebagai aplikasi Windows standalone. Node.js tidak perlu terinstall pada mesin target.');
