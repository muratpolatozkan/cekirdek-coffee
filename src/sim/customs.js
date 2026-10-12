// Tarif atölyesi: oyuncunun kendi içeceği (baz + süt + aroma) menüye gerçek bir içecek olarak eklenir
import { DRINKS, BASES, MILKS, FLAVORS } from '../config.js';
import { S } from '../state.js';

const ADJ = { sade: '', karamel: 'Karamelli', findik: 'Fındıklı', tarcin: 'Tarçınlı', lavanta: 'Lavantalı', tahin: 'Tahinli', lokum: 'Lokumlu' };
export function autoName(c) {
  const kind = c.base === 'coldbrew' ? 'Cold Brew' : c.base === 'filtre' ? 'Filtre' : c.milk === 'yok' ? 'Espresso' : 'Latte';
  return [ADJ[c.flavor], c.milk === 'yulaf' ? 'Yulaflı' : '', kind].filter(Boolean).join(' ');
}
export function customDef(c) {
  const b = BASES[c.base], m = MILKS[c.milk], f = FLAVORS[c.flavor], likes = {};
  for (const src of [f.likes, m.likes]) for (const [k, v] of Object.entries(src)) likes[k] = (likes[k] || 0) + v;
  return {
    name: c.name || autoName(c), icon: c.flavor === 'sade' ? b.icon : f.icon,
    base: b.base + m.add + f.add, beans: b.beans, milk: m.milk, extra: f.extra + m.extra,
    time: b.time + (m.milk ? 1.5 : 0) + (c.flavor === 'sade' ? 0 : .5), temp: b.temp,
    sig: true, custom: true, likes, desc: `${b.name} · ${m.name} · ${f.name}`,
  };
}
// kayıttaki tarifleri içecek listesine ekle (oyun açılırken ve yeni tarifte)
export function registerCustoms() {
  for (const c of S.customs) {
    DRINKS[c.id] = customDef(c);
    if (!S.menu[c.id]) S.menu[c.id] = { on: true, price: DRINKS[c.id].base, sweet: 1 };
  }
}
export function createCustom(spec) {
  const id = 'c' + S.nextId++;
  S.customs.push({ id, ...spec, name: (spec.name || autoName(spec)).slice(0, 30) });
  registerCustoms();
  return id;
}
