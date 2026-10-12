// Performans: çok sayıda küçük parçayı birkaç büyük parçada birleştirir (çizim komutu sayısını düşürür)
// ve pil tasarrufu ayarlarını tutar.
import * as THREE from 'three';

// kalite ayarları (applyQuality ile değişir)
export const Q = { battery: false, peopleShadows: true, lampLights: true, fps: 0 };

const vcMats = new Map();
function vcMaterial(r, m) {
  const k = `${r}|${m}`;
  let mat = vcMats.get(k);
  if (!mat) { mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: r, metalness: m }); vcMats.set(k, mat); }
  return mat;
}
const isPlain = m => m.isMeshStandardMaterial && !m.map && !m.transparent && !m.vertexColors && !m.userData.keepMaterial && m.emissive.r + m.emissive.g + m.emissive.b === 0;

// root içindeki (userData.dynamic olmayan) bütün meshleri, malzemesine göre birleştirir.
// Düz renkli malzemeler köşe rengi (vertex color) olarak tek malzemede toplanır.
// unify: bütün düz renkli parçaları tek bir malzemede birleştir (insanlar ve küçük eşyalar için)
export function bake(root, { unify = false } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const walk = node => {
    if (node !== root && node.userData.dynamic) return;
    if (node.isMesh && !Array.isArray(node.material) && !node.userData.baked) {
      const m = node.material;
      const vc = isPlain(m);
      const key = vc ? (unify ? 'vc|u' : `vc|${m.roughness}|${m.metalness}`) : m.uuid;
      let b = buckets.get(key);
      if (!b) { b = { vc, mat: vc ? (unify ? vcMaterial(0.75, 0) : vcMaterial(m.roughness, m.metalness)) : m, items: [], cast: false }; buckets.set(key, b); }
      b.items.push({ mesh: node, matrix: new THREE.Matrix4().multiplyMatrices(inv, node.matrixWorld), color: m.color });
      if (node.castShadow) b.cast = true;
    }
    for (const c of node.children.slice()) walk(c);
  };
  walk(root);
  root.userData.bakedGeos = root.userData.bakedGeos || [];
  for (const b of buckets.values()) {
    if (!b.vc && b.items.length < 2) continue;
    const geo = mergeInto(b.items, b.vc);
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = true; mesh.userData.baked = true;
    for (const it of b.items) it.mesh.parent?.remove(it.mesh);
    root.add(mesh);
    root.userData.bakedGeos.push(geo);
  }
  return root;
}

const _n = new THREE.Matrix3(), _v = new THREE.Vector3();
function mergeInto(items, withColor) {
  const geos = items.map(it => it.mesh.geometry.index ? it.mesh.geometry.toNonIndexed() : it.mesh.geometry);
  const total = geos.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const col = withColor ? new Float32Array(total * 3) : null;
  let o = 0;
  items.forEach((it, k) => {
    const g = geos[k], P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    _n.getNormalMatrix(it.matrix);
    for (let i = 0; i < P.count; i++) {
      const j = (o + i) * 3;
      _v.fromBufferAttribute(P, i).applyMatrix4(it.matrix); pos[j] = _v.x; pos[j + 1] = _v.y; pos[j + 2] = _v.z;
      if (N) { _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize(); nor[j] = _v.x; nor[j + 1] = _v.y; nor[j + 2] = _v.z; }
      if (U) { uv[(o + i) * 2] = U.getX(i); uv[(o + i) * 2 + 1] = U.getY(i); }
      if (col) { col[(o + i) * 3] = it.color.r; col[(o + i) * 3 + 1] = it.color.g; col[(o + i) * 3 + 2] = it.color.b; }
    }
    o += P.count;
    if (g !== it.mesh.geometry) g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}
// birleştirilmiş geometrileri bellekten at (grup sahneden kaldırılınca)
export function disposeBaked(root) {
  root.traverse(o => { if (o.userData.bakedGeos) { for (const g of o.userData.bakedGeos) g.dispose(); o.userData.bakedGeos = []; } });
}
