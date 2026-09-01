const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDB: () => ipcRenderer.invoke('get-db'),
  saveDB: (data) => ipcRenderer.invoke('save-db', data),
  saveProject: (data) => ipcRenderer.invoke('save-project', data),
  loadProject: () => ipcRenderer.invoke('load-project'),
  exportXLSX: () => ipcRenderer.invoke('export-xlsx'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowClose: () => ipcRenderer.invoke('window-close')
});