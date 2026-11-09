const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core.js');
const { Mission, asteroidY, MISSILES_PER_BURST } = require('../js/mission.js');
const entries = C.parseWords('der Hund = le chien\ndie Katze = le chat\nder Fuchs = le renard\ndas Pferd = le cheval\ndie Eule = la chouette\nder Vogel = l’oiseau').entries;
const seed = () => { let n = 171; return () => { n = (n * 16807) % 2147483647; return n / 2147483647; }; };
const mission = (settings = {}) => new Mission(entries, { ...C.DEFAULT_SETTINGS, ...settings }, seed());
const ready = (settings = {}) => { const m = mission(settings); m.start(); m.advance(9); m.drainEvents(); return m; };
const asteroid = (m, lane) => m.asteroids.find(a => a.lane === lane);
const award = (m, lane, count = 1) => { for (let i = 0; i < count; i++) { m.resolve(asteroid(m, lane).uid, 'correct'); if (i < count - 1) m.spawn(lane); } };

test('Arrivées successives : départ entièrement hors écran et pas de ligne initiale', () => {
  const m = mission(); m.start(); assert.equal(m.asteroids.length, 0);
  m.advance(.09); assert.equal(m.asteroids.length, 1);
  const first = m.asteroids[0]; assert.ok(asteroidY(first, 160, 180, 600) + 80 < 0);
  assert.equal(m.fire(first.lane), false);
  m.advance(1); assert.equal(m.asteroids.length, 1); assert.ok(first.entryProgress > 0);
  m.advance(.5); assert.equal(m.asteroids.length, 2);
  const second = m.asteroids[1]; assert.ok(first.entryProgress > second.entryProgress + .5);
  assert.ok(asteroidY(first, 160, 180, 600) > asteroidY(second, 160, 180, 600));
});
test('Déplacements et apparitions identiques à 30 et 144 images/s', () => {
  const a = mission(), b = mission(); a.start(); b.start();
  for (let i = 0; i < 300; i++) a.advance(1 / 30); for (let i = 0; i < 1440; i++) b.advance(1 / 144);
  assert.deepEqual(a.asteroids, b.asteroids); assert.equal(a.elapsed, b.elapsed);
});
test('Le vaisseau rejoint sa cible avant le premier des 6 missiles', () => {
  const m = ready(), lane = 1; assert.ok(m.fire(lane));
  m.advance(.1); assert.equal(m.shots.length, 0); assert.ok(m.shipX < .5 && m.shipX > 1 / 6);
  let pairs = 0;
  for (let i = 0; i < 240 && !m.correct; i++) {
    m.advance(1 / 120);
    const fired = m.drainEvents().filter(e => e.type === 'fire');
    fired.forEach(() => { assert.equal(m.shipX, 1 / 6); pairs++; });
    m.shots.forEach(s => assert.equal(s.fromX, 1 / 6));
  }
  assert.equal(pairs * 2, MISSILES_PER_BURST); assert.equal(MISSILES_PER_BURST, 6); assert.equal(m.correct, 1); assert.ok(m.elapsed < 9.8, 'La validation doit prendre moins de 0,8 seconde');
});
test('Quatre validations rapides : chaque rafale part du bon couloir, sans doublon', () => {
  const m = ready({ mode: 'teams', teamCount: 4, teamBonuses: false });
  [1, 4, 2, 3].forEach(lane => { assert.ok(m.fire(lane)); assert.equal(m.fire(lane), false); });
  for (let i = 0; i < 600 && m.correct < 4; i++) {
    m.advance(1 / 120); m.shots.forEach(s => {
      const a = m.asteroids.find(a => a.uid === s.targetUid); assert.equal(s.fromX, (a.lane - .5) / 4);
    });
  }
  assert.equal(m.correct, 4); assert.deepEqual(m.teams.map(t => t.score), [1, 1, 1, 1]); assert.equal(m.shots.length, 0);
});
test('Pause : temps, entrée, vaisseau, missiles, remplacements et bonus figés', () => {
  const m = ready(); m.fire(1); m.advance(.2); m.paused = true; const before = JSON.stringify(m);
  m.advance(20); assert.equal(JSON.stringify(m), before); assert.equal(m.fire(2), false);
  m.paused = false; m.advance(2); assert.equal(m.correct, 1); assert.equal(m.elapsed, 11.2);
});
test('Les projectiles retirés ne peuvent toucher le remplaçant du même numéro', () => {
  const m = ready({ lanes: 1 }); const old = m.asteroids[0]; m.fire(1); m.advance(.2);
  assert.ok(m.shots.length); m.resolve(old.uid, 'correct'); const fresh = m.spawn(1);
  assert.equal(m.shots.length, 0); assert.notEqual(fresh.uid, old.uid); assert.equal(m.resolve(old.uid, 'correct'), false);
  m.advance(1); assert.equal(m.correct, 1); assert.ok(m.asteroids.includes(fresh));
  assert.equal(fresh.entryProgress < 1, true);
});
test('Toutes les expirations simultanées sont comptées', () => {
  const m = ready(); m.asteroids.forEach(a => { a.progress = .999; a.entryProgress = 1; }); m.advance(.1);
  assert.equal(m.missed, 3); assert.equal(m.score, -3);
});
test('Sans chute : une fois entrés, les mots restent disponibles sans pénalité', () => {
  const m = ready({ mode: 'calm' }), before = m.asteroids.map(a => a.progress);
  m.advance(600); assert.deepEqual(m.asteroids.map(a => a.progress), before); assert.equal(m.missed, 0);
});
test('Un tour de liste : chaque mot une fois, puis bilan et fin', () => {
  const m = mission({ mode: 'onepass' }); m.start();
  for (let i = 0; i < 1200 && !m.finished; i++) { [...m.asteroids].forEach(a => m.fire(a.lane)); m.advance(.1); }
  assert.ok(m.finished); assert.equal(m.correct, entries.length); assert.equal(new Set(m.results.map(r => r.index)).size, entries.length); assert.equal(m.asteroids.length, 0);
});
test('Une liste à un mot : un seul astéroïde classique, quatre équipes possibles', () => {
  const classic = new Mission([entries[0]], { lanes: 5 }); classic.start(); classic.advance(9); assert.equal(classic.capacity, 1); assert.equal(classic.asteroids.length, 1);
  const teams = new Mission([entries[0]], { mode: 'teams', teamCount: 4 }); teams.start(); teams.advance(9);
  assert.equal(teams.capacity, 4); assert.equal(teams.asteroids.length, 4); assert.deepEqual(teams.asteroids.map(a => a.lane).sort(), [1, 2, 3, 4]);
});
test('Chaque équipe conserve son numéro et son propre passage de la liste', () => {
  const m = ready({ mode: 'teams', teamCount: 4, teamBonuses: false }), seen = [];
  const opponents = m.asteroids.filter(a => a.lane !== 2).map(a => a.uid);
  for (let i = 0; i < entries.length; i++) {
    const a = asteroid(m, 2); seen.push(a.entry.index); m.resolve(a.uid, 'correct'); m.advance(.17);
    assert.equal(asteroid(m, 2).lane, 2);
  }
  assert.equal(new Set(seen).size, entries.length); assert.deepEqual(m.asteroids.filter(a => a.lane !== 2).map(a => a.uid), opponents);
  assert.equal(m.team(2).score, entries.length); assert.equal(m.team(1).score, 0);
});
test('Durée limitée : le temps de pause ne raccourcit pas la séance', () => {
  const m = mission({ mode: 'calm', duration: 60 }); m.start(); m.advance(59); m.paused = true; m.advance(300);
  assert.equal(m.finished, false); m.paused = false; m.advance(1); assert.ok(m.finished); assert.equal(m.elapsed, 60);
});
test('Passer un mot le conserve au bilan sans retirer de point à son équipe', () => {
  const m = ready({ mode: 'teams' }); assert.ok(m.skip(1)); assert.equal(m.team(1).score, 0);
  const r = m.summary('Classe').results[0]; assert.equal(r.status, 'skipped'); assert.equal(r.teamId, 1); assert.ok(r.answer);
});
test('Bonus : palier de réussites, aucun bonus sur échec ou sur points volés', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2 });
  award(m, 1); assert.equal(m.nextBonus, null); m.spawn(1); m.resolve(asteroid(m, 1).uid, 'missed'); m.spawn(1); award(m, 1);
  assert.equal(m.nextBonus.actorId, 1); assert.equal(m.pendingBonuses.length, 1); assert.equal(m.team(1).score, 1);
  m.team(2).score = 3; assert.ok(m.applyBonus(1, 'steal', 2)); assert.equal(m.team(1).score, 4); assert.equal(m.nextBonus, null); assert.equal(m.team(1).correct, 2);
});
test('Vol : seulement les points disponibles, transfert conservé et un seul usage', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2 }); award(m, 1, 2); m.team(2).score = 1;
  assert.equal(m.applyBonus(2, 'steal', 1), false); assert.equal(m.applyBonus(1, 'steal', 1), false); assert.equal(m.applyBonus(1, 'unknown', 2), false);
  const total = m.teams.reduce((s, t) => s + t.score, 0);
  assert.ok(m.applyBonus(1, 'steal', 2)); assert.equal(m.team(2).score, 0); assert.equal(m.team(1).score, total);
  assert.equal(m.bonusEvents[0].amount, 1); assert.equal(m.applyBonus(1, 'steal', 2), false);
});
test('Gel : chute et validations bloquées 5 secondes de jeu, pause respectée', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2 }); award(m, 1, 2); assert.ok(m.applyBonus(1, 'freeze', 2));
  const a = asteroid(m, 2), p = a.progress; assert.equal(m.fire(2), false); m.advance(4.9); assert.equal(a.progress, p);
  m.paused = true; m.advance(30); assert.equal(m.frozen(2), true); m.paused = false; m.advance(.2);
  assert.equal(m.frozen(2), false); assert.ok(a.progress > p); assert.ok(m.fire(2));
});
test('Un remplacement gelé attend la fin du gel pour entrer', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2 }); award(m, 1, 2); m.applyBonus(1, 'freeze', 2); m.skip(2);
  m.advance(4.9); assert.equal(asteroid(m, 2), undefined); m.advance(.2); assert.ok(asteroid(m, 2));
});
test('Accélération : facteur 2,5 pendant 10 secondes, puis vitesse normale', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2, speed: 0 }), baseline = ready({ mode: 'teams', bonusEvery: 2, speed: 0 });
  award(m, 1, 2); m.applyBonus(1, 'accelerate', 2);
  assert.equal(m.team(2).acceleratedUntil - m.clock, 10);
  m.paused = true; const until = m.team(2).acceleratedUntil; m.advance(12); assert.equal(m.team(2).acceleratedUntil, until); assert.equal(m.elapsed, 9); m.paused = false;
  const a = asteroid(m, 2), b = asteroid(baseline, 2), p = a.progress, q = b.progress;
  m.advance(1); baseline.advance(1); assert.ok(Math.abs((a.progress - p) / (b.progress - q) - 2.5) < 1e-9);
  m.advance(9.1); assert.ok(m.clock > m.team(2).acceleratedUntil); const before = a.progress; m.advance(1);
  const slow = b.progress; baseline.advance(1); assert.ok(Math.abs((a.progress - before) - (b.progress - slow)) < 1e-9);
});
test('Historique : les nouveaux bonus gardent 10 s et ×2,5 ; les anciens gardent 8 s', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2 }); award(m, 1, 2); m.applyBonus(1, 'accelerate', 2);
  const state = C.createDefaultState(), summary = m.summary('Nouvelle séance'); state.history = [summary, { ...summary, title: 'Ancienne séance', bonusEvents: [{ at: 1, type: 'accelerate', actorId: 1, targetId: 2, duration: 8, amount: 0 }] }];
  const restored = C.validateState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.history[0].bonusEvents[0].duration, 10); assert.equal(restored.history[0].bonusEvents[0].factor, 2.5);
  assert.equal(restored.history[1].bonusEvents[0].duration, 8); assert.equal(restored.history[1].bonusEvents[0].factor, undefined);
});
test('Plusieurs bonus : chaque ticket reste attribué à la bonne équipe', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2 }); award(m, 1, 2); award(m, 2, 2);
  assert.equal(m.pendingBonuses.length, 2); m.paused = true;
  assert.equal(m.applyBonus(2, 'freeze', 1), false); assert.ok(m.applyBonus(1, 'freeze', 2)); assert.equal(m.nextBonus.actorId, 2);
  assert.ok(m.skipBonus()); assert.equal(m.nextBonus, null); assert.deepEqual(m.bonusEvents.map(b => b.type), ['freeze', 'skip']);
});
test('Bonus désactivés : aucun arrêt ni ticket, scores toujours indépendants', () => {
  const m = ready({ mode: 'teams', teamBonuses: false, bonusEvery: 2 }); award(m, 1, 4);
  assert.equal(m.nextBonus, null); assert.equal(m.team(1).score, 4); assert.equal(m.team(2).score, 0);
});
test('Sauvegarde complète : noms, ambiance, classement, attribution et bonus conservés', () => {
  const m = ready({ mode: 'teams', bonusEvery: 2, ambientVolume: 37, teamNames: ['Comètes', 'Étoiles', 'Nova', 'Atlas'] });
  award(m, 1, 2); m.applyBonus(1, 'accelerate', 2);
  const state = C.createDefaultState(); state.settings = m.settings; state.history = [m.summary('Finale')];
  const restored = C.validateState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.history[0], state.history[0]); assert.deepEqual(restored.settings, m.settings);
  const merged = C.mergeBackup(C.createDefaultState(), state).state;
  assert.deepEqual(merged.history[0].teams, state.history[0].teams); assert.equal(merged.settings.ambientVolume, 37); assert.equal(merged.settings.teamNames[0], 'Comètes');
});
