/* © CoursCircuit. Simulation déterministe : entrées, placement, rafales et équipes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.AsterovocMission = factory(root.AsterovocCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const SPEEDS = [10, 19, 34, 52];
  const STEP = 1 / 120;
  const PAIRS = 3, PAIR_INTERVAL = .035;
  const BONUS_TYPES = Object.freeze({ freeze: { label: 'Gel', duration: 5 }, steal: { label: 'Vol de points', duration: 0 }, accelerate: { label: 'Accélération', duration: 10, factor: 2.5 } });
  const asteroidY = (a, height, start, end) => {
    const origin = -height / 2 - 48;
    const destination = start + a.progress * (end - start);
    const t = Math.max(0, Math.min(1, a.entryProgress));
    return origin + (destination - origin) * (1 - Math.pow(1 - t, 3));
  };
  class Mission {
    constructor(entries, settings, random = Math.random) {
      if (!entries.length) throw new Error('Une mission a besoin d’au moins un mot.');
      this.entries = entries.map((e, index) => ({ ...e, index }));
      this.settings = Core.sanitizeSettings(settings); this.random = random;
      if (this.settings.mode === 'teams') this.settings.lanes = this.settings.teamCount;
      this.asteroids = []; this.shots = []; this.results = []; this.events = [];
      this.bag = []; this.cycle = 0; this.elapsed = 0; this.clock = 0; this.ticks = 0; this.remainder = 0;
      this.nextId = 0; this.nextShotId = 0; this.started = false; this.paused = false; this.finished = false;
      this.viewport = { width: 1200, height: 800, top: 100, bottom: 630 };
      this.shipX = .5; this.shipTarget = .5; this.fireQueue = []; this.volley = null;
      this.pendingSpawns = new Map(); this.pendingBonuses = []; this.bonusEvents = []; this.nextBonusId = 0;
      this.teams = this.settings.mode === 'teams' ? Array.from({ length: this.settings.teamCount }, (_, i) => ({ id: i + 1, name: this.settings.teamNames[i], color: Core.TEAM_COLORS[i], score: 0, correct: 0, missed: 0, frozenUntil: 0, acceleratedUntil: 0, bag: [], cycle: 0 })) : [];
    }
    setViewport(width, height, top = 100, bottom = height - 145) { this.viewport = { width, height, top, bottom: Math.max(top + 100, bottom) }; }
    get capacity() { return this.teams.length || Math.min(this.settings.lanes, this.entries.length); }
    get correct() { return this.results.filter(r => r.status === 'correct').length; }
    get missed() { return this.results.filter(r => r.status === 'missed').length; }
    get score() { return this.correct - this.missed; }
    get progress() { return new Set(this.results.map(r => r.index)).size; }
    get nextBonus() { return this.pendingBonuses[0] || null; }
    team(id) { return this.teams.find(t => t.id === id); }
    frozen(id) { return (this.team(id)?.frozenUntil || 0) > this.clock; }
    ready(a) { return !!a && a.entryProgress >= .85 && !a.targeted; }
    setSpeed(speed) { if ([0, 1, 2, 3].includes(speed)) this.settings.speed = speed; }
    takeEntry(lane) {
      const deck = this.team(lane) || this;
      if (!deck.bag.length) {
        if (deck.cycle > 0 && this.settings.mode === 'onepass') return null;
        deck.bag = Core.shuffle(this.entries, this.random); deck.cycle++;
      }
      const active = new Set(this.asteroids.map(a => a.entry.index));
      let next = deck.bag.findIndex(e => !active.has(e.index));
      if (next < 0 && this.teams.length) next = 0;
      return next < 0 ? null : deck.bag.splice(next, 1)[0];
    }
    spawn(lane) {
      if (this.finished || this.asteroids.length >= this.capacity) return null;
      const free = Array.from({ length: this.settings.lanes }, (_, i) => i + 1).filter(id => !this.asteroids.some(a => a.lane === id));
      if (lane === undefined) lane = free[Math.floor(this.random() * free.length)];
      if (!free.includes(lane) || this.frozen(lane)) return null;
      const entry = this.takeEntry(lane); if (!entry) return null;
      const a = { uid: ++this.nextId, lane, entry, ...Core.orientEntry(entry, this.settings.direction, this.random), progress: this.settings.mode === 'calm' ? .04 + this.random() * .23 : 0, entryProgress: 0, entryDuration: [2.5, 2.15, 1.8, 1.5][this.settings.speed], phase: this.random() * Math.PI * 2, targeted: false, hits: 0 };
      this.asteroids.push(a); this.pendingSpawns.delete(lane); this.events.push({ type: 'spawn', asteroid: a }); return a;
    }
    start() {
      if (this.started) return; this.started = true;
      const lanes = Core.shuffle(Array.from({ length: this.settings.lanes }, (_, i) => i + 1), this.random).slice(0, this.capacity);
      lanes.forEach((lane, i) => this.pendingSpawns.set(lane, .08 + i * [1.8, 1.45, 1.15, .95][this.settings.speed]));
    }
    fire(lane) {
      if (this.paused || this.finished || this.frozen(lane)) return false;
      const target = this.asteroids.find(a => a.lane === lane && this.ready(a)); if (!target) return false;
      target.targeted = true; this.fireQueue.push({ targetUid: target.uid, lane });
      this.events.push({ type: 'queued', asteroid: target }); return true;
    }
    advanceWeapons(dt) {
      if (!this.volley && this.fireQueue.length) {
        const next = this.fireQueue.shift(), a = this.asteroids.find(a => a.uid === next.targetUid);
        if (a) {
          this.shipTarget = (a.lane - .5) / this.settings.lanes;
          this.volley = { targetUid: a.uid, phase: 'moving', age: 0, from: this.shipX, to: this.shipTarget, moveDuration: .13 + Math.abs(this.shipTarget - this.shipX) * .52, pair: 0 };
        }
      }
      const v = this.volley;
      if (v) {
        const target = this.asteroids.find(a => a.uid === v.targetUid);
        if (!target) this.volley = null;
        else if (v.phase === 'moving') {
          v.age += dt; const t = Math.min(1, v.age / v.moveDuration);
          this.shipX = v.from + (v.to - v.from) * t * t * (3 - 2 * t);
          if (t >= 1) { this.shipX = v.to; v.phase = 'firing'; v.age = 0; }
        } else {
          v.age += dt;
          while (v.pair < PAIRS && v.age >= v.pair * PAIR_INTERVAL) {
            const targetY = this.viewport.top + target.progress * (this.viewport.bottom - this.viewport.top);
            const duration = Math.max(.11, Math.min(.45, (this.viewport.height - 156 - targetY) / (2200 * this.viewport.height / 800)));
            for (const side of [-1, 1]) this.shots.push({ uid: ++this.nextShotId, targetUid: target.uid, fromX: this.shipX, offset: side * 17, elapsed: 0, duration });
            this.events.push({ type: 'fire', asteroid: target, pair: v.pair }); v.pair++;
          }
          if (v.pair >= PAIRS) this.volley = null;
        }
      }
      const remaining = [];
      for (const shot of this.shots) {
        const target = this.asteroids.find(a => a.uid === shot.targetUid); if (!target) continue;
        shot.elapsed += dt;
        if (shot.elapsed >= shot.duration) { target.hits++; if (target.hits >= PAIRS * 2) this.resolve(target.uid, 'correct'); }
        else remaining.push(shot);
      }
      this.shots = remaining.filter(s => this.asteroids.some(a => a.uid === s.targetUid));
    }
    resolve(uid, status) {
      const index = this.asteroids.findIndex(a => a.uid === uid); if (index < 0 || this.finished) return false;
      const a = this.asteroids[index]; this.asteroids.splice(index, 1);
      this.fireQueue = this.fireQueue.filter(q => q.targetUid !== uid);
      this.shots = this.shots.filter(s => s.targetUid !== uid);
      if (this.volley?.targetUid === uid) this.volley = null;
      const team = this.team(a.lane);
      const result = { prompt: a.prompt, answer: a.answer, status, index: a.entry.index, ...(team ? { teamId: team.id } : {}) };
      this.results.push(result); this.events.push({ type: status, asteroid: a });
      if (team) {
        if (status === 'correct') {
          team.correct++; team.score++;
          if (this.settings.teamBonuses && team.correct % this.settings.bonusEvery === 0) {
            const bonus = { id: ++this.nextBonusId, actorId: team.id }; this.pendingBonuses.push(bonus); this.events.push({ type: 'bonus-earned', bonus });
          }
        } else if (status === 'missed') { team.missed++; team.score--; }
      }
      this.pendingSpawns.set(a.lane, this.clock + (team ? .16 : .4)); return true;
    }
    skip(lane) {
      const target = this.asteroids.find(a => a.lane === lane && !a.targeted);
      return !this.paused && !this.finished && target ? this.resolve(target.uid, 'skipped') : false;
    }
    applyBonus(actorId, type, targetId) {
      const ticket = this.nextBonus, actor = this.team(actorId), target = this.team(targetId);
      if (this.finished || !ticket || ticket.actorId !== actorId || !actor || !target || actor === target || !BONUS_TYPES[type]) return false;
      if (type === 'steal' && target.score <= 0) return false;
      let amount = 0;
      if (type === 'freeze') target.frozenUntil = Math.max(target.frozenUntil, this.clock + BONUS_TYPES.freeze.duration);
      if (type === 'accelerate') target.acceleratedUntil = Math.max(target.acceleratedUntil, this.clock + BONUS_TYPES.accelerate.duration);
      if (type === 'steal') { amount = Math.min(3, Math.max(0, target.score)); target.score -= amount; actor.score += amount; }
      const event = { at: this.clock, type, actorId, targetId, amount, duration: BONUS_TYPES[type].duration, ...(type === 'accelerate' ? { factor: BONUS_TYPES.accelerate.factor } : {}) };
      this.bonusEvents.push(event); this.pendingBonuses.shift(); this.events.push({ type: 'bonus-applied', bonus: event }); return true;
    }
    skipBonus() {
      if (!this.nextBonus || this.finished) return false;
      this.bonusEvents.push({ at: this.clock, type: 'skip', actorId: this.nextBonus.actorId, targetId: 0, amount: 0, duration: 0 }); this.pendingBonuses.shift(); return true;
    }
    step() {
      this.ticks++; this.clock = this.elapsed = this.ticks / 120;
      const travel = this.viewport.bottom - this.viewport.top;
      for (const a of [...this.asteroids]) {
        if (a.targeted || this.frozen(a.lane)) continue;
        const fast = (this.team(a.lane)?.acceleratedUntil || 0) > this.clock ? BONUS_TYPES.accelerate.factor : 1;
        const previous = a.entryProgress; a.entryProgress = Math.min(1, previous + STEP * fast / a.entryDuration);
        const movingTime = previous >= 1 ? STEP : a.entryProgress >= 1 ? Math.max(0, STEP - (1 - previous) * a.entryDuration / fast) : 0;
        const velocity = this.settings.mode === 'calm' ? 0 : SPEEDS[this.settings.speed] * Math.max(.55, this.viewport.height / 800) * fast;
        a.progress += velocity * movingTime / travel;
        if (a.progress >= 1) this.resolve(a.uid, 'missed');
      }
      this.advanceWeapons(STEP);
      for (const [lane, due] of [...this.pendingSpawns]) if (this.clock >= due && !this.frozen(lane)) this.spawn(lane);
      if (this.settings.duration && this.elapsed >= this.settings.duration) this.finish('time');
      else if (this.settings.mode === 'onepass' && this.cycle && !this.bag.length && !this.asteroids.length) this.finish('complete');
    }
    advance(dt) {
      if (this.paused || this.finished || !this.started || !Number.isFinite(dt) || dt <= 0) return;
      this.remainder += dt;
      while (this.remainder + 1e-10 >= STEP && !this.finished) { this.remainder -= STEP; this.step(); }
    }
    finish(reason = 'manual') {
      if (this.finished) return; this.finished = true; this.shots = []; this.fireQueue = []; this.volley = null;
      this.events.push({ type: 'finish', reason });
    }
    drainEvents() { return this.events.splice(0); }
    summary(title) {
      return { title, at: new Date().toISOString(), elapsed: Math.round(this.elapsed), mode: this.settings.mode, results: this.results.map(({ prompt, answer, status, teamId }) => ({ prompt, answer, status, ...(teamId ? { teamId } : {}) })), ...(this.teams.length ? { teams: this.teams.map(({ id, name, color, score, correct, missed }) => ({ id, name, color, score, correct, missed })), bonusEvents: this.bonusEvents.map(b => ({ ...b })) } : {}) };
    }
  }
  return { Mission, SPEEDS, asteroidY, BONUS_TYPES, MISSILES_PER_BURST: PAIRS * 2 };
});
