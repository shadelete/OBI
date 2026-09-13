const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exportToXLSXBuffer, buildPdfHtml } = require('./src/export');
const updater = require('./src/updater');
const calcWorkbook = require('./src/workbook');

let mainWindow;
let fitRulesWindow;

function dataDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged) return path.dirname(app.getPath('exe'));
  return __dirname;
}

// Active project = a FOLDER chosen by the user (or the folder of the JSON passed
// via --project by the Bazis script). Products are OBI JSON files inside it.
let projectRoot = null;
let preselectJson = '';

function startupProjectPath() {
  const idx = process.argv.indexOf('--project');
  if (idx === -1 || !process.argv[idx + 1]) return '';
  const p = path.resolve(process.argv[idx + 1]);
  return fs.existsSync(p) ? p : '';
}

function configPath() {
  return path.join(dataDir(), 'config', 'config.json');
}

const APP_URL = 'https://github.com/shadelete/OBI';
const APP_AUTHOR = 'Alexander Bondarenko';

const DEFAULT_CONFIG = Object.freeze({ theme: 'dark', language: 'uk', autoUpdate: false, workbookPath: '', lastProjectFolder: '', recentFolders: [] });

function readConfig() {
  try {
    const p = configPath();
    if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG };
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return {
      theme: data.theme === 'dark' ? 'dark' : 'light',
      language: data.language === 'ru' ? 'ru' : 'uk',
      autoUpdate: !!data.autoUpdate,
      workbookPath: typeof data.workbookPath === 'string' ? data.workbookPath : '',
      lastProjectFolder: typeof data.lastProjectFolder === 'string' ? data.lastProjectFolder : '',
      recentFolders: Array.isArray(data.recentFolders) ? data.recentFolders.filter(f => typeof f === 'string') : []
    };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  const p = configPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf-8');
}

function fitRulesPath() {
  return path.join(dataDir(), 'data', 'fit_rules.json');
}

const DEFAULT_FIT_RULES = Object.freeze({ tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [], suppliers: {}, suppliersByName: [], matBlacklist: [], matBlacklistByName: [], profBlacklist: [], profBlacklistByName: [], bookBlacklist: [], bookBlacklistByName: [], matBookBlacklist: [], matBookBlacklistByName: [], profBookBlacklist: [], profBookBlacklistByName: [] });

function emptyFitRules() {
  return { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [], suppliers: {}, suppliersByName: {}, matBlacklist: [], matBlacklistByName: [], profBlacklist: [], profBlacklistByName: [], bookBlacklist: [], bookBlacklistByName: [], matBookBlacklist: [], matBookBlacklistByName: [], profBookBlacklist: [], profBookBlacklistByName: [] };
}

function readFitRules() {
  try {
    const p = fitRulesPath();
    if (!fs.existsSync(p)) return emptyFitRules();
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const out = emptyFitRules();
    Object.keys(out).forEach(k => {
      if (Array.isArray(out[k])) out[k] = Array.isArray(data[k]) ? data[k] : [];
      else out[k] = (data[k] && typeof data[k] === 'object') ? data[k] : {};
    });
    return out;
  } catch (e) {
    return emptyFitRules();
  }
}

function saveFitRulesFile(rules) {
  const p = fitRulesPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(rules, null, 2), 'utf-8');
}

// --- cp1251 fallback reader (Bazis-era JSON files) ---
const windows1251 = (() => {
  const chars = [];
  const cp = [
    0x0402,0x0403,0x201A,0x0453,0x201E,0x2026,0x2020,0x2021,
    0x20AC,0x2030,0x0409,0x2039,0x040A,0x040C,0x040B,0x040F,
    0x0452,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,
    0xFEFF,0x2122,0x0459,0x203A,0x045A,0x045C,0x045B,0x045F,
    0x00A0,0x040E,0x045E,0x0408,0x00A4,0x0490,0x00A6,0x00A7,
    0x0401,0x00A9,0x0404,0x00AB,0x00AC,0x00AD,0x00AE,0x0407,
    0x00B0,0x00B1,0x0406,0x0456,0x0491,0x00B5,0x00B6,0x00B7,
    0x0451,0x2116,0x0454,0x00BB,0x0458,0x0405,0x0455,0x0457,
    0x0410,0x0411,0x0412,0x0413,0x0414,0x0415,0x0416,0x0417,
    0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E,0x041F,
    0x0420,0x0421,0x0422,0x0423,0x0424,0x0425,0x0426,0x0427,
    0x0428,0x0429,0x042A,0x042B,0x042C,0x042D,0x042E,0x042F,
    0x0430,0x0431,0x0432,0x0433,0x0434,0x0435,0x0436,0x0437,
    0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,0x043f,
    0x0440,0x0441,0x0442,0x0443,0x0444,0x0445,0x0446,0x0447,
    0x0448,0x0449,0x044A,0x044B,0x044C,0x044D,0x044E,0x044F
  ];
  for (let i = 0; i < 128; i++) chars[i] = String.fromCharCode(i);
  for (let i = 0; i < 128; i++) chars[i + 128] = String.fromCharCode(cp[i]);
  return chars;
})();

