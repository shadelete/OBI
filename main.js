const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exportToXLSXBuffer } = require('./src/export');

let mainWindow;

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
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
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
  const dbPath = path.join(__dirname, 'data', 'db.json');
  const buf = fs.readFileSync(dbPath);
  let text = buf.toString('utf-8');
  if (text.includes('\uFFFD')) {
    text = buf.toString('latin1')
      .replace(/[\u0080-\u00FF]/g, ch => windows1251[ch.charCodeAt(0)] || ch);
  }
  return JSON.parse(text);
}

ipcMain.handle('get-db', () => readDB());

ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('save-db', (event, data) => {
  const dbPath = path.join(__dirname, 'data', 'db.json');
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true };
});

ipcMain.handle('save-project', async (event, data) => {
  const filePath = await dialog.showSaveDialog(mainWindow, {
    title: 'Зберегти замовлення',
    defaultPath: 'order.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (filePath.canceled || !filePath.filePath) return { success: false, canceled: true };
  fs.writeFileSync(filePath.filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true, path: filePath.filePath };
});

ipcMain.handle('load-project', async () => {
  const filePath = await dialog.showOpenDialog(mainWindow, {
    title: 'Відкрити замовлення',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (filePath.canceled || !filePath.filePaths || !filePath.filePaths[0]) {
    return { success: false, canceled: true };
  }
  const buf = fs.readFileSync(filePath.filePaths[0]);
  let text = buf.toString('utf-8');
  if (text.includes('\uFFFD')) {
    text = buf.toString('latin1')
      .replace(/[\u0080-\u00FF]/g, ch => windows1251[ch.charCodeAt(0)] || ch);
  }
  const data = JSON.parse(text);
  return { success: true, data };
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