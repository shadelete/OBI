// ViyarPro automation for the main process:
//  - Keycloak OIDC login (hidden BrowserWindow) with stored login/password,
//  - vpSession bootstrap (GET service getVpSession),
//  - .project upload (multipart convertProject),
//  - openConvertedProject -> ticket,
//  - findProjectUuid (poll ProjectsAPI getAllProjects for the freshly-converted
//    project's uuid — keyed by external_id == hash, or by Bazis2Viyar +
//    most-recent updated_at fallback),
//  - shell.openExternal — hand the URL off to the user's default browser
//    (Chrome/Edge/Firefox) which already has the viyar / Keycloak session
//    cookies the constructor needs.
const { BrowserWindow, app, shell } = require('electron');
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
      uuiddoc: sessionId,
      sid: sessionId,
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

// Register the freshly-converted project with the new viyar SPA (which uses
// separate endpoints, not ProjectsAPI actions). The old /service/ AngularJS
// flow accepted `convertProject + openConvertedProject` and the project
// immediately appeared in the user's saved-projects list. The 2026 SPA at
// /projects and /service/?page=... is a different code path: the project
// only becomes addressable (uuid-lookupable, tabs-functional) after an
// explicit registration call. Discovered by reading
// https://viyar.pro/assets/index-CPZ2xh13.js — the SPA's ProjectAPI class
// exposes `saveProject({project, userId})`, `loadProject({projectId})`,
// `getProjectDetails({projectId})`, `getUserProjects({userId})`, and the
// legacy `addProject({fileData: base64})`. We try each in turn — any one
// that returns a uuid (or returns 200 with the project now visible in
// getUserProjects) is enough. Returns { uuid, project, action, response }
// on success, or { error, lastResponse } if none worked.
async function registerProjectViaNewApi(accessToken, sessionId, hash, ticket, title) {
  const extractUuid = (data) => {
    if (!data) return null;
    const candidates = [data, data.result, data.data, data.project,
      data.convertedProject, data.savedProject,
      data.result && data.result.data, data.result && data.result.project];
    for (const c of candidates) {
      if (c && typeof c === 'object') {
        if (typeof c.uuid === 'string' && c.uuid) return c.uuid;
        if (typeof c.project_uuid === 'string' && c.project_uuid) return c.project_uuid;
        if (typeof c.projectId === 'string' && c.projectId) return c.projectId;
      }
    }
    // Sometimes the response itself is the project object.
    if (typeof data.uuid === 'string' && data.uuid) return data.uuid;
    if (typeof data.project_uuid === 'string' && data.project_uuid) return data.project_uuid;
    return null;
  };
  const callApi = async (body) => {
    const resp = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'api-key': API_KEY_RESOURCES,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) {}
    return { http: resp.status, text, parsed };
  };
  const tries = [];
  // 1. saveProject — registers project in user's saved-projects list.
  //    SPA calls this with {endpoint, project:{...metadata}, userId}.
  tries.push({
    name: 'saveProject (project=hash+ticket)',
    body: {
      endpoint: 'saveProject',
      project: { hash, ticket, title, external_id: hash, type: 'dsp' },
      userId: sessionId
    }
  });
  // 2. loadProject — SPA loads a saved project by projectId. May return
  //    project data including uuid if it triggers an internal registration.
  tries.push({
    name: 'loadProject (projectId=hash)',
    body: { endpoint: 'loadProject', projectId: hash }
  });
  // 3. getProjectDetails — by projectId.
  tries.push({
    name: 'getProjectDetails (projectId=hash)',
    body: {
      endpoint: 'ProjectsAPI', uuiddoc: sessionId, sid: sessionId,
      action: 'getProjectDetails', projectId: hash
    }
  });
  // 4. getProjectDetails — by ticket (alternative identifier).
  tries.push({
    name: 'getProjectDetails (projectId=ticket)',
    body: {
      endpoint: 'ProjectsAPI', uuiddoc: sessionId, sid: sessionId,
      action: 'getProjectDetails', projectId: ticket
    }
  });
  let lastResponse = null;
  // Fire all candidate endpoints in parallel — first uuid wins. Sequential
  // was ~1-1.5s; parallel is ~one round-trip (~200-400ms). The follow-up
  // getUserProjects is run only if no endpoint returned a uuid directly.
  const tryOne = async (t) => {
    try {
      const r = await callApi(t.body);
      const snippet = r.text.slice(0, 600).replace(/\s+/g, ' ');
      debugLog('registerProjectViaNewApi: ' + t.name + ' → HTTP ' + r.http + ' body=' + snippet);
      if (lastResponse === null) lastResponse = r; // keep raw response for diagnostics
      if (r.http < 200 || r.http >= 300) return null;
      const uuid = extractUuid(r.parsed);
      if (uuid) {
        debugLog('registerProjectViaNewApi: ' + t.name + ' → uuid=' + uuid);
        return { uuid, project: r.parsed, action: t.name, response: r.parsed };
      }
      return null;
    } catch (e) {
      debugLog('registerProjectViaNewApi: ' + t.name + ' threw: ' + (e && e.message || String(e)));
      return null;
    }
  };
  const parallelResults = await Promise.all(tries.map(tryOne));
  for (const r of parallelResults) {
    if (r && r.uuid) return r;
  }
  // 5. Even if none of the above returned a uuid, the registration may have
  //    happened as a side-effect. Poll getUserProjects — if our project
  //    appears, pull its uuid.
  try {
    const r = await callApi({ endpoint: 'getUserProjects', userId: sessionId });
    debugLog('registerProjectViaNewApi: getUserProjects → HTTP ' + r.http
      + ' body=' + (r.text || '').slice(0, 600).replace(/\s+/g, ' '));
    if (r.http >= 200 && r.http < 300 && r.parsed) {
      const projects = (r.parsed && r.parsed.projects) || r.parsed;
      if (Array.isArray(projects)) {
        const norm = s => String(s || '').toLowerCase();
        const tn = norm(title);
        const exact = projects.find(p => p && norm(p.title) === tn);
        if (exact && exact.uuid) {
          debugLog('registerProjectViaNewApi: matched in getUserProjects by title → uuid=' + exact.uuid);
          return { uuid: exact.uuid, project: exact, action: 'getUserProjects.title', response: r.parsed };
        }
      }
    }
  } catch (e) {
    debugLog('registerProjectViaNewApi: getUserProjects threw: ' + (e && e.message || String(e)));
  }
  return { error: 'no-uuid-from-new-api', lastResponse };
}

