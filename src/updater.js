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

const msleep = (ms) => { const s = Date.now(); while (Date.now() - s < ms) {} };

// ASCII-only launcher: starts updater.ps1 hidden and independent of the parent process.
// WScript (GUI subsystem) spawned with detached:true + windowsHide survives Electron's
// exit, and piping into PowerShell keeps everything out of any visible console window.
const VBS_LAUNCHER = `' updater-launcher - starts install.ps1 hidden, independent of parent
Dim sh : Set sh = CreateObject("WScript.Shell")
Dim i, cmd
cmd = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & WScript.Arguments(0) & """"
For i = 1 To WScript.Arguments.Count - 1
  cmd = cmd & " """ & WScript.Arguments(i) & """"
Next
sh.Run cmd, 0, False
`;
// PowerShell installer: survives Electron's exit (launched detached via wscript/VBS,
// proven against the real packaged runtime) so it runs AFTER the app has fully closed
// and released its exe. Then it replaces the executable, copies side files, relaunches
// and cleans up. ASCII-only; all paths arrive as argv tokens (UTF-16) so Cyrillic
// survives. Logs step-by-step to upd.log.
const INSTALLER_PS1 = `
param(
  [string] $srcExe,
  [string] $targetExe,
  [string] $targetJs,
  [string] $targetIcon,
  [string] $logFile,
  [string] $frame
)
function Log($m) { try { Add-Content -LiteralPath $logFile -Value ((Get-Date -Format "HH:mm:ss") + " " + $m) -Encoding ASCII } catch {} }
Log "start"
# The parent app is quitting; wait until its exe is fully released (no OBI process), so
# the old file is no longer locked/mapped and can be overwritten.
$waited = 0
for (; $waited -lt 60; $waited++) {
  if (-not (Get-Process -Name "OBI" -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Seconds 1
}
Log ("wait-exit waited=" + $waited)
# Replace the executable; retry in case the old file is still briefly held.
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    Copy-Item -LiteralPath $srcExe -Destination $targetExe -Force -ErrorAction Stop
    $ok = $true
    Log ("copy-exe-ok i=" + $i)
    break
  } catch {
    Log ("copy-exe-fail i=" + $i + " " + $_.Exception.Message)
    Start-Sleep -Milliseconds 500
  }
}
foreach ($f in @(@("OBI.js", $targetJs), @("icon.bmp", $targetIcon))) {
  $s = Join-Path (Split-Path -Parent $srcExe) $f[0]
  if ($f[1] -and (Test-Path -LiteralPath $s)) {
    try { Copy-Item -LiteralPath $s -Destination $f[1] -Force -ErrorAction Stop; Log ("copy-" + $f[0] + "-ok") }
    catch { Log ("copy-" + $f[0] + "-fail " + $_.Exception.Message) }
  }
}
if ($ok) { try { Start-Process -FilePath $targetExe; Log "launched" } catch { Log ("launch-fail " + $_.Exception.Message) } }
Log "done"
if ($frame) { try { Remove-Item -LiteralPath $frame -Recurse -Force -ErrorAction SilentlyContinue } catch {} }
`;

// Standalone installer builder: writes a hidden launcher (wscript -> vbs -> powershell)
// that outlives the electron process, so the installer reliably runs AFTER the app exits.
// All paths are passed as argv (UTF-16), no literals embedded, content ASCII-only.
function writeStandalone(frame, extractDir, targetExe, targetJs, targetIcon) {
  const ps1 = path.join(frame, 'install.ps1');
  const vbs = path.join(frame, 'launch.vbs');
  fs.writeFileSync(ps1, '\uFEFF' + INSTALLER_PS1, 'utf8');
  fs.writeFileSync(vbs, VBS_LAUNCHER, 'utf8');
  const child = spawn('wscript.exe',
    [vbs, ps1,
      path.join(extractDir, 'OBI.exe'), targetExe, targetJs || '', targetIcon || '',
      path.join(frame, 'upd.log'), frame],
    { detached: true, windowsHide: true, stdio: 'ignore' });
  child.unref();
}

// The portable stub keeps OBI.exe mapped/locked while the app runs: overwriting it from
// the running process fails (EBUSY/sharing violation — proven on the live exe). So the
// in-App copy is only a best-effort fast path; the authoritative replacement is done by
// the detached installer above AFTER we quit. Both are armed here so nothing depends on
// timing between the copy and the app's exit.
function installInto(extractDir, targetExe, targetJs, targetIcon, frame) {
  const srcExe = path.join(extractDir, 'OBI.exe');
  if (!fs.existsSync(srcExe)) throw new Error('OBI.exe missing in update package');
  writeStandalone(frame, extractDir, targetExe, targetJs, targetIcon);
  let done = false;
  for (let i = 0; i < 20; i++) {
    try { fs.copyFileSync(srcExe, targetExe); done = true; break; } catch (e) { msleep(250); }
  }
  // Side files are not locked, so copy them in-process when the exe copy succeeded.
  if (done) {
    for (const [name, dest] of [['OBI.js', targetJs], ['icon.bmp', targetIcon]]) {
      const src = path.join(extractDir, name);
      if (dest && fs.existsSync(src)) { try { fs.copyFileSync(src, dest); } catch (e) {} }
    }
  }
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
  const tmpBase = opts.tmpBase || require('os').tmpdir();
  const tmpRoot = path.join(tmpBase, 'obi-update-' + Date.now());
  // Clean stale dirs from earlier interrupted runs (best effort, never fatal).
  try {
    const existing = fs.readdirSync(tmpBase);
    for (const e of existing) {
      if (/^obi-update(-\d+)?$/.test(e)) {
        try { fs.rmSync(path.join(tmpBase, e), { recursive: true, force: true }); } catch (err) {}
      }
    }
  } catch (err) {}
  fs.mkdirSync(tmpRoot, { recursive: true });
  const zipPath = path.join(tmpRoot, assetName || 'OBI-update.zip');
  await download(assetUrl, zipPath);
  const extractDir = path.join(tmpRoot, 'files');
  await extractZip(zipPath, extractDir);
  installInto(extractDir, opts.targetExe, opts.targetJs, opts.targetIcon, tmpRoot);
  return { success: true };
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