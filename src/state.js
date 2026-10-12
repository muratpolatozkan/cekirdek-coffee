// Oyun durumu (S) ve kayıt. Şube bazlı veriler S.branches içinde, B() aktif şubeyi verir.
import { SAVE_KEY, OLD_SAVE_KEY, META_KEY, HOODS, DRINKS, BEANS, FOOD, DAY_START, START_ITEMS, SEASONS, SEASON_DAYS, NAMES } from './config.js';
import { pick } from './utils.js';

export const S = {};
export const B = () => S.branches[S.activeBranch];
export const saveHooks = [];               // kaydetmeden önce çalışır (ör. eşyaları duruma yazmak)
let resetting = false;                     // sıfırlarken sayfa kapanışındaki otomatik kayıt eski oyunu geri yazmasın
export const setResetting = () => { resetting = true; };

// franchise yıldızları sıfırlamadan sonra da kalır
export const meta = { stars: 0, runs: 0 };
try { Object.assign(meta, JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch (e) {}
export function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }

export const seasonOf = day => SEASONS[Math.floor((day - 1) / SEASON_DAYS) % SEASONS.length];

export function newToday() {
  return { revenue: 0, foodRev: 0, tips: 0, served: 0, angry: 0, turned: 0, refused: 0, stock: 0, invest: 0, fines: 0, gifts: 0, sats: [], arts: 0 };
}
function branchDefaults(hood) {
  const H = HOODS[hood];
  return {
    hood, age: 0, served: 0,
    units: H.units.map(u => u.kind === 'ours' ? 'own' : u.kind === 'empty' ? 'rent' : 'occupied'),
    items: START_ITEMS.map(x => ({ ...x })), staff: [], candidates: [],
    beans: Object.fromEntries(Object.keys(BEANS).map(k => [k, { r: k === 'brezilya' ? 150 : 0, h: 0, g: 0 }])),
    activeBean: 'brezilya', milk: 30, croissant: 0, croissantOrder: 10,
    reviews: [], machine: 1, roast: 'orta',
    decor: { wall: 'krem', floor: 'mese', slots: {} }, terrace: false, civic: 0,
    regulars: [], todayRegulars: [], quests: [], questTimer: 2,
    rival: { active: false, closed: false, health: 100, rating: 3.8, promo: 0, share: null },
    today: newToday(), histNet: [],
  };
}
const ownerStaff = () => ({ id: 1, name: 'Sen', role: 'barista', speed: 1, charm: 1, wage: 0, lvl: 1, owner: true, fatigue: 0, morale: 80, trait: null });
export function newBranch(hood, withOwner) {
  const b = branchDefaults(hood);
  b.staff = withOwner ? [ownerStaff()]
    : [{ id: S.nextId++, name: pick(NAMES), role: 'barista', speed: 1.05, charm: 1.05, wage: 380, lvl: 1, fatigue: 0, morale: 75, trait: null, manager: true }];
  return b;
}
export function newState() {
  return {
    v: 3, money: 2500 + meta.stars * 1000, day: 1, time: DAY_START, phase: 'open', served: 0,
    ads: 0, autoSupply: false, loyaltyCard: false, geisha: false,
    menu: Object.fromEntries(Object.entries(DRINKS).map(([id, d]) => [id, { on: !!d.start, price: d.base, sweet: 1 }])),
    foodPrice: FOOD.base,
    market: Object.fromEntries(Object.keys(BEANS).map(k => [k, 1])),
    marketPrev: Object.fromEntries(Object.keys(BEANS).map(k => [k, 1])),
    weather: { today: 'gunes', tomorrow: 'gunes' }, event: null, pevent: null, buzz: 0, dayLog: [],
    history: [], sales: {}, typeCounts: {}, perfectArts: 0, eventsHeld: 0,
    brand: { name: 'ÇEKİRDEK', color: 'yesil', icon: '☕' },
    goalsDone: [], lastReport: null, sound: true, music: true, latteArt: true, introSeen: false, tipsShown: {},
    nextId: 2, activeBranch: 0, branches: [],
  };
}

function normalizeBranch(b) {
  const d = branchDefaults(b.hood || 'cinar');
  const n = { ...d, ...b, beans: { ...d.beans, ...b.beans }, decor: { ...d.decor, ...b.decor, slots: { ...(b.decor?.slots || {}) } },
    rival: { ...d.rival, ...b.rival }, today: { ...newToday(), ...b.today } };
  n.staff = (n.staff || []).map(s => ({ fatigue: 0, morale: 70, trait: null, ...s, breakT: 0 }));
  return n;
}
function normalize(L) {
  const base = newState();
  const menu = {};
  for (const id of Object.keys(DRINKS)) menu[id] = { ...base.menu[id], ...(L.menu?.[id] || {}) };
  return { ...base, ...L, menu, market: { ...base.market, ...L.market }, marketPrev: { ...base.marketPrev, ...L.marketPrev },
    weather: { ...base.weather, ...L.weather }, brand: { ...base.brand, ...L.brand },
    branches: (L.branches || []).map(normalizeBranch) };
}
// v2 (tek dükkanlı sürüm) kaydını yeni yapıya taşı
function migrateV2(L) {
  const st = newState(), b = branchDefaults('cinar');
  Object.assign(b, {
    units: L.units || b.units, items: L.items || b.items, staff: L.staff || [ownerStaff()],
    beans: { ...b.beans, ...L.beans }, activeBean: L.activeBean || 'brezilya', milk: L.milk ?? 30,
    croissant: L.croissant || 0, croissantOrder: L.croissantOrder ?? 10, reviews: L.reviews || [], machine: L.machine || 1,
    age: L.day || 1, served: L.served || 0, today: { ...newToday(), ...L.today },
  });
  Object.assign(st, {
    money: L.money ?? st.money, day: L.day || 1, time: L.time ?? DAY_START, phase: L.phase === 'report' ? 'report' : 'open',
    served: L.served || 0, ads: L.ads || 0, autoSupply: !!L.autoSupply, geisha: !!L.geisha, goalsDone: L.goalsDone || [],
    lastReport: L.lastReport || null, sound: L.sound ?? true, introSeen: !!L.introSeen, tipsShown: L.tipsShown || {},
    foodPrice: L.foodPrice || FOOD.base, nextId: Math.max(L.nextId || 2, 50),
  });
  for (const id of Object.keys(L.menu || {})) if (st.menu[id]) Object.assign(st.menu[id], L.menu[id]);
  st.branches = [b];
  return normalize(st);
}

// yeni oyunsa true döner
export function loadState() {
  let st = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) st = normalize(JSON.parse(raw));
    else { const old = localStorage.getItem(OLD_SAVE_KEY); if (old) st = migrateV2(JSON.parse(old)); }
  } catch (e) { st = null; }
  if (st && st.branches.length) { Object.assign(S, st); return false; }
  Object.assign(S, newState());
  S.branches.push(newBranch('cinar', true));
  return true;
}
export function save() {
  if (resetting || !S.branches) return;
  for (const h of saveHooks) h();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}
export function wipeSave() {
  setResetting();
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_SAVE_KEY); } catch (e) {}
}