// Look up our freshly-converted project in the user's saved projects list.
// Called from sendToViyar right after openConvertedProject (no BrowserWindow
// yet). Uses the same ProjectsAPI endpoint the /main SPA calls. The server
// returns each saved project with `uuid`, `title`, `external_id`, `creator_id`
// and `updated_at` — we pick ours by:
//   1. creator_id === 'Bazis2Viyar' + most-recent updated_at (our previous
//      exports live there, and the freshly-converted one shows up at the top),
//   2. external_id === hash (server assigns this from convertProject's hash),
//   3. title case-insensitive match against the source .project fileName.
// Returns { uuid, project, allProjects } on success,
// { notFound: true, allProjects, raw } when nothing matched,
// { error: '...' } on transport / parse failure.
async function findProjectUuid(accessToken, sessionId, hash, title, maxAttempts = 3, backoffMs = 1000) {
  const pickTarget = (projects) => {
    if (!Array.isArray(projects) || !projects.length) return null;
    const ours = projects.filter(p => p && p.creator_id === 'Bazis2Viyar');
    if (ours.length) {
      ours.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
      return ours[0];
    }
    if (hash) {
      const byExt = projects.find(p => p && String(p.external_id) === String(hash));
      if (byExt) return byExt;
    }
    if (title) {
      const tn = String(title).toLowerCase();
      const exact = projects.find(p => p && String(p.title || '').toLowerCase() === tn);
      if (exact) return exact;
      const partial = projects.find(p => p && String(p.title || '').toLowerCase().indexOf(tn) >= 0);
      if (partial) return partial;
    }
    return null;
  };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const resp = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'api-key': API_KEY_RESOURCES,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: 'ProjectsAPI',
          action: 'getAllProjects',
          uuiddoc: sessionId,
          sid: sessionId
        })
      });
      const text = await resp.text();
      if (!resp.ok) {
        debugLog('findProjectUuid: HTTP ' + resp.status + ' ' + text.slice(0, 300));
        if (attempt === maxAttempts - 1) return { error: 'http-' + resp.status };
      } else {
        let parsed = null;
        try { parsed = JSON.parse(text); } catch (e) {
          debugLog('findProjectUuid: parse failed: ' + (e && e.message || e));
        }
        const ps = parsed && parsed.result && parsed.result.projects;
        debugLog('findProjectUuid: attempt ' + attempt + ' got ' + (Array.isArray(ps) ? ps.length : 0) + ' projects');
        if (Array.isArray(ps)) {
          // Prefer the exact match by hash (our freshly-converted project) or
          // title — those are guaranteed ours. Only fall back to "most recent
          // Bazis2Viyar" if we genuinely can't find a hash/title match.
          const exact = (hash && ps.find(p => p && String(p.external_id) === String(hash)))
            || (title && ps.find(p => p && String(p.title || '').toLowerCase() === String(title).toLowerCase()));
          let target = exact;
          if (!target) {
            const ours = ps.filter(p => p && p.creator_id === 'Bazis2Viyar');
            if (ours.length) {
              ours.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
              target = ours[0];
            }
          }
          if (target && (exact || (!hash && !title))) {
            debugLog('findProjectUuid: matched (exact=' + !!exact + ') uuid=' + target.uuid + ' title="' + target.title + '" ext=' + target.external_id + ' updated=' + target.updated_at);
            return { uuid: target.uuid, project: target, allProjects: ps, matchedExact: !!exact };
          }
          // Not matched yet — keep polling until we've used all attempts.
          if (attempt === maxAttempts - 1) return { notFound: true, allProjects: ps, raw: parsed };
        }
      }
    } catch (e) {
      debugLog('findProjectUuid: fetch failed (attempt ' + attempt + '): ' + (e && e.message || String(e)));
      if (attempt === maxAttempts - 1) return { error: 'fetch-failed: ' + (e && e.message || String(e)) };
    }
    // Eventual-consistency / freshly-converted project not yet listed —
    // back off and retry. With defaults (3 × 1s) total wait ≈ 3s.
    if (attempt < maxAttempts - 1) await new Promise(r => setTimeout(r, backoffMs));
  }
  return { error: 'no-attempts' };
}

