const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REPO = 'shadelete/OBI';
const API_RELEASES = `https://api.github.com/repos/${REPO}/releases?per_page=30`;

function getJson(url, _redirects) {
  _redirects = _redirects || 0;
  return new Promise((resolve, reject) => {
    if (_redirects > 5) { reject(new Error('Too many redirects')); return; }
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'OBI-updater', 'Accept': 'application/vnd.github.v3+json' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        getJson(res.headers.location, _redirects + 1).then(resolve, reject);
        return;
      }
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

function download(url, dest, _redirects) {
  _redirects = _redirects || 0;
  return new Promise((resolve, reject) => {
    if (_redirects > 5) { reject(new Error('Too many redirects')); return; }
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'OBI-updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        download(res.headers.location, dest, _redirects + 1).then(resolve, reject);
        return;
      }
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
  // Only true dev builds never update. alpha/beta/rc are prereleases that DO update
  // (to newer prereleases and to final releases) via full semver precedence.
  if (/-(dev)(?!\w)/i.test(current)) {
    return { available: false, dev: true, currentVersion: current };
  }
  let releases;
  try {
    releases = await getJson(API_RELEASES);
    if (!Array.isArray(releases)) releases = [];
  } catch (e) {
    return { available: false, error: e.message, currentVersion: current };
  }
  // Normalize each release version; ignore drafts.
  const candidates = releases
    .filter(r => !r.draft)
    .map(r => {
      const v = String(r.tag_name || '').replace(/^v/, '').trim();
      return { v, semver: parseVersion(v), tag: r.tag_name, r };
    })
    .filter(c => c.semver && !/^0\.0\.0/.test(c.v));

  if (candidates.length === 0) {
    return { available: false, currentVersion: current };
  }

  // Candidates sorted ascending by semver. Number-crunching may be ambiguous when
  // a stable and a prerelease share numeric core (e.g. 0.2.0 > 0.2.0-beta). We pick
  // the newest version that is STRICTLY newer than current (compareVersions handles
  // prerelease precedence, so a prerelease never wins over its own stable).
  let newest = null;
  for (const c of candidates) {
    if (compareVersions(c.semver, current) > 0) {
      if (!newest || compareVersions(c.semver, newest.semver) > 0) newest = c;
    }
  }

  if (!newest) {
    return { available: false, currentVersion: current };
  }

  const rel = newest.r;
  const asset = (rel.assets || []).find(a => /^OBI-.*\.zip$/i.test(a.name));
  return {
    available: true,
    currentVersion: current,
    latestVersion: newest.v,
    releaseName: rel.name || rel.tag_name || '',
    notes: rel.body || '',
    assetUrl: asset ? asset.browser_download_url : null,
    assetName: asset ? asset.name : null,
    url: rel.html_url || ''
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

// Semver-aware compare following https://semver.org precedence rules.
// a/b may be parsed objects ({ core:[maj,min,patch], prerelease:[...] }) or version strings.
// Prerelease < release. Higher build metadata ignored. Numeric identifiers < alphanumeric.
function compareVersions(a, b) {
  const A = typeof a === 'string' ? parseVersion(a) : a;
  const B = typeof b === 'string' ? parseVersion(b) : b;
  if (!A || !B) return 0;
  for (let i = 0; i < 3; i++) {
    if (A.core[i] > B.core[i]) return 1;
    if (A.core[i] < B.core[i]) return -1;
  }
  // Same core: no prerelease is higher than any prerelease.
  const aPre = A.prerelease;
  const bPre = B.prerelease;
  if (!aPre.length && !bPre.length) return 0;
  if (!aPre.length) return 1;
  if (!bPre.length) return -1;
  // Both prereleases: compare identifiers.
  for (let i = 0; i < Math.max(aPre.length, bPre.length); i++) {
    const x = aPre[i];
    const y = bPre[i];
    if (x === undefined) return -1; // shorter prerelease is lower
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      if (parseInt(x, 10) !== parseInt(y, 10)) return parseInt(x, 10) > parseInt(y, 10) ? 1 : -1;
    } else if (xn !== yn) {
      return yn ? 1 : -1; // numeric < alphanumeric
    } else if (x !== y) {
      return x > y ? 1 : -1; // ASCII lexicographic
    }
  }
  return 0;
}

function parseVersion(v) {
  const s = String(v || '').trim();
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(s);
  if (!m) return null;
  const pre = m[4] ? m[4].split('.') : [];
  return { core: [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)], prerelease: pre };
}

module.exports = { checkUpdate, applyUpdate, compareVersions, parseVersion };