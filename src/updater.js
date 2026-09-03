const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REPO = 'shadelete/OBI';
const API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'OBI-updater', 'Accept': 'application/vnd.github.v3+json' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('Bad JSON from server')); }
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + body.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Timeout')));
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'OBI-updater' } }, (res) => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); res.resume(); return; }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('Download timeout')));
  });
}

// Extract a zip to a dir. Windows 10+ has tar.exe. Fallback to PowerShell Expand-Archive.
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true });
    const tar = spawn('tar', ['-xf', zipPath, '-C', destDir], { windowsHide: true });
    tar.on('error', () => {
      // Fallback
      const ps = spawn('powershell', ['-NoProfile', '-Command',
        `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`],
        { windowsHide: true });
      ps.on('error', reject);
      ps.on('close', code => code === 0 ? resolve() : reject(new Error('extract failed: ' + code)));
    });
    tar.on('close', code => code === 0 ? resolve() : reject(new Error('tar failed: ' + code)));
  });
}

function escapeBat(s) {
  return String(s).replace(/%/g, '%%');
}

// Build updater.bat that waits for OBI.exe to exit, replaces files, relaunches, cleans temp.
function writeUpdaterBat(opts) {
  const { extractDir, targetExe, targetJs, targetIcon, appLauncher } = opts;
  const lines = [];
  lines.push('@echo off');
  lines.push('setlocal');
  lines.push('cd /d "%~dp0"');
  lines.push(':wait');
  lines.push('>nul 2>&1 tasklist /FI "IMAGENAME eq OBI.exe" | find /i "OBI.exe" >nul');
  lines.push('if %errorlevel% EQU 0 (');
  lines.push('   timeout /t 1 /nobreak >nul');
  lines.push('   goto wait');
  lines.push(')');
  // copy new files over the current install dir
  if (extractDir && targetExe) {
    lines.push(`copy /y "${escapeBat(extractDir)}\\OBI.exe" "${escapeBat(targetExe)}" >nul`);
  }
  if (targetJs) {
    lines.push(`if exist "${escapeBat(extractDir)}\\OBI.js" copy /y "${escapeBat(extractDir)}\\OBI.js" "${escapeBat(targetJs)}" >nul`);
  }
  if (targetIcon) {
    lines.push(`if exist "${escapeBat(extractDir)}\\icon.bmp" copy /y "${escapeBat(extractDir)}\\icon.bmp" "${escapeBat(targetIcon)}" >nul`);
  }
  if (appLauncher) {
    lines.push(`start "" "${escapeBat(appLauncher)}"`);
  }
  lines.push('timeout /t 1 /nobreak >nul');
  lines.push(`rmdir /s /q "${escapeBat(extractDir)}" >nul 2>&1`);
  lines.push('endlocal');
  return lines.join('\r\n');
}

async function checkUpdate(opts) {
  const current = opts.currentVersion || '';
  // Dev builds never update.
  if (/-(dev|alpha|beta|rc)/i.test(current)) {
    return { available: false, dev: true, currentVersion: current };
  }
  let release;
  try {
    release = await getJson(API_LATEST);
  } catch (e) {
    return { available: false, error: e.message, currentVersion: current };
  }
  const tag = (release.tag_name || '').replace(/^v/, '').trim();
  const asset = (release.assets || []).find(a => /^OBI-.*\.zip$/i.test(a.name));
  const latest = tag;
  const available = compareVersions(latest, current) > 0;
  return {
    available,
    currentVersion: current,
    latestVersion: latest,
    releaseName: release.name || release.tag_name || '',
    notes: release.body || '',
    assetUrl: asset ? asset.browser_download_url : null,
    assetName: asset ? asset.name : null,
    url: release.html_url || ''
  };
}

async function applyUpdate(opts) {
  const { assetUrl, assetName } = opts;
  if (!assetUrl) throw new Error('no asset url');
  const tmpRoot = path.join(opts.tmpBase || require('os').tmpdir(), 'obi-update');
  if (fs.existsSync(tmpRoot)) fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });
  const zipPath = path.join(tmpRoot, assetName || 'OBI-update.zip');
  await download(assetUrl, zipPath);
  const extractDir = path.join(tmpRoot, 'files');
  await extractZip(zipPath, extractDir);
  const batPath = path.join(tmpRoot, 'updater.bat');
  const bat = writeUpdaterBat({
    extractDir,
    targetExe: opts.targetExe,
    targetJs: opts.targetJs || null,
    targetIcon: opts.targetIcon || null,
    appLauncher: opts.targetExe
  });
  fs.writeFileSync(batPath, bat, 'utf8');
  const child = spawn('cmd.exe', ['/c', batPath], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  return { batPath };
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v || '').trim());
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)] : [0, 0, 0];
}

module.exports = { checkUpdate, applyUpdate, compareVersions };