// Pull the project's uuid from alternate ProjectsAPI actions. Used as a
// fallback when getAllProjects doesn't list the freshly-converted project
// yet (eventual consistency, or the convert-project flow doesn't add it to
// the user's saved-projects list at all). Fires ALL candidates in parallel
// (no retries) — the wider list compensates for the missing retry, and the
// network does the latency in parallel rather than sequentially (~500ms
// instead of ~3-5s for 16 candidates). Returns the first non-null uuid
// found, or null if every candidate returns null/fails.
async function findProjectUuidExtras(accessToken, sessionId, hash, ticket) {
  const candidates = [];
  const push = (action, body) => candidates.push({ action, body });
  // Direct-from-hash/ticket variants.
  push('getConvertedProjectData', { hash, ticket });
  push('getConvertedProjectData', { hash });
  push('getConvertedProject',     { hash, ticket });
  push('getConvertedProject',     { hash });
  push('getProjectByHash',         { hash });
  push('getProjectByTicket',       { ticket });
  push('getConvertedProjectInfo', { hash, ticket });
  push('getConvertedProjectInfo', { hash });
  push('loadConvertedProject',     { hash });
  push('loadConvertedProject',     { hash, ticket });
  push('getProjectInfoByHash',     { hash });
  push('getProjectInfoByTicket',   { ticket });
  push('importedProject',          { hash });
  push('importProject',            { hash });
  push('getProject',               { hash });
  push('getProject',               { ticket });
  const extractUuid = (data) => {
    if (!data) return null;
    // Walk common response shapes: {uuid}, {result:{uuid}}, {data:{uuid}},
    // {result:{data:{uuid}}}, {project:{uuid}}, {convertedProject:{uuid}}.
    const candidates = [data, data.result, data.data, data.project,
      data.convertedProject,
      data.result && data.result.data, data.result && data.result.project,
      data.result && data.result.convertedProject];
    for (const c of candidates) {
      if (c && typeof c === 'object') {
        if (typeof c.uuid === 'string' && c.uuid) return c.uuid;
        if (typeof c.project_uuid === 'string' && c.project_uuid) return c.project_uuid;
      }
    }
    return null;
  };
  const tryOne = async (a) => {
    try {
      const resp = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'api-key': API_KEY_RESOURCES,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.assign({
          endpoint: 'ProjectsAPI',
          uuiddoc: sessionId,
          sid: sessionId
        }, a.body))
      });
      const text = await resp.text();
      debugLog('findProjectUuidExtras: ' + a.action + ' → HTTP ' + resp.status + ' body=' + text.slice(0, 600));
      if (!resp.ok) return null;
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) {}
      const uuid = extractUuid(parsed);
      if (uuid) {
        debugLog('findProjectUuidExtras: ' + a.action + ' → uuid=' + uuid);
        return { uuid, action: a.action, response: parsed };
      }
      return null;
    } catch (e) {
      debugLog('findProjectUuidExtras: ' + a.action + ' threw: ' + (e && e.message || String(e)));
      return null;
    }
  };
  // Fire all candidates in parallel. Use Promise.all + find-first-non-null
  // so we wait at most one round-trip (~200-500ms typical). A 3s internal
  // deadline kicks in if any request hangs (slow network).
  const promises = candidates.map(tryOne);
  const deadline = new Promise(resolve => setTimeout(() => resolve(null), 3000));
  const winner = await Promise.race([
    Promise.all(promises).then(results => results.find(r => r && r.uuid) || null),
    deadline
  ]);
  return winner || null;
}

