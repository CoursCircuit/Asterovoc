/* © CoursCircuit. Scène de projection : une seule boucle, un seul chronomètre. */
(function () {
  'use strict';
  const Core = window.AsterovocCore;
  const $ = id => document.getElementById(id);
  const image = src => { const img = new Image(); img.src = src; return img; };
  const art = { ship: image('assets/art/interceptor.png'), rock: image('assets/art/asteroid.png') };
  const loaded = Promise.all(Object.values(art).map(img => img.decode().catch(() => console.error('Image introuvable :', img.src))));
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  const measure = (text, size) => { measureContext.font = `600 ${size}px "Space Grotesk", sans-serif`; return measureContext.measureText(text).width; };
  const formatTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  function fit(canvas, width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function drawRock(ctx, x, y, width, height, angle = 0, danger = false, color = '', frozen = false) {
    if (!art.rock.complete || !art.rock.naturalWidth) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.shadowColor = frozen ? '#a3e7ff' : color || (danger ? '#ffb8784a' : '#7ba6be24'); ctx.shadowBlur = frozen ? 24 : color ? 15 : danger ? 22 : 13;
    ctx.drawImage(art.rock, -width / 2, -height / 2, width, height);
    if (frozen) { ctx.strokeStyle = '#a3e7ff99'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, width * .46, height * .45, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  function drawShip(ctx, x, y, size, angle = 0, clock = 0, reduced = false) {
    if (!art.ship.complete || !art.ship.naturalWidth) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    if (!reduced) {
      const glow = ctx.createRadialGradient(0, size * .3, 1, 0, size * .35, size * .65);
      glow.addColorStop(0, '#5ee6ff25'); glow.addColorStop(1, '#5ee6ff00');
      ctx.fillStyle = glow; ctx.fillRect(-size, -size * .15, size * 2, size * 1.3);
    }
    const h = size * art.ship.naturalHeight / art.ship.naturalWidth;
    const bob = reduced ? 0 : Math.sin(clock * 2) * 2;
    ctx.drawImage(art.ship, -size / 2, -h / 2 + bob, size, h);
    ctx.restore();
  }
  function adaptiveLanes(entries, settings, width, height) {
    let lanes = Math.min(settings.lanes, entries.length, Math.max(1, Math.floor(width / 205)));
    const maxHeight = Math.max(110, Math.min(280, (height - 230) * .6));
    const labels = entries.map(e => settings.direction === 'reverse' && e.answer ? e.answer : e.prompt);
    if (settings.direction === 'mixed') labels.push(...entries.filter(e => e.answer).map(e => e.answer));
    while (lanes > 1 && labels.some(text => {
      const available = Math.max(90, width / lanes - 78);
      return text.split(/\s+/).some(token => measure(token, 23) > available) || Core.layoutText(text, available, measure, settings.fontSize, 23).height > maxHeight;
    })) lanes--;
    return Math.max(1, lanes);
  }

  class Game {
    constructor(callbacks) {
      this.callbacks = callbacks; this.canvas = $('gameCanvas'); this.ctx = this.canvas.getContext('2d');
      this.labels = $('asteroidLabels'); this.labelNodes = new Map(); this.layoutCache = new Map();
      this.frame = null; this.running = false; this.countdownTimers = []; this.effects = new window.AsterovocEffects.ExplosionField(art.rock); this.lastTime = null;
      this.audio = new window.AsterovocAudio.SpaceAudio(); this.finishedSent = false; this.generation = 0;
      this.teams = new window.AsterovocTeams.TeamsUI({ apply: (actor, kind, target) => {
        if (this.model.applyBonus(actor, kind, target)) this.completeBonus();
      } });
      $('skipBonus').addEventListener('click', () => { if (this.model?.skipBonus()) this.completeBonus(); });
      $('bonusDialog').addEventListener('cancel', e => e.preventDefault());
      $('ambientToggle').addEventListener('click', () => {
        this.setAmbient(!this.model.settings.ambient, this.model.settings.ambientVolume);
        this.callbacks.onAmbientChange?.(this.model.settings.ambient, this.model.settings.ambientVolume);
      });
      this.onResize = () => this.resize(); window.addEventListener('resize', this.onResize);
      this.tick = timestamp => {
        this.frame = null;
        if (!this.running || this.model.paused || this.model.finished) return;
        const dt = this.lastTime === null ? 0 : Math.min(.1, Math.max(0, (timestamp - this.lastTime) / 1000));
        this.lastTime = timestamp; this.model.advance(dt);
        this.handleEvents(); this.updateEffects(dt); this.render(); this.updateHud();
        if (this.running && !this.model.paused && !this.model.finished) this.frame = requestAnimationFrame(this.tick);
      };
    }
    async start(entries, settings, title, countdown = true) {
      this.stop(); this.entries = entries; this.title = title;
      const generation = this.generation;
      this.running = true; this.finishedSent = false;
      const width = window.innerWidth, height = window.innerHeight;
      const effective = { ...settings, lanes: settings.mode === 'teams' ? settings.teamCount : adaptiveLanes(entries, settings, width, height), reducedMotion: settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches };
      this.model = new window.AsterovocMission.Mission(entries, effective); this.model.start(); this.model.paused = true;
      $('gameScreen').classList.toggle('team-mode', effective.mode === 'teams'); this.teams.configure(this.model);
      this.effects.clear(); this.layoutCache.clear(); this.labelNodes.clear(); this.labels.replaceChildren();
      this.stars = Array.from({ length: effective.reducedMotion ? 30 : 90 }, () => ({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.05 + .35, depth: Math.random() * 15 + 3 }));
      $('missionTitle').textContent = title; $('maxKey').textContent = String(effective.lanes);
      $('gameSpeed').hidden = effective.mode === 'calm'; $('pauseOverlay').hidden = true; $('answerOverlay').hidden = true;
      this.resize(); this.updateHud(); this.syncSpeeds();
      if (effective.mode !== 'teams' && effective.lanes < settings.lanes) this.feedback(`${effective.lanes} couloir${effective.lanes > 1 ? 's' : ''} pour garder les mots lisibles.`, 6000);
      this.handleEvents(); this.render();
      // Create/resume audio in the user's launch gesture. Silent unless enabled.
      if (effective.sound || effective.ambient) this.unlockAudio(); this.syncAmbient();
      await Promise.race([loaded, new Promise(resolve => setTimeout(resolve, 1200))]);
      if (!this.running || this.generation !== generation) return;
      if (document.hidden) { this.pause('Reprenez quand la classe est prête.'); return; }
      if (countdown && !effective.reducedMotion) this.countdown();
      else this.resume();
    }
    countdown() {
      this.model.paused = true;
      $('countdown').hidden = false; $('countdown').textContent = '3';
      [2, 1].forEach((n, i) => this.countdownTimers.push(setTimeout(() => { $('countdown').textContent = String(n); }, (i + 1) * 650)));
      this.countdownTimers.push(setTimeout(() => { $('countdown').hidden = true; this.countdownTimers = []; this.resume(); }, 1950));
    }
    cancelCountdown() { this.countdownTimers.forEach(clearTimeout); this.countdownTimers = []; $('countdown').hidden = true; }
    stop() {
      this.running = false; this.generation++; this.cancelCountdown(); cancelAnimationFrame(this.frame); this.frame = null; this.lastTime = null;
      clearTimeout(this.feedbackTimer); $('gameFeedback').textContent = ''; this.labels.replaceChildren(); this.labelNodes.clear();
      this.audio.stop(); this.teams.close();
    }
    pause(reason = 'Prenez le temps d’échanger avec la classe.', show = true) {
      if (!this.running || this.model.finished) return;
      this.cancelCountdown(); this.model.paused = true; cancelAnimationFrame(this.frame); this.frame = null; this.lastTime = null;
      $('pauseReason').textContent = reason; $('pauseOverlay').hidden = !show;
      $('pauseGame').setAttribute('aria-label', 'Reprendre la mission'); this.updateLabelDisabled(); this.render();
      this.syncAmbient();
    }
    resume() {
      if (!this.running || this.model.finished || document.hidden) return;
      if (this.model.nextBonus) { this.pause('', false); this.teams.choose(this.model); return; }
      this.cancelCountdown(); this.model.paused = false; $('pauseOverlay').hidden = true; $('answerOverlay').hidden = true;
      $('pauseGame').setAttribute('aria-label', 'Mettre en pause'); this.lastTime = null;
      this.updateLabelDisabled(); if (this.frame === null) this.frame = requestAnimationFrame(this.tick);
      if (this.model.settings.ambient || this.model.settings.sound) this.unlockAudio(); this.syncAmbient();
    }
    completeBonus() {
      this.teams.close(); this.handleEvents(); this.updateHud();
      if (this.model.nextBonus) this.teams.choose(this.model); else this.resume();
    }
    togglePause() { if (!this.model || this.model.finished) return; this.model.paused ? this.resume() : this.pause(); }
    fire(lane) { if (this.running && this.model.fire(lane)) { this.handleEvents(); this.updateLabelDisabled(); } }
    setSpeed(speed) { if (!this.model) return; this.model.setSpeed(speed); this.syncSpeeds(); }
    syncSpeeds() { document.querySelectorAll('#gameSpeed button').forEach(b => { const active = Number(b.dataset.speed) === this.model.settings.speed; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); }); }
    finish() { if (!this.running) return; this.model.finish(); this.handleEvents(); }
    resize() {
      if (!this.running) return;
      const w = window.innerWidth, h = window.innerHeight;
      this.width = w; this.height = h; this.ctx = fit(this.canvas, w, h);
      this.layoutCache.clear();
      const hud = document.querySelector('.game-hud').getBoundingClientRect().height;
      $('gameScreen').style.setProperty('--hud-height', hud + 'px');
      const board = this.model.teams.length ? $('teamScoreboard').getBoundingClientRect().height + 20 : 0;
      this.fieldTop = hud + board; this.labels.style.clipPath = `inset(${this.fieldTop}px 0 50px)`;
      this.model.setViewport(w, h, this.fieldTop + 100, h - 172); this.render();
      if (this.frame && (w < 650 || h < 450) && !this.model.paused) this.pause('L’affichage a changé. Vérifiez la projection, puis reprenez.');
    }
    geometry(a) {
      if (!this.layoutCache.has(a.uid)) {
        const laneWidth = this.width / this.model.settings.lanes;
        const available = Math.max(70, laneWidth - 78);
        const longest = Math.max(...a.prompt.split(/\s+/).map(token => measure(token, 23)));
        const textWidth = a.prompt.includes(' ') ? Math.min(available, Math.max(this.model.settings.fontSize * 10.8, longest)) : available;
        const layout = Core.layoutText(a.prompt, textWidth, measure, this.model.settings.fontSize, 23);
        const width = Math.min(laneWidth - 14, Math.max(148, layout.width + 72));
        const height = Math.max(130, layout.height + 62, width * .57);
        this.layoutCache.set(a.uid, { layout, width, height });
      }
      const base = this.layoutCache.get(a.uid), v = this.model.viewport;
      const start = v.top + Math.max(0, base.height / 2 - 75);
      const end = Math.max(start + 25, v.bottom - base.height / 2 + 20);
      return { ...base, x: (a.lane - .5) * this.width / this.model.settings.lanes, y: window.AsterovocMission.asteroidY(a, base.height, start, end) };
    }
    handleEvents() {
      for (const event of this.model.drainEvents()) {
        const a = event.asteroid;
        if (event.type === 'spawn') {
          const b = document.createElement('button'); b.className = 'asteroid-label'; b.type = 'button';
          const team = this.model.team(a.lane);
          if (team) b.style.setProperty('--team-color', team.color);
          b.setAttribute('aria-label', `Valider ${team ? team.name + ', équipe ' : ''}${a.lane} : ${a.prompt}`);
          const num = document.createElement('span'); num.className = 'lane-number'; num.textContent = String(a.lane); num.setAttribute('aria-hidden', 'true');
          const word = document.createElement('span'); word.className = 'asteroid-word';
          b.append(num, word); b.addEventListener('click', () => { this.fire(a.lane); b.blur(); });
          this.labelNodes.set(a.uid, { button: b, word, lastLayout: null }); this.labels.append(b);
        } else if (event.type === 'fire' && event.pair === 0) this.sound('fire', a.lane);
        else if (['correct', 'missed', 'skipped'].includes(event.type)) {
          const g = this.geometry(a); this.labelNodes.get(a.uid)?.button.remove(); this.labelNodes.delete(a.uid); this.layoutCache.delete(a.uid);
          this.effects.add(g.x, g.y, g.width, g.height, event.type, this.model.settings.reducedMotion);
          if (event.type !== 'skipped') this.sound(event.type === 'correct' ? 'correct' : 'missed', a.lane);
          if (event.type === 'missed') this.feedback(`À revoir : ${a.prompt}`, 2200);
        } else if (event.type === 'bonus-earned' && !this.model.finished) {
          this.pause('', false); this.teams.choose(this.model); this.sound('bonus');
        } else if (event.type === 'bonus-applied') {
          const bonus = event.bonus, actor = this.model.team(bonus.actorId), target = this.model.team(bonus.targetId);
          this.feedback(bonus.type === 'freeze' ? `${actor.name} gèle ${target.name} pendant 5 s` : bonus.type === 'steal' ? `${actor.name} vole ${bonus.amount} point${bonus.amount > 1 ? 's' : ''} à ${target.name}` : `${actor.name} accélère ${target.name} pendant ${bonus.duration} s (×${String(bonus.factor).replace('.', ',')})`, 4500);
          this.sound('bonus');
        } else if (event.type === 'finish' && !this.finishedSent) {
          this.finishedSent = true; cancelAnimationFrame(this.frame); this.frame = null; this.running = false;
          this.cancelCountdown(); $('pauseOverlay').hidden = true; $('answerOverlay').hidden = true;
          this.audio.stop(); this.teams.close();
          this.callbacks.onFinish(this.model.summary(this.title), event.reason);
        }
      }
    }
    updateLabelDisabled() { for (const a of this.model.asteroids) { const label = this.labelNodes.get(a.uid); if (label) label.button.disabled = this.model.paused || !this.model.ready(a) || this.model.frozen(a.lane); } }
    render() {
      if (!this.model || !this.width) return;
      const ctx = this.ctx, w = this.width, h = this.height, m = this.model;
      ctx.clearRect(0, 0, w, h);
      this.drawStars();
      const horizon = h - 136;
      const grad = ctx.createLinearGradient(0, horizon - 35, 0, horizon + 35); grad.addColorStop(0, '#ffb87800'); grad.addColorStop(.5, '#ffb87814'); grad.addColorStop(1, '#ffb87800');
      ctx.fillStyle = grad; ctx.fillRect(0, horizon - 35, w, 70);
      ctx.strokeStyle = '#b5916230'; ctx.lineWidth = 1; ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.moveTo(25, horizon); ctx.lineTo(w - 25, horizon); ctx.stroke(); ctx.setLineDash([]);
      for (let lane = 1; lane <= m.settings.lanes; lane++) {
        const x = (lane - .5) * w / m.settings.lanes;
        const team = m.team(lane);
        ctx.fillStyle = team?.color || '#75a2b83b'; ctx.font = '11px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(lane).padStart(2, '0'), x, h - 67);
        if (team && lane < m.settings.lanes) { ctx.strokeStyle = '#a2c6de12'; ctx.beginPath(); ctx.moveTo(lane * w / m.settings.lanes, this.fieldTop + 12); ctx.lineTo(lane * w / m.settings.lanes, horizon - 20); ctx.stroke(); }
      }
      ctx.save(); ctx.beginPath(); ctx.rect(0, this.fieldTop, w, Math.max(0, h - this.fieldTop - 50)); ctx.clip();
      for (const a of m.asteroids) {
        const g = this.geometry(a), danger = a.progress > .79, team = m.team(a.lane), frozen = m.frozen(a.lane);
        const angle = m.settings.reducedMotion ? 0 : Math.sin(m.clock * .23 + a.phase) * .045;
        drawRock(ctx, g.x, g.y, g.width, g.height, angle, danger, team?.color, frozen);
        const n = this.labelNodes.get(a.uid);
        if (!n) continue;
        n.button.style.left = g.x + 'px'; n.button.style.top = g.y + 'px'; n.button.style.width = g.layout.width + 12 + 'px';
        n.button.style.fontSize = g.layout.size + 'px';
        n.button.classList.toggle('danger', danger); n.button.classList.toggle('targeted', a.targeted);
        n.button.classList.toggle('entering', a.entryProgress < 1); n.button.classList.toggle('frozen', frozen);
        n.button.disabled = m.paused || !m.ready(a) || frozen;
        if (n.lastLayout !== g.layout) {
          n.word.replaceChildren(...g.layout.lines.map(text => { const line = document.createElement('span'); line.textContent = text; return line; }));
          n.lastLayout = g.layout;
        }
      }
      ctx.restore();
      const shipX = m.shipX * w, shipY = h - 114;
      for (const shot of m.shots) {
        const target = m.asteroids.find(a => a.uid === shot.targetUid); if (!target) continue;
        const g = this.geometry(target), t = Math.max(0, Math.min(1, shot.elapsed / shot.duration));
        const startX = shot.fromX * w + shot.offset, startY = shipY - 42;
        const dx = g.x + shot.offset * .2 - startX, dy = g.y - startY, length = Math.hypot(dx, dy) || 1;
        const x = startX + dx * t, y = startY + dy * t, color = m.team(target.lane)?.color || '#78f5c3';
        ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = m.settings.reducedMotion ? 0 : 12; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - dx / length * 17, y - dy / length * 17); ctx.lineTo(x, y); ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#efffff'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineCap = 'butt';
      }
      this.drawEffects();
      drawShip(ctx, shipX, shipY, Math.min(112, w * .13 + 42), (m.shipTarget - m.shipX) * .22, m.clock, m.settings.reducedMotion);
    }
    drawStars() {
      const ctx = this.ctx, m = this.model;
      for (const s of this.stars || []) {
        const y = m.settings.reducedMotion ? s.y : (s.y + m.clock * s.depth) % this.height;
        ctx.fillStyle = `rgba(192,222,237,${.2 + s.r * .25})`; ctx.beginPath(); ctx.arc(s.x % this.width, y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    updateEffects(dt) { this.effects.advance(dt); }
    drawEffects() {
      this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(0, this.fieldTop, this.width, Math.max(0, this.height - this.fieldTop - 50)); this.ctx.clip();
      this.effects.draw(this.ctx); this.ctx.restore();
    }
    updateHud() {
      const m = this.model;
      $('score').textContent = String(m.score);
      $('missionProgress').textContent = `${m.correct} validé${m.correct > 1 ? 's' : ''} · ${m.missed} manqué${m.missed > 1 ? 's' : ''} · ${m.progress}/${m.entries.length} rencontrés`;
      $('timerLabel').textContent = m.settings.duration ? 'RESTE' : 'TEMPS';
      $('timer').textContent = formatTime(m.settings.duration ? Math.max(0, Math.ceil(m.settings.duration - m.elapsed)) : Math.floor(m.elapsed));
      this.teams.render(m);
    }
    feedback(message, duration = 2500) { clearTimeout(this.feedbackTimer); $('gameFeedback').textContent = message; this.feedbackTimer = setTimeout(() => { $('gameFeedback').textContent = ''; }, duration); }
    unlockAudio() {
      const generation = this.generation;
      this.audio.unlock().then(() => { if (this.running && generation === this.generation) this.syncAmbient(); });
    }
    setAmbient(enabled, volume) {
      this.model.settings.ambient = !!enabled; this.model.settings.ambientVolume = Math.max(0, Math.min(100, Number(volume) || 0));
      if (enabled) this.unlockAudio(); this.syncAmbient();
    }
    syncAmbient() {
      if (!this.model) return;
      const s = this.model.settings, button = $('ambientToggle');
      button.setAttribute('aria-pressed', String(s.ambient)); button.setAttribute('aria-label', s.ambient ? 'Couper l’ambiance spatiale' : 'Activer l’ambiance spatiale');
      button.querySelector('.sound-on').hidden = !s.ambient; button.querySelector('.sound-off').hidden = s.ambient;
      this.audio.setAmbient(s.ambient, s.ambientVolume, this.running && !this.model.paused && !this.model.finished);
    }
    sound(kind, lane) { this.audio.sound(kind, this.model.settings.sound, lane ? ((lane - .5) / this.model.settings.lanes - .5) * 1.3 : 0); }
  }

  async function drawPreview(entries, settings) {
    await loaded; await document.fonts.ready;
    const canvas = $('previewCanvas'), width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const ctx = fit(canvas, width, height);
    const sample = entries.length ? entries.slice(0, 2) : [{ prompt: 'Vos mots ici', answer: '' }];
    sample.forEach((entry, i) => {
      const text = settings.direction === 'reverse' && entry.answer ? entry.answer : entry.prompt;
      const layout = Core.layoutText(text, Math.max(80, width * .4 - 28), measure, Math.min(24, Math.max(18, width / 24)), 17);
      const x = sample.length === 1 ? width * .5 : width * (i === 0 ? .27 : .76);
      const rw = Math.min(width * .48, Math.max(132, width * .35, layout.width + 41)), rh = Math.max(105, layout.height + 44, rw * .82);
      const y = Math.max(height * (i === 0 ? .32 : .45), rh / 2 + 18);
      drawRock(ctx, x, y, rw, rh, i === 0 ? -.035 : .05);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f5faff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 7;
      ctx.font = `600 ${layout.size}px "Space Grotesk", sans-serif`;
      layout.lines.forEach((line, j) => ctx.fillText(line, x, y + (j - (layout.lines.length - 1) / 2) * layout.size * 1.23));
      ctx.shadowBlur = 0;
      const badgeY = y - rh * .45;
      ctx.beginPath(); ctx.arc(x, badgeY, 14, 0, Math.PI * 2); ctx.fillStyle = '#07151e'; ctx.fill(); ctx.strokeStyle = '#78f5c3'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#78f5c3'; ctx.font = '500 16px "Space Grotesk",sans-serif'; ctx.fillText(String(i + 1), x, badgeY + 1);
    });
    drawShip(ctx, width * .52, height * .75, Math.min(176, height * .49));
  }
  window.AsterovocScene = { Game, drawPreview, adaptiveLanes, formatTime, ready: loaded };
})();
