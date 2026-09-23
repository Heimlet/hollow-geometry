import * as THREE from 'three';
import { A, CR } from './constants.js';

function getUniqueVerts(geom) {
  const pos = geom.getAttribute('position'), seen = new Map(), out = [];
  for (let i = 0; i < pos.count; i++) {
    const x = +pos.getX(i).toFixed(5), y = +pos.getY(i).toFixed(5), z = +pos.getZ(i).toFixed(5);
    const k = `${x},${y},${z}`;
    if (!seen.has(k)) { seen.set(k, out.length); out.push(new THREE.Vector3(x, y, z)); }
  }
  return out;
}

function createStarHighlight(geom, axis, skip) {
  const verts = getUniqueVerts(geom);
  const dir = new THREE.Vector3(...axis).normalize();
  verts.sort((a, b) => b.dot(dir) - a.dot(dir));
  const ring = verts.slice(0, 5);
  // Sort by angle around axis
  const center = new THREE.Vector3();
  ring.forEach(v => center.add(v));
  center.divideScalar(5);
  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.dot(up)) > 0.9) up.set(1, 0, 0);
  const right = new THREE.Vector3().crossVectors(up, dir).normalize();
  const fwd   = new THREE.Vector3().crossVectors(dir, right).normalize();
  ring.sort((a, b) => {
    const da = a.clone().sub(center), db = b.clone().sub(center);
    return Math.atan2(da.dot(fwd), da.dot(right)) - Math.atan2(db.dot(fwd), db.dot(right));
  });
  const pts = [];
  const s = skip || 2;
  for (let i = 0; i < 5; i++) pts.push(ring[(i * s) % 5]);
  pts.push(pts[0].clone());
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.9 }));
}

export function createPresetHint(preset) {
  const group = new THREE.Group();
  const guides = [];
  if (preset.star) {
    const geometry = new THREE.DodecahedronGeometry(CR);
    const star = createStarHighlight(geometry, preset.dir, 2);
    geometry.dispose();
    star.material.depthTest = false; star.renderOrder = 10;
    group.add(star); guides.push(star);
  } else if (preset.id === 'metatron2d') {
    const geometry = new THREE.BoxGeometry(2 * A, 2 * A, 2 * A);
    const faces = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0x7ddcff, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false,
    }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xc2f4ff, depthTest: false }));
    edges.renderOrder = 10;
    group.add(faces, edges); guides.push(edges);
  }
  return { group, guides };
}

// Frame-driven lifetime: no stale timeout can clear a newly selected preset.
export class TimedHint {
  constructor(scene, now = () => performance.now()) { this.scene = scene; this.now = now; this.current = null; }
  start(preset) {
    this.clear();
    if (!preset.star && preset.id !== 'metatron2d') return;
    this.current = createPresetHint(preset);
    this.expiresAt = this.now() + 5000;
    this.scene.add(this.current.group);
  }
  update() { if (this.current && this.now() >= this.expiresAt) this.clear(); }
  get guides() { this.update(); return this.current?.guides || []; }
  clear() {
    if (!this.current) return;
    this.scene.remove(this.current.group);
    this.current.group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    this.current = null;
  }
}
