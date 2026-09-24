import { updateKnowledgePreview } from './knowledge-preview.js';
import { initPageZoom } from './page-zoom.js';
import { initAnalytics } from './analytics.js';
import { initOnboarding } from './onboarding.js';
import { createScreenLines } from './screen-lines.js';
import { openTourReading } from './tour-reading.js';
import { initTours, updateTours, applyTourEffects, applyTourTransition, restoreTourMaterials, renderTourScene, updateTourStage, resetTourCamera } from './tours.js';
import { updateLab } from './lab.js';
import { drawLabProjection } from './lab-projection.js';
/**
 * Entry point — imports all modules, runs the animation loop, sets up events.
 * Start a local server to run:  npx serve .  or  python3 -m http.server
 */
import * as THREE from 'three';
import { scene, camera, renderer, controls, canvas, setDepth, setViewHeight, resizeCamera } from './scene.js';
import { getState, actions, ALL_IDS } from './state.js';
import { levels } from './levels.js';
import { updateCamAnim, isCamAnimating, deactivatePreset, isPresetActive, cancelCameraAnimation, flyCamera } from './presets.js';
import { initUI, showInfo } from './ui.js';
import { drawProjectionGuide } from './guide.js';
import { updateStudies } from './studies.js';
import { updateGolden } from './golden.js';
import { initPicking } from './picking.js';
import { initShortcuts } from './shortcuts.js';
import { updateStarfield, renderStarfield } from './starfield.js';
import { updateGoldenScenes } from './golden-scenes.js';

// ── Build UI ──
initPageZoom();
initAnalytics(controls);
initUI();

// ── Toggle all objects on/off ──
window.toggleAll = on => actions.objects(ALL_IDS, { visible: on });

// ── Camera reset ──
window.resetCamera = () => {
  if(resetTourCamera())return;
  window.dispatchEvent(new Event('camera-manual-change'));
  if (isPresetActive()) deactivatePreset();
  camera.up.set(0, 1, 0);
  flyCamera(new THREE.Vector3(1,1,1).normalize().multiplyScalar(30),11/Math.min(1,innerWidth/innerHeight),1400);

};

document.querySelectorAll('.hdr-btns button').forEach(button=>button.disabled=false);
initShortcuts();
initTours();
initOnboarding(resetTourCamera);
const screenLines=createScreenLines(scene);

const updatePicking = initPicking(id=>getState().tour.id?openTourReading(id):showInfo(id));

// ── Animation loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  updateCamAnim();
  updateTours(dt);
  controls.autoRotate = (getState().display.autoRotate && !getState().tour.id) && !isCamAnimating();
  controls.autoRotateSpeed = getState().display.speed * 8;

  // Decorative motion follows the same paused timeline as the film.
  const motionTime=getState().tour.id?getState().tour.elapsed:t;
  for (const lv of levels) {
    if (!lv.mc.vis) continue;
    const bs = 1 + 0.06 * Math.sin(motionTime * 1.5 + lv.idx);
    lv.mc.nodes.forEach((n, i) => n.scale.setScalar(bs + 0.04 * Math.sin(motionTime * 2 + i * 0.5)));
  }

  controls.update(dt);
  updateLab(dt);
  updateTourStage(dt);
  // OrbitControls changes the pose before WebGLRenderer refreshes matrixWorld.
  // Canvas overlays and raycasting must use that same, current-frame pose.
  camera.updateMatrixWorld(true);
  applyTourEffects();
  applyTourTransition(dt);
  updatePicking();
  updateGolden();
  updateStudies(dt);
  updateStarfield(dt);
  updateGoldenScenes(dt);
  renderStarfield();
  if(getState().ui.mode==='advanced'||getState().tour.id)renderTourScene(()=>{screenLines.prepare(!!getState().tour.id);renderer.render(scene, camera);screenLines.restore();});
  restoreTourMaterials();
  updateKnowledgePreview();
  drawProjectionGuide();
  drawLabProjection();
}

animate();

// ── Resize ──
addEventListener('resize', () => {
  resizeCamera();
  renderer.setSize(innerWidth, innerHeight);
});