function readTextAuto(filePath) {
  const buf = fs.readFileSync(filePath);
  let text = buf.toString('utf-8');
  if (text.includes('\uFFFD')) {
    text = buf.toString('latin1')
      .replace(/[\u0080-\u00FF]/g, ch => windows1251[ch.charCodeAt(0)] || ch);
  }
  return text;
}

// --- Project folder scanning ---
// An "OBI product JSON" is detected by schema: arrays materials + fittings.
function tryReadProduct(filePath) {
  try {
    const data = JSON.parse(readTextAuto(filePath));
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.materials) || !Array.isArray(data.fittings)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function walkDir(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  entries.forEach(ent => {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith('.') || ent.name === 'node_modules') return;
      const sub = { type: 'dir', name: ent.name, path: full, children: [] };
      walkDir(full, sub.children);
      if (sub.children.length) out.push(sub);
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.json')) {
      let stat = null;
      try { stat = fs.statSync(full); } catch (e) {}
      if (stat && stat.size > 20 * 1024 * 1024) return;
      const data = tryReadProduct(full);
      if (!data) return;
      const base = path.basename(ent.name, '.json');
      out.push({
        type: 'product',
        name: base,
        path: full,
        displayName: (data.name && String(data.name).trim()) ? String(data.name).trim() : base,
        orderName: data.orderName || '',
        modelFile: data.modelFile || '',
        mtime: stat ? stat.mtimeMs : 0
      });
    }
  });
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), 'uk');
  });
}

function scanProjectFolder(root) {
  const children = [];
  walkDir(root, children);
  return {
    type: 'dir',
    name: path.basename(root) || root,
    path: root,
    children
  };
}

function collectProductPaths(node, out) {
  if (!node) return out || [];
  if (!out) out = [];
  if (node.type === 'product') out.push(node.path);
  (node.children || []).forEach(c => collectProductPaths(c, out));
  return out;
}

function setProjectRoot(root, preselect) {
  projectRoot = root || null;
  preselectJson = preselect || '';
  if (projectRoot) {
    const cfg = readConfig();
    cfg.lastProjectFolder = projectRoot;
    const recents = (cfg.recentFolders || []).filter(f => f !== projectRoot);
    recents.unshift(projectRoot);
    cfg.recentFolders = recents.slice(0, 10);
    saveConfig(cfg);
  }
}

function projectTitle() {
  return projectRoot ? (path.basename(projectRoot) || projectRoot) : '';
}

// --- Per-project overlay: <projectRoot>\.obi\project.json ---
function overlayPath() {
  return projectRoot ? path.join(projectRoot, '.obi', 'project.json') : '';
}

function readOverlayFile() {
  try {
    const p = overlayPath();
    if (p && fs.existsSync(p)) {
      const data = JSON.parse(readTextAuto(p));
      if (data && typeof data === 'object') return data;
    }
  } catch (e) {}
  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'Output Bazis Info',
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.setMenu(null);
  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.webContents.on('did-finish-load', () => {
    autoCheckUpdates();
  });
}

function openFitRulesWindow() {
  if (fitRulesWindow && !fitRulesWindow.isDestroyed()) {
    fitRulesWindow.focus();
    return;
  }
  fitRulesWindow = new BrowserWindow({
    width: 820,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'Правила фурнітури',
    icon: path.join(__dirname, 'icon.png')
  });
  fitRulesWindow.setMenu(null);
  fitRulesWindow.loadFile(path.join(__dirname, 'src', 'fit_rules.html'));
  fitRulesWindow.on('closed', () => { fitRulesWindow = null; });
}