// Main orchestration: returns { success, url, project, viaBrowser } or throws.
//
// Flow (v5 — open in user's default browser via shell.openExternal):
//   1. login + getVpSession + convertProject + openConvertedProject (as before),
//   2. findProjectUuid — poll getAllProjects up to ~30s looking for our
//      project (matched by external_id == hash or title; fall back to most-
//      recent Bazis2Viyar if no exact match),
//   3. shell.openExternal the constructor URL with our uuid (or /main if we
//      couldn't locate the project).
//
// We deliberately do NOT open a BrowserWindow in our app for the constructor:
// the viyar /service/ pages require cookies set by the full Keycloak redirect
// flow (AUTH_SESSION_ID, device-source, etc.) that our PKCE-only login flow
// does not install, so the constructor would always redirect away from our
// URL. The user's regular browser already has those cookies from their normal
// viyar sessions, so opening the URL there just works.
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
  debugLog('openConvertedProject response: ' + JSON.stringify(openRes));

  // Look up our project's uuid in parallel across three strategies:
  //   1. findProjectUuidExtras — direct ProjectsAPI actions (parallel, ~500ms)
  //   2. registerProjectViaNewApi — new SPA endpoints (parallel, ~500ms)
  //   3. findProjectUuid — getAllProjects polling, capped at 3 × 1s (~3s)
  // Capped at 5s overall — first non-null uuid wins. Each strategy's
  // "null result" is mapped to a never-resolving promise so Promise.race
  // only resolves on the first real uuid (or the timeout).
  //
  // Typical case (uuid never appears in saved-projects — see viyar SPA
  // bug where convertProject+openConvertedProject don't register the
  // project in /service/api/getAllProjects): ~3-5s total instead of the
  // previous ~35-40s sequential chain. Ticket URL works regardless.
  const UUID_LOOKUP_DEADLINE_MS = 5000;
  let projectUuid = null;
  let matchedProject = null;
  let matchedExact = false;
  try {
    const lookupStart = Date.now();
    // neverNull: turn a null-ish result into a never-resolving promise so
    // Promise.race keeps waiting for a real uuid (or the timeout).
    const neverNull = (p) => p.then(r => (r && r.uuid) ? r : new Promise(() => {}))
      .catch(e => {
        debugLog('lookup strategy threw: ' + (e && e.message || String(e)));
        return new Promise(() => {});
      });
    const winner = await Promise.race([
      neverNull(findProjectUuidExtras(accessToken, sessionId, hash, ticket).then(r => ({
        uuid: r && r.uuid, project: null, action: 'extras.' + (r && r.action), matchedExact: false
      }))),
      neverNull(registerProjectViaNewApi(accessToken, sessionId, hash, ticket, title).then(r => ({
        uuid: r && r.uuid, project: r && r.project, action: 'newApi.' + (r && r.action), matchedExact: false
      }))),
      neverNull(findProjectUuid(accessToken, sessionId, hash, title).then(r => ({
        uuid: r && r.uuid, project: r && r.project, action: 'list', matchedExact: !!(r && r.matchedExact)
      }))),
      new Promise(resolve => setTimeout(() => resolve(null), UUID_LOOKUP_DEADLINE_MS))
    ]);
    if (winner && winner.uuid) {
      projectUuid = winner.uuid;
      matchedProject = winner.project || null;
      matchedExact = !!winner.matchedExact;
      debugLog('lookupUuidFast: got uuid=' + projectUuid + ' via ' + winner.action
        + ' (in ' + (Date.now() - lookupStart) + 'ms)');
    } else {
      debugLog('lookupUuidFast: no uuid in ' + (Date.now() - lookupStart)
        + 'ms — falling back to ticket URL');
    }
  } catch (e) {
    debugLog('lookupUuidFast threw: ' + (e && e.message ? e.message : String(e)));
  }

  // Build the URL we want to open in the user's default browser.
  // The viyar SPA (https://viyar.pro/assets/index-D3tSRp4c.js) builds its
  // navigation URL via the helper `redirectToBackend(constructorId, page,
  // extraParams)`, which always produces the SAME shape:
  //
  //   https://viyar.pro/service/?page=homepage&redirect=1
  //     &constructor_id=<cid>&constructor_page=<page>
  //     &<extraParams joined as &key=value>
  //
  // The hosting "/service/" page is a thin AngularJS shell that, on
  // `page=homepage&redirect=1`, hands off to the new SPA at /furniture/...
  // — that's where the React/Vue router initializes. Calling the legacy
  // page=materials route directly renders the OLD constructor (no SPA
  // router) and breaks every internal click → full page reload. Likewise,
  // adding `hash=<hash>` to the URL conflicts with `ticket_session` (server
  // uses ticket_session to look up the converted project; hash is just an
  // upload identifier).
  //
  // We therefore use exactly the SPA's redirectToBackend shape:
  //   - uuid path: page=editor + uuid (no ticket_session, no hash)
  //   - ticket fallback: page=homepage&redirect=1&constructor_page=materials
  //     + ticket_session + direct_load=true (no hash)
  let openUrl;
  let usedFallback = null;
  if (projectUuid) {
    // uuid path mirrors redirectToBackend('dsp','editor',{uuid}) — opens
    // the project in the new SPA via the /service/ shell.
    const u = new URL(SERVICE_BASE);
    u.searchParams.set('page', 'homepage');
    u.searchParams.set('redirect', '1');
    u.searchParams.set('constructor_id', constructorId || 'dsp');
    u.searchParams.set('constructor_page', 'editor');
    u.searchParams.set('uuid', projectUuid);
    openUrl = u.toString();
  } else if (ticket) {
    // Ticket-fallback: convertProject + openConvertedProject always produce
    // a ticket. Mirror exactly `redirectToBackend('dsp','materials',
    // {ticket_session, direct_load:'true'})` from the SPA bundle.
    const u = new URL(SERVICE_BASE);
    u.searchParams.set('page', 'homepage');
    u.searchParams.set('redirect', '1');
    u.searchParams.set('constructor_id', constructorId || 'dsp');
    u.searchParams.set('constructor_page', 'materials');
    u.searchParams.set('ticket_session', ticket);
    u.searchParams.set('direct_load', 'true');
    openUrl = u.toString();
    usedFallback = 'ticket';
  } else {
    // Last resort: send the user to the project list.
    openUrl = 'https://viyar.pro/main';
    usedFallback = 'main';
  }
  debugLog('shell.openExternal (' + (usedFallback || 'uuid') + '): ' + openUrl);

  let viaBrowser = false;
  try {
    viaBrowser = await shell.openExternal(openUrl);
  } catch (e) {
    debugLog('shell.openExternal failed: ' + (e && e.message ? e.message : String(e)));
  }
  debugLog('shell.openExternal returned: ' + viaBrowser);

  // Return structured result for the IPC handler — it can show a notification
  // or alert with the URL / project title so the user knows where to look.
  return {
    success: true,
    url: openUrl,
    viaBrowser: !!viaBrowser,
    project: matchedProject || null,
    title: matchedProject ? matchedProject.title : title,
    projectUuid,
    ticket,
    hash,
    constructorId
  };
}

module.exports = { sendToViyar, decryptBazis, looksLikeBazisProject };