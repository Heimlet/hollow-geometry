/** Camera projection math, independent of the renderer and UI. */
import * as THREE from 'three';

export const DEFAULT_HEIGHT = 11;
export const ORBIT_DISTANCE = 30;
export const MAX_FOV = 25;

export function viewHeight(camera, target) {
  return camera.isOrthographicCamera
    ? (camera.top - camera.bottom) / camera.zoom
    : 2 * camera.position.distanceTo(target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
}

export function frameCamera(camera, height, aspect) {
  camera.zoom = 1;
  if (camera.isOrthographicCamera) {
    camera.top = height / 2; camera.bottom = -height / 2;
    camera.right = height * aspect / 2; camera.left = -camera.right;
  } else camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

/** Preserve the target plane's scale and view direction, including at depth=0. */
export function configureProjection(previous, next, target, depth, aspect) {
  const height = viewHeight(previous, target);
  const direction = previous.position.clone().sub(target).normalize();
  next.up.copy(previous.up);
  next.quaternion.copy(previous.quaternion);
  let distance = ORBIT_DISTANCE;
  if (depth > 0) {
    // Linear perspective strength (tan(FOV/2)), with a narrow 25° maximum.
    const tangent = depth * Math.tan(THREE.MathUtils.degToRad(MAX_FOV / 2));
    next.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tangent));
    distance = height / (2 * tangent);
  }
  next.position.copy(target).addScaledVector(direction, distance);
  next.near = Math.max(0.01, distance / 10000);
  next.far = Math.max(500, distance * 4);
  frameCamera(next, height, aspect);
  next.updateMatrixWorld(true);
  return next;
}
