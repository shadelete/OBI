const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDB: () => ipcRenderer.invoke('get-db'),
  getProjectName: () => ipcRenderer.invoke('get-project-name'),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  renameProject: (name) => ipcRenderer.invoke('rename-project', name),
  saveDB: (data) => ipcRenderer.invoke('save-db', data),
  saveProject: (data) => ipcRenderer.invoke('save-project', data),
  loadProject: (path) => ipcRenderer.invoke('load-project', path),
  exportXLSX: () => ipcRenderer.invoke('export-xlsx'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getCalcWorkbookConfig: () => ipcRenderer.invoke('get-calc-workbook-config'),
  chooseCalcWorkbook: () => ipcRenderer.invoke('choose-calc-workbook'),
  writeCalcWorkbook: (db, roomName) => ipcRenderer.invoke('write-calc-workbook', { db, roomName }),
  getFitRules: () => ipcRenderer.invoke('get-fit-rules'),
  getFitRulesData: () => ipcRenderer.invoke('get-fit-rules-data'),
  openFitRulesWindow: () => ipcRenderer.invoke('open-fit-rules-window'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  applyUpdate: (info) => ipcRenderer.invoke('apply-update', info),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (e, info) => cb(info)),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close')
});