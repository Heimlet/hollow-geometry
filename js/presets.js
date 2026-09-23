/**
 * Camera presets for 2D projections.
 * Each preset moves the camera along a symmetry axis of the relevant solid
 * so the 3D wireframe projects into a recognisable 2D shape.
 */
import * as THREE from 'three';
import './camera-views.js';
import { TimedHint } from './preset-hints.js';
import { scene, camera, controls, projectionDepth, setDepth, setViewHeight, getViewHeight, settleControls } from './scene.js';
import { transitionAt } from './camera-transition.js';
import './levels.js';
import { getState, subscribe, actions } from './state.js';
import { getPreset } from './preset-data.js';

export function isPresetActive() { return getState().presetId !== null; }
let camAnim = null;
const hint = new TimedHint(scene);
export function getPresetHighlights() { return hint.guides; }

export function cancelCameraAnimation() { camAnim = null; }
window.addEventListener('camera-manual-change', cancelCameraAnimation);
controls.addEventListener('start', cancelCameraAnimation);

export function flyCamera(to, height, dur = 1200) {
  settleControls();
  camAnim = { from: camera.position.clone(), target: controls.target.clone(),
    fromHeight: getViewHeight(), height, to: to.clone(),
    direction: camera.position.clone().sub(controls.target).normalize(),
    rotation: new THREE.Quaternion().setFromUnitVectors(camera.position.clone().sub(controls.target).normalize(), to.clone().normalize()),
    depth: projectionDepth, distance: camera.position.distanceTo(controls.target), t0: performance.now(), dur };
}

/** Call once per frame to animate camera. */
export function updateCamAnim() {
  hint.update();
  if (!camAnim) return;
  const frame = transitionAt(performance.now() - camAnim.t0, camAnim.dur, 900, camAnim.depth);
  if (!frame.flattening || !camAnim.arrived) {
    controls.target.copy(camAnim.target).multiplyScalar(1 - frame.move);
    const rotation = new THREE.Quaternion().slerp(camAnim.rotation, frame.move);
    camera.position.copy(camAnim.direction).applyQuaternion(rotation)
      .multiplyScalar(THREE.MathUtils.lerp(camAnim.distance, camAnim.to.length(), frame.move)).add(controls.target);
    setViewHeight(THREE.MathUtils.lerp(camAnim.fromHeight, camAnim.height, frame.move));
    controls.update();
  }
  if (frame.flattening) {
    camAnim.arrived = true;
    setDepth(frame.depth, { automatic: true });
  }
  if (frame.done) camAnim = null;
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
  const dir = new THREE.Vector3(...preset.dir).normalize();
  const height = preset.R * 2.5 / Math.min(1, innerWidth / innerHeight);
  flyCamera(dir.multiplyScalar(30), height);
  hint.start(preset);
});
