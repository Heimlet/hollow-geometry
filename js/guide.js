import { derivedObjects } from './lab.js';
/** Screen-space orthographic edge overlay; never perspective-divide by vertex Z. */
import * as THREE from 'three';
import { camera, controls, getViewHeight } from './scene.js';
import { levels } from './levels.js';
import { getPresetHighlights } from './presets.js';
import { getPreset } from './preset-data.js';
import { getState, subscribe } from './state.js';

const canvas = document.createElement('canvas');
canvas.id = 'projection-guide';
canvas.setAttribute('aria-hidden', 'true');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
const reference = new THREE.Camera();
const inverse = new THREE.Quaternion();
const point = new THREE.Vector3();
const offset = new THREE.Vector3();
canvas.hidden = !getState().display.guide;
subscribe(state => { canvas.hidden = !state.display.guide; });

export function drawProjectionGuide() {
  if (!getState().display.guide) return;
  const width = innerWidth, height = innerHeight, dpr = Math.min(devicePixelRatio, 2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const preset = getPreset(getState().presetId);
  if (preset) {
    reference.position.set(...preset.dir);
    reference.up.copy(camera.up);
    reference.lookAt(0, 0, 0);
    inverse.copy(reference.quaternion).invert();
  } else inverse.copy(camera.quaternion).invert();
  // Panning moves the origin equally in the live view and the reference overlay.
  offset.copy(controls.target).applyQuaternion(camera.quaternion.clone().invert());
  const scale = height / getViewHeight();
  ctx.strokeStyle = 'rgba(210,250,255,0.85)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const level of levels) {
    const objects = Object.entries(level.objs)
      .filter(([id, object]) => object.vis && object.group.visible && (!preset || preset.obj.includes(id)))
      .map(([, object]) => object.edges);
    if (level.mc.vis && (!preset || preset.obj.includes('_metatron_'))) objects.push(level.mc.lines);
    if(!preset||preset.obj.includes('merkaba_up'))objects.push(...derivedObjects.filter(o=>o.level===level.idx && o.object.vis).map(o=>o.edges));
    if (level.idx === 0) objects.push(...getPresetHighlights());
    for (const edges of objects) {
      const positions = edges.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(edges.matrixWorld).applyQuaternion(inverse);
        const x = width / 2 + (point.x - offset.x) * scale;
        const y = height / 2 - (point.y - offset.y) * scale;
        if (i === 0 || (edges.isLineSegments && i % 2 === 0)) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
  }
  ctx.stroke();
}
