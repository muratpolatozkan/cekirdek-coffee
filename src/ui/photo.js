// Fotoğraf modu: sahnenin temiz bir görüntüsünü alır, altına dükkan adını ekler
import { renderer, scene, camera } from '../engine/scene.js';
import { S, B } from '../state.js';
import { HOODS } from '../config.js';
import { rating } from '../sim/economy.js';
import { showPhoto } from './modal.js';

export function takePhoto() {
  renderer.render(scene, camera);           // WebGL tamponu silinmeden hemen kopyala
  const src = renderer.domElement, w = src.width, h = src.height, strip = Math.round(h * .09);
  const c = document.createElement('canvas'); c.width = w; c.height = h + strip;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.fillStyle = '#fffdf9'; g.fillRect(0, h, w, strip);
  g.textBaseline = 'middle';
  g.fillStyle = '#2a211b'; g.font = `800 ${Math.round(strip * .42)}px system-ui, sans-serif`;
  g.fillText(`${S.brand.icon} ${S.brand.name} COFFEE`, strip * .4, h + strip / 2);
  g.textAlign = 'right'; g.fillStyle = '#7a6c60'; g.font = `500 ${Math.round(strip * .3)}px system-ui, sans-serif`;
  g.fillText(`${HOODS[B().hood].name} · Gün ${S.day} · ★ ${rating().toFixed(1)}`, w - strip * .4, h + strip / 2);
  showPhoto(c.toDataURL('image/jpeg', .9));
}
