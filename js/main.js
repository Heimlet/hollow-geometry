/**
 * Entry point — imports all modules, runs the animation loop, sets up events.
 * Start a local server to run:  npx serve .  or  python3 -m http.server
 */
import * as THREE from 'three';
import { scene, camera, renderer, controls, canvas, setDepth, setViewHeight, resizeCamera } from './scene.js';
import { getState, actions, ALL_IDS } from './state.js';
import { levels } from './levels.js';
import { updateCamAnim, isCamAnimating, deactivatePreset, isPresetActive, cancelCameraAnimation } from './presets.js';
import { initUI, showInfo } from './ui.js';
import { drawProjectionGuide } from './guide.js';
import { updateStudies } from './studies.js';
import { updateGolden } from './golden.js';
import { initPicking } from './picking.js';

// ── Build UI ──
initUI();

// ── Toggle all objects on/off ──
window.toggleAll = on => actions.objects(ALL_IDS, { visible: on });

// ── Camera reset ──
window.resetCamera = () => {
  cancelCameraAnimation();
  setDepth(0);
  camera.position.set(7, 5, 9).normalize().multiplyScalar(30);
  controls.target.set(0, 0, 0);
  setViewHeight(11);
  controls.update();
  if (isPresetActive()) deactivatePreset();
};

const updatePicking = initPicking(showInfo);

// ── Animation loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  updateCamAnim();
  controls.autoRotate = getState().display.autoRotate && !isCamAnimating();
  controls.autoRotateSpeed = getState().display.speed * 8;

  // Node pulsation
  for (const lv of levels) {
    if (!lv.mc.vis) continue;
    const bs = 1 + 0.06 * Math.sin(t * 1.5 + lv.idx);
    lv.mc.nodes.forEach((n, i) => n.scale.setScalar(bs + 0.04 * Math.sin(t * 2 + i * 0.5)));
  }

  controls.update();
  updatePicking();
  updateGolden();
  updateStudies(dt);
  renderer.render(scene, camera);
  drawProjectionGuide();
}

animate();

// ── Resize ──
addEventListener('resize', () => {
  resizeCamera();
  renderer.setSize(innerWidth, innerHeight);
});
