/** Session-local camera memory. Figure settings remain in the immutable store. */
import * as THREE from 'three';
import { camera, controls, projectionDepth, getViewHeight, setViewHeight, setDepth, settleControls } from './scene.js';
import { subscribe } from './state.js';
import { DEFAULT_HEIGHT, ORBIT_DISTANCE } from './projection.js';

const views = new Map();
function snapshot() {
  return { target: controls.target.clone(), up: camera.up.clone(),
    direction: camera.position.clone().sub(controls.target).normalize(),
    height: getViewHeight(), depth: projectionDepth };
}
function defaultView() {
  return { target: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
    direction: new THREE.Vector3(7, 5, 9).normalize(), height: DEFAULT_HEIGHT, depth: 0 };
}
function restore(view) {
  setDepth(view.depth, { automatic: true });
  controls.target.copy(view.target);
  camera.up.copy(view.up);
  camera.position.copy(view.target).addScaledVector(view.direction, ORBIT_DISTANCE);
  setViewHeight(view.height);
  settleControls();
}

subscribe((state, previous, action) => {
  if (state.viewContext === previous.viewContext) return;
  window.dispatchEvent(new Event('camera-manual-change'));
  settleControls();
  views.set(previous.viewContext, snapshot());
  // A preset starts its flight from the current view, then gradually flattens.
  // Merely opening its figure settings does not change the context or camera.
  if (!['preset/select','golden-scene/start'].includes(action.type)) restore(views.get(state.viewContext) || defaultView());
});
