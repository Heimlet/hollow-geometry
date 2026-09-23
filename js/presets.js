/**
 * Camera presets for 2D projections.
 * Each preset moves the camera along a symmetry axis of the relevant solid
 * so the 3D wireframe projects into a recognisable 2D shape.
 */
import * as THREE from 'three';
import { TimedHint } from './preset-hints.js';
import { scene, camera, controls, setDepth, setViewHeight, getViewHeight, settleControls } from './scene.js';
import './levels.js';
import { getState, subscribe, actions } from './state.js';
import { getPreset } from './preset-data.js';

export function isPresetActive() { return getState().presetId !== null; }
let camAnim = null;
const hint = new TimedHint(scene);
export function getPresetHighlights() { return hint.guides; }

function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

export function cancelCameraAnimation() { camAnim = null; }
window.addEventListener('camera-manual-change', cancelCameraAnimation);
controls.addEventListener('start', cancelCameraAnimation);

export function flyCamera(to, height, dur = 1200) {
  settleControls();
  camAnim = { from: camera.position.clone(), target: controls.target.clone(),
    fromHeight: getViewHeight(), height, to: to.clone(),
    direction: camera.position.clone().sub(controls.target).normalize(),
    rotation: new THREE.Quaternion().setFromUnitVectors(camera.position.clone().sub(controls.target).normalize(), to.clone().normalize()),
    distance: camera.position.distanceTo(controls.target), t0: performance.now(), dur };
}

/** Call once per frame to animate camera. */
export function updateCamAnim() {
  hint.update();
  if (!camAnim) return;
  const p = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur);
  controls.target.copy(camAnim.target).multiplyScalar(1 - ease(p));
  const rotation = new THREE.Quaternion().slerp(camAnim.rotation, ease(p));
  camera.position.copy(camAnim.direction).applyQuaternion(rotation)
    .multiplyScalar(THREE.MathUtils.lerp(camAnim.distance, camAnim.to.length(), ease(p))).add(controls.target);
  setViewHeight(THREE.MathUtils.lerp(camAnim.fromHeight, camAnim.height, ease(p)));
  if (p >= 1) camAnim = null;
}

export function isCamAnimating() { return !!camAnim; }

// ── Highlight helpers ──

// ── Activate / deactivate ──

export function activatePreset(preset) { actions.preset(preset.id); }
export function deactivatePreset() { actions.clearPreset(); }

// Effects consume one committed state: geometry has already been reconciled.
subscribe((state, previous, action) => {
  if (state.presetId === previous.presetId && action.type !== 'preset/select') return;
  cancelCameraAnimation();
  hint.clear();
  const preset = getPreset(state.presetId);
  if (!preset) return;
  setDepth(0);
  const dir = new THREE.Vector3(...preset.dir).normalize();
  const height = preset.R * 2.5 / Math.min(1, innerWidth / innerHeight);
  flyCamera(dir.multiplyScalar(30), height);
  hint.start(preset);
});
