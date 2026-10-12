// Ses efektleri ve lo-fi müzik: hepsi WebAudio ile anlık üretilir, ses dosyası yok
import { S } from './state.js';

let actx = null, userGesture = false, lastChime = 0, lastCoin = 0;
function ctx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
// iOS sesi ancak kullanıcı dokunuşu içinde açılırsa çalar
addEventListener('pointerdown', () => {
  userGesture = true;
  if (S.sound || S.music) ctx();
  if (S.music && !music) startMusic();
}, true);

function tone(freq, start, dur, vol, type = 'sine', dest) {
  const a = ctx(); if (!a) return;
  const t0 = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest || a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
const sfxOk = () => S.sound && userGesture;
export function chime() { const n = performance.now(); if (!sfxOk() || n - lastChime < 500) return; lastChime = n; tone(1318.5, 0, .7, .035, 'triangle'); tone(1046.5, .13, .9, .035, 'triangle'); }
export function coin() { const n = performance.now(); if (!sfxOk() || n - lastCoin < 160) return; lastCoin = n; tone(1567, 0, .12, .02, 'triangle'); tone(2093, .06, .2, .018, 'triangle'); }
export function sparkle() { if (!sfxOk()) return; [1568, 1976, 2349, 3136].forEach((f, k) => tone(f, k * .07, .4, .025, 'sine')); }
export function thud() { if (!sfxOk()) return; tone(180, 0, .25, .05, 'sine'); }

// ---- lo-fi müzik: Fmaj7 – Em7 – Dm7 – Cmaj7, 72 bpm, yumuşak piyano + davul + plak cızırtısı ----
let music = null;
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const SCALE = [72, 74, 76, 79, 81, 84];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function noiseBuffer(a, sec) {
  const b = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
export function startMusic() {
  if (music || !userGesture) return;
  const a = ctx(); if (!a) return;
  const master = a.createGain(); master.gain.value = 0.0001; master.gain.linearRampToValueAtTime(0.5, a.currentTime + 2);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
  lp.connect(master).connect(a.destination);
  const nb = noiseBuffer(a, 2);
  // plak cızırtısı
  const crackle = a.createBufferSource(); crackle.buffer = nb; crackle.loop = true;
  const cf = a.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 3000;
  const cg = a.createGain(); cg.gain.value = .006;
  crackle.connect(cf).connect(cg).connect(master); crackle.start();
  const beat = 60 / 72;
  let next = a.currentTime + .1, step = 0;
  const pad = (m, t, d) => {
    for (const [type, det, vol] of [['sine', 0, .018], ['triangle', 4, .008]]) {
      const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = hz(m); o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .4); g.gain.setTargetAtTime(0, t + d - .6, .3);
      o.connect(g).connect(lp); o.start(t); o.stop(t + d + .5);
    }
  };
  const keys = (m, t) => {
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.03, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
    o.connect(g).connect(lp); o.start(t); o.stop(t + 1.3);
  };
  const kick = t => {
    const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + .18);
    g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.0001, t + .3); o.connect(g).connect(master); o.start(t); o.stop(t + .35);
  };
  const hiss = (t, vol, f, d) => {
    const s = a.createBufferSource(); s.buffer = nb; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f;
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(bp).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + d + .05);
  };
  const timer = setInterval(() => {
    while (next < a.currentTime + .4) {
      const bar = Math.floor(step / 8) % 4, eighth = step % 8, t = next;
      if (eighth === 0) CHORDS[bar].forEach(m => pad(m, t, beat * 4));
      if (eighth === 0 || eighth === 5) kick(t);
      if (eighth === 2 || eighth === 6) hiss(t, .03, 1800, .18);
      hiss(t + (eighth % 2 ? beat * .08 : 0), .008, 8000, .05);
      if (Math.random() < .35) keys(SCALE[Math.floor(Math.random() * SCALE.length)] - (Math.random() < .3 ? 12 : 0), t);
      next += beat / 2; step++;
    }
  }, 100);
  music = { master, timer, crackle };
}
export function stopMusic() {
  if (!music) return;
  const m = music; music = null;
  clearInterval(m.timer);
  m.master.gain.setTargetAtTime(0, actx.currentTime, .3);
  setTimeout(() => { try { m.crackle.stop(); m.master.disconnect(); } catch (e) {} }, 1500);
}
export function setMusic(on) { S.music = on; if (on) startMusic(); else stopMusic(); }
