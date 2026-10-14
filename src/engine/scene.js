// Renderer, sahne, izometrik kamera ve ana ışıklar
import * as THREE from 'three';
import { GW, UD, UW } from '../config.js';
import { clamp, V } from '../utils.js';

export const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // gölgeler ana döngüde seyrek güncellenir
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xefe7dc);

export const CAM_OFFSET = new THREE.Vector3(30, 30, 30);    // (1,1,1) yönü = gerçek izometrik
// dikey ekranda kamera daha yukarıdan bakar: dükkan ekranın boyunu daha iyi doldurur, cadde daha az yer kaplar
const ISO_Y = 30, PORTRAIT_Y = 48;
export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
export let camTarget = V(UW * 1.5, UD / 2 + 1);
export function setCamTarget(t) {
  t.x = clamp(t.x, -4, GW + 4); t.z = clamp(t.z, -1, UD + 8); t.y = 0;
  camera.position.copy(t).add(CAM_OFFSET); camera.lookAt(t); camera.updateMatrixWorld(); camTarget = t;
}
export const focusShop = () => { setCamTarget(V(UW * 1.5, UD / 2 + 1)); requestRender(); };
setCamTarget(camTarget.clone());
camera.zoom = 1.25;

export function resizeRenderer() {
  const a = innerWidth / innerHeight, halfH = Math.max(6.2, 5.6 / a);
  const y = a < 0.8 ? PORTRAIT_Y : ISO_Y;
  if (CAM_OFFSET.y !== y) { CAM_OFFSET.y = y; setCamTarget(camTarget.clone()); }
  camera.left = -halfH * a; camera.right = halfH * a; camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderWanted = true;
}

export const hemi = new THREE.HemisphereLight(0xffffff, 0xcdb79c, 1.6);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff0dd, 2.2);
sun.target.position.set(GW / 2, 0, UD / 2 + 2);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 80 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

// sadece bir şey değiştiğinde çizmek için: değişiklik yapan kod requestRender() çağırır
let renderWanted = true;
export const requestRender = () => { renderWanted = true; };
export const takeRenderRequest = () => { const w = renderWanted; renderWanted = false; return w; };
// pil tasarrufu: düşük çözünürlük ve küçük gölge haritası
export function applyRendererQuality(battery) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, battery ? 1.25 : IS_TOUCH ? 1.5 : 2));
  const size = battery ? 1024 : 2048;
  if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  renderer.setSize(innerWidth, innerHeight);
  requestRender();
}
export const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
export const raycaster = new THREE.Raycaster();
const tmpV = new THREE.Vector3(), ndc = new THREE.Vector2();
export function toScreen(v) { tmpV.copy(v).project(camera); return { x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight }; }
export function groundAt(clientX, clientY) {
  ndc.set(clientX / innerWidth * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const p = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, p) ? p : null;
}
// ekranda sürükleme: kamera düzlemindeki kaymayı zemine izdüşür
export function panBy(dx, dy) {
  const upp = (camera.top - camera.bottom) / camera.zoom / innerHeight;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
  const t = camTarget.clone().addScaledVector(right, -dx * upp).addScaledVector(up, dy * upp);
  const ray = new THREE.Ray(t.clone().add(CAM_OFFSET), CAM_OFFSET.clone().negate().normalize());
  const hit = new THREE.Vector3();
  if (ray.intersectPlane(groundPlane, hit)) setCamTarget(hit);
  requestRender();
}
export function setZoom(z) { camera.zoom = clamp(z, 0.5, 3); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); requestRender(); }
