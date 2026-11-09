/* © CoursCircuit. Asterovoc — logique indépendante de l'interface. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AsterovocCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 2;
  const MAX_WORDS = 2000;
  const MAX_LENGTH = 240;
  const TEAM_COLORS = Object.freeze(['#78f5c3', '#80baff', '#ffbf7b', '#dba5ff']);
  const TEAM_NAMES = Object.freeze(['Orion', 'Véga', 'Nova', 'Atlas']);
  const DEFAULT_SETTINGS = Object.freeze({ speed: 1, mode: 'training', duration: 0, lanes: 3, direction: 'forward', fontSize: 30, sound: false, reducedMotion: false, ambient: true, ambientVolume: 18, teamCount: 2, teamNames: TEAM_NAMES, teamBonuses: true, bonusEvery: 5 });
  const normalize = text => String(text).normalize('NFC').trim().replace(/\s+/g, ' ');
  const keyOf = text => normalize(text).toLocaleLowerCase('fr');
  const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'a-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);

  function parseWords(input) {
    const entries = [], seen = new Set();
    let duplicates = 0, invalid = 0;
    const add = (prompt, answer = '') => {
      prompt = normalize(prompt); answer = normalize(answer);
      if (!prompt) return;
      if (prompt.length > MAX_LENGTH || answer.length > MAX_LENGTH) { invalid++; return; }
      const key = keyOf(prompt);
      if (seen.has(key)) { duplicates++; return; }
      seen.add(key);
      entries.push({ prompt, answer });
    };
    String(input || '').replace(/\r\n?/g, '\n').split('\n').forEach(line => {
      line = line.trim().replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '');
      if (!line || /^```/.test(line)) return;
      const pair = line.match(/^(.*?)\s*(?:=>|→|=)\s*(.*)$/);
      if (pair) { add(pair[1], pair[2]); return; }
      const columns = line.split('\t').map(s => s.trim()).filter(Boolean);
      if (columns.length === 2) { add(columns[0], columns[1]); return; }
      line.split(/[,;\t]+/).forEach(word => add(word));
    });
    return { entries, duplicates, invalid, overflow: entries.length > MAX_WORDS, valid: invalid === 0 && entries.length > 0 && entries.length <= MAX_WORDS };
  }

  const serializeWords = entries => entries.map(e => e.prompt + (e.answer ? ' = ' + e.answer : '')).join('\n');
  function sanitizeSettings(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {
      speed: [0, 1, 2, 3].includes(value.speed) ? value.speed : DEFAULT_SETTINGS.speed,
      mode: ['training', 'calm', 'onepass', 'teams'].includes(value.mode) ? value.mode : DEFAULT_SETTINGS.mode,
      duration: [0, 60, 120, 180, 300, 600].includes(value.duration) ? value.duration : 0,
      lanes: [1, 2, 3, 4, 5].includes(value.lanes) ? value.lanes : 3,
      direction: ['forward', 'reverse', 'mixed'].includes(value.direction) ? value.direction : 'forward',
      fontSize: [26, 30, 34, 38].includes(value.fontSize) ? value.fontSize : 30,
      sound: value.sound === true,
      reducedMotion: value.reducedMotion === true,
      ambient: value.ambient !== false,
      ambientVolume: Number.isFinite(value.ambientVolume) ? Math.max(0, Math.min(100, value.ambientVolume)) : DEFAULT_SETTINGS.ambientVolume,
      teamCount: [2, 3, 4].includes(value.teamCount) ? value.teamCount : 2,
      teamNames: TEAM_NAMES.map((name, i) => typeof value.teamNames?.[i] === 'string' && value.teamNames[i].trim() ? normalize(value.teamNames[i]).slice(0, 24) : name),
      teamBonuses: value.teamBonuses !== false,
      bonusEvery: Number.isInteger(value.bonusEvery) && value.bonusEvery >= 2 && value.bonusEvery <= 50 ? value.bonusEvery : 5
    };
  }
  function createDefaultState() {
    const now = new Date().toISOString();
    const folders = ['Allemand', 'Français', 'Sciences'].map(name => ({ id: uid(), name }));
    const samples = [
      { title: 'Les animaux', raw: 'der Hund = le chien\ndie Katze = le chat\nder Fuchs = le renard\ndas Pferd = le cheval\nder Schmetterling = le papillon\ndie Eule = la chouette\nder Vogel = l’oiseau\ndas Kaninchen = le lapin\ndie Schildkröte = la tortue\nder Fisch = le poisson\ndie Maus = la souris\nder Löwe = le lion' },
      { title: 'Trouver le synonyme', raw: 'rapide = véloce\njoyeux = heureux\nune demeure = une habitation\nobserver = regarder\nimmense = gigantesque\nune frayeur = une peur\nréfléchir = penser\nun sentier = un chemin\népuisé = fatigué\nun ouvrage = un livre' },
      { title: 'Destination : système solaire', raw: 'La planète rouge = Mars\nNotre étoile = le Soleil\nLe satellite de la Terre = la Lune\nLa plus grande planète = Jupiter\nLa planète aux anneaux = Saturne\nLa planète la plus proche du Soleil = Mercure\nNotre galaxie = la Voie lactée\nLa troisième planète = la Terre\nUn petit corps rocheux en orbite = un astéroïde\nUn astre avec une queue = une comète' }
    ];
    const lists = samples.map((s, i) => ({ ...s, id: uid(), folderId: folders[i].id, createdAt: now, updatedAt: now }));
    return { version: VERSION, folders, lists, trash: [], settings: { ...DEFAULT_SETTINGS }, draft: { listId: lists[0].id, title: lists[0].title, folderId: lists[0].folderId, raw: lists[0].raw }, history: [] };
  }

  function validateState(input) {
    if (!input || typeof input !== 'object' || input.version !== VERSION || !Array.isArray(input.lists) || !Array.isArray(input.folders)) throw new Error('Ce fichier n’est pas une sauvegarde Asterovoc 2.');
    if (input.lists.length > 1000 || input.folders.length > 200) throw new Error('La sauvegarde dépasse 1 000 listes ou 200 dossiers.');
    const ids = new Set();
    const folders = input.folders.map(f => {
      if (!f || typeof f.id !== 'string' || ids.has(f.id) || typeof f.name !== 'string' || !f.name.trim() || f.name.length > 80) throw new Error('Un dossier de la sauvegarde est invalide.');
      ids.add(f.id); return { id: f.id, name: normalize(f.name) };
    });
    ids.clear();
    const listFrom = l => {
      if (!l || typeof l.id !== 'string' || ids.has(l.id) || typeof l.title !== 'string' || l.title.length > 120 || typeof l.raw !== 'string' || l.raw.length > 1000000) throw new Error('Une liste de la sauvegarde est invalide.');
      ids.add(l.id);
      return { id: l.id, title: l.title.trim() || 'Sans titre', raw: l.raw, folderId: folders.some(f => f.id === l.folderId) ? l.folderId : '', createdAt: typeof l.createdAt === 'string' ? l.createdAt : '', updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : '' };
    };
    const lists = input.lists.map(listFrom);
    const trash = Array.isArray(input.trash) ? input.trash.slice(-100).map(listFrom) : [];
    const d = input.draft;
    const draft = d && typeof d.raw === 'string' && d.raw.length <= 1000000 ? {
      listId: lists.some(l => l.id === d.listId) ? d.listId : '', title: typeof d.title === 'string' ? d.title.slice(0, 120) : '', raw: d.raw,
      folderId: folders.some(f => f.id === d.folderId) ? d.folderId : ''
    } : { listId: '', title: '', folderId: '', raw: '' };
    const history = Array.isArray(input.history) ? input.history.filter(h => h && typeof h.title === 'string' && typeof h.elapsed === 'number' && Array.isArray(h.results)).slice(-20).map(h => ({
      title: h.title.slice(0, 120), at: typeof h.at === 'string' ? h.at : '', elapsed: Math.max(0, h.elapsed),
      mode: ['training', 'calm', 'onepass', 'teams'].includes(h.mode) ? h.mode : 'training',
      results: h.results.filter(r => r && typeof r.prompt === 'string' && ['correct', 'missed', 'skipped'].includes(r.status)).slice(0, 10000).map(r => ({ prompt: r.prompt.slice(0, 240), answer: typeof r.answer === 'string' ? r.answer.slice(0, 240) : '', status: r.status, ...([1, 2, 3, 4].includes(r.teamId) ? { teamId: r.teamId } : {}) })),
      ...(h.mode === 'teams' ? {
        teams: Array.isArray(h.teams) ? h.teams.slice(0, 4).filter(t => t && [1, 2, 3, 4].includes(t.id)).map(t => ({ id: t.id, name: typeof t.name === 'string' ? t.name.slice(0, 24) : TEAM_NAMES[t.id - 1], color: TEAM_COLORS[t.id - 1], score: Number.isFinite(t.score) ? Math.trunc(t.score) : 0, correct: Number.isFinite(t.correct) ? Math.max(0, Math.trunc(t.correct)) : 0, missed: Number.isFinite(t.missed) ? Math.max(0, Math.trunc(t.missed)) : 0 })) : [],
        bonusEvents: Array.isArray(h.bonusEvents) ? h.bonusEvents.slice(0, 10000).filter(b => b && ['freeze', 'steal', 'accelerate', 'skip'].includes(b.type) && [1, 2, 3, 4].includes(b.actorId)).map(b => ({ type: b.type, actorId: b.actorId, targetId: [1, 2, 3, 4].includes(b.targetId) ? b.targetId : 0, at: Number.isFinite(b.at) ? Math.max(0, b.at) : 0, amount: Number.isFinite(b.amount) ? Math.max(0, Math.min(3, b.amount)) : 0, duration: Number.isFinite(b.duration) ? Math.max(0, Math.min(10, b.duration)) : 0, ...(b.type === 'accelerate' && Number.isFinite(b.factor) ? { factor: Math.max(1, Math.min(10, b.factor)) } : {}) })) : []
      } : {})
    })) : [];
    return { version: VERSION, lists, folders, trash, draft, settings: sanitizeSettings(input.settings), history };
  }

  function mergeBackup(current, incoming) {
    const target = validateState(current), source = validateState(incoming);
    const folderMap = new Map();
    source.folders.forEach(f => {
      let match = target.folders.find(t => keyOf(t.name) === keyOf(f.name));
      if (!match) { match = { id: uid(), name: f.name }; target.folders.push(match); }
      folderMap.set(f.id, match.id);
    });
    let added = 0;
    const addList = l => {
      const folderId = folderMap.get(l.folderId) || '';
      if (target.lists.some(t => t.title === l.title && t.raw === l.raw && t.folderId === folderId)) return;
      target.lists.push({ ...l, id: uid(), folderId }); added++;
    };
    source.lists.forEach(addList);
    if (!source.draft.listId && source.draft.raw.trim()) addList({ ...source.draft, title: source.draft.title || 'Brouillon importé', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    source.trash.forEach(l => {
      const folderId = folderMap.get(l.folderId) || '';
      if (!target.trash.some(t => t.title === l.title && t.raw === l.raw)) target.trash.push({ ...l, id: uid(), folderId });
    });
    target.trash = target.trash.slice(-100);
    source.history.forEach(h => { if (!target.history.some(t => t.at === h.at && t.title === h.title)) target.history.push(h); });
    target.history.sort((a, b) => a.at.localeCompare(b.at)); target.history = target.history.slice(-20);
    target.settings = source.settings;
    if (target.lists.length > 1000 || target.folders.length > 200) throw new Error('Import impossible : limite de 1 000 listes ou 200 dossiers dépassée.');
    return { state: target, added };
  }

  function shuffle(items, random = Math.random) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  function orientEntry(entry, direction, random = Math.random) {
    const reverse = entry.answer && (direction === 'reverse' || (direction === 'mixed' && random() < .5));
    return { prompt: reverse ? entry.answer : entry.prompt, answer: reverse ? entry.prompt : entry.answer };
  }

  // Find balanced lines by measured width. A long compound is split only as a fallback.
  function layoutText(text, width, measure, preferredSize = 30, minSize = 23) {
    const longestToken = normalize(text).split(' ').reduce((longest, token) => measure(token, preferredSize) > measure(longest, preferredSize) ? token : longest, '');
    // Shrink a little before breaking a word that can fit intact at a readable size.
    if (measure(longestToken, minSize) <= width) {
      while (preferredSize > minSize && measure(longestToken, preferredSize) > width) preferredSize--;
    }
    const candidates = size => {
      const tokens = normalize(text).split(' '), lines = [];
      let current = '';
      for (const token of tokens) {
        const proposed = current ? current + ' ' + token : token;
        if (measure(proposed, size) <= width) { current = proposed; continue; }
        if (current) { lines.push(current); current = ''; }
        if (measure(token, size) <= width) { current = token; continue; }
        let piece = '';
        for (const char of Array.from(token)) {
          if (piece && measure(piece + char + '‑', size) > width) { lines.push(piece + '‑'); piece = char; } else piece += char;
        }
        current = piece;
      }
      if (current) lines.push(current);
      // When possible, balance a two-line phrase at a word boundary.
      if (lines.length === 2 && tokens.length > 1) {
        let best = Infinity;
        for (let i = 1; i < tokens.length; i++) {
          const a = tokens.slice(0, i).join(' '), b = tokens.slice(i).join(' ');
          const wa = measure(a, size), wb = measure(b, size);
          if (wa <= width && wb <= width && Math.abs(wa - wb) < best) { best = Math.abs(wa - wb); lines[0] = a; lines[1] = b; }
        }
      }
      return lines;
    };
    for (let size = preferredSize; size >= minSize; size--) {
      const lines = candidates(size);
      if (lines.length <= 3 || size === minSize) return { lines, size, width: Math.max(...lines.map(l => measure(l, size))), height: lines.length * size * 1.23 };
    }
  }

  function buildPrompt(options) {
    const count = Math.max(5, Math.min(100, Number(options.count) || 20));
    return `Crée une liste de ${count} éléments pour un jeu oral collectif projeté en classe.\n\nBranche : ${normalize(options.subject) || 'allemand'}\nThème : ${normalize(options.theme) || 'les animaux'}\nNiveau / âge : ${normalize(options.level) || 'élèves de 12 à 15 ans'}\nDifficulté : ${normalize(options.difficulty) || 'intermédiaire'}\nLangue des éléments affichés : ${normalize(options.language) || 'allemand'}\nLangue des réponses attendues : ${normalize(options.answerLanguage) || 'français'}\n${options.instructions ? 'Consignes supplémentaires : ' + normalize(options.instructions) + '\n' : ''}\nL’enseignant lit les éléments avec la classe, écoute les réponses puis valide manuellement. Adapte le contenu à la branche : mot et traduction, question courte et réponse, notion et définition, calcul et résultat, etc.\n\nFormat impératif : un élément par ligne, sous la forme « élément = réponse ». Aucun titre, numéro, puce, tableau Markdown ni commentaire. Pas de doublon. Vise 45 caractères maximum par élément affiché et des réponses courtes, exactes et adaptées au niveau. Pour l’allemand, garde les articles des noms et les majuscules. Vérifie l’orthographe et les réponses avant de livrer la liste.\n\nExemple de format uniquement :\nder Hund = le chien\ndie Katze = le chat`;
  }
  return { VERSION, MAX_WORDS, MAX_LENGTH, DEFAULT_SETTINGS, TEAM_COLORS, TEAM_NAMES, uid, keyOf, parseWords, serializeWords, sanitizeSettings, createDefaultState, validateState, mergeBackup, shuffle, orientEntry, layoutText, buildPrompt };
});
