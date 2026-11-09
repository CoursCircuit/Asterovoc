/* Transforme sans modification les fichiers audio en banque JS lisible aussi en file://. */
const fs = require('node:fs');
const path = require('node:path');
const { SOUND_FILES } = require('../js/audio.js');
const folder = path.join(__dirname, '..', 'assets', 'audio');
const samples = Object.fromEntries(Object.entries(SOUND_FILES).map(([key, file]) => [key, fs.readFileSync(path.join(folder, file)).toString('base64')]));
const header = '/* Audio CC0 : Kenney et wipics. Généré par scripts/pack-audio.cjs ; crédits et originaux dans ce dossier. */\n';
fs.writeFileSync(path.join(folder, 'samples.js'), header + '(function(root){const samples=' + JSON.stringify(samples) + ';if(typeof module==="object"&&module.exports)module.exports=samples;else root.AsterovocAudioSamples=samples;})(typeof globalThis!=="undefined"?globalThis:this);\n');
console.log('Banque audio prête : ' + Object.keys(samples).length + ' fichiers.');
