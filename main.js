/* © CoursCircuit. Licence MIT. */
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const entryUrl = pathToFileURL(path.join(__dirname, 'index.html')).href;
// An isolated profile is useful for native QA without touching the teacher's library.
if (process.env.ASTEROVOC_QA_PROFILE) app.setPath('userData', process.env.ASTEROVOC_QA_PROFILE);
let mainWindow;
function trusted(event) {
  return event.senderFrame === event.sender.mainFrame && event.senderFrame.url === entryUrl;
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420, height: 940, minWidth: 760, minHeight: 620,
    backgroundColor: '#080d19', title: 'Asterovoc',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: false }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => { if (url !== entryUrl && url !== entryUrl + '#') event.preventDefault(); });
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.loadFile('index.html');
}
ipcMain.handle('asterovoc:fullscreen', event => {
  if (!trusted(event)) throw new Error('Fenêtre non autorisée.');
  const win = BrowserWindow.fromWebContents(event.sender); win.setFullScreen(!win.isFullScreen()); return true;
});
ipcMain.handle('asterovoc:save-file', async (event, payload) => {
  if (!trusted(event)) throw new Error('Fenêtre non autorisée.');
  if (!payload || typeof payload.data !== 'string' || Buffer.byteLength(payload.data, 'utf8') > 24000000 || !['backup', 'text', 'report'].includes(payload.kind)) throw new Error('Fichier invalide ou trop volumineux.');
  const extension = payload.kind === 'backup' ? 'asterovoc' : 'txt';
  const name = typeof payload.name === 'string' ? path.basename(payload.name).replace(/[<>:"|?*\x00-\x1f]/g, '-').slice(0, 160) : `Asterovoc.${extension}`;
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: payload.kind === 'backup' ? 'Exporter toute la bibliothèque Asterovoc' : 'Enregistrer le fichier',
    defaultPath: path.join(app.getPath('downloads'), name),
    filters: [{ name: payload.kind === 'backup' ? 'Sauvegarde Asterovoc' : 'Document texte', extensions: [extension] }],
    properties: ['createDirectory', 'showOverwriteConfirmation']
  });
  if (canceled || !filePath) return { canceled: true };
  const temporary = path.join(path.dirname(filePath), '.' + path.basename(filePath) + '.' + require('node:crypto').randomUUID() + '.tmp');
  try { await fs.writeFile(temporary, payload.data, { encoding: 'utf8', flag: 'wx' }); await fs.rename(temporary, filePath); }
  catch (error) { await fs.rm(temporary, { force: true }).catch(() => {}); throw error; }
  return { canceled: false };
});
app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Asterovoc', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide', label: 'Masquer Asterovoc' }, { role: 'hideOthers', label: 'Masquer les autres' }, { role: 'unhide', label: 'Tout afficher' }, { type: 'separator' }, { role: 'quit', label: 'Quitter Asterovoc' }] },
    { label: 'Édition', submenu: [{ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' }, { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
    { label: 'Présentation', submenu: [{ role: 'resetZoom', label: 'Taille réelle' }, { role: 'zoomIn', label: 'Agrandir' }, { role: 'zoomOut', label: 'Réduire' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Plein écran' }] },
    { label: 'Fenêtre', submenu: [{ role: 'minimize', label: 'Réduire' }, { role: 'zoom', label: 'Agrandir' }, { role: 'close', label: 'Fermer' }] }
  ]));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
