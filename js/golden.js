/** Golden-ratio overlays are derived from the same meshes that the user sees. */
import * as THREE from 'three';
import { PHI, INFO } from './constants.js';
import { getState, subscribe, actions } from './state.js';
import { levels } from './levels.js';
import { scene, camera, controls, getViewHeight, setDepth, setViewHeight, settleControls } from './scene.js';
import { verticesOf, goldenRectangles, pentagonalFaces, pentagramDivision, edgeDivisions } from './golden-math.js';
import { registerSetting, settingLink, linkText } from './settings-links.js';

const overlay = new THREE.Group(); scene.add(overlay);
const gold = 0xffd166, cyan = 0x66d9ff;
let findings = [], current = null, panel, choices, status, toggle, badge, details, align;
const lengthLabels = new Map(), lengthAnchors = new Map(), figureButtons = new Map();
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
const format = n => n.toLocaleString('ru-RU', { maximumFractionDigits: 5 });
function clearOverlay() {
  lengthAnchors.clear();
  for (const child of [...overlay.children]) { child.geometry.dispose(); child.material.dispose(); overlay.remove(child); }
}
function segment(a,b,color) {
  const role = color === gold ? 'long' : color === cyan ? 'short' : null;
  if (role && !lengthAnchors.has(role)) lengthAnchors.set(role,a.clone().add(b).multiplyScalar(.5));
  const line = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([a,b]),
    new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 1 }));
  line.renderOrder = 30; overlay.add(line);
}
function drawFinding() {
  clearOverlay();
  if (!current || !getState().display.golden) return;
  const p = current.points;
  if (current.kind === 'rectangle') {
    for (let i = 0; i < 4; i++) segment(p[i],p[(i+1)%4], Math.abs(p[i].distanceTo(p[(i+1)%4]) - current.short) < current.short * 1e-4 ? cyan : gold);
    const geometry = new THREE.BufferGeometry().setFromPoints([p[0],p[1],p[2],p[0],p[2],p[3]]);
    const mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({ color: gold, side: THREE.DoubleSide, transparent:true, opacity:.09, depthWrite:false }));
    mesh.renderOrder = 3; overlay.add(mesh);
  } else if (current.kind === 'face') {
    for (let i = 0; i < 5; i++) segment(p[i],p[(i+1)%5],cyan);
    segment(p[0],p[2],gold);
  } else if (current.kind === 'star') {
    // Only the two diagonals establishing the ratio, not a permanent pentagram.
    segment(p[1],p[3],0xb5a079);
    const lengths = [p[0].distanceTo(current.cross),p[2].distanceTo(current.cross)];
    segment(p[0],current.cross,lengths[0] > lengths[1] ? gold : cyan);
    segment(current.cross,p[2],lengths[1] > lengths[0] ? gold : cyan);
  } else {
    segment(p[0],p[1],p[0].distanceTo(p[1]) > current.short * 1.001 ? gold : cyan);
    segment(p[1],p[2],p[1].distanceTo(p[2]) > current.short * 1.001 ? gold : cyan);
  }
  const markedPoints = current.cross ? [...p,current.cross] : p;
  for (const point of markedPoints) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(current.short * .025, .006),8,6),
      new THREE.MeshBasicMaterial({ color:gold, depthTest:false }));
    dot.position.copy(point); dot.renderOrder = 31; overlay.add(dot);
  }
}
function description(finding) {
  const source = INFO[finding.source].name;
  const explanation = {
    rectangle: finding.centers ? 'Центры четырёх пятиугольных граней образуют золотой прямоугольник внутри додекаэдра. Все 12 центров — вершины двойственного икосаэдра. Длинная сторона / короткая сторона = φ.' : 'Четыре найденные вершины образуют плоский прямоугольник: соседние стороны перпендикулярны, а длинная сторона делится на короткую с результатом φ.',
    face: 'На этой правильной пятиугольной грани диагональ длиннее ребра в φ раз. Голубым показаны рёбра, золотым — диагональ.',
    star: 'Две диагонали пятиугольника пересекаются и делят одну из них в золотом отношении: большая часть / меньшая часть = φ. Здесь показан фрагмент пентаграммы.',
    division: 'Эта вершина икосаэдра лежит на ребре октаэдра и делит его в золотом отношении. Контекстное ребро показано даже при скрытом октаэдре; его настройки не меняются.',
  }[finding.kind];
  return { source, explanation };
}
function explain() {
  if (!current) return;
  const el = document.getElementById('info'), { source, explanation } = description(current);
  el.replaceChildren(); el.dataset.golden = 'true';
  const close = document.createElement('button'); close.className = 'xbtn'; close.textContent = '×'; close.setAttribute('aria-label','Закрыть объяснение φ');
  close.addEventListener('click',()=>el.classList.remove('vis'));
  const title = document.createElement('h2'); title.textContent = `φ · ${current.title}`;
  const owner = document.createElement('p'); owner.className = 'sub'; owner.textContent = `${source} · уровень ${current.level + 1}`;
  const text = document.createElement('p'); text.className = 'desc'; text.textContent = explanation;
  const measurements = document.createElement('p'); measurements.className = 'golden-measurements';
  measurements.textContent = `Большая длина: ${format(current.long)}\nМеньшая длина: ${format(current.short)}\nОтношение: ${format(current.long/current.short)} ≈ φ\nφ = (1 + √5) / 2 ≈ ${format(PHI)}`;
  const note = document.createElement('p'); note.className = 'camera-hint'; note.textContent = 'Длины измерены в координатах модели. Отношение не зависит от масштаба и ракурса; перспектива может визуально искажать длины.';
  el.append(close,title,owner,text,measurements,note,settingLink('Настройки золотого сечения','display.golden'));
  linkText(el,current.source); el.classList.add('vis');
  window.dispatchEvent(new Event('golden-inspect'));
}
function normalOf(finding) {
  const [a,b,c] = finding.points;
  const normal = b.clone().sub(a).cross(c.clone().sub(a));
  if (normal.lengthSq() < 1e-12) {
    const direction = c.clone().sub(a).normalize();
    normal.copy(camera.position).sub(controls.target).addScaledVector(direction, -camera.position.clone().sub(controls.target).dot(direction));
    if (normal.lengthSq() < 1e-12) normal.copy(direction).cross(new THREE.Vector3(0,1,0));
  }
  return normal.normalize();
}
function alignFinding() {
  if (!current) return;
  const normal = normalOf(current);
  if (normal.dot(camera.position.clone().sub(controls.target)) < 0) normal.negate();
  const center = current.points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(current.points.length);
  actions.clearPreset();
  actions.display({autoRotate:false});
  setDepth(0); settleControls();
  controls.target.copy(center); camera.position.copy(center).addScaledVector(normal,30);
  const radius = Math.max(...current.points.map(point=>point.distanceTo(center)));
  setViewHeight(radius*2.8/Math.min(1,innerWidth/innerHeight)); controls.update();
}
function select(key, open = false) {
  const view = camera.position.clone().sub(controls.target).normalize();
  const preferred = findings.filter(item=>item.kind === 'rectangle').sort((a,b)=>a.level-b.level || Math.abs(normalOf(b).dot(view))-Math.abs(normalOf(a).dot(view)))[0];
  current = findings.find(item=>item.key === key) || preferred || findings[0] || null;
  if (choices) choices.value = current?.key || '';
  drawFinding();
  if (open) explain();
}
function rebuild() {
  for (const [id, button] of figureButtons) {
    const visible = getState().objects[id].visible;
    button.textContent = `${visible ? 'Скрыть' : 'Показать'} ${INFO[id].name.toLowerCase()}`;
    button.setAttribute('aria-pressed', String(visible));
  }
  const key = current?.key;
  findings = [];
  if (getState().display.golden) for (const level of levels) {
    for (const source of ['icosahedron','dodecahedron']) {
      const object = level.objs[source]; if (!object.vis) continue;
      const vertices = verticesOf(object.mesh.geometry);
      const append = (kind, list, title) => list.forEach((data,i)=>findings.push({ ...data, kind, source, level:level.idx, title:`${title} ${i+1}`, key:`${source}:${level.idx}:${kind}:${i}` }));
      if (source === 'icosahedron') append('rectangle',goldenRectangles(vertices),'Золотой прямоугольник');
      if (source === 'dodecahedron') {
        const faces = pentagonalFaces(object.mesh.geometry,vertices);
        const centers = faces.map(face=>face.points.reduce((sum,point)=>sum.add(point),new THREE.Vector3()).divideScalar(5));
        append('rectangle',goldenRectangles(centers).map(rectangle=>({...rectangle,centers:true})),'Прямоугольник центров граней');
        append('face',faces,'Диагональ и ребро грани');
        append('star',faces.map(face=>({ ...face, ...pentagramDivision(face.points) })).filter(face=>face.cross),'Деление диагонали');
      } else append('division',edgeDivisions(vertices,level.objs.octahedron.edges.geometry),'Деление ребра октаэдра');
    }
  }
  if (choices) {
    choices.replaceChildren();
    for (const finding of findings) {
      const option = document.createElement('option'); option.value = finding.key;
      option.textContent = `${INFO[finding.source].name} · ${finding.title} · ур. ${finding.level+1}`;
      choices.appendChild(option);
    }
    choices.disabled = !findings.length;
    status.textContent = !getState().display.golden ? 'Включите режим для поиска отношений в видимых фигурах.' : findings.length ? `Найдено отношений: ${findings.length}. Выберите пример; голубой — меньшая длина, золотой — большая.` : 'Нет подходящих видимых фигур. Включите икосаэдр или додекаэдр.';
    toggle.checked = getState().display.golden;
    details.disabled = !findings.length; align.disabled = !findings.length;
  }
  select(key);
  const info = document.getElementById('info');
  if (info?.dataset.golden) { info.classList.remove('vis'); delete info.dataset.golden; }
}
export function initGoldenUI(before) {
  panel = document.createElement('section'); panel.className = 'golden-panel';
  const heading = document.createElement('h2'); heading.textContent = 'Золотое сечение · φ';
  const label = document.createElement('label'); label.className = 'guide-control';
  toggle = document.createElement('input'); toggle.type='checkbox'; toggle.setAttribute('aria-label','Золотое сечение · φ');
  toggle.addEventListener('change',()=>actions.display({golden:toggle.checked}));
  label.append(toggle,'Показать отношения φ');
  status = document.createElement('p'); status.className = 'camera-hint'; status.setAttribute('role','status');
  choices = document.createElement('select'); choices.setAttribute('aria-label','Отношение золотого сечения');
  choices.addEventListener('change',()=>select(choices.value,true));
  details = document.createElement('button'); details.textContent = 'Где здесь φ?'; details.addEventListener('click',explain);
  align = document.createElement('button'); align.textContent = 'Ракурс φ'; align.title = 'Посмотреть на построение прямо, без перспективы'; align.addEventListener('click',alignFinding);
  const quick = document.createElement('p'); quick.className='golden-quick';
  for (const id of ['icosahedron','dodecahedron']) {
    const button = document.createElement('button'); figureButtons.set(id, button);
    button.addEventListener('click',()=>actions.objects([id],{visible:!getState().objects[id].visible})); quick.appendChild(button);
  }
  panel.append(heading,label,status,choices,details,align,quick); before.before(panel);
  registerSetting('display.golden',panel,'Золотое сечение · φ');
  const hint = document.createElement('p'); hint.className='camera-hint'; hint.textContent='Выделенные отрезки и метка φ кликабельны. Видимость фигур и режим φ независимы.'; panel.appendChild(hint);
  badge = document.createElement('button'); badge.id='golden-badge'; badge.textContent='φ · Объяснить'; badge.hidden=true; badge.addEventListener('click',explain); document.body.appendChild(badge);
  for (const role of ['short','long']) {
    const label = document.createElement('button'); label.className = `golden-length ${role}`; label.hidden = true;
    label.addEventListener('click',explain); document.body.appendChild(label); lengthLabels.set(role,label);
  }
  rebuild();
}
subscribe((state,previous)=>{
  if (state.display.golden !== previous.display.golden || ['icosahedron','dodecahedron'].some(id=>state.objects[id].visible !== previous.objects[id].visible) || state.recursion !== previous.recursion) rebuild();
});
export function updateGolden() {
  if (!badge) return;
  badge.hidden = !current || !getState().display.golden;
  for (const [role,label] of lengthLabels) {
    label.hidden = badge.hidden || !lengthAnchors.has(role);
    if (label.hidden) continue;
    const point = lengthAnchors.get(role).clone().project(camera);
    label.hidden = point.z < -1 || point.z > 1;
    label.textContent = `${role === 'long' ? 'φa' : 'a'} = ${format(current[role])}`;
    label.style.left = Math.max(8,Math.min(innerWidth-120,(point.x+1)*innerWidth/2+8))+'px';
    label.style.top = Math.max(8,Math.min(innerHeight-35,(1-point.y)*innerHeight/2-24))+'px';
  }
  if (badge.hidden) return;
  const center = current.points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(current.points.length).project(camera);
  if (center.z < -1 || center.z > 1) { badge.hidden=true; return; }
  badge.style.left = Math.max(10,Math.min(innerWidth-130,(center.x+1)*innerWidth/2+14))+'px';
  badge.style.top = Math.max(100,Math.min(innerHeight-45,(1-center.y)*innerHeight/2+14))+'px';
}
export function inspectGoldenAt(x,y) {
  if (!current || !getState().display.golden) return false;
  mouse.set(x/innerWidth*2-1,-y/innerHeight*2+1);
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  ray.params.Line.threshold = getViewHeight()/innerHeight*7;
  ray.setFromCamera(mouse,camera);
  // Planes are context only: they must not capture clicks across a whole solid.
  const hits = ray.intersectObjects(overlay.children.filter(object=>object.isLineSegments || object.geometry.type === 'SphereGeometry'),false);
  if (!hits.length) return false;
  explain(); return true;
}
export function getGoldenFinding() { return current; }
