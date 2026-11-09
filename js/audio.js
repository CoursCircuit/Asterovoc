/* © CoursCircuit. Fichiers audio CC0 embarqués : Kenney et wipics, crédits dans assets/audio/. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AsterovocAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const SOUND_FILES = Object.freeze({ ambience: 'ambience.mp3', fire: 'fire.ogg', explosionA: 'explosion-a.ogg', explosionB: 'explosion-b.ogg', missed: 'missed.ogg', bonus: 'bonus.ogg' });
  const decodedBanks = new WeakMap();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function loopBuffer(context, original) {
    // La fin se fond dans le début : aucune coupure au retour de la boucle.
    const overlap = Math.min(Math.round(original.sampleRate * .6), Math.floor(original.length / 4));
    const length = original.length - overlap, output = context.createBuffer(original.numberOfChannels, length, original.sampleRate);
    for (let channel = 0; channel < original.numberOfChannels; channel++) {
      const from = original.getChannelData(channel), to = output.getChannelData(channel);
      to.set(from.subarray(overlap, original.length - overlap));
      for (let i = 0; i < overlap; i++) {
        const t = i / overlap * Math.PI / 2;
        to[length - overlap + i] = from[original.length - overlap + i] * Math.cos(t) + from[i] * Math.sin(t);
      }
    }
    return output;
  }
  class SpaceAudio {
    constructor(Context = root.AudioContext || root.webkitAudioContext, bank = root.AsterovocAudioSamples) {
      this.Context = Context; this.bank = bank; this.context = null; this.buffers = null; this.ready = null;
      this.ambientBus = null; this.effectsBus = null; this.music = null; this.musicOffset = 0; this.voices = new Set();
      this.active = false; this.ambientEnabled = false; this.volume = 0; this.generation = 0; this.explosionIndex = 0;
    }
    ensureContext() {
      if (this.context && this.context.state !== 'closed' && this.ambientBus) return;
      const c = this.context && this.context.state !== 'closed' ? this.context : new this.Context(); this.context = c;
      this.music = null; this.musicOffset = 0; this.voices.clear();
      this.ambientBus = c.createGain(); this.ambientBus.gain.value = 0;
      this.effectsBus = c.createGain(); this.effectsBus.gain.value = .9;
      const compressor = c.createDynamicsCompressor(), master = c.createGain();
      compressor.threshold.value = -12; compressor.knee.value = 18; compressor.ratio.value = 8; compressor.attack.value = .003; compressor.release.value = .18;
      master.gain.value = .8; this.ambientBus.connect(compressor); this.effectsBus.connect(compressor); compressor.connect(master).connect(c.destination);
    }
    loadSamples() {
      if (this.ready) return this.ready;
      this.ensureContext();
      if (!this.bank) return Promise.resolve(false);
      let pending = decodedBanks.get(this.bank);
      if (!pending) {
        const c = this.context;
        pending = Promise.all(Object.keys(SOUND_FILES).map(async key => {
          const text = root.atob(this.bank[key]), bytes = Uint8Array.from(text, c => c.charCodeAt(0));
          const decoded = await c.decodeAudioData(bytes.buffer);
          return [key, key === 'ambience' ? loopBuffer(c, decoded) : decoded];
        })).then(entries => Object.fromEntries(entries));
        decodedBanks.set(this.bank, pending);
        pending.catch(() => decodedBanks.delete(this.bank));
      }
      this.ready = pending.then(buffers => { this.buffers = buffers; this.syncAmbient(); return true; }).catch(error => {
        console.warn('Les fichiers audio n’ont pas pu être chargés.', error.message); this.ready = null; return false;
      });
      return this.ready;
    }
    unlock() {
      try {
        this.ensureContext();
        const resumed = this.context.state === 'suspended' ? this.context.resume() : Promise.resolve();
        return Promise.all([resumed, this.loadSamples()]).then(([, loaded]) => loaded).catch(() => false);
      } catch { return Promise.resolve(false); }
    }
    setAmbient(enabled, volume, active) {
      this.ambientEnabled = !!enabled; this.volume = Number.isFinite(volume) ? clamp(volume, 0, 100) / 100 : 0; this.active = !!active;
      this.syncAmbient();
    }
    syncAmbient() {
      const c = this.context; if (!c || c.state === 'closed' || !this.ambientBus) return;
      const wanted = this.active && this.ambientEnabled && this.volume > 0, now = c.currentTime;
      this.ambientBus.gain.cancelScheduledValues(now); this.ambientBus.gain.setTargetAtTime(wanted ? this.volume * .55 : 0, now, wanted ? .18 : .06);
      if (!wanted && this.music) {
        const { source, gain, startedAt, offset } = this.music;
        this.musicOffset = (offset + now - startedAt) % source.buffer.duration;
        gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, .035); source.stop(now + .2); this.music = null;
      } else if (wanted && !this.music && this.buffers) {
        const source = c.createBufferSource(), gain = c.createGain(); source.buffer = this.buffers.ambience; source.loop = true;
        source.connect(gain).connect(this.ambientBus); gain.gain.value = 0; gain.gain.setTargetAtTime(1, now, .15);
        const offset = this.musicOffset % source.buffer.duration;
        this.music = { source, gain, startedAt: now, offset }; source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start(now, offset);
      }
    }
    sound(kind, enabled = true, pan = 0) {
      const c = this.context; if (!enabled || !c || c.state !== 'running' || !this.buffers) return;
      const key = kind === 'correct' ? (++this.explosionIndex % 2 ? 'explosionA' : 'explosionB') : kind;
      const buffer = this.buffers[key]; if (!buffer) return;
      // Les sons se superposent sans retarder les tirs ; le nombre de voix est borné.
      if (this.voices.size >= 18) return;
      const source = c.createBufferSource(), gain = c.createGain(), position = c.createStereoPanner(); source.buffer = buffer;
      source.playbackRate.value = kind === 'fire' ? .97 + Math.random() * .06 : kind === 'correct' ? .95 + Math.random() * .1 : 1;
      gain.gain.value = { fire: .23, correct: .42, missed: .18, bonus: .28 }[kind] || .2;
      position.pan.value = Number.isFinite(pan) ? clamp(pan, -.75, .75) : 0;
      source.connect(gain).connect(position).connect(this.effectsBus);
      const voice = { source, gain, position }; this.voices.add(voice);
      source.onended = () => { source.disconnect(); gain.disconnect(); position.disconnect(); this.voices.delete(voice); };
      source.start();
    }
    stop() {
      this.generation++; this.setAmbient(false, this.volume * 100, false); this.musicOffset = 0;
      const c = this.context; if (!c || c.state === 'closed') return;
      for (const { source, gain } of this.voices) {
        gain.gain.cancelScheduledValues(c.currentTime); gain.gain.setTargetAtTime(0, c.currentTime, .02);
        try { source.stop(c.currentTime + .1); } catch { /* Déjà terminé. */ }
      }
    }
  }
  return { SpaceAudio, SOUND_FILES, loopBuffer };
});
