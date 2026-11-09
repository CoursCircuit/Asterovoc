/* © CoursCircuit. Asterovoc 2 — bibliothèque, préparation et conduite de séance. */
(function () {
  'use strict';
  const Core = window.AsterovocCore, Scene = window.AsterovocScene;
  const KEY = 'asterovoc-library-v2', RECOVERY_KEY = KEY + '-previous';
  const $ = id => document.getElementById(id);
  const paths = {
    save: 'M4 3h14l3 3v15H3V3h1M7 3v6h10V3M7 21v-8h10v8', help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m0 3h.01',
    plus: 'M12 5v14M5 12h14', search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', folder: 'M3 7V4h6l2 3h10v13H3V7Z',
    'folder-plus': 'M3 7V4h6l2 3h10v13H3V7ZM12 10v7m-3-3.5h6', file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7', export: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
    import: 'M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6', sparkles: 'm12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Zm7-1v5m-2.5-2.5h5',
    info: 'M12 11v6m0-10h.01', more: 'M5 12h.01M12 12h.01M19 12h.01', edit: 'm16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',
    chevron: 'm6 9 6 6 6-6', play: 'M7 3v18l15-9L7 3Z', pause: 'M8 4v16M16 4v16', fullscreen: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    restart: 'M3 10a9 9 0 1 1 1 7M3 4v6h6', stop: 'M5 5h14v14H5z', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0', close: 'm6 6 12 12M6 18 18 6',
    history: 'M3 10a9 9 0 1 1 1 7M3 4v6h6m3-4v6l4 2',
    volume: 'M11 3 6 7H2v10h4l5 4V3Zm4 5a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
    'volume-off': 'M11 3 6 7H2v10h4l5 4V3Zm5 6 6 6m-6 0 6-6'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('icon');
    if (['help', 'info'].includes(name)) { const circle = document.createElementNS(svg.namespaceURI, 'circle'); circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10'); svg.append(circle); }
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || paths.file); svg.append(path); return svg;
  }
  function hydrateIcons() { document.querySelectorAll('[data-icon]').forEach(node => { node.replaceWith(icon(node.dataset.icon)); }); }
  function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function action(text, fn, className = 'button quiet') { const b = el('button', className, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function setText(id, text) { if ($(id).textContent !== text) $(id).textContent = text; }
  hydrateIcons();

  let state, loadMessage = '', filterFolder = '*', saveTimer, toastTimer, restoreFocus;
  try {
    const stored = localStorage.getItem(KEY);
    state = stored ? Core.validateState(JSON.parse(stored)) : Core.createDefaultState();
  } catch {
    try { state = Core.validateState(JSON.parse(localStorage.getItem(RECOVERY_KEY))); loadMessage = 'La sauvegarde de secours a restauré votre bibliothèque. Exportez-la pour conserver une copie.'; }
    catch { state = Core.createDefaultState(); loadMessage = 'La bibliothèque locale n’a pas pu être lue. Les données existantes ne seront pas écrasées avant votre prochaine modification.'; }
  }
  function toast(text, label, fn, error = false) {
    clearTimeout(toastTimer); $('toast').hidden = false; $('toast').classList.toggle('error', error); $('toastText').textContent = text;
    $('toastAction').hidden = !label; $('toastAction').textContent = label || ''; $('toastAction').onclick = fn ? () => { fn(); $('toast').hidden = true; } : null;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, error || fn ? 12000 : 5000);
  }
  $('toastClose').addEventListener('click', () => { $('toast').hidden = true; });
  function persist() {
    clearTimeout(saveTimer);
    try {
      const serialized = JSON.stringify(state);
      // The previous complete value is a second local recovery point.
      const previous = localStorage.getItem(KEY);
      localStorage.setItem(KEY, serialized);
      if (previous && previous !== serialized) { try { localStorage.setItem(RECOVERY_KEY, previous); } catch { /* Primary value is already safe. */ } }
      $('saveStatus').classList.remove('error'); setText('saveStatus', state.draft.listId ? 'Enregistré sur ce Mac' : 'Brouillon enregistré');
      return true;
    } catch {
      $('saveStatus').classList.add('error'); setText('saveStatus', 'Sauvegarde impossible');
      toast('Le stockage local est plein ou indisponible. Exportez votre bibliothèque pour ne rien perdre.', 'Exporter', exportLibrary, true); return false;
    }
  }
  function readEditor() {
    state.draft = { listId: state.draft.listId, title: $('listTitle').value, folderId: $('listFolder').value, raw: $('wordInput').value };
    const list = state.lists.find(l => l.id === state.draft.listId);
    if (list) { list.title = state.draft.title.trim() || 'Sans titre'; list.folderId = state.draft.folderId; list.raw = state.draft.raw; list.updatedAt = new Date().toISOString(); }
  }
  function saveEditor(immediate = false) {
    readEditor(); refreshWordFeedback();
    setText('saveStatus', 'Enregistrement…'); clearTimeout(saveTimer);
    if (immediate) { persist(); renderLibrary(); }
    else saveTimer = setTimeout(() => { persist(); renderLibrary(); }, 350);
  }
  function saveList() {
    readEditor();
    if (!state.draft.raw.trim()) { toast('Ajoutez au moins un mot avant d’enregistrer la liste.'); $('wordInput').focus(); return false; }
    if (!state.draft.listId) {
      if (state.lists.length >= 1000) { toast('La bibliothèque contient déjà 1 000 listes. Exportez une copie puis faites du rangement.', undefined, undefined, true); return false; }
      const now = new Date().toISOString(), list = { id: Core.uid(), title: state.draft.title.trim() || 'Nouvelle liste', folderId: state.draft.folderId, raw: state.draft.raw, createdAt: now, updatedAt: now };
      state.lists.unshift(list); state.draft.listId = list.id; state.draft.title = list.title; $('listTitle').value = list.title;
    }
    const success = persist(); renderLibrary(); if (success) toast('Liste enregistrée. Vos modifications sont ensuite sauvegardées automatiquement.'); return success;
  }
  function openList(id) {
    saveEditor(true); if (!state.draft.listId && state.draft.raw.trim() && !saveList()) return;
    const list = state.lists.find(l => l.id === id); if (!list) return;
    state.draft = { listId: list.id, title: list.title, folderId: list.folderId, raw: list.raw }; renderEditor(); persist(); renderLibrary();
  }
  function newList() {
    saveEditor(true);
    // Keep a named copy of a nonempty unsaved draft before starting another one.
    if (!state.draft.listId && state.draft.raw.trim() && !saveList()) return false;
    state.draft = { listId: '', title: '', folderId: filterFolder !== '*' ? filterFolder : '', raw: '' }; renderEditor(); persist(); renderLibrary(); $('listTitle').focus(); return true;
  }
  function renderEditor() {
    $('listTitle').value = state.draft.title; $('wordInput').value = state.draft.raw; renderFolderSelect();
    $('deleteList').disabled = !state.draft.listId; refreshWordFeedback();
  }
  function renderFolderSelect() {
    const select = $('listFolder'); select.replaceChildren(new Option('Sans dossier', ''));
    state.folders.forEach(f => select.add(new Option(f.name, f.id))); select.value = state.draft.folderId;
    $('manageFolder').disabled = !select.value;
  }
  function renderLibrary() {
    const nav = $('folderNav'); nav.replaceChildren();
    const folderRow = (id, name, count) => {
      const b = action('', () => { filterFolder = id; renderLibrary(); }, 'folder-row' + (filterFolder === id ? ' active' : ''));
      b.setAttribute('aria-current', filterFolder === id ? 'true' : 'false'); b.append(icon('folder'), el('span', 'folder-name', name), el('span', 'folder-count', String(count))); nav.append(b);
    };
    folderRow('*', 'Toutes les listes', state.lists.length);
    state.folders.forEach(f => folderRow(f.id, f.name, state.lists.filter(l => l.folderId === f.id).length));
    if (state.lists.some(l => !l.folderId)) folderRow('', 'Sans dossier', state.lists.filter(l => !l.folderId).length);
    const query = Core.keyOf($('listSearch').value), visible = state.lists.filter(l => (filterFolder === '*' || l.folderId === filterFolder) && (!query || Core.keyOf(l.title + ' ' + l.raw).includes(query)));
    const collection = $('listCollection'); collection.replaceChildren();
    visible.forEach(l => {
      const row = action('', () => openList(l.id), 'saved-list' + (state.draft.listId === l.id ? ' active' : ''));
      row.setAttribute('aria-pressed', String(state.draft.listId === l.id)); row.title = l.title;
      const text = el('span', 'list-copy'); text.append(el('strong', '', l.title), el('small', '', `${Core.parseWords(l.raw).entries.length} mots`)); row.append(icon('file'), text); collection.append(row);
    });
    if (!visible.length) collection.append(el('p', 'empty-library', query ? 'Aucune liste ne correspond à la recherche.' : 'Aucune liste dans ce dossier. Créez-en une !'));
    setText('libraryCount', String(visible.length)); setText('trashCount', state.trash.length ? String(state.trash.length) : '');
    $('deleteList').disabled = !state.draft.listId;
  }
  function refreshWordFeedback() {
    const parsed = Core.parseWords($('wordInput').value), n = parsed.entries.length;
    setText('wordCount', `${n} mot${n > 1 ? 's' : ''} prêt${n > 1 ? 's' : ''}`);
    const messages = [];
    if (parsed.duplicates) messages.push(`${parsed.duplicates} doublon${parsed.duplicates > 1 ? 's' : ''} ignoré${parsed.duplicates > 1 ? 's' : ''}`);
    if (parsed.invalid) messages.push(`${parsed.invalid} ligne${parsed.invalid > 1 ? 's' : ''} dépasse${parsed.invalid > 1 ? 'nt' : ''} 240 caractères : raccourcissez-la${parsed.invalid > 1 ? 's' : ''}`);
    if (parsed.overflow) messages.push('2 000 mots maximum par mission');
    if (state.settings.direction !== 'forward' && parsed.entries.some(e => !e.answer)) messages.push('Les éléments sans réponse restent dans le sens normal');
    const long = parsed.entries.some(e => (state.settings.direction === 'reverse' && e.answer ? e.answer : e.prompt).length > 65);
    if (long) messages.push(state.settings.mode === 'teams' ? 'Phrases longues : privilégiez 2 équipes pour garder de grands caractères' : 'Phrases longues : le nombre de couloirs s’adaptera pour garder le texte lisible');
    $('inputFeedback').textContent = messages.join(' · '); $('inputFeedback').classList.toggle('error', !!parsed.invalid || parsed.overflow);
    $('cleanWords').hidden = !parsed.duplicates; $('startGame').disabled = !parsed.valid;
    Scene.drawPreview(parsed.entries, state.settings);
    return parsed;
  }
  function renderSettings() {
    const s = state.settings;
    $('gameMode').value = s.mode; $('gameDuration').value = String(s.duration); $('laneCount').value = String(s.lanes); $('wordSize').value = String(s.fontSize); $('wordDirection').value = s.direction;
    $('soundEnabled').checked = s.sound; $('reducedMotion').checked = s.reducedMotion;
    $('ambientEnabled').checked = s.ambient; $('ambientVolume').value = String(s.ambientVolume); $('ambientVolume').disabled = !s.ambient; $('ambientVolumeValue').textContent = s.ambientVolume + ' %';
    $('teamOptions').hidden = s.mode !== 'teams'; $('teamCount').value = String(s.teamCount); $('teamBonuses').checked = s.teamBonuses;
    if (![...$('bonusEvery').options].some(o => Number(o.value) === s.bonusEvery)) $('bonusEvery').add(new Option(`${s.bonusEvery} réussites`, String(s.bonusEvery)));
    $('bonusEvery').value = String(s.bonusEvery); $('bonusEvery').disabled = !s.teamBonuses; $('laneCount').disabled = s.mode === 'teams';
    $('teamNames').replaceChildren(...s.teamNames.slice(0, s.teamCount).map((name, i) => {
      const label = el('label', 'team-name-field'), number = el('b', '', String(i + 1)), input = el('input');
      label.style.setProperty('--team-color', Core.TEAM_COLORS[i]); input.value = name; input.maxLength = 24; input.setAttribute('aria-label', `Nom de l’équipe ${i + 1}`);
      input.addEventListener('input', () => { state.settings.teamNames[i] = input.value.trim().normalize('NFC') || Core.TEAM_NAMES[i]; persist(); });
      label.append(number, input); return label;
    }));
    document.querySelectorAll('#homeSpeed button').forEach(b => { const active = Number(b.dataset.speed) === s.speed; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); b.disabled = s.mode === 'calm'; });
    refreshWordFeedback();
  }
  function closeMenu() { $('listMenu').hidden = true; $('listMenuButton').setAttribute('aria-expanded', 'false'); }
  $('listMenuButton').addEventListener('click', e => { e.stopPropagation(); $('listMenu').hidden = !$('listMenu').hidden; $('listMenuButton').setAttribute('aria-expanded', String(!$('listMenu').hidden)); });
  document.addEventListener('click', e => { if (!$('listMenu').contains(e.target)) closeMenu(); });
  ['listTitle', 'wordInput'].forEach(id => $(id).addEventListener('input', () => saveEditor()));
  $('listFolder').addEventListener('change', () => { $('manageFolder').disabled = !$('listFolder').value; saveEditor(true); });
  $('listSearch').addEventListener('input', renderLibrary); $('newList').addEventListener('click', newList); $('saveList').addEventListener('click', saveList);
  $('cleanWords').addEventListener('click', () => { const parsed = Core.parseWords($('wordInput').value); if (parsed.invalid) return toast('Raccourcissez les lignes trop longues avant de nettoyer la liste.', undefined, undefined, true); $('wordInput').value = Core.serializeWords(parsed.entries); saveEditor(true); toast('Liste nettoyée : un élément par ligne, sans doublon.'); });
  $('duplicateList').addEventListener('click', () => { closeMenu(); readEditor(); if (!state.draft.raw.trim()) return toast('Ajoutez d’abord quelques mots.'); if (!state.draft.listId && !saveList()) return; const draft = { ...state.draft }; state.draft = { ...draft, listId: '', title: (draft.title || 'Nouvelle liste').slice(0, 110) + ' — copie' }; renderEditor(); saveList(); });
  $('deleteList').addEventListener('click', () => {
    closeMenu(); saveEditor(true); const index = state.lists.findIndex(l => l.id === state.draft.listId); if (index < 0) return;
    const removed = state.lists.splice(index, 1)[0]; state.trash.push(removed); state.trash = state.trash.slice(-100);
    const next = state.lists[0]; state.draft = next ? { listId: next.id, title: next.title, folderId: next.folderId, raw: next.raw } : { listId: '', title: '', folderId: '', raw: '' };
    renderEditor(); renderLibrary(); persist(); toast('Liste déplacée dans la corbeille.', 'Annuler', () => restoreList(removed.id));
  });
  function restoreList(id) {
    const index = state.trash.findIndex(l => l.id === id); if (index < 0) return;
    if (state.lists.length >= 1000) return toast('La bibliothèque a atteint sa limite de 1 000 listes.', undefined, undefined, true);
    const l = state.trash.splice(index, 1)[0]; if (!state.folders.some(f => f.id === l.folderId)) l.folderId = '';
    state.lists.unshift(l); persist(); renderLibrary();
  }
  ['gameMode', 'gameDuration', 'laneCount', 'wordSize', 'wordDirection', 'soundEnabled', 'reducedMotion', 'ambientEnabled', 'teamCount', 'teamBonuses', 'bonusEvery'].forEach(id => $(id).addEventListener('change', () => {
    state.settings = Core.sanitizeSettings({ ...state.settings, mode: $('gameMode').value, duration: Number($('gameDuration').value), lanes: Number($('laneCount').value), fontSize: Number($('wordSize').value), direction: $('wordDirection').value, sound: $('soundEnabled').checked, reducedMotion: $('reducedMotion').checked, ambient: $('ambientEnabled').checked, ambientVolume: Number($('ambientVolume').value), teamCount: Number($('teamCount').value), teamBonuses: $('teamBonuses').checked, bonusEvery: Number($('bonusEvery').value) });
    renderSettings(); persist();
  }));
  $('ambientVolume').addEventListener('input', () => { state.settings.ambientVolume = Number($('ambientVolume').value); $('ambientVolumeValue').textContent = state.settings.ambientVolume + ' %'; persist(); });
  document.querySelectorAll('#homeSpeed button').forEach(b => b.addEventListener('click', () => { state.settings.speed = Number(b.dataset.speed); renderSettings(); persist(); }));

  function openDialog(title, build, extraClass = '') {
    if ($('appDialog').open) $('appDialog').close();
    restoreFocus = document.activeElement; $('dialogTitle').textContent = title; $('dialogBody').replaceChildren(); $('appDialog').className = extraClass; build($('dialogBody')); $('appDialog').showModal();
  }
  function closeDialog() { $('appDialog').close(); restoreFocus?.focus?.(); }
  $('closeDialog').addEventListener('click', closeDialog);
  $('appDialog').addEventListener('click', e => { if (e.target === $('appDialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(); } });
  function dialogField(label, type = 'text', value = '', options) {
    const wrap = el('label', 'dialog-field', label); let control;
    if (options) { control = el('select'); options.forEach(o => control.add(new Option(o[1], o[0]))); }
    else if (type === 'textarea') control = el('textarea');
    else { control = el('input'); control.type = type; control.maxLength = 300; }
    control.value = value; wrap.append(control); return { wrap, control };
  }
  function manageFolder(folderId) {
    const current = state.folders.find(f => f.id === folderId);
    openDialog(current ? 'Modifier le dossier' : 'Nouveau dossier', body => {
      const f = dialogField('Nom du dossier', 'text', current?.name || ''); f.control.maxLength = 80;
      body.append(f.wrap, el('p', 'field-note', 'Ex. Allemand · Chapitre 2, Sciences, Calcul mental…'));
      const actions = el('div', 'dialog-actions');
      const submit = () => {
        const name = f.control.value.trim(); if (!name) { f.control.focus(); return; }
        if (state.folders.some(other => other.id !== current?.id && Core.keyOf(other.name) === Core.keyOf(name))) return toast('Un dossier porte déjà ce nom.');
        if (current) current.name = name;
        else {
          if (state.folders.length >= 200) return toast('200 dossiers maximum.', undefined, undefined, true);
          const folder = { id: Core.uid(), name }; state.folders.push(folder); state.draft.folderId = folder.id;
          const active = state.lists.find(l => l.id === state.draft.listId); if (active) active.folderId = folder.id;
          filterFolder = folder.id;
        }
        persist(); renderFolderSelect(); renderLibrary(); closeDialog();
      };
      f.control.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      if (current) actions.append(action('Retirer le dossier', () => {
        const old = { ...current }, affected = state.lists.filter(l => l.folderId === current.id).map(l => l.id);
        state.folders = state.folders.filter(f => f.id !== current.id); state.lists.forEach(l => { if (l.folderId === current.id) l.folderId = ''; }); if (state.draft.folderId === current.id) state.draft.folderId = '';
        filterFolder = '*'; persist(); renderFolderSelect(); renderLibrary(); closeDialog();
        toast('Dossier retiré. Ses listes sont conservées dans « Sans dossier ».', 'Annuler', () => { state.folders.push(old); state.lists.forEach(l => { if (affected.includes(l.id)) l.folderId = old.id; }); if (affected.includes(state.draft.listId)) state.draft.folderId = old.id; persist(); renderFolderSelect(); renderLibrary(); });
      }, 'button quiet danger-text'));
      actions.append(action('Annuler', closeDialog), action(current ? 'Enregistrer' : 'Créer le dossier', submit, 'button primary')); body.append(actions);
      setTimeout(() => f.control.focus(), 0);
    });
  }
  $('newFolder').addEventListener('click', () => { saveEditor(true); manageFolder(); }); $('manageFolder').addEventListener('click', () => { saveEditor(true); manageFolder($('listFolder').value); });
  $('trashButton').addEventListener('click', () => openDialog('Corbeille', body => {
    body.append(el('p', 'dialog-intro', 'Les 100 dernières listes retirées restent récupérables sur ce Mac et dans les sauvegardes exportées.'));
    if (!state.trash.length) body.append(el('p', 'dialog-intro', 'La corbeille est vide.'));
    [...state.trash].reverse().forEach(l => { const row = el('div', 'trash-row'), info = el('div'); info.append(el('strong', '', l.title), el('small', '', `${Core.parseWords(l.raw).entries.length} mots`)); row.append(info, action('Restaurer', () => { restoreList(l.id); row.remove(); toast('Liste restaurée dans la bibliothèque.'); })); body.append(row); });
  }));

  async function saveFile(data, name, kind) {
    try {
      if (window.asterovocDesktop?.saveFile) {
        const result = await window.asterovocDesktop.saveFile({ data, name, kind });
        if (!result.canceled) toast('Fichier enregistré.'); return !result.canceled;
      }
      const blob = new Blob([data], { type: kind === 'backup' ? 'application/json' : 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); toast('Le fichier a été transmis aux téléchargements du navigateur.'); return true;
    } catch (error) { toast('Le fichier n’a pas pu être enregistré : ' + error.message, undefined, undefined, true); return false; }
  }
  const safeName = name => (name || 'liste').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').slice(0, 100);
  function exportLibrary() {
    readEditor(); persist();
    const backup = { app: 'Asterovoc', exportedAt: new Date().toISOString(), ...state };
    return saveFile(JSON.stringify(backup, null, 2), 'Asterovoc-bibliotheque-' + new Date().toISOString().slice(0, 10) + '.asterovoc', 'backup');
  }
  $('exportLibrary').addEventListener('click', exportLibrary); $('importLibrary').addEventListener('click', () => $('backupFileInput').click());
  $('backupFileInput').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    if (file.size > 12000000) return toast('Cette sauvegarde dépasse 12 Mo.', undefined, undefined, true);
    try {
      saveEditor(true); const incoming = JSON.parse(await file.text()), merged = Core.mergeBackup(state, incoming); state = merged.state; renderEditor(); renderSettings(); renderLibrary(); persist();
      toast(`${merged.added} liste${merged.added > 1 ? 's' : ''} ajoutée${merged.added > 1 ? 's' : ''}. Dossiers, réglages et historique importés ; vos listes sont conservées.`);
    } catch (error) { toast('Import impossible : ' + error.message + ' Vos listes sont conservées.', undefined, undefined, true); }
  });
  $('exportList').addEventListener('click', () => { closeMenu(); readEditor(); saveFile(state.draft.raw, safeName(state.draft.title) + '.txt', 'text'); });
  $('importText').addEventListener('click', () => $('textFileInput').click());
  $('textFileInput').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    if (file.size > 1000000) return toast('La liste dépasse 1 Mo.', undefined, undefined, true);
    try { const raw = await file.text(); if (!Core.parseWords(raw).entries.length) return toast('Aucun mot reconnu dans ce fichier.', undefined, undefined, true); if (!newList()) return; state.draft.title = file.name.replace(/\.[^.]+$/, '').slice(0, 120); state.draft.raw = raw; renderEditor(); saveList(); }
    catch (error) { toast('Lecture impossible : ' + error.message, undefined, undefined, true); }
  });

  $('aiButton').addEventListener('click', () => {
    saveEditor(true);
    openDialog('Créer une liste avec une IA', body => {
      body.append(el('p', 'dialog-intro', 'Composez un prompt, copiez-le dans l’IA de votre choix, puis collez sa réponse ici. Aucun compte ni connexion nécessaire dans Asterovoc.'));
      const grid = el('div', 'dialog-grid');
      const subject = dialogField('Branche', 'text', 'Allemand'), theme = dialogField('Thème', 'text', ''), level = dialogField('Niveau / âge', 'text', '9H · 12–13 ans'), difficulty = dialogField('Difficulté', 'text', 'intermédiaire', [['débutant', 'Débutant'], ['intermédiaire', 'Intermédiaire'], ['avancé', 'Avancé']]);
      const language = dialogField('Langue des éléments', 'text', 'Allemand'), answerLanguage = dialogField('Langue des réponses', 'text', 'Français'), count = dialogField('Nombre d’éléments', 'number', '20'), instructions = dialogField('Consignes supplémentaires (facultatif)', 'text', '');
      theme.control.placeholder = 'Ex. les animaux, les fractions…'; count.control.min = '5'; count.control.max = '100';
      [subject, theme, level, difficulty, language, answerLanguage, count, instructions].forEach(f => grid.append(f.wrap)); body.append(grid);
      const step1 = el('h3', 'assistant-step'); step1.append(el('b', '', '1'), document.createTextNode('Copiez votre prompt')); body.append(step1);
      const output = el('textarea', 'prompt-output'); output.readOnly = true; output.setAttribute('aria-label', 'Prompt à copier');
      const fields = { subject, theme, level, difficulty, language, answerLanguage, count, instructions };
      const update = () => { output.value = Core.buildPrompt(Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.control.value]))); };
      Object.values(fields).forEach(f => f.control.addEventListener('input', update)); update();
      const copy = action('Copier le prompt', async () => {
        try { await navigator.clipboard.writeText(output.value); copy.textContent = 'Prompt copié !'; setTimeout(() => { copy.textContent = 'Copier le prompt'; }, 2500); }
        catch { output.focus(); output.select(); if (document.execCommand('copy')) copy.textContent = 'Prompt copié !'; else toast('Le prompt est sélectionné. Utilisez ⌘C ou Ctrl+C pour le copier.'); }
      }, 'button primary'); body.append(output, el('div', 'dialog-actions')); body.lastChild.append(copy);
      body.append(el('hr', 'section-divider'));
      const step2 = el('h3', 'assistant-step'); step2.append(el('b', '', '2'), document.createTextNode('Collez la liste générée')); body.append(step2);
      const paste = dialogField('Réponse de l’IA', 'textarea', ''); paste.control.placeholder = 'der Hund = le chien\ndie Katze = le chat'; paste.control.rows = 4; const info = el('p', 'field-note', 'Relisez les éléments et leurs réponses avant de les projeter.');
      paste.control.addEventListener('input', () => { const parsed = Core.parseWords(paste.control.value); info.textContent = `${parsed.entries.length} éléments reconnus${parsed.duplicates ? ' · doublons ignorés' : ''}${parsed.invalid ? ' · certaines lignes dépassent 240 caractères' : ''}. Relisez les réponses avant la séance.`; });
      body.append(paste.wrap, info); const actions = el('div', 'dialog-actions');
      actions.append(action('Fermer', closeDialog), action('Créer une nouvelle liste', () => {
        const parsed = Core.parseWords(paste.control.value); if (!parsed.valid) return toast('Collez une liste valide : 1 à 2 000 éléments, 240 caractères maximum chacun.', undefined, undefined, true);
        const title = theme.control.value.trim() || 'Liste ' + subject.control.value.trim(); if (!newList()) return; state.draft.title = title.slice(0, 120); state.draft.raw = Core.serializeWords(parsed.entries); renderEditor(); saveList(); closeDialog();
      }, 'button primary')); body.append(actions);
    });
  });

  const game = new Scene.Game({ onAmbientChange: (enabled, volume) => { state.settings.ambient = enabled; state.settings.ambientVolume = volume; persist(); }, onFinish: (summary, reason) => {
    state.history.push(summary); state.history = state.history.slice(-20); persist(); showSummary(summary, reason, true);
  } });
  function launch(entries, title) {
    $('welcomeScreen').hidden = true; $('gameScreen').hidden = false; $('appDialog').open && closeDialog();
    game.start(entries, { ...state.settings }, title); $('pauseGame').focus({ preventScroll: true });
  }
  $('startGame').addEventListener('click', () => { saveEditor(true); const parsed = Core.parseWords(state.draft.raw); if (!parsed.valid) { $('wordInput').focus(); return; } if (!state.draft.listId && !saveList()) return; launch(parsed.entries, state.draft.title.trim() || 'Mission de la classe'); });
  $('pauseGame').addEventListener('click', () => game.togglePause()); $('resumeGame').addEventListener('click', () => game.resume());
  $('backToHome').addEventListener('click', () => game.finish()); $('endPaused').addEventListener('click', () => game.finish());
  document.querySelectorAll('#gameSpeed button').forEach(b => b.addEventListener('click', () => { const speed = Number(b.dataset.speed); game.setSpeed(speed); state.settings.speed = speed; persist(); }));
  function goHome() { game.stop(); $('gameScreen').hidden = true; $('welcomeScreen').hidden = false; $('pauseOverlay').hidden = true; $('answerOverlay').hidden = true; if ($('appDialog').open) closeDialog(); renderSettings(); renderLibrary(); Scene.drawPreview(Core.parseWords(state.draft.raw).entries, state.settings); $('startGame').focus({ preventScroll: true }); }
  function restartMission() {
    game.pause();
    openDialog('Recommencer cette mission ?', body => {
      body.append(el('p', 'dialog-intro', 'Le score et le chronomètre de cette tentative repartiront de zéro. Votre liste reste enregistrée.'));
      const controls = el('div', 'dialog-actions'); controls.append(action('Continuer la mission', () => { closeDialog(); game.resume(); }), action('Recommencer', () => { closeDialog(); game.start(game.entries, { ...game.model.settings }, game.title); }, 'button primary')); body.append(controls);
    });
  }
  $('restart').addEventListener('click', restartMission);
  async function toggleFullscreen() {
    try {
      if (window.asterovocDesktop?.toggleFullscreen) await window.asterovocDesktop.toggleFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen(); else await $('gameScreen').requestFullscreen();
    } catch { toast('Utilisez le bouton vert de la fenêtre ou le menu Présentation pour le plein écran.'); }
  }
  $('fullscreenGame').addEventListener('click', toggleFullscreen);
  function showAnswers() {
    if (!game.running || game.model.finished) return;
    game.pause('', false); $('answerOverlay').hidden = false; const list = $('answerList'); list.replaceChildren();
    const targets = game.model.asteroids.filter(a => !a.targeted);
    if (!targets.length) list.append(el('p', 'dialog-intro', 'Les derniers tirs sont en cours. Reprenez pour faire apparaître de nouveaux mots.'));
    targets.sort((a, b) => a.lane - b.lane).forEach(a => {
      const row = el('div', 'answer-row'); row.append(el('b', '', String(a.lane)), el('span', '', a.prompt), el('span', '', a.answer || 'Aucune réponse renseignée'));
      row.append(action('Passer ce mot et le revoir au bilan', () => { game.model.paused = false; game.model.skip(a.lane); game.model.paused = true; game.handleEvents(); game.render(); game.updateHud(); row.remove(); }, 'text-button')); list.append(row);
    });
    $('hideAnswers').focus();
  }
  $('showAnswers').addEventListener('click', showAnswers); $('hideAnswers').addEventListener('click', () => game.resume());
  function reportText(summary) {
    const counts = { correct: 'Validé', missed: 'Manqué', skipped: 'Passé' };
    const teams = summary.teams || [], ranking = [...teams].sort((a, b) => b.score - a.score);
    const scores = ranking.length ? 'CLASSEMENT\n' + ranking.map(t => `${t.name} (équipe ${t.id}) : ${t.score} point${Math.abs(t.score) === 1 ? '' : 's'} · ${t.correct} validé${t.correct > 1 ? 's' : ''} · ${t.missed} manqué${t.missed > 1 ? 's' : ''}`).join('\n') + '\n\n' : '';
    const bonuses = summary.bonusEvents?.length ? '\n\nBONUS\n' + summary.bonusEvents.map(b => bonusText(b, teams)).join('\n') : '';
    return `ASTEROVOC — BILAN DE SÉANCE\n${summary.title}\n${new Date(summary.at).toLocaleString('fr-CH')}\nDurée jouée : ${Scene.formatTime(summary.elapsed)}\nValidés : ${summary.results.filter(r => r.status === 'correct').length}\nÀ revoir : ${summary.results.filter(r => r.status !== 'correct').length}\n\n` + scores + summary.results.map(r => `${r.teamId ? (teams.find(t => t.id === r.teamId)?.name || 'Équipe ' + r.teamId) + '\t' : ''}${counts[r.status]}\t${r.prompt}\t${r.answer}`).join('\n') + bonuses + '\n';
  }
  function bonusText(b, teams) {
    const name = id => teams.find(t => t.id === id)?.name || `Équipe ${id}`;
    const seconds = b.duration || (b.type === 'accelerate' ? 8 : 5);
    const factor = String(b.factor || (seconds === 8 ? 1.7 : 2.5)).replace('.', ',');
    return `${Scene.formatTime(b.at)} · ${name(b.actorId)} ${b.type === 'freeze' ? `gèle ${name(b.targetId)} pendant 5 s` : b.type === 'steal' ? `vole ${b.amount} point${b.amount > 1 ? 's' : ''} à ${name(b.targetId)}` : b.type === 'accelerate' ? `accélère ${name(b.targetId)} pendant ${seconds} s (×${factor})` : 'continue sans bonus'}`;
  }
  function showSummary(summary, reason = '', fromGame = false) {
    const allCorrect = summary.results.length > 0 && summary.results.every(r => r.status === 'correct');
    openDialog(reason === 'complete' ? (allCorrect ? 'Mission accomplie !' : 'Tour de liste terminé') : reason === 'time' ? 'Le temps est écoulé' : 'Bilan de la mission', body => {
      body.append(el('p', 'summary-heading', `${summary.title} · ${Scene.formatTime(summary.elapsed)} de jeu`));
      if (summary.teams?.length) {
        const ranking = [...summary.teams].sort((a, b) => b.score - a.score), winners = ranking.filter(t => t.score === ranking[0].score);
        body.append(el('h3', 'team-winner', winners.length === 1 ? `${winners[0].name} remporte la mission !` : `Égalité : ${winners.map(t => t.name).join(', ')}`));
        const board = el('div', 'summary-teams'); board.style.setProperty('--team-count', String(ranking.length));
        ranking.forEach(t => {
          const card = el('div', 'summary-team'); card.style.setProperty('--team-color', t.color);
          const rank = ranking.findIndex(other => other.score === t.score) + 1;
          card.append(el('small', '', `${rank === 1 ? '1re' : rank + 'e'} place · Équipe ${t.id}`), el('h4', '', t.name), el('strong', '', `${t.score} pt${Math.abs(t.score) === 1 ? '' : 's'}`), el('span', '', `${t.correct} validé${t.correct > 1 ? 's' : ''} · ${t.missed} manqué${t.missed > 1 ? 's' : ''}`)); board.append(card);
        }); body.append(board);
        if (summary.bonusEvents?.length) {
          const details = el('details', 'bonus-history'); details.append(el('summary', '', `${summary.bonusEvents.length} bonus pendant cette mission`));
          summary.bonusEvents.forEach(b => details.append(el('p', '', bonusText(b, summary.teams)))); body.append(details);
        }
      }
      const correct = summary.results.filter(r => r.status === 'correct');
      const review = [...new Map(summary.results.filter(r => r.status !== 'correct').map(r => [Core.keyOf(r.prompt), r])).values()];
      const stats = el('div', 'summary-stats'); [[correct.length, 'mots validés'], [review.length, 'mots à revoir'], [new Set(summary.results.map(r => Core.keyOf(r.prompt))).size, 'éléments rencontrés']].forEach(([num, label]) => { const s = el('div'); s.append(el('strong', '', String(num)), el('small', '', label)); stats.append(s); }); body.append(stats);
      body.append(el('p', 'dialog-intro', summary.results.length ? 'Le bilan reprend les mots effectivement validés, manqués ou passés pendant cette séance.' : 'Aucun mot n’a encore été validé ou manqué. Vous pouvez relancer la mission.'));
      if (review.length) {
        body.append(el('h3', '', 'À revoir ensemble'));
        const rows = el('div', 'summary-results'); review.forEach(r => { const row = el('div', 'result-row missed'); row.append(el('span', 'result-status', '↺'), el('span', '', r.prompt), el('span', '', r.answer || '')); rows.append(row); }); body.append(rows);
      }
      const controls = el('div', 'dialog-actions');
      controls.append(action('Exporter le bilan', () => saveFile(reportText(summary), 'Bilan-' + safeName(summary.title) + '.txt', 'report')));
      if (fromGame) {
        controls.append(action('Bibliothèque', goHome));
        if (review.length) controls.append(action('Rejouer les mots à revoir', () => { closeDialog(); const entries = Core.parseWords(Core.serializeWords(review)).entries; game.start(entries, { ...state.settings, direction: 'forward', mode: 'onepass' }, summary.title + ' · révision'); }, 'button primary'));
        else controls.append(action('Rejouer', () => { closeDialog(); game.start(game.entries, { ...state.settings }, game.title); }, 'button primary'));
      } else controls.append(action('Fermer', closeDialog, 'button primary'));
      body.append(controls);
    }, fromGame ? 'mission-summary' : '');
  }
  $('appDialog').addEventListener('close', () => {
    if (!$('gameScreen').hidden && game.model?.finished) goHome();
    else if (!$('gameScreen').hidden && game.model?.paused && !$('bonusDialog').open && $('pauseOverlay').hidden && $('answerOverlay').hidden && !game.countdownTimers.length) { $('pauseOverlay').hidden = false; }
  });
  $('historyButton').addEventListener('click', () => openDialog('Historique des séances', body => {
    body.append(el('p', 'dialog-intro', 'Les 20 dernières séances sont conservées sur ce Mac et dans votre sauvegarde exportée.'));
    if (!state.history.length) body.append(el('p', 'dialog-intro', 'Votre première mission apparaîtra ici.'));
    [...state.history].reverse().forEach(summary => { const row = el('div', 'history-row'), info = el('div'); info.append(el('strong', '', summary.title), el('small', '', `${new Date(summary.at).toLocaleString('fr-CH')} · ${summary.results.filter(r => r.status === 'correct').length} validés · ${Scene.formatTime(summary.elapsed)}`)); row.append(info, action('Voir le bilan', () => showSummary(summary))); body.append(row); });
  }));
  $('helpButton').addEventListener('click', () => openDialog('Une mission, toute la classe', body => {
    const ol = el('ol', 'help-list');
    ['Préparez ou choisissez une liste. Écrivez un élément par ligne, éventuellement suivi de = et de sa réponse. Les anciennes listes séparées par des virgules ou points-virgules fonctionnent aussi. Deux colonnes copiées d’un tableur donnent un mot et sa réponse.', 'Lancez la mission et projetez la fenêtre. Les élèves répondent à voix haute : traduction, définition, résultat d’un calcul… Vous validez les bonnes réponses avec les touches 1 à 5, le pavé numérique, ou un clic sur l’astéroïde.', 'Chaque bonne réponse vaut +1. Un astéroïde manqué vaut −1 et reste dans le bilan. Le mode « Sans chute » laisse tout le temps à la classe. « Un tour de liste » présente chaque élément une fois, puis termine la séance.', 'Le mode « Défi par équipes » propose 2 à 4 équipes, avec leur nom, couleur et numéro fixes. Chaque réponse validée rapporte 1 point à son équipe. Les bonus facultatifs permettent de geler une équipe 5 secondes, de lui voler jusqu’à 3 points ou de multiplier sa chute par 2,5 pendant 10 secondes. Le jeu est figé pendant le choix du bonus et de sa cible.', 'L’ambiance spatiale se règle dans les options et se coupe avec l’icône de son pendant le jeu. Elle s’arrête pendant les pauses et au bilan. Les effets sonores ont leur propre réglage.', 'Espace met tout en pause, y compris le temps et les tirs. R affiche les réponses sur l’écran projeté. L’app se met en pause si vous changez de fenêtre ou d’onglet.', 'Les modifications d’une liste enregistrée sont sauvegardées automatiquement sur ce Mac. « Exporter la bibliothèque » crée une copie portable avec les listes, dossiers, brouillon, réglages, corbeille et historique. L’import ajoute vos listes sans effacer celles déjà présentes.'].forEach(text => ol.append(el('li', '', text)));
    body.append(ol); const dl = el('dl', 'help-shortcuts'); [['1–5', 'Valider l’astéroïde de ce numéro'], ['Espace / Échap', 'Pause ou reprise'], ['R', 'Afficher / masquer les réponses'], ['F', 'Plein écran'], ['⌘S / Ctrl+S', 'Enregistrer la liste']].forEach(([key, description]) => dl.append(el('dt', '', key), el('dd', '', description))); body.append(dl);
    body.append(el('p', 'field-note', 'Conseil de projection : 2 ou 3 mots à l’écran et une grande taille de texte facilitent la lecture au fond de la classe. Un astéroïde n’affiche jamais sa réponse avant votre demande.'));
  }));
  document.addEventListener('keydown', e => {
    const typing = e.target instanceof Element && (e.target.matches('input,textarea,select') || e.target.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !$('welcomeScreen').hidden) { e.preventDefault(); saveList(); return; }
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing || $('appDialog').open || $('bonusDialog').open || $('gameScreen').hidden || !game.running) return;
    const lane = /^(?:Digit|Numpad)[1-5]$/.test(e.code) ? Number(e.code.slice(-1)) : /^[1-5]$/.test(e.key) ? Number(e.key) : null;
    if (lane) { e.preventDefault(); game.fire(lane); }
    else if (e.code === 'Space' || e.key === 'Escape') { e.preventDefault(); game.togglePause(); }
    else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
    else if (e.key.toLowerCase() === 'r') { e.preventDefault(); $('answerOverlay').hidden ? showAnswers() : game.resume(); }
  });
  function autoPause() { if (game.running && (!game.model.paused || game.countdownTimers.length)) game.pause('L’app a été quittée des yeux. Reprenez quand la classe est prête.'); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); }); window.addEventListener('blur', autoPause);
  window.addEventListener('beforeunload', () => { readEditor(); persist(); });
  let resizeTimer; window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!$('welcomeScreen').hidden) Scene.drawPreview(Core.parseWords(state.draft.raw).entries, state.settings); }, 120); });
  document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); $('listTitle').focus(); });
  renderEditor(); renderLibrary(); renderSettings();
  if (loadMessage) toast(loadMessage, undefined, undefined, true);
})();
