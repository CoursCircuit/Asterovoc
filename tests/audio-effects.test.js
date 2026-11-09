const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { SpaceAudio, SOUND_FILES, loopBuffer } = require('../js/audio.js');
const bank = require('../assets/audio/samples.js');
const { createExplosion, particlePosition, ExplosionField } = require('../js/effects.js');

class Param {
  constructor(value = 0) { this.value = value; }
  cancelScheduledValues() {}
  setTargetAtTime(value) { this.value = value; }
}
class AudioNode {
  connect(other) { return other; }
  disconnect() { this.disconnected = true; }
}
class Context {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 100; this.destination = new AudioNode(); this.sources = []; }
  createGain() { return Object.assign(new AudioNode(), { gain: new Param() }); }
  createStereoPanner() { return Object.assign(new AudioNode(), { pan: new Param() }); }
  createDynamicsCompressor() { return Object.assign(new AudioNode(), Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(key => [key, new Param()]))); }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: i => data[i] };
  }
  async decodeAudioData(bytes) { assert.ok(bytes.byteLength); return this.createBuffer(2, 1000, 100); }
  createBufferSource() {
    const node = new AudioNode(); node.playbackRate = new Param(1);
    node.start = (at, offset) => { node.started = true; node.offset = offset; };
    node.stop = at => { node.stoppedAt = at; }; this.sources.push(node); return node;
  }
  async resume() { this.state = 'running'; }
}
const engine = () => new SpaceAudio(Context, { ...bank });

test('Les six sons embarqués sont les fichiers de bibliothèque, à l’octet près', () => {
  for (const [key, file] of Object.entries(SOUND_FILES)) {
    const original = fs.readFileSync(require('node:path').join(__dirname, '../assets/audio', file));
    assert.ok(original.length > 1000); assert.ok(original.equals(Buffer.from(bank[key], 'base64')));
  }
});
test('Le fond sonore repart à la position de pause, avec une seule boucle active', async () => {
  const a = engine(); await a.unlock(); a.setAmbient(true, 18, true); const original = a.music;
  a.setAmbient(true, 37, true); assert.equal(a.music, original);
  a.context.currentTime = 3.25; a.setAmbient(true, 37, false); assert.equal(a.music, null); assert.ok(original.source.stoppedAt > 3.25);
  a.setAmbient(true, 37, true); assert.equal(a.music.source.offset, 3.25); assert.notEqual(a.music, original);
});
test('Chargement retardé puis arrêt : aucune musique ne démarre après la mission', async () => {
  const a = engine(); a.setAmbient(true, 100, true); const pending = a.unlock(); a.stop(); await pending;
  assert.equal(a.music, null); assert.equal(a.active, false); assert.equal(a.context.sources.filter(s => s.loop).length, 0);
});
test('Les bruitages désactivés restent muets ; le panoramique et la polyphonie sont bornés', async () => {
  const a = engine(); await a.unlock(); a.sound('fire', false); assert.equal(a.voices.size, 0);
  a.sound('fire', true, 20); assert.equal([...a.voices][0].position.pan.value, .75);
  for (let i = 0; i < 100; i++) a.sound('correct'); assert.equal(a.voices.size, 18);
  a.stop(); for (const voice of a.voices) assert.ok(voice.source.stoppedAt >= 0);
  for (const voice of [...a.voices]) voice.source.onended(); assert.equal(a.voices.size, 0);
});
test('Volume nul : pas de boucle inutile ; un redémarrage ne conserve pas la voix précédente', async () => {
  const a = engine(); await a.unlock(); a.setAmbient(true, 0, true); assert.equal(a.music, null);
  a.setAmbient(true, 100, true); const old = a.music.source; a.stop(); a.setAmbient(true, 18, true);
  assert.equal(a.music.source.offset, 0); assert.ok(old.stoppedAt >= 0); assert.notEqual(a.music.source, old);
});
test('Le fondu de boucle atténue la discontinuité sans modifier l’original', () => {
  const c = new Context(), original = c.createBuffer(1, 300, 100), data = original.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = i / data.length;
  const before = Float32Array.from(data), loop = loopBuffer(c, original), out = loop.getChannelData(0);
  assert.equal(loop.length, 240); assert.ok(Math.abs(out[0] - out.at(-1)) < .08); assert.deepEqual(data, before);
});
test('Explosion : roche texturée, feu, étincelles et poussière ; variante réduite sans projections', () => {
  const normal = createExplosion(100, 200, 250, 180, 'correct', false, () => .4);
  assert.deepEqual([...new Set(normal.particles.map(p => p.kind))].sort(), ['flame', 'rock', 'smoke', 'spark']);
  const small = createExplosion(100, 200, 250, 180, 'correct', true); assert.equal(small.particles.length, 0); assert.ok(small.lifetime <= .3);
  for (const p of normal.particles) { const at = particlePosition(p, .5, normal.scale); assert.ok(Number.isFinite(at.x) && Number.isFinite(at.y)); }
});
test('Explosions : limite de charge, pause et suppression des effets terminés', () => {
  const field = new ExplosionField(); for (let i = 0; i < 100; i++) field.add(i, i, 250, 180, 'correct');
  assert.equal(field.bursts.length, 8); assert.equal(field.bursts[0].x, 92);
  const before = JSON.stringify(field.bursts); field.advance(0); assert.equal(JSON.stringify(field.bursts), before);
  field.advance(2); assert.equal(field.bursts.length, 0);
});
