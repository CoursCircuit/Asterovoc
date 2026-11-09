/* © CoursCircuit. Pont natif limité à deux actions explicites. */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('asterovocDesktop', Object.freeze({
  saveFile: payload => ipcRenderer.invoke('asterovoc:save-file', { data: payload.data, name: payload.name, kind: payload.kind }),
  toggleFullscreen: () => ipcRenderer.invoke('asterovoc:fullscreen')
}));
