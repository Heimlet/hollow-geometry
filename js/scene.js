/**
 * Three.js scene, camera, controls, lights, and starfield.
 * Exports the core rendering objects used by all other modules.
 */
import * as THREE from 'three';
import { getState, subscribe } from './state.js';
import { DEFAULT_HEIGHT, ORBIT_DISTANCE, viewHeight, frameCamera, configureProjection } from './projection.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const canvas   = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04040f);
// Camera distance changes with focal length; distance fog would change the solids' appearance.

const orthographic = new THREE.OrthographicCamera();
const perspective = new THREE.PerspectiveCamera();
export let camera = orthographic;
export let projectionDepth = 0;
let lastDepth = 0.65;
frameCamera(camera, DEFAULT_HEIGHT, innerWidth / innerHeight);
camera.near = 0.01; camera.far = 500;
camera.position.set(7, 5, 9).normalize().multiplyScalar(ORBIT_DISTANCE);
camera.updateProjectionMatrix();

export const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 0.1;
controls.maxDistance = Infinity;
controls.minZoom = 0.05;
controls.maxZoom = 100;
controls.update();

export function getViewHeight() { return viewHeight(camera, controls.target); }
export function setViewHeight(height) {
  if (camera.isPerspectiveCamera) {
    const distance = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.sub(controls.target).normalize().multiplyScalar(distance).add(controls.target);
    camera.far = Math.max(500, distance * 4);
  }
  frameCamera(camera, height, innerWidth / innerHeight);
}

// Flush damping before replacing the controlled camera, keeping its target intact.
export function settleControls() {
  const damping = controls.enableDamping, auto = controls.autoRotate;
  controls.enableDamping = false; controls.autoRotate = false;
  controls.update();
  controls.enableDamping = damping; controls.autoRotate = auto;
}

export function setDepth(value) {
  window.dispatchEvent(new Event('camera-manual-change'));
  settleControls();
  projectionDepth = THREE.MathUtils.clamp(value, 0, 1);
  if (projectionDepth > 0) lastDepth = projectionDepth;
  camera = configureProjection(camera, projectionDepth === 0 ? orthographic : perspective,
    controls.target, projectionDepth, innerWidth / innerHeight);
  controls.object = camera;
  const auto = controls.autoRotate;
  controls.autoRotate = false; controls.update(); controls.autoRotate = auto;
  window.dispatchEvent(new Event('projection-change'));
}
export function setProjectionMode(mode) { setDepth(mode === 'orthographic' ? 0 : lastDepth); }
export function resizeCamera() {
  if (camera.isOrthographicCamera) {
    const aspect = innerWidth / innerHeight;
    camera.left = -camera.top * aspect; camera.right = camera.top * aspect;
    camera.updateProjectionMatrix();
  } else {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
}

// ── Lights ──
scene.add(new THREE.AmbientLight(0x445566, 0.8));
const dl1 = new THREE.DirectionalLight(0xffeedd, 0.7); dl1.position.set(5, 8, 3);  scene.add(dl1);
const dl2 = new THREE.DirectionalLight(0xaabbff, 0.4); dl2.position.set(-4, 2, -5); scene.add(dl2);
scene.add(new THREE.PointLight(0xffffff, 0.4, 15));

// ── Starfield ──
{
  const N = 2000, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r  = 45 + Math.random() * 50;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7, sizeAttenuation: true,
  }));
  scene.add(stars);
  stars.visible = getState().display.stars;
  subscribe(state => { stars.visible = state.display.stars; });
}