app.whenReady().then(() => {
  const sp = startupProjectPath();
  if (sp) {
    setProjectRoot(path.dirname(sp), sp);
  } else {
    const cfg = readConfig();
    if (cfg.lastProjectFolder && fs.existsSync(cfg.lastProjectFolder)) {
      projectRoot = cfg.lastProjectFolder;
    }
  }
  if (process.env.OBI_TEST_UPDATE === '1') {
    autoTestUpdate();
    const hb = () => {
      try { fs.appendFileSync(path.join(dataDir(), 'data', 'updtest.log'), new Date().toISOString() + ' beat\n'); } catch (e) {}
      setTimeout(hb, 2000);
    };
    hb();
  }
  createWindow();
});

// Headless self-update used for local E2E testing: OBI_TEST_UPDATE=1 triggers the
// normal update flow (check -> apply -> quit) without UI interaction. Never set in
// production, so it is inert unless explicitly enabled.
async function autoTestUpdate() {
  const dbg = (m) => {
    try { fs.appendFileSync(path.join(dataDir(), 'data', 'updtest.log'), new Date().toISOString() + ' ' + m + '\n'); } catch (e) {}
  };
  try {
    const targets = updaterTargets();
    dbg('checkUpdate start');
    const info = await updater.checkUpdate(targets);
    dbg('checkUpdate => available=' + info.available + ' latest=' + info.latestVersion + ' url=' + (info.assetUrl || 'none'));
    if (info.available && info.assetUrl) {
      dbg('applyUpdate start');
      const r = await updater.applyUpdate({ ...targets, assetUrl: info.assetUrl, assetName: info.assetName });
      dbg('applyUpdate done success=' + r.success);
      setTimeout(() => app.quit(), 800);
    }
  } catch (e) {
    dbg('error: ' + (e && e.message));
  }
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try { fs.appendFileSync(path.join(dataDir(), 'data', 'updtest.log'), new Date().toISOString() + ' window-all-closed\n'); } catch (e) {}
    app.quit();
  }
});

// ============ PROJECT FOLDER IPC ============

ipcMain.handle('get-project-state', () => ({
  root: projectRoot || '',
  preselect: (preselectJson && fs.existsSync(preselectJson)) ? preselectJson : ''
}));

ipcMain.handle('choose-project-folder', async () => {
  const cfg = readConfig();
  const sel = await dialog.showOpenDialog(mainWindow, {
    title: 'Обрати папку проєкту',
    properties: ['openDirectory'],
    defaultPath: (cfg.lastProjectFolder && fs.existsSync(cfg.lastProjectFolder)) ? cfg.lastProjectFolder : undefined
  });
  if (sel.canceled || !sel.filePaths.length) return { success: false };
  setProjectRoot(sel.filePaths[0], '');
  return { success: true, root: projectRoot };
});

ipcMain.handle('scan-project', () => {
  if (!projectRoot || !fs.existsSync(projectRoot)) {
    return { success: false, root: projectRoot || '', tree: null };
  }
  const tree = scanProjectFolder(projectRoot);
  const products = collectProductPaths(tree);
  return { success: true, root: projectRoot, name: tree.name, tree, products };
});

ipcMain.handle('load-products', (_e, paths) => {
  const out = [];
  (Array.isArray(paths) ? paths : []).forEach(p => {
    try {
      const data = JSON.parse(readTextAuto(p));
      out.push({ path: p, db: data });
    } catch (e) {
      out.push({ path: p, error: e.message });
    }
  });
  return out;
});

ipcMain.handle('read-overlay', () => readOverlayFile());

