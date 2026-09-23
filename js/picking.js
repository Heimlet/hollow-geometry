/** Inspection UI is transient: it never changes scene visibility or materials. */
import * as THREE from 'three';
import { INFO } from './constants.js';
import { scene, camera, canvas, controls, getViewHeight } from './scene.js';
import { levels } from './levels.js';
import { subscribe } from './state.js';
import { uniqueHits } from './pick-targets.js';
import { inspectGoldenAt } from './golden.js';
import { settingLink } from './settings-links.js';

export function initPicking(showInfo) {
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const label = document.createElement('div'); label.id = 'object-label'; label.hidden = true;
  const picker = document.createElement('div'); picker.id = 'object-picker'; picker.hidden = true;
  picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', 'Фигуры под курсором');
  document.body.append(label, picker);
  const outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
    color: 0xb8efff, transparent: true, opacity: .95, depthTest: false, depthWrite: false,
  }));
  // Geometry is borrowed from the inspected object; never dispose it here.
  outline.geometry.dispose(); outline.visible = false; outline.renderOrder = 20; scene.add(outline);
  let selected = null, hovered = null, preview = null, pointer = null, start = null, dragged = false;
  let focusBeforePicker = null, labelHovered = false, lastHoverAt = 0;
  label.addEventListener('pointerenter', () => { labelHovered = true; });
  label.addEventListener('pointerleave', () => { labelHovered = false; });
  const title = owner => `${INFO[owner.id]?.name || owner.id}${owner.level ? ` · уровень ${owner.level + 1}` : ''}`;
  function candidates() {
    const owners = new Map();
    for (const level of levels) {
      for (const [id, object] of Object.entries(level.objs)) {
        if (!object.vis || !(object.eVis || (object.fVis && object.op > 0))) continue;
        const owner = { id, object, level: level.idx, key: `${id}:${level.idx}`, edges: object.edges };
        // Solid volumes remain pickable in wireframe view, including interior solids.
        owners.set(object.mesh, owner);
        if (object.eVis) owners.set(object.edges, owner);
      }
      const meta = level.mc;
      if (meta.vis) {
        const owner = { id: 'metatron', object: meta, level: level.idx, key: `metatron:${level.idx}`, edges: meta.lines };
        if (meta.nVis) meta.nodes.forEach(node => owners.set(node, owner));
        if (meta.lVis && meta.op > 0) owners.set(meta.lines, owner);
      }
    }
    return owners;
  }
  function hitsAt(x, y) {
    mouse.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    ray.params.Line.threshold = getViewHeight() / innerHeight * 5;
    ray.setFromCamera(mouse, camera);
    const owners = candidates();
    return uniqueHits(ray.intersectObjects([...owners.keys()], false), owners);
  }
  function closePicker(restore = false) {
    picker.hidden = true; preview = null;
    if (restore) focusBeforePicker?.focus();
  }
  function select(owner) { selected = owner; hovered = null; showInfo(owner.id); closePicker(); }
  let labelKey = null;
  const keyFor = owner => `object.${owner.id === 'metatron' ? '_metatron_' : owner.id}`;
  function position(element, x, y) {
    element.style.left = Math.max(8, Math.min(x, innerWidth - element.offsetWidth - 8)) + 'px';
    element.style.top = Math.max(8, Math.min(y, innerHeight - element.offsetHeight - 8)) + 'px';
  }
  canvas.addEventListener('pointerdown', event => { start = [event.clientX, event.clientY]; dragged = false; closePicker(); });
  canvas.addEventListener('pointermove', event => {
    pointer = [event.clientX, event.clientY];
    if (start && Math.hypot(pointer[0] - start[0], pointer[1] - start[1]) > 5) dragged = true;
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; });
  window.addEventListener('pointerup', () => { start = null; });
  canvas.addEventListener('pointercancel', () => { start = null; dragged = true; });
  canvas.addEventListener('click', event => {
    start = null;
    if (dragged) return;
    if (inspectGoldenAt(event.clientX,event.clientY)) { selected = null; hovered = null; preview = null; return; }
    const hits = hitsAt(event.clientX, event.clientY);
    if (!hits.length) { selected = null; hovered = null; return; }
    if (hits.length === 1) { select(hits[0]); return; }
    focusBeforePicker = document.activeElement;
    picker.replaceChildren();
    const heading = document.createElement('p'); heading.textContent = 'Выберите фигуру под курсором';
    const close = document.createElement('button'); close.className = 'pick-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Закрыть выбор');
    close.addEventListener('click', () => closePicker(true)); picker.append(heading, close);
    for (const owner of hits) {
      const button = document.createElement('button'); button.className = 'pick-item'; button.textContent = title(owner);
      button.addEventListener('pointerenter', () => { preview = owner; });
      button.addEventListener('focus', () => { preview = owner; });
      button.addEventListener('click', () => select(owner));
      const row = document.createElement('div'); row.className = 'pick-row';
      const settings = settingLink('Настройки', keyFor(owner));
      settings.addEventListener('click', () => closePicker());
      row.append(button, settings); picker.appendChild(row);
    }
    hovered = null; picker.hidden = false;
    position(picker, event.clientX + 12, event.clientY + 12);
    picker.querySelector('.pick-item').focus();
  });
  document.addEventListener('pointerdown', event => { if (!picker.contains(event.target) && event.target !== label) closePicker(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closePicker(true); selected = null; hovered = null; }
  });
  controls.addEventListener('start', () => { closePicker(); hovered = null; });
  window.addEventListener('golden-inspect', () => { selected = null; hovered = null; preview = null; closePicker(); });
  // Sidebar info buttons use the same inspection/highlight path as canvas selection.
  window.addEventListener('inspect-object', event => {
    if (selected?.id === event.detail) return;
    selected = [...candidates().values()].find(owner => owner.id === event.detail) || null;
  });
  subscribe((state, previous) => {
    if (state.objects !== previous.objects || state.recursion !== previous.recursion || state.presetId !== previous.presetId) {
      selected = null; hovered = null; preview = null; closePicker(); outline.visible = false; label.hidden = true;
      document.getElementById('info').classList.remove('vis');
    }
  });
  const projected = new THREE.Vector3();
  return function updatePicking() {
    if (selected && !document.getElementById('info').classList.contains('vis')) selected = null;
    if (!labelHovered) {
      const hit = pointer && picker.hidden && !start ? hitsAt(...pointer)[0] : null;
      if (hit) { hovered = hit; lastHoverAt = performance.now(); }
      else if (performance.now() - lastHoverAt > 400 || !picker.hidden || start) hovered = null;
    }
    const owner = preview || selected || hovered;
    canvas.style.cursor = hovered ? 'pointer' : 'default';
    outline.visible = !!owner; label.hidden = !owner;
    if (!owner) return;
    outline.geometry = owner.edges.geometry;
    owner.edges.updateWorldMatrix(true, false);
    outline.matrixAutoUpdate = false; outline.matrix.copy(owner.edges.matrixWorld);
    if (labelKey !== owner.key) {
      labelKey = owner.key;
      const name = settingLink(title(owner), keyFor(owner));
      const info = document.createElement('button'); info.className = 'label-info'; info.textContent = 'i';
      info.title = 'Описание фигуры'; info.setAttribute('aria-label', `Описание: ${title(owner)}`);
      info.addEventListener('click', () => select(owner)); label.replaceChildren(name, info);
    }
    // Anchor the name to the rightmost projected vertex, following orbit and zoom.
    let anchor = null;
    const positions = owner.edges.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      projected.fromBufferAttribute(positions, i).applyMatrix4(owner.edges.matrixWorld).project(camera);
      if (projected.z >= -1 && projected.z <= 1 && (!anchor || projected.x > anchor.x)) anchor = projected.clone();
    }
    if (!anchor) { label.hidden = true; return; }
    position(label, (anchor.x + 1) * innerWidth / 2 + 10, (1 - anchor.y) * innerHeight / 2 - 12);
  };
}
