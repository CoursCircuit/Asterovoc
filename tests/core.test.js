const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core.js');
const entries = C.parseWords('der Hund = le chien\ndie Katze = le chat\nder Fuchs = le renard\ndas Pferd = le cheval\ndie Eule = la chouette\nder Vogel = l’oiseau').entries;

test('Anciennes listes, accents, CRLF, puces et dédoublonnage', () => {
  const p = C.parseWords('chat, chien; éléphant\r\n- renard\n1. CHIEN\n```txt\n• chouette\n```');
  assert.deepEqual(p.entries.map(e => e.prompt), ['chat', 'chien', 'éléphant', 'renard', 'chouette']); assert.equal(p.duplicates, 1); assert.ok(p.valid);
});
test('Paires et tableaux à deux colonnes conservent réponses et virgules', () => {
  const p = C.parseWords('der Hund = le chien\ndie Katze\tle chat\nla moitié de cinq → 2,5\ndas Pferd => le cheval');
  assert.deepEqual(p.entries[2], { prompt: 'la moitié de cinq', answer: '2,5' }); assert.equal(p.entries[1].answer, 'le chat'); assert.equal(p.entries.length, 4);
  assert.deepEqual(C.parseWords(C.serializeWords(p.entries)).entries, p.entries);
});
test('Limites explicites, sans troncature silencieuse', () => {
  assert.equal(C.parseWords(' ').valid, false); assert.equal(C.parseWords('x'.repeat(241)).invalid, 1);
  assert.equal(C.parseWords(Array.from({ length: 2001 }, (_, i) => 'mot ' + i).join('\n')).overflow, true);
});
test('Réglages invalides remplacés par des valeurs utilisables', () => {
  assert.deepEqual(C.sanitizeSettings({ speed: NaN, lanes: 20, mode: 'x', duration: -5 }), { ...C.DEFAULT_SETTINGS });
  assert.deepEqual(C.sanitizeSettings(null), { ...C.DEFAULT_SETTINGS });
});
test('Export complet puis import : listes existantes, dossiers, réglages, brouillon, corbeille et bilans', () => {
  const original = C.createDefaultState(), source = C.createDefaultState();
  source.settings.mode = 'calm'; source.settings.sound = true;
  source.draft = { listId: '', title: 'Brouillon à conserver', raw: 'eins = un', folderId: source.folders[0].id };
  source.trash.push({ ...source.lists.pop() });
  source.history.push({ title: 'Séance de test', at: '2026-10-22T10:00:00Z', elapsed: 45, mode: 'training', results: [{ prompt: 'eins', answer: 'un', status: 'correct' }] });
  const merged = C.mergeBackup(original, JSON.parse(JSON.stringify(source)));
  assert.equal(merged.state.lists.length, 4); assert.equal(merged.added, 1); assert.equal(merged.state.folders.length, 3);
  assert.ok(merged.state.lists.some(l => l.title === 'Brouillon à conserver')); assert.ok(merged.state.lists.some(l => l.id === original.lists[0].id));
  assert.equal(merged.state.settings.mode, 'calm'); assert.equal(merged.state.trash.length, 1); assert.equal(merged.state.history.length, 1);
  const again = C.mergeBackup(merged.state, source); assert.equal(again.added, 0); assert.equal(again.state.trash.length, 1); assert.equal(again.state.history.length, 1);
});
test('Import invalide atomique et refus des identifiants en double', () => {
  const state = C.createDefaultState(), before = JSON.stringify(state), invalid = C.createDefaultState(); invalid.lists[1].id = invalid.lists[0].id;
  assert.throws(() => C.mergeBackup(state, invalid)); assert.equal(JSON.stringify(state), before);
  assert.throws(() => C.validateState({ version: 999, lists: [], folders: [] }));
});
test('Mots longs et phrases : aucune ligne ne dépasse sa largeur', () => {
  const measure = (s, size) => Array.from(s).length * size * .59;
  ['der Schmetterling', 'Donaudampfschifffahrtsgesellschaftskapitän', 'La planète la plus proche du Soleil', 'é'.repeat(200)].forEach(text => {
    const layout = C.layoutText(text, 190, measure, 30, 23); assert.ok(layout.lines.length); assert.ok(layout.lines.every(l => measure(l, layout.size) <= 190)); assert.ok(layout.size >= 23);
    assert.equal(layout.lines.join('').replaceAll('‑', '').replaceAll(' ', ''), text.replaceAll(' ', ''));
  });
});
test('Prompt paramétrable : contraintes, branche et niveau inclus', () => {
  const p = C.buildPrompt({ subject: 'Mathématiques', theme: 'fractions', level: '10H', count: '999', language: 'français', answerLanguage: 'français' });
  assert.match(p, /100 éléments/); assert.match(p, /fractions/); assert.match(p, /10H/); assert.match(p, /élément = réponse/);
});
test('Un mot garde ses lettres ensemble s’il peut tenir à une taille lisible', () => {
  const measure = (s, size) => s.length * size * .55;
  const layout = C.layoutText('der Schmetterling', 180, measure, 34, 23);
  assert.ok(layout.lines.includes('Schmetterling')); assert.ok(layout.lines.every(l => !l.includes('‑')));
});
test('Inversion facultative et éléments sans réponse', () => {
  assert.deepEqual(C.orientEntry(entries[0], 'reverse'), { prompt: 'le chien', answer: 'der Hund' });
  assert.deepEqual(C.orientEntry({ prompt: 'mot', answer: '' }, 'reverse'), { prompt: 'mot', answer: '' });
});
