// Pil tasarrufu modu: düşük çözünürlük, 30 kare/sn, seyrek gölge, gerçek ışıkların çoğu kapalı
import { S } from './state.js';
import { Q } from './engine/perf.js';
import { applyRendererQuality } from './engine/scene.js';
import { setStreetLightsEnabled } from './world/street.js';
import { buildUnits } from './world/units.js';
import { items } from './sim/grid.js';

export function applyQuality() {
  const bat = !!S.battery;
  Object.assign(Q, { battery: bat, peopleShadows: !bat, lampLights: !bat, fps: bat ? 30 : 60 });
  applyRendererQuality(bat);
  setStreetLightsEnabled(!bat);
  for (const it of items) it.mesh.traverse(o => { if (o.isLight) o.visible = Q.lampLights; });
  buildUnits();
}
