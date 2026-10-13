// Giriş noktası: durumu yükler, dünyayı kurar, arayüzü bağlar ve ana döngüyü başlatır
import * as THREE from 'three';
import { S, B, loadState, save, wipeSave, onSaveConflict, loadProblem, CHALLENGE } from './state.js';
import { $ } from './utils.js';
import { renderer, scene, camera, resizeRenderer, takeRenderRequest, requestRender } from './engine/scene.js';
import { updatePuffs } from './engine/fx.js';
import { Q } from './engine/perf.js';
import { buildStreet, buildRival, updateStreet } from './world/street.js';
import { buildUnits, updateUnits, refreshMenuBoard } from './world/units.js';
import { setDayLight, applyWeather, updateWeather, precipActive } from './world/weather.js';
import { rebuildWorld, switchBranch } from './sim/branches.js';
import { recomputeBounds, loadItems, items, tileCenter, cleanItem } from './sim/grid.js';
import { assignBaristas, syncWorkers, genCandidates } from './sim/staff.js';
import { genRegulars, scheduleRegulars } from './sim/regulars.js';
import { simulate, rollWeather, endDay, startDay } from './sim/day.js';
import { people } from './sim/people.js';
import { registerCustoms } from './sim/customs.js';
import { ensureDaily, level, levelTitle, unlocksOf } from './sim/progress.js';
import { planDay } from './sim/events.js';
import { offlineEarnings } from './sim/offline.js';
import { applyQuality } from './quality.js';
import { UNLOCK_NAMES, CATALOG } from './config.js';
import { refreshUI } from './ui/hud.js';
import { renderPanel, sheet, openSheet } from './ui/panels.js';
import { showReport, showIntro, showChangelog, showChallengeIntro, showFranchise, showOffline, showLevelUp, showConflict, showLoadProblem, isModalOpen } from './ui/modal.js';
import { initInput } from './ui/input.js';
import { updateArt } from './ui/minigame.js';
import { itemTag, placeEl, confetti } from './ui/overlay.js';
import { takePhoto } from './ui/photo.js';
import { toast } from './ui/toast.js';
import { updateTutorial } from './ui/tutorial.js';
import { updatePlots } from './ui/plots.js';
import { sparkle } from './audio.js';
import { setupChallenge } from './sim/challenge.js';
import { checkAch } from './sim/achievements.js';
import { canFranchise } from './sim/prestige.js';
import { LATEST, seenVersion, markSeen } from './changelog.js';

// ---- durum ve dünya ----
const isNew = loadState();
if (CHALLENGE) setupChallenge();
registerCustoms();
Object.assign(Q, { battery: !!S.battery, peopleShadows: !S.battery, lampLights: !S.battery, fps: S.battery ? 30 : 60 });
if (isNew) { S.weather.tomorrow = rollWeather(2); planDay(); }
if (S.levelSeen === 99) S.levelSeen = level();
ensureDaily();
for (const b of S.branches) { if (!b.regulars.length) genRegulars(b); if (!b.candidates.length) genCandidates(b); }
recomputeBounds(); buildStreet(); loadItems(); assignBaristas(); syncWorkers(); buildRival(); applyWeather();
applyQuality();          // birimleri de kurar
refreshMenuBoard();
if (B().regDay !== S.day) scheduleRegulars();

// ---- hız, duraklat, fotoğraf, klavye ----
let speed = 1, lastSpeed = 1;
const SPEEDS = [1, 2, 4];
function setSpeed(v) {
  speed = v; if (v) lastSpeed = v;
  $('pauseBtn').textContent = v ? '⏸' : '▶';
  $('pauseBtn').classList.toggle('paused', !v);
  $('speedBtn').textContent = (v || lastSpeed) + '×';
  requestRender();
}
$('pauseBtn').onclick = () => setSpeed(speed ? 0 : lastSpeed);
$('speedBtn').onclick = () => setSpeed(SPEEDS[(SPEEDS.indexOf(lastSpeed) + 1) % SPEEDS.length]);
$('btnPhoto').onclick = () => takePhoto();
$('eventChip').onclick = () => toast($('eventChip').title, 3500);
$('clock').onclick = () => toast($('clock').title, 2500);
$('stock').onclick = () => openSheet('shop', 'stok');
$('levelPill').onclick = () => openSheet('more', 'hedef');
$('goalChip').onclick = () => openSheet('more', CHALLENGE ? 'meydan' : 'hedef');
$('money').onclick = () => toast('💰 Paran. Eşya, personel ve stok alırsın. Kira ve maaşlar gün sonunda ödenir.', 4000);
$('rating').onclick = () => toast('⭐ Puanın: müşteri yorumlarının ortalaması. Yükseldikçe caddeden daha çok kişi içeri girer.', 4000);
initInput({ setSpeed, getSpeed: () => speed });

