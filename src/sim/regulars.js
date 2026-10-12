// Müdavimler: adı ve hikayesi olan, her gün belli saatte gelen müşteriler
import { REGULARS, REGULAR_STORIES, REGULAR_EMOJI, REGULAR_FAV, REGULAR_HOUR, HOODS, TYPES, NAMES } from '../config.js';
import { S, B } from '../state.js';
import { pick, rand, clamp, weightedPick } from '../utils.js';
import { randomLook } from '../engine/models.js';
import { note } from '../ui/toast.js';
import { floatText } from '../ui/overlay.js';
import { spawnVisitor, addReview } from './people.js';
import { shopOpen } from './economy.js';

const fresh = r => ({ ...r, loyalty: 50, status: 'active', visits: 0, milestone: false });
export function genRegulars(b) {
  const tpl = REGULARS[b.hood];
  if (tpl) { b.regulars = tpl.map((r, k) => fresh({ id: k + 1, ...r, look: { ...randomLook(), ...r.look } })); return; }
  const tm = HOODS[b.hood].typeMult, used = new Set();
  b.regulars = Array.from({ length: 5 }, (_, k) => {
    const type = weightedPick(Object.fromEntries(Object.keys(TYPES).map(t => [t, tm[t] ?? 1])));
    let name; do name = pick(NAMES); while (used.has(name)); used.add(name);
    const [h0, h1] = REGULAR_HOUR[type];
    return fresh({ id: k + 1, name, emoji: REGULAR_EMOJI[type], type, fav: REGULAR_FAV[type], hour: Math.round(rand(h0, h1) * 4) / 4,
      story: pick(REGULAR_STORIES[type]), look: randomLook({ acc: TYPES[type].look.acc }) });
  });
}
export function scheduleRegulars() {
  const b = B();
  b.regDay = S.day;
  b.todayRegulars = b.regulars.filter(r => r.status === 'active' && Math.random() < .35 + r.loyalty / 160)
    .map(r => ({ rid: r.id, at: r.hour * 60 + rand(-20, 20), done: false }));
}
export function updateRegulars() {
  if (!shopOpen()) return;
  for (const t of B().todayRegulars) if (!t.done && S.time >= t.at) {
    t.done = true;
    const r = B().regulars.find(x => x.id === t.rid);
    if (r && r.status === 'active') spawnVisitor(r.type, { regular: r, look: r.look, name: r.name });
  }
}
function changeLoyalty(r, d, pos) {
  if (S.loyaltyCard && d > 0) d *= 1.5;
  r.loyalty = clamp(r.loyalty + d, 0, 100);
  if (pos && Math.round(d)) floatText(`${d >= 0 ? '💚 +' : '💔 '}${Math.round(d)}`, pos, 'heart');
  if (r.loyalty < 15 && r.status === 'active') { r.status = 'lost'; note(`💔 ${r.name} artık gelmiyor. Rakiplere gitmiş olabilir…`); }
  if (r.loyalty >= 90 && !r.milestone) { r.milestone = true; milestone(r); }
}
function milestone(r) {
  if (r.type === 'emekli') {
    for (let k = 0; k < 3; k++) addReview(5, `${r.name} gazetede yazmış: "Burası mahallemizin kalbi." Çok haklı!`, 'Gazete okuru', '📰');
    note(`📰 ${r.name} mahalle gazetesinde senden bahsetti! (+3 harika yorum)`);
  } else if (r.type === 'tutkun') {
    for (let k = 0; k < 4; k++) addReview(5, `${r.name}’ın blogundan geldim, söylediği kadar varmış!`, 'Blog okuru', '🧐');
    note(`🧐 ${r.name} kahve blogunda seni övdü! (+4 harika yorum)`);
  } else if (r.type === 'ofis') {
    S.money += 1500; note(`💼 ${r.name}, şirketinin toplantı kahvelerini sana verdi! (+1.500 ₺)`);
  } else {
    S.buzz = Math.max(S.buzz, 2); note(`📸 ${r.name} seni sosyal medyada paylaştı! 2 gün boyunca cadde daha kalabalık.`);
  }
}
export function onRegularServed(c) {
  const r = c.regular;
  r.visits++;
  changeLoyalty(r, clamp((c.sat - 3.2) * 10, -15, 12) + (c.missedFav ? -10 : 0), c.headPos().setY(1.3));
  if (r.loyalty >= 80 && Math.random() < .3) {
    c.say('Arkadaşımı da getirdim! 😊', 2.5);
    setTimeout(() => { if (shopOpen()) spawnVisitor(r.type, {}); }, 1200);
  }
}
export function onRegularLeft(c, why) { changeLoyalty(c.regular, why === 'angry' ? -15 : -6, c.headPos().setY(1.3)); }