ipcMain.handle('save-overlay', (_e, data) => {
  try {
    const p = overlayPath();
    if (!p) return { success: false, error: 'no-project' };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-project-title', () => projectTitle());

// ============ FIT RULES IPC ============

ipcMain.handle('get-fit-rules', () => readFitRules());

ipcMain.handle('save-fit-rules', (event, rules) => {
  try {
    if (!rules || typeof rules !== 'object') return { success: false, error: 'invalid' };
    saveFitRulesFile(rules);
    BrowserWindow.getAllWindows().forEach(w => {
      if (!w.isDestroyed() && w.webContents.id !== event.sender.id) {
        w.webContents.send('fit-rules-updated');
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Last known aggregate from the renderer (for the fit_rules window: maps codes/names
// back to friendly display strings). Fire-and-forget; defaults to empty arrays.
let fitRulesContext = { fittings: [], materials: [], profiles: [] };

function normalizeCtxArray(arr) {
  return Array.isArray(arr) ? arr.filter(x => x && typeof x === 'object') : [];
}

ipcMain.handle('set-fit-rules-context', (_e, ctx) => {
  if (!ctx || typeof ctx !== 'object') return { success: false };
  fitRulesContext = {
    fittings: normalizeCtxArray(ctx.fittings),
    materials: normalizeCtxArray(ctx.materials),
    profiles: normalizeCtxArray(ctx.profiles)
  };
  return { success: true };
});

ipcMain.handle('get-fit-rules-data', () => {
  const rules = readFitRules();
  const ov = readOverlayFile();
  return {
    rules,
    fittings: fitRulesContext.fittings,
    materials: fitRulesContext.materials,
    profiles: fitRulesContext.profiles,
    tagOrder: (ov && Array.isArray(ov.tagOrder)) ? ov.tagOrder : []
  };
});

ipcMain.handle('open-fit-rules-window', () => {
  openFitRulesWindow();
});

// ============ CONFIG / SETTINGS IPC ============

ipcMain.handle('get-config', () => readConfig());

ipcMain.handle('save-config', (event, config) => {
  const merged = { ...readConfig(), ...(config || {}) };
  saveConfig(merged);
  return { success: true };
});

ipcMain.handle('get-calc-workbook-config', () => {
  const cfg = readConfig();
  return { workbookPath: cfg.workbookPath || '' };
});

ipcMain.handle('choose-calc-workbook', async () => {
  const sel = await dialog.showOpenDialog(mainWindow, {
    title: 'Обрати файл «Розрахунок фурнітури»',
    properties: ['openFile'],
    filters: [{ name: 'Excel з макросами', extensions: ['xlsm'] }]
  });
  if (!sel.canceled && sel.filePaths.length) {
    const wp = sel.filePaths[0];
    saveConfig({ ...readConfig(), workbookPath: wp });
    return { success: true, workbookPath: wp };
  }
  return { success: false, workbookPath: '' };
});

ipcMain.handle('write-calc-workbook', (event, payload) => {
  try {
    const cfg = readConfig();
    if (!cfg.workbookPath || !fs.existsSync(cfg.workbookPath)) {
      return { success: false, error: 'no-workbook' };
    }
    if (!payload || !payload.db) return { success: false, error: 'no-data' };
    const res = calcWorkbook.writeCalcWorkbook(cfg.workbookPath, payload.db, payload.roomName || '');
    return { success: true, result: res };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('export-settings', async (_e, payload) => {
  try {
    const data = {
      format: 'obi-settings',
      version: 1,
      app: 'Output Bazis Info',
      exportedAt: new Date().toISOString(),
      config: (payload && payload.config && typeof payload.config === 'object') ? payload.config : {},
      fitRules: (payload && payload.fitRules && typeof payload.fitRules === 'object') ? payload.fitRules : {}
    };
    const filePath = await dialog.showSaveDialog(mainWindow, {
      title: 'Експорт налаштувань',
      defaultPath: 'OBI-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (filePath.canceled || !filePath.filePath) return { success: false, canceled: true };
    fs.writeFileSync(filePath.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: filePath.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import-settings', async () => {
  try {
    const sel = await dialog.showOpenDialog(mainWindow, {
      title: 'Імпорт налаштувань',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (sel.canceled || !sel.filePaths.length) return { success: false, canceled: true };
    const raw = JSON.parse(fs.readFileSync(sel.filePaths[0], 'utf-8'));
    if (!raw || typeof raw !== 'object') return { success: false, error: 'invalid' };
    let config = null;
    let fitRules = null;
    if (raw.format === 'obi-settings' || (raw.config && raw.fitRules)) {
      config = (raw.config && typeof raw.config === 'object') ? raw.config : null;
      fitRules = (raw.fitRules && typeof raw.fitRules === 'object') ? raw.fitRules : null;
    } else if ('theme' in raw || 'language' in raw) {
      config = raw;
    } else if (raw.tags && typeof raw.tags === 'object' || Array.isArray(raw.blacklist)) {
      fitRules = raw;
    } else {
      return { success: false, error: 'invalid' };
    }
    return { success: true, path: sel.filePaths[0], config, fitRules };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  url: APP_URL,
  author: APP_AUTHOR
}));

// ============ UPDATES ============

function updaterTargets() {
  const dir = dataDir();
  return {
    targetExe: path.join(dir, 'OBI.exe'),
    targetJs: path.join(dir, 'OBI.js'),
    targetIcon: path.join(dir, 'icon.bmp'),
    currentVersion: app.getVersion()
  };
}

ipcMain.handle('check-update', async () => {
  return await updater.checkUpdate(updaterTargets());
});

ipcMain.handle('apply-update', async (event, info) => {
  try {
    const targets = updaterTargets();
    await updater.applyUpdate({ ...targets, assetUrl: info.assetUrl, assetName: info.assetName });
    setTimeout(() => app.quit(), 800);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

async function autoCheckUpdates() {
  try {
    const cfg = readConfig();
    if (!cfg.autoUpdate) return;
    const info = await updater.checkUpdate(updaterTargets());
    if (info.available && mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  } catch (e) {}
}

// ============ WINDOW CONTROLS ============

ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

// ============ EXPORT ============

ipcMain.handle('export-xlsx', async (_e, data) => {
  try {
    if (!data) return { success: false, error: 'no-data' };
    const buffer = await exportToXLSXBuffer(data);
    const fileName = (projectTitle() || 'mebel-export') + '.xlsx';
    const filePath = await dialog.showSaveDialog(mainWindow, {
      title: 'Зберегти експорт',
      defaultPath: fileName,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });
    if (!filePath.canceled && filePath.filePath) {
      fs.writeFileSync(filePath.filePath, buffer);
      return { success: true, path: filePath.filePath };
    }
    return { success: false };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// PDF print-page geometry: A4 landscape, 0.4in margins, @96 CSS dpi
const PDF_PAGE_PX = 716.86;
// A group is moved to the next page only when <25% of it fits on the
// current one (i.e. >75% would spill); otherwise it may split naturally.
const PDF_MEASURE_SCRIPT = `(() => {
  const P = ${PDF_PAGE_PX};
  const q = '.gwrap:not(.split)';
  let rounds = 0, changed = true;
  while (changed && rounds < 100) {
    changed = false; rounds++;
    document.querySelectorAll(q).forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.height) return;
      const rem = P - (r.top % P);
      if (rem / r.height < 0.25) {
        el.classList.add('split');
        const part = el.closest('.part');
        if (part && part.querySelector('.grp') === el) {
          const t = part.querySelector('.part-title');
          if (t) t.classList.add('split');
        }
        changed = true;
      }
    });
  }
  return rounds;
})();`;

ipcMain.handle('export-pdf', async (_e, data) => {
  let win = null;
  let tmp = null;
  try {
    if (!data) return { success: false, error: 'no-data' };
    const html = buildPdfHtml(data);
    const fileName = (projectTitle() || 'mebel-export') + '.pdf';
    const filePath = await dialog.showSaveDialog(mainWindow, {
      title: 'Зберегти PDF',
      defaultPath: fileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (filePath.canceled || !filePath.filePath) return { success: false };

    tmp = path.join(os.tmpdir(), `obi-pdf-${Date.now()}.html`);
    fs.writeFileSync(tmp, html, 'utf8');
    // Content width of A4 landscape minus 0.4in side margins (276.68mm == 1045.8px @96dpi)
    win = new BrowserWindow({ show: false, useContentSize: true, width: 1046, height: 2000, webPreferences: { sandbox: true } });
    win.webContents.setZoomFactor(1);
    await win.loadFile(tmp);
    await new Promise(r => setTimeout(r, 300));
    await win.webContents.executeJavaScript(PDF_MEASURE_SCRIPT);
    await new Promise(r => setTimeout(r, 120));
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      landscape: true,
      printBackground: true,
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });
    fs.writeFileSync(filePath.filePath, pdf);
    return { success: true, path: filePath.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
    if (tmp) { try { fs.unlinkSync(tmp); } catch (e) {} }
  }
});
