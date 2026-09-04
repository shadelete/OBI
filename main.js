const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exportToXLSXBuffer } = require('./src/export');
const updater = require('./src/updater');

let mainWindow;
let fitRulesWindow;

function dataDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged) return path.dirname(app.getPath('exe'));
  return __dirname;
}

function projectsDir() {
  return path.join(dataDir(), 'data', 'projects');
}

let activeProjectPath = null;

function listProjects() {
  const pd = projectsDir();
  if (!fs.existsSync(pd)) return [];
  return fs.readdirSync(pd)
    .filter(f => f.toLowerCase().endsWith('.json'))
    .map(f => ({
      name: path.basename(f, '.json'),
      path: path.join(pd, f),
      mtime: fs.statSync(path.join(pd, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

function findMostRecentProject() {
  const items = listProjects();
  return items.length ? items[0].path : '';
}

function dbPath() {
  if (activeProjectPath && fs.existsSync(activeProjectPath)) return activeProjectPath;
  const def = path.join(dataDir(), 'data', 'db.json');
  try {
    const activePath = path.join(dataDir(), 'data', 'current_project.txt');
    if (fs.existsSync(activePath)) {
      let saved = fs.readFileSync(activePath, 'utf-8').trim();
      if (saved) {
        if (!path.isAbsolute(saved)) saved = path.resolve(dataDir(), saved);
        if (fs.existsSync(saved)) return saved;
      }
    }
  } catch (e) {}
  try {
    const pd = projectsDir();
    if (fs.existsSync(pd)) {
      const files = fs.readdirSync(pd).filter(f => f.toLowerCase().endsWith('.json'));
      if (files.length) {
        files.sort((a, b) => fs.statSync(path.join(pd, b)).mtimeMs - fs.statSync(path.join(pd, a)).mtimeMs);
        return path.join(pd, files[0]);
      }
    }
  } catch (e) {}
  return def;
}

function ensureProjectsDir() {
  fs.mkdirSync(projectsDir(), { recursive: true });
}

function sanitizeFileName(name) {
  return String(name || '').replace(/[\\\/:\*\?"<>\|]/g, '_').trim();
}

function configPath() {
  return path.join(dataDir(), 'config', 'config.json');
}

const APP_URL = 'https://github.com/shadelete/OBI';
const APP_AUTHOR = 'Alexander Bondarenko';

const DEFAULT_CONFIG = Object.freeze({ theme: 'dark', language: 'uk', autoUpdate: false });

function readConfig() {
  try {
    const p = configPath();
    if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG };
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return {
      theme: data.theme === 'dark' ? 'dark' : 'light',
      language: data.language === 'ru' ? 'ru' : 'uk',
      autoUpdate: !!data.autoUpdate
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

const DEFAULT_FIT_RULES = Object.freeze({ tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [] });

function readFitRules() {  try {
    const p = fitRulesPath();
    if (!fs.existsSync(p)) return { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [] };
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return {
      tags: (data.tags && typeof data.tags === 'object') ? data.tags : {},
      tagsByName: (data.tagsByName && typeof data.tagsByName === 'object') ? data.tagsByName : {},
      blacklist: Array.isArray(data.blacklist) ? data.blacklist : [],
      blacklistByName: Array.isArray(data.blacklistByName) ? data.blacklistByName : []
    };
  } catch (e) {
    return { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [] };
  }
}

function saveFitRules(rules) {
  const p = fitRulesPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(rules, null, 2), 'utf-8');
}

function ensureDB() {
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify({ date: new Date().toString(), materials: [], profiles: [], fittings: [] }, null, 2), 'utf-8');
  }
}

function createWindow() {
  ensureDB();
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

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
    0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,0x043F,
    0x0440,0x0441,0x0442,0x0443,0x0444,0x0445,0x0446,0x0447,
    0x0448,0x0449,0x044A,0x044B,0x044C,0x044D,0x044E,0x044F
  ];
  for (let i = 0; i < 128; i++) chars[i] = String.fromCharCode(i);
  for (let i = 0; i < 128; i++) chars[i + 128] = String.fromCharCode(cp[i]);
  return chars;
})();

function readDB() {
  const buf = fs.readFileSync(dbPath());
  let text = buf.toString('utf-8');
  if (text.includes('\uFFFD')) {
    text = buf.toString('latin1')
      .replace(/[\u0080-\u00FF]/g, ch => windows1251[ch.charCodeAt(0)] || ch);
  }
  return JSON.parse(text);
}

ipcMain.handle('get-db', () => readDB());

ipcMain.handle('get-project-name', () => {
  const p = path.basename(activeProjectPath || dbPath(), '.json');
  return (p && p !== 'db') ? p : '';
});

ipcMain.handle('get-config', () => readConfig());

ipcMain.handle('save-config', (event, config) => {
  saveConfig(config);
  return { success: true };
});

ipcMain.handle('get-fit-rules', () => readFitRules());

ipcMain.handle('get-fit-rules-data', () => {
  const rules = readFitRules();
  const db = readDB();
  return { rules, fittings: db.fittings || [], tagOrder: db.tagOrder || [] };
});

ipcMain.handle('open-fit-rules-window', () => {
  openFitRulesWindow();
});

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  url: APP_URL,
  author: APP_AUTHOR
}));

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

ipcMain.handle('save-db', (event, data) => {
  ensureProjectsDir();
  const p = activeProjectPath || dbPath();
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  activeProjectPath = p;
  if (data.fitRules) {
    try { saveFitRules(data.fitRules); } catch (e) {}
  }
  return { success: true, path: p };
});

ipcMain.handle('save-project', (event, data) => {
  ensureProjectsDir();
  const p = activeProjectPath || findMostRecentProject() || path.join(projectsDir(), 'order.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  activeProjectPath = p;
  if (data.fitRules) {
    try { saveFitRules(data.fitRules); } catch (e) {}
  }
  return { success: true, path: p };
});

ipcMain.handle('load-project', (event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return { success: false };
  const buf = fs.readFileSync(filePath);
  let text = buf.toString('utf-8');
  if (text.includes('\uFFFD')) {
    text = buf.toString('latin1')
      .replace(/[\u0080-\u00FF]/g, ch => windows1251[ch.charCodeAt(0)] || ch);
  }
  const data = JSON.parse(text);
  activeProjectPath = filePath;
  return { success: true, data, path: filePath };
});

ipcMain.handle('get-projects', () => {
  return listProjects().map(({ name, path: p, mtime }) => ({ name, path: p, mtime }));
});

ipcMain.handle('rename-project', (event, newName) => {
  const clean = sanitizeFileName(newName);
  if (!clean || clean === 'db') return { success: false, error: 'invalid-name' };
  const old = activeProjectPath || dbPath();
  const newPath = path.join(path.dirname(old), clean + '.json');
  if (fs.existsSync(newPath) && newPath !== old) {
    return { success: false, error: 'exists' };
  }
  fs.renameSync(old, newPath);
  activeProjectPath = newPath;
  return { success: true, name: clean, path: newPath };
});

ipcMain.handle('export-xlsx', async () => {
  try {
    const data = readDB();
    const buffer = await exportToXLSXBuffer(data);
    const filePath = await dialog.showSaveDialog(mainWindow, {
      title: 'Зберегти експорт',
      defaultPath: 'mebel-export.xlsx',
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