/* © CoursCircuit. Débris texturés, gerbe incandescente et souffle sur canvas. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AsterovocEffects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function createExplosion(x, y, width, height, status = 'correct', reduced = false, random = Math.random) {
    const scale = clamp((width + height) / 390, .65, 1.55);
    const burst = { x, y, scale, status, reduced, age: 0, lifetime: reduced ? .3 : 1.65, particles: [] };
    if (reduced) return burst;
    const strong = status === 'correct';
    const add = (kind, count, make) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count + random() * .07) * Math.PI * 2;
        burst.particles.push({ kind, x: (random() - .5) * width * .14, y: (random() - .5) * height * .14, angle, ...make(angle) });
      }
    };
    add('smoke', strong ? 9 : 4, a => ({ vx: Math.cos(a) * (22 + random() * 55), vy: Math.sin(a) * 35 - 22, size: 18 + random() * 22, life: 1 + random() * .6, drag: 1, gravity: -9 }));
    if (strong) add('flame', 11, a => ({ vx: Math.cos(a) * (75 + random() * 110), vy: Math.sin(a) * (55 + random() * 105), size: 10 + random() * 20, life: .25 + random() * .4, drag: 2.8, gravity: -12 }));
    add('rock', strong ? 18 : 7, a => {
      const speed = (strong ? 115 : 55) + random() * 150;
      return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * .75, size: 7 + random() * 16, life: .65 + random() * .85, drag: .8, gravity: 90, spin: (random() - .5) * 11, tilt: 3 + random() * 7, cropX: .23 + random() * .35, cropY: .3 + random() * .25, cropSize: .065 + random() * .055, polygon: Array.from({ length: 5 }, (_, i) => { const a = i * Math.PI * .4, r = .65 + random() * .35; return [Math.cos(a) * r, Math.sin(a) * r]; }) };
    });
    if (strong) add('spark', 42, a => {
      const speed = 150 + random() * 260;
      return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * .73, size: .7 + random() * 1.8, life: .24 + random() * .65, drag: 1.8, gravity: 45, trail: 7 + random() * 17, hot: random() > .45 };
    });
    return burst;
  }
  function particlePosition(p, age, scale = 1) {
    const travel = (1 - Math.exp(-p.drag * age)) / p.drag;
    return { x: (p.x + p.vx * travel) * scale, y: (p.y + p.vy * travel + .5 * p.gravity * age * age) * scale };
  }
  function sprite(stops) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([at, color]) => gradient.addColorStop(at, color)); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); return canvas;
  }
  class ExplosionField {
    constructor(rock) { this.rock = rock; this.bursts = []; this.sprites = null; }
    add(x, y, width, height, status, reduced = false) {
      const burst = createExplosion(x, y, width, height, status, reduced); this.bursts.push(burst);
      if (this.bursts.length > 8) this.bursts.shift(); return burst;
    }
    clear() { this.bursts = []; }
    advance(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      this.bursts = this.bursts.filter(b => { b.age += dt; return b.age < b.lifetime; });
    }
    draw(ctx) {
      if (!this.bursts.length) return;
      if (!this.sprites) this.sprites = {
        fire: sprite([[0, '#fffdf1'], [.12, '#fff2b8ed'], [.36, '#ffb642b3'], [.65, '#f34c1938'], [1, '#b82a0000']]),
        glow: sprite([[0, '#ffe1a8b0'], [.32, '#ff9c4d69'], [1, '#ff541000']]),
        smoke: sprite([[0, '#9384767a'], [.28, '#706a6482'], [.65, '#504c4835'], [1, '#38343100']])
      };
      ctx.save();
      for (const b of this.bursts) {
        ctx.save(); ctx.translate(b.x, b.y);
        const t = b.age, s = b.scale, strong = b.status === 'correct';
        if (b.reduced) {
          const r = 75 * s; ctx.globalAlpha = (1 - t / b.lifetime) * .65;
          ctx.drawImage(this.sprites.glow, -r, -r * .7, r * 2, r * 1.4); ctx.restore(); continue;
        }
        // La poussière reste derrière la flamme et les fragments.
        ctx.globalCompositeOperation = 'source-over';
        for (const p of b.particles.filter(p => p.kind === 'smoke' && t < p.life)) {
          const pos = particlePosition(p, t, s), r = p.size * s * (1 + t * 2.5);
          ctx.globalAlpha = Math.min(1, t * 8) * Math.pow(1 - t / p.life, 1.8) * .65;
          ctx.drawImage(this.sprites.smoke, pos.x - r, pos.y - r * .8, r * 2, r * 1.6);
        }
        if (strong && t < .52) {
          ctx.globalCompositeOperation = 'lighter';
          const r = (55 + t * 200) * s; ctx.globalAlpha = Math.pow(1 - t / .52, 2) * .9;
          ctx.drawImage(this.sprites.glow, -r * 1.7, -r, r * 3.4, r * 2);
          if (t < .2) {
            const core = (44 + t * 270) * s; ctx.globalAlpha = Math.pow(1 - t / .2, 1.3) * .85;
            ctx.drawImage(this.sprites.fire, -core, -core, core * 2, core * 2);
          }
          const ring = (12 + t * 290) * s; ctx.globalAlpha = Math.pow(1 - t / .52, 2) * .6;
          ctx.strokeStyle = '#ffdfad'; ctx.lineWidth = (1 + (1 - t / .52) * 3) * s;
          ctx.beginPath(); ctx.ellipse(0, 0, ring, ring * .72, 0, 0, Math.PI * 2); ctx.stroke();
        }
        for (const p of b.particles.filter(p => p.kind === 'flame' && t < p.life)) {
          const pos = particlePosition(p, t, s), r = p.size * s * (1 + t * 2.7);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.pow(1 - t / p.life, 1.5);
          ctx.drawImage(this.sprites.fire, pos.x - r, pos.y - r, r * 2, r * 2);
        }
        ctx.globalCompositeOperation = 'source-over';
        for (const p of b.particles.filter(p => p.kind === 'rock' && t < p.life)) {
          const pos = particlePosition(p, t, s), size = p.size * s, fade = Math.min(1, (p.life - t) * 3.5);
          ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(p.angle + p.spin * t); ctx.scale(1, .65 + .35 * Math.cos(p.tilt * t));
          ctx.globalAlpha = fade; ctx.beginPath(); p.polygon.forEach(([x, y], i) => i ? ctx.lineTo(x * size, y * size) : ctx.moveTo(x * size, y * size)); ctx.closePath(); ctx.clip();
          if (this.rock?.complete && this.rock.naturalWidth) {
            const image = this.rock, sw = image.naturalWidth * p.cropSize, sh = image.naturalHeight * p.cropSize;
            ctx.drawImage(image, image.naturalWidth * p.cropX, image.naturalHeight * p.cropY, sw, sh, -size, -size, size * 2, size * 2);
          } else { ctx.fillStyle = '#79746c'; ctx.fillRect(-size, -size, size * 2, size * 2); }
          ctx.fillStyle = `rgba(255,133,40,${Math.max(0, .25 - t * .6)})`; ctx.fillRect(-size, -size, size * 2, size * 2);
          ctx.strokeStyle = '#211c1888'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const p of b.particles.filter(p => p.kind === 'spark' && t < p.life)) {
          const pos = particlePosition(p, t, s), length = Math.hypot(p.vx, p.vy), trail = p.trail * s * Math.exp(-t * 2);
          if (t < .12 && Math.hypot(pos.x, pos.y) < 27 * s) continue;
          ctx.globalAlpha = Math.pow(1 - t / p.life, .65); ctx.strokeStyle = p.hot ? '#fff0c4' : '#ff983e'; ctx.lineWidth = p.size * s;
          ctx.beginPath(); ctx.moveTo(pos.x - p.vx / length * trail, pos.y - p.vy / length * trail); ctx.lineTo(pos.x, pos.y); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }
  return { createExplosion, particlePosition, ExplosionField };
});
