// Giriş noktası: durumu yükler, dünyayı kurar, arayüzü bağlar ve ana döngüyü başlatır
import * as THREE from 'three';
import { S, B, loadState, save, wipeSave } from './state.js';
import { $ } from './utils.js';
import { renderer, scene, camera, resizeRenderer } from './engine/scene.js';
import { updatePuffs } from './engine/fx.js';
import { buildStreet, buildRival, updateStreet } from './world/street.js';
import { buildUnits, updateUnits, refreshMenuBoard } from './world/units.js';
import { setDayLight, applyWeather, updateWeather } from './world/weather.js';
import { rebuildWorld, switchBranch } from './sim/branches.js';
import { recomputeBounds, loadItems, items, tileCenter, cleanItem } from './sim/grid.js';
import { assignBaristas, syncWorkers, genCandidates } from './sim/staff.js';
import { genRegulars, scheduleRegulars } from './sim/regulars.js';
import { simulate, rollWeather, endDay, startDay } from './sim/day.js';
import { people } from './sim/people.js';
import { refreshUI } from './ui/hud.js';
import { renderPanel, sheet } from './ui/panels.js';
import { showReport, showIntro, showNews, isModalOpen } from './ui/modal.js';
import { initInput } from './ui/input.js';
import { updateArt } from './ui/minigame.js';
import { itemTag, placeEl } from './ui/overlay.js';
import { takePhoto } from './ui/photo.js';

// ---- durum ve dünya ----
const isNew = loadState();
if (isNew) S.weather.tomorrow = rollWeather(2);
for (const b of S.branches) { if (!b.regulars.length) genRegulars(b); if (!b.candidates.length) genCandidates(b); }
recomputeBounds(); buildStreet(); buildUnits(); loadItems(); assignBaristas(); syncWorkers(); buildRival(); applyWeather(); refreshMenuBoard();
if (B().regDay !== S.day) scheduleRegulars();

// ---- hız, duraklat, fotoğraf, klavye ----
let speed = 1, lastSpeed = 1;
const SPEEDS = [1, 2, 4];
function setSpeed(v) {
  speed = v; if (v) lastSpeed = v;
  $('pauseBtn').textContent = v ? '⏸' : '▶';
  $('pauseBtn').classList.toggle('paused', !v);
  $('speedBtn').textContent = (v || lastSpeed) + '×';
}
$('pauseBtn').onclick = () => setSpeed(speed ? 0 : lastSpeed);
$('speedBtn').onclick = () => setSpeed(SPEEDS[(SPEEDS.indexOf(lastSpeed) + 1) % SPEEDS.length]);
$('btnPhoto').onclick = () => takePhoto();
initInput({ setSpeed, getSpeed: () => speed });

// ---- yerleşim ----
function layout() { resizeRenderer(); }
addEventListener('resize', layout); layout();
setDayLight(S.time / 60);
refreshUI();
if (S.phase === 'report') showReport();
else if (!S.introSeen) showIntro();
else if (!S.news3) showNews();

// ---- ana döngü ----
function updateTags() {
  for (const it of items) {
    if (it.seats) itemTag(it, it.seats.some(s => s.dirty) && !it.cleaner ? '🧽' : '');
    if (it.tagEl && it.tagEl.style.display !== 'none') placeEl(it.tagEl, tileCenter(it.i, it.j).setY(it.type === 'bar' ? 1.05 : 0.75));
  }
  for (const p of people) p.placeBubble();
}
let uiT = 0, saveT = 0;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const raw = Math.min(clock.getDelta(), 0.1);
  const dt = isModalOpen() ? 0 : raw * speed;
  if (dt > 0 && S.phase !== 'report') simulate(dt);
  updateStreet(dt); updateUnits(dt); updatePuffs(dt); updateWeather(raw); updateArt();
  setDayLight(S.time / 60);
  updateTags();
  if ((uiT += raw) > 0.3) { uiT = 0; refreshUI(); if (sheet) renderPanel(); }
  if ((saveT += raw) > 5) { saveT = 0; save(); }
  renderer.render(scene, camera);
});
addEventListener('beforeunload', save);
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// test için: ?debug ile konsoldan erişim
if (new URLSearchParams(location.search).has('debug')) {
  window.G = { S, B, simulate, endDay, startDay, setSpeed, people: () => people, items: () => items,
    cleanAll() { for (const it of items) cleanItem(it); },
    reset() { wipeSave(); location.reload(); },
    weather(w) { S.weather.today = w; applyWeather(); }, rebuildWorld, switchBranch, buildUnits,
    run(sec, step = 0.05) { for (let t = 0; t < sec && S.phase !== 'report'; t += step) simulate(step); } };
}