// ---- yerleşim ve açılış pencereleri ----
function layout() { resizeRenderer(); }
addEventListener('resize', layout); layout();
setDayLight(S.time / 60);
refreshUI();
const away = isNew || CHALLENGE ? null : offlineEarnings();
onSaveConflict(() => showConflict());
if (CHALLENGE) showChallengeIntro();
else if (loadProblem) showLoadProblem();
else if (S.phase === 'report') { showReport(); if (away) toast(`🌙 Sen yokken dükkanın +${away.amount.toLocaleString('tr-TR')} ₺ kazandı.`, 4500); }
else if (!S.introSeen) { showIntro(); markSeen(); }
else if (seenVersion() < LATEST) showChangelog();
else if (away) showOffline(away);
if (isNew && !CHALLENGE) markSeen();   // yeni oyuncuya eski sürüm notları gösterilmez

// ---- ana döngü ----
function updateTags() {
  for (const it of items) {
    if (it.seats) itemTag(it, it.seats.some(s => s.dirty) && !it.cleaner ? '🧽' : '');
    if (it.tagEl && it.tagEl.style.display !== 'none') placeEl(it.tagEl, tileCenter(it.i, it.j).setY(it.type === 'bar' ? 1.05 : 0.75));
  }
  for (const p of people) p.placeBubble();
}
// seviye atlayınca kutlama (açık bir pencere varsa kapanınca)
function checkLevelUp() {
  const l = level();
  if (l <= S.levelSeen || isModalOpen()) return;
  const names = [];
  for (let k = S.levelSeen + 1; k <= l; k++) for (const u of unlocksOf(k)) names.push(UNLOCK_NAMES[u] || (u.startsWith('item:') ? `${CATALOG[u.slice(5)].icon} ${CATALOG[u.slice(5)].name}` : u));
  S.levelSeen = l; save();
  showLevelUp(l, levelTitle(l), [...new Set(names)]); confetti(60); sparkle();
}
// franchise şartı ilk kez dolunca haber ver
function checkFranchise() {
  if (S.frOffer || isModalOpen() || S.phase === 'report' || !canFranchise()) return;
  S.frOffer = true; save(); showFranchise(true);
}

let uiT = 0, saveT = 0, shadowT = 0, frameAcc = 0, idleT = 0;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  frameAcc += clock.getDelta();
  // pil tasarrufunda saniyede 30 kare
  if (Q.fps < 60 && frameAcc < 1 / Q.fps - 0.002) return;
  const raw = Math.min(frameAcc, 0.1); frameAcc = 0;
  const dt = isModalOpen() ? 0 : raw * speed;
  if (dt > 0 && S.phase !== 'report') simulate(dt);
  updateStreet(dt); updateUnits(dt); updatePuffs(dt); updateWeather(raw); updateArt();
  setDayLight(S.time / 60);
  updateTags(); updatePlots();
  if ((uiT += raw) > 0.3) { uiT = 0; refreshUI(); if (sheet) renderPanel(); updateTutorial({ speed: () => speed, setSpeed }); checkLevelUp(); checkAch(); checkFranchise(); }
  if ((saveT += raw) > 5) { saveT = 0; save(); }
  // zaman akmıyorsa ve bir değişiklik yoksa seyrek çiz (saniyede 4 kare): pil yemesin ama
  // tarayıcı görüntüyü silerse (iOS'ta panel açılınca / arka plandan dönünce) ekran boş kalmasın
  const wanted = takeRenderRequest();
  idleT += raw;
  if (dt === 0 && !wanted && !precipActive() && idleT < 0.25) return;
  idleT = 0;
  // gölgeleri her karede değil, aralıklarla güncelle
  shadowT += raw;
  if (wanted || shadowT > (Q.battery ? 0.25 : 0.05)) { renderer.shadowMap.needsUpdate = true; shadowT = 0; }
  renderer.render(scene, camera);
});
addEventListener('beforeunload', save);
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); return; }
  // geri dönünce: sen yokken kazanç
  const off = CHALLENGE ? null : offlineEarnings();
  if (off && !isModalOpen()) showOffline(off);
  requestRender(); renderer.shadowMap.needsUpdate = true;
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // yeni sürüm devreye girdi: oyun yeni açıldıysa hemen yenile, oynarken ise haber ver
  const hadSW = !!navigator.serviceWorker.controller, t0 = performance.now();
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadSW) return;
    save();
    if (performance.now() - t0 < 20000 && !isModalOpen()) location.reload();
    else toast('🆕 Yeni sürüm hazır! Oyunu kapatıp açınca gelecek.', 5000);
  });
}
// test için: ?debug ile konsoldan erişim
if (new URLSearchParams(location.search).has('debug')) {
  window.G = { S, B, simulate, endDay, startDay, setSpeed, people: () => people, items: () => items,
    cleanAll() { for (const it of items) cleanItem(it); },
    reset() { wipeSave(); location.reload(); },
    weather(w) { S.weather.today = w; applyWeather(); }, rebuildWorld, switchBranch, buildUnits,
    run(sec, step = 0.05) { for (let t = 0; t < sec && S.phase !== 'report'; t += step) simulate(step); } };
}
