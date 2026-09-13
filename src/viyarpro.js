// ViyarPro automation for the main process:
//  - Keycloak OIDC login (hidden BrowserWindow) with stored login/password,
//  - vpSession bootstrap (GET service getVpSession),
//  - .project upload (multipart convertProject),
//  - openConvertedProject -> ticket + constructor, then open URL in a new
//    BrowserWindow that reuses the same persist:viyarpro partition so the
//    Keycloak session cookies carry over.
const { BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_URL = 'https://auth.viyar.tech/auth';
const REALM = 'ViyarAuth';
const CLIENT_ID = 'viyarsites';
const REDIRECT_URI = 'https://viyar.pro/';
const API_BASE = 'https://viyar.pro/service/api/';
const SERVICE_BASE = 'https://viyar.pro/service/';
const API_KEY_RESOURCES = 'ksm2V_eio45I4U79_+sdmlksdfkldmfklemit4y5';
const BAZIS_KEY = 'c928f7180e21ff8eae69f0b039d5279e90fa68607851d1a3835b8de2b739dba7';

const LOGIN_TIMEOUT_MS = 60000;
const FORM_WAIT_MS = 25000;

// File logger for ViyarPro debugging — writes to <userData>/viyarpro-debug.log
// so the user can inspect the API response, URL, and full navigation chain
// without needing DevTools open.
function debugLog(msg) {
  try {
    const dir = app.getPath('userData');
    fs.appendFileSync(path.join(dir, 'viyarpro-debug.log'),
      `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
  console.log(msg);
}

function b64u(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randB64u(n) {
  return b64u(crypto.randomBytes(n));
}

function makePkce() {
  const verifier = randB64u(48);
  const challenge = b64u(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// ---- token cache (in-memory, per app run) ----
let tokenCache = { access_token: '', refresh_token: '', expires_at: 0 };

function tokenValid(tokenCache) {
  return tokenCache.access_token && tokenCache.expires_at > Date.now() / 1000 + 30;
}

async function refreshToken(tokenCache) {
  if (!tokenCache.refresh_token) throw new Error('no-refresh-token');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenCache.refresh_token,
    client_id: CLIENT_ID
  });
  const resp = await fetch(`${AUTH_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!resp.ok) throw new Error(`Keycloak refresh failed: HTTP ${resp.status}`);
  const data = await resp.json();
  tokenCache = {
    access_token: data.access_token || '',
    refresh_token: data.refresh_token || tokenCache.refresh_token,
    expires_at: Date.now() / 1000 + (data.expires_in || 300)
  };
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier
  });
  const resp = await fetch(`${AUTH_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = JSON.stringify(await resp.json()); } catch (e) {}
    throw new Error(`Обмін коду авторизації не вдався (HTTP ${resp.status}) ${detail}`);
  }
  const data = await resp.json();
  if (!data.access_token) throw new Error('Не отримано access_token');
  tokenCache = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || '',
    expires_at: Date.now() / 1000 + (data.expires_in || 300)
  };
}

// Open a Keycloak login page, fill stored credentials, capture the auth code.
function loginInWindow(login, password) {
  return new Promise((resolve, reject) => {
    const pkce = makePkce();
    const state = randB64u(24);
    const nonce = randB64u(24);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'openid',
      response_type: 'code',
      response_mode: 'fragment',
      state,
      nonce,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256'
    });
    const authUrl = `${AUTH_URL}/realms/${REALM}/protocol/openid-connect/auth?${params.toString()}`;

    const win = new BrowserWindow({
      show: false,
      width: 920,
      height: 720,
      webPreferences: {
        partition: 'persist:viyarpro',
        sandbox: true
      },
      title: 'ViyarPro — вхід'
    });

    let settled = false;
    const cleanup = () => {
      if (!win.isDestroyed()) win.destroy();
    };
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      cleanup();
      reject(err);
    };
    const ok = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      cleanup();
      exchangeCode(code, pkce.verifier).then(resolve).catch(reject);
    };

    const hardTimeout = setTimeout(() => {
      if (settled) return;
      fail(new Error('Час входу вичерпано (більше 60 с)'));
    }, LOGIN_TIMEOUT_MS);

    // late-show fallback: if credentials are wrong/extra step, show the window
    const showLater = setTimeout(() => {
      if (settled) return;
      win.show();
      win.focus();
    }, FORM_WAIT_MS);

    const tryCapture = (url) => {
      if (settled || !url) return;
      let u;
      try { u = new URL(url); } catch (e) { return; }
      if (u.origin !== 'https://viyar.pro') return;
      const hash = u.hash ? new URLSearchParams(u.hash.replace(/^#/, '')) : u.searchParams;
      if (hash.get('state') && hash.get('state') !== state) return;
      const code = hash.get('code');
      if (code) ok(code);
      const err = hash.get('error');
      if (err) fail(new Error(`Вхід не вдався: ${err}${hash.get('error_description') ? ' — ' + hash.get('error_description') : ''}`));
    };

    win.webContents.on('will-redirect', (e, url) => tryCapture(url));
    win.webContents.on('will-navigate', (e, url) => tryCapture(url));
    win.webContents.on('did-navigate', (e, url) => tryCapture(url));
    win.webContents.on('did-navigate-in-page', (e, url) => tryCapture(url));

    win.webContents.on('did-finish-load', async () => {
      if (settled) return;
      try {
        const filled = await win.webContents.executeJavaScript(`
          (() => {
            const u = document.querySelector('#username');
            const p = document.querySelector('#password');
            if (!u || !p) return false;
            u.value = ${JSON.stringify(login)};
            p.value = ${JSON.stringify(password)};
            const btn = document.querySelector('#kc-login') || document.querySelector('input[type=submit]');
            if (btn) btn.click(); else if (u.form) u.form.submit();
            return true;
          })()
        `);
        if (filled) clearTimeout(showLater);
      } catch (e) {}
    });

    win.loadURL(authUrl).catch(err => fail(new Error('Не вдалося відкрити сторінку входу: ' + err.message)));
  });
}

// Ensure a valid access token (refresh or full login).
async function ensureAccessToken(creds) {
  if (tokenValid(tokenCache)) return tokenCache.access_token;
  if (tokenCache.refresh_token) {
    try { await refreshToken(tokenCache); return tokenCache.access_token; } catch (e) {}
    tokenCache = { access_token: '', refresh_token: '', expires_at: 0 };
  }
  if (!creds || !creds.login || !creds.password) {
    throw new Error('Потрібний логін і пароль ViyarPro');
  }
  await loginInWindow(creds.login, creds.password);
  return tokenCache.access_token;
}

// GET https://viyar.pro/service/?endpoint=getVpSession -> uuiddoc
async function getVpSessionId(accessToken) {
  const resp = await fetch(`${SERVICE_BASE}?endpoint=getVpSession`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'api-key': API_KEY_RESOURCES
    }
  });
  if (!resp.ok) {
    throw new Error(`Помилка отримання сесії (HTTP ${resp.status})`);
  }
  const data = await resp.json().catch(() => null);
  const sessionId = data && data.uuiddoc;
  if (!sessionId) {
    throw new Error('Не вдалося отримати vpSessionId (uuiddoc)');
  }
  return sessionId;
}

function looksLikeBazisProject(buf) {
  const head = buf.slice(0, 400).toString('utf8').trim();
  if (!head.startsWith('{')) return false;
  try {
    const obj = JSON.parse(head.replace(/\0/g, '').slice(0, head.lastIndexOf('}') + 1).replace(/,\s*}$/, '}'));
    if (!obj) return false;
    return typeof obj.iv === 'string' && obj.cipher !== undefined;
  } catch (e) {
    return /"iv"\s*:\s*"/.test(head);
  }
}

// Decrypt an SJCL-JSON-encrypted Bazis .project into the raw XML.
// Mirrors what website does client-side before upload (sjcl.decrypt with the bazis key),
// so the server receives the plain project file (bazis=1). Throws if it can't decrypt.
function decryptBazis(buf) {
  let obj;
  try {
    obj = JSON.parse(buf.toString('utf8'));
  } catch (e) {
    throw new Error('Не валідний JSON шифрованого файлу');
  }
  if (typeof obj.iv !== 'string' || typeof obj.ct !== 'string' || typeof obj.iter !== 'number') {
    throw new Error('Непідтримуваний формат шифрованого файлу (не SJCL)');
  }
  const ivAll = Buffer.from(obj.iv, 'base64');
  const salt = Buffer.from(obj.salt || '', 'base64');
  const ctAll = Buffer.from(obj.ct, 'base64');
  const tlen = (obj.ts || 64) / 8;
  if (ctAll.length < tlen) throw new Error('Файл пошкоджено (замало ct)');
  const tag = ctAll.slice(ctAll.length - tlen);
  const ct = ctAll.slice(0, ctAll.length - tlen);

  if (obj.cipher !== 'aes') throw new Error(`Непідтримуваний шифр: ${obj.cipher}`);
  if (obj.mode !== 'ccm') throw new Error(`Непідтримуваний режим: ${obj.mode}`);
  if (obj.adata) throw new Error(`Непідтримувана додаткова автентифікація`);

  let L = 2;
  for (; L < 4 && (ct.length >>> (8 * L)); L++) {}
  const nonce = ivAll.slice(0, 15 - L);

  const dk = crypto.pbkdf2Sync(Buffer.from(BAZIS_KEY, 'utf8'), salt, obj.iter, (obj.ks || 128) / 8, 'sha256');
  const cipher = crypto.createDecipheriv(`aes-${obj.ks || 128}-ccm`, dk, nonce, { authTagLength: tlen });
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(ct), cipher.final()]);
}

// multipart POST convertProject; returns { hash, fileName }
async function convertProject(filePath, sessionId, accessToken) {
  let buf = fs.readFileSync(filePath);
  const name = path.basename(filePath);
  let bazis = looksLikeBazisProject(buf) ? '1' : '0';
  if (bazis === '1') {
    buf = decryptBazis(buf);
    if (!buf.length) throw new Error('Розшифрований файл порожній');
  }

  const fd = new FormData();
  fd.append('endpoint', 'ProjectsAPI');
  fd.append('uuiddoc', sessionId);
  fd.append('action', 'convertProject');
  fd.append('bazis', bazis);
  fd.append('fileName', name);
  fd.append('fileSize', String(buf.length));
  fd.append('fileType', bazis === '1' ? 'bazis' : 'application/octet-stream');
  fd.append('fileEncoding', '');
  fd.append('originalFileSize', String(buf.length));
  fd.append('file', new Blob([buf], { type: bazis === '1' ? 'bazis' : 'application/octet-stream' }), name);

  const resp = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'api-key': API_KEY_RESOURCES
    },
    body: fd
  });
  const text = await resp.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  if (!resp.ok) {
    throw new Error(`Завантаження не вдалося (HTTP ${resp.status}): ${text.slice(0, 500)}`);
  }
  const status = data && data.result && data.result.status;
  // Positive path first: hash present means the server accepted the file.
  // NOTE: status.convertedProjects is an OBJECT {projects, errors, warnings}, not an array.
  const group = status && status.convertedProjects;
  const proj = group && group.projects && group.projects[0];
  if (proj && proj.hash) {
    return { hash: proj.hash, fileName: proj.file_name || name };
  }
  // Real error: non-empty status.error. NOTE: status.error is [] on success,
  // and [] is truthy in JS — so we must check the length, not just truthiness.
  const err = status && status.error;
  const hasError = Array.isArray(err) ? err.length > 0 : (err && Object.keys(err).length > 0);
  if (hasError) {
    throw new Error('Сервер не прийняв файл: ' + JSON.stringify(err).slice(0, 400));
  }
  // Fallback: hash missing for other reason — dump full result for debugging.
  throw new Error(`Сервер не повернув hash (HTTP ${resp.status}). result: ${JSON.stringify(status || data).slice(0, 800)}`);
}

// POST openConvertedProject -> { ticket_hash, constructorId }
async function openConvertedProject(hash, title, sessionId, accessToken) {
  const resp = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'api-key': API_KEY_RESOURCES,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: 'ProjectsAPI',
      vpSessionId: sessionId,
      action: 'openConvertedProject',
      hash,
      title
    })
  });
  const text = await resp.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  if (!resp.ok) {
    throw new Error(`Відкриття проєкту не вдалося (HTTP ${resp.status}): ${text.slice(0, 500)}`);
  }
  const status = data && data.result && data.result.status;
  const ticket = status && status.ticket_hash;
  const constructorId = status && status.constructorId;
  if (!ticket || !constructorId) {
    throw new Error('Сервер не повернув ticket_hash/constructorId. status: ' + JSON.stringify(status || data).slice(0, 800));
  }
  return { ticket, constructorId };
}

function backendUrl(constructorId, ticket) {
  // page=materials — direct materials page of the constructor (where the
  // loaded project actually displays). No redirect=1 (that stripped all
  // params → /service/ with empty project). direct_load=true on this page
  // tells the server to render the converted project.
  return `${SERVICE_BASE}?page=materials&constructor_id=${encodeURIComponent(constructorId)}`
    + `&ticket_session=${encodeURIComponent(ticket)}&direct_load=true`;
}

// Main orchestration: returns { success, url } or throws.
async function sendToViyar(filePath, creds, onProgress) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error('Файл не знайдено');
  const step = (phase) => { if (onProgress) onProgress(phase); };

  step('login');
  const accessToken = await ensureAccessToken(creds);

  step('session');
  const sessionId = await getVpSessionId(accessToken);

  step('upload');
  const { hash, fileName } = await convertProject(filePath, sessionId, accessToken);

  step('open');
  const title = fileName.replace(/\.project$/i, '') || fileName;
  const openRes = await openConvertedProject(hash, title, sessionId, accessToken);
  const ticket = openRes.ticket;
  const constructorId = openRes.constructorId;
  const url = backendUrl(constructorId, ticket);
  // Diagnostic: dump the full openConvertedProject response so we see every
  // field the server returns (some might be a canonical URL we should use).
  debugLog('openConvertedProject response: ' + JSON.stringify(openRes));
  debugLog('opening URL: ' + url);
  // Open in a new BrowserWindow that reuses the same persist:viyarpro partition
  // as the Keycloak login — Keycloak session cookies carry over.
  // NOTE: removed sandbox:true — with sandbox+custom partition combo the URL
  // load was silently failing (window opens empty, no nav events fired).
  const win = new BrowserWindow({
    show: true,
    width: 1280,
    height: 800,
    webPreferences: {
      partition: 'persist:viyarpro'
    },
    title: 'ViyarPro — проєкт'
  });
  // Diagnostic: log every navigation event so we see the full redirect chain.
  win.webContents.on('did-start-loading', (_e, navUrl) => {
    debugLog('did-start-loading: ' + navUrl);
  });
  win.webContents.on('did-navigate', (_e, navUrl) => {
    debugLog('did-navigate: ' + navUrl);
  });
  win.webContents.on('did-navigate-in-page', (_e, navUrl) => {
    debugLog('did-navigate-in-page: ' + navUrl);
  });
  win.webContents.on('did-fail-load', (_e, code, desc, navUrl) => {
    debugLog('did-fail-load: ' + code + ' ' + desc + ' ' + navUrl);
  });
  win.webContents.on('dom-ready', async () => {
    try {
      const url = win.webContents.getURL();
      debugLog('dom-ready, URL: ' + url);
      // Probe the actual rendered page — tells us whether the server rendered
      // the constructor with our params or an unrelated page.
      try {
        const probe = await win.webContents.executeJavaScript(`
          (() => {
            try {
              const text = (document.body && document.body.innerText || '').slice(0, 600);
              return {
                title: document.title || '',
                href: location.href,
                search: location.search,
                bodyText: text.replace(/\\s+/g, ' ').trim()
              };
            } catch (e) { return { error: String(e) }; }
          })();
        `);
        debugLog('PAGE PROBE: ' + JSON.stringify(probe));
      } catch (e) {
        debugLog('executeJavaScript failed: ' + e.message);
      }
    } catch (e) {
      debugLog('dom-ready probe failed: ' + e.message);
    }
  });
  // Step 1: visit viyar.pro/main first to establish the viyar.pro server-side
  // session cookie (the constructor expects it for direct_load to work).
  // NOTE: must be the main app URL (viyar.pro/main), NOT viyar.pro/service/main
  // (that returns 404 nginx).
  try {
    debugLog('Step 1: visiting /main to establish session...');
    await win.loadURL('https://viyar.pro/main');
    // Wait for the page to fully load (including any JS-driven redirects).
    await new Promise(resolve => setTimeout(resolve, 4000));
    debugLog('after /main visit, URL: ' + win.webContents.getURL());
  } catch (e) {
    debugLog('/main visit threw: ' + (e && e.message ? e.message : String(e)));
  }
  // Step 2: navigate to the constructor URL with the project ticket.
  try {
    debugLog('Step 2: calling win.loadURL(constructor)...');
    await win.loadURL(url);
    debugLog('Step 2: win.loadURL resolved');
  } catch (e) {
    debugLog('win.loadURL threw: ' + (e && e.message ? e.message : String(e)));
    throw e;
  }
  // Capture the final URL after navigation settles — tells us exactly where
  // the window ended up (in case many redirects stripped our params).
  setTimeout(() => {
    try {
      const finalUrl = win.webContents.getURL();
      debugLog('final URL after 8s: ' + finalUrl);
    } catch (e) {
      debugLog('final URL probe failed: ' + e.message);
    }
  }, 8000);
  return { success: true, url };
}

module.exports = { sendToViyar, decryptBazis, looksLikeBazisProject };