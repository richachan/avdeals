const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  fetchApi: (endpoint, query) => ipcRenderer.invoke('fetch-api', endpoint, query)
}); 