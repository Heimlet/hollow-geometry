/**
 * Sidebar UI — groups, toggles, sliders, preset buttons.
 * All DOM construction happens here; other modules stay DOM-free.
 */
import * as THREE from 'three';
import { COLORS, OBJ_IDS, INFO } from './constants.js';
import { getState, actions, subscribe, groupVisibility } from './state.js';
import { projectionDepth, setDepth, setProjectionMode } from './scene.js';
import { PRESETS, getPreset } from './preset-data.js';
import { activatePreset } from './presets.js';
import { initStudiesUI } from './studies.js';
import { initGoldenUI } from './golden.js';
import { registerSetting, settingLink, linkText, initSettingsNavigation } from './settings-links.js';

// ── Helpers ──

function tog(el) { el.classList.toggle('open'); }
function cHex(c) { return '#' + new THREE.Color(c).getHexString(); }

const settingBindings = [];
function syncSettingsUI() { settingBindings.forEach(sync => sync()); }

function mkTgl(checked, fn, read) {
  const l = document.createElement('label'); l.className = 'tgl';
  const i = document.createElement('input'); i.type = 'checkbox'; i.checked = checked;
  i.addEventListener('change', () => fn(i.checked));
  if (read) {
    const sync = () => {
      const value = read();
      i.checked = value === true; i.indeterminate = value === 'mixed';
    };
    settingBindings.push(sync); sync();
  }
  const s = document.createElement('span');
  l.append(i, s); return l;
}

function mkSl(val, min, max, step, fn) {
  const i = document.createElement('input'); i.type = 'range';
  i.min = min; i.max = max; i.step = step; i.value = val;
  i.addEventListener('input', () => fn(+i.value));
  return i;
}

// ── Info panel ──

export function showInfo(id) {
  const d = INFO[id]; if (!d) return;
  delete document.getElementById('info').dataset.golden;
  const el = document.getElementById('info');
  el.innerHTML = `<button class="xbtn" onclick="document.getElementById('info').classList.remove('vis')">✕</button>
    <h2>${d.name}</h2><div class="sub">${d.nameEn} ${d.schlaefli ? '· ' + d.schlaefli : ''}</div>
    <div class="pr"><span class="pl">Вершины</span><span class="pv">${d.V}</span></div>
    <div class="pr"><span class="pl">Рёбра</span><span class="pv">${d.E}</span></div>
    <div class="pr"><span class="pl">Грани</span><span class="pv">${d.F}</span></div>
    <div class="pr"><span class="pl">Тип граней</span><span class="pv">${d.faceType}</span></div>
    <div class="pr"><span class="pl">Симметрия</span><span class="pv">${d.sym}</span></div>
    <div class="pr"><span class="pl">Дуальное тело</span><span class="pv">${d.dual}</span></div>
    <div class="pr"><span class="pl">Элемент</span><span class="pv">${d.element}</span></div>
    <div class="desc">${d.desc}</div>`;
  linkText(el, id === 'metatron' ? '_metatron_' : id);
  const help = document.createElement('p'); help.className = 'settings-link-help'; help.textContent = 'Подчёркнутые названия открывают настройки. Включение и выключение — тумблером.'; el.append(help);
  el.classList.add('vis');
  window.dispatchEvent(new CustomEvent('inspect-object', { detail: id }));
}

// ── Object row builder ──

function buildObjRow(id, label, color) {
  const row = document.createElement('div'); row.className = 'obj-row'; row.dataset.objectId = id;
  const hdr = document.createElement('div'); hdr.className = 'obj-hdr';
  const dot = document.createElement('span'); dot.className = 'dot';
  dot.style.background = cHex(color); dot.style.color = cHex(color);
  const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = label;
  const ib = document.createElement('button'); ib.className = 'ibtn'; ib.textContent = 'i';
  ib.addEventListener('click', e => { e.stopPropagation(); showInfo(id); });
  const vt = mkTgl(true, v => actions.objects([id], { visible: v }), () => getState().objects[id].visible);
  hdr.append(dot, nm, ib, vt); row.appendChild(hdr);

  const ct = document.createElement('div'); ct.className = 'obj-ctrls';
  { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Рёбра</label>'; c.appendChild(mkTgl(true, v => actions.objects([id], { edges: v }), () => getState().objects[id].edges)); ct.appendChild(c); }
  { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Грани</label>'; c.appendChild(mkTgl(true, v => actions.objects([id], { faces: v }), () => getState().objects[id].faces)); ct.appendChild(c); }
  { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Прозр.</label>';
    const vs = document.createElement('span'); vs.className = 'val'; vs.textContent = Math.round(getState().objects[id].opacity * 100) + '%';
    const slider = mkSl(getState().objects[id].opacity, 0, 1, 0.01, v => actions.objects([id], { opacity: v }));
    settingBindings.push(() => { slider.value = getState().objects[id].opacity; vs.textContent = Math.round(getState().objects[id].opacity * 100) + '%'; });
    c.append(slider, vs);
    ct.appendChild(c); }
  hdr.addEventListener('click', e => { if (e.target.closest('.tgl, button, a')) return; tog(ct); });
  row.appendChild(ct);
  return { id, el: row };
}

// ── Group builder ──

function buildGrp(title, icon, items) {
  const g = document.createElement('div'); g.className = 'grp';
  const h = document.createElement('div'); h.className = 'grp-hdr';
  h.innerHTML = `<span class="arr">▶</span><span class="ico">${icon}</span><span class="ttl">${title}</span>`;
  const ids = items.map(item => item.id);
  const mt = mkTgl(true, v => actions.objects(ids, { visible: v }),
    () => groupVisibility(getState(), ids));
  h.appendChild(mt);
  const b = document.createElement('div'); b.className = 'grp-body';
  items.forEach(it => b.appendChild(it.el));
  h.addEventListener('click', e => { if (e.target.closest('.tgl, a')) return; h.classList.toggle('open'); tog(b); });
  g.append(h, b); return g;
}

// ── Build entire sidebar ──

export function initUI() {
  const groupsEl = document.getElementById('groups');
  const panel = document.createElement('section');
  panel.className = 'camera-settings';
  panel.innerHTML = `<h2>Камера и проекция</h2>
    <div class="camera-modes" role="group" aria-label="Режим камеры">
      <button id="mode-ortho" type="button">Ортографическая</button>
      <button id="mode-perspective" type="button">Перспективная</button>
    </div>
    <div class="depth-label"><label for="camera-depth">Глубина перспективы</label><output id="depth-value" for="camera-depth">0%</output></div>
    <input id="camera-depth" type="range" min="0" max="1" step="0.01" value="0">
    <p class="camera-hint">0 — точная 2D-проекция · 100 — мягкая перспектива</p>
    <label class="guide-control"><input id="guide-toggle" type="checkbox"> Направляющая проекции</label>
    <p class="camera-hint">С пресетом — эталон его оси. Без пресета — текущий ракурс без перспективы.</p>
    <p class="camera-help">Перетаскивание — вращать · Колесо — масштаб<br>Правая кнопка — сдвиг · ⟲ — сброс камеры<br>Клик по пересечению — выбор фигуры · Esc — снять выделение</p>`;
  groupsEl.before(panel);
  initGoldenUI(groupsEl);
  initStudiesUI(document.getElementById('setting-display-golden'));
  const ortho = panel.querySelector('#mode-ortho'), perspective = panel.querySelector('#mode-perspective');
  const depth = panel.querySelector('#camera-depth'), value = panel.querySelector('#depth-value');
  ortho.addEventListener('click', () => setProjectionMode('orthographic'));
  perspective.addEventListener('click', () => setProjectionMode('perspective'));
  depth.addEventListener('input', () => setDepth(+depth.value));
  panel.querySelector('#guide-toggle').addEventListener('change', e => actions.display({ guide: e.target.checked }));
  settingBindings.push(() => { panel.querySelector('#guide-toggle').checked = getState().display.guide; });
  const syncProjection = () => {
    depth.value = projectionDepth; value.textContent = `${Math.round(projectionDepth * 100)}%`;
    ortho.setAttribute('aria-pressed', projectionDepth === 0);
    perspective.setAttribute('aria-pressed', projectionDepth > 0);
  };
  window.addEventListener('projection-change', syncProjection); syncProjection();

  // G1: Metatron's Cube
  {
    const div = document.createElement('div'); div.className = 'obj-row'; div.dataset.objectId = '_metatron_';
    const h = document.createElement('div'); h.className = 'obj-hdr';
    const d = document.createElement('span'); d.className = 'dot'; d.style.background = cHex(COLORS.metatron); d.style.color = cHex(COLORS.metatron);
    const n = document.createElement('span'); n.className = 'nm'; n.textContent = 'Куб Метатрона';
    const ib = document.createElement('button'); ib.className = 'ibtn'; ib.textContent = 'i'; ib.addEventListener('click', () => showInfo('metatron'));
    const vt = mkTgl(true, v => actions.objects(['_metatron_'], { visible: v }), () => getState().objects._metatron_.visible);
    h.append(d, n, ib, vt); div.appendChild(h);
    const ct = document.createElement('div'); ct.className = 'obj-ctrls';
    { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Узлы</label>'; c.appendChild(mkTgl(true, v => actions.objects(['_metatron_'], { nodes: v }), () => getState().objects._metatron_.nodes)); ct.appendChild(c); }
    { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Линии</label>'; c.appendChild(mkTgl(true, v => actions.objects(['_metatron_'], { lines: v }), () => getState().objects._metatron_.lines)); ct.appendChild(c); }
    { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Прозр.</label>';
      const vs = document.createElement('span'); vs.className = 'val'; vs.textContent = '40%';
      const slider = mkSl(getState().objects._metatron_.opacity, 0, 1, 0.01, v => actions.objects(['_metatron_'], { opacity: v }));
      settingBindings.push(() => { slider.value = getState().objects._metatron_.opacity; vs.textContent = Math.round(getState().objects._metatron_.opacity * 100) + '%'; });
      c.append(slider, vs); ct.appendChild(c); }
    h.addEventListener('click', e => { if (e.target.closest('.tgl, button, a')) return; tog(ct); });
    div.appendChild(ct);
    groupsEl.appendChild(buildGrp('Куб Метатрона', '✡', [{ id: '_metatron_', el: div }]));
  }

  // G2: Platonic Solids
  {
    const ids  = ['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron'];
    const lbl  = ['Тетраэдр', 'Куб', 'Октаэдр', 'Додекаэдр', 'Икосаэдр'];
    groupsEl.appendChild(buildGrp('Платоновы тела', '⬡', ids.map((id, i) => buildObjRow(id, lbl[i], COLORS[id]))));
  }

  // G3: Merkaba
  groupsEl.appendChild(buildGrp('Меркаба', '✦', [
    buildObjRow('merkaba_up', 'Тетраэдр ▲', COLORS.merkaba_up),
    buildObjRow('merkaba_down', 'Тетраэдр ▼', COLORS.merkaba_down),
  ]));

  // G4: Compound structures
  groupsEl.appendChild(buildGrp('Составные', '◈', [
    buildObjRow('cuboctahedron', 'Кубооктаэдр', COLORS.cuboctahedron),
  ]));

  // G5: 2D Projections (camera presets)
  {
    const grid = document.createElement('div'); grid.className = 'preset-grid';
    PRESETS.forEach(p => {
      const b = document.createElement('button'); b.className = 'preset-btn'; b.dataset.pid = p.id;
      b.innerHTML = `<span class="p-icon">${p.icon}</span><span class="p-name">${p.name}</span>`;
      b.title = p.desc;
      b.addEventListener('click', () => activatePreset(p));
      grid.appendChild(b);
    });
    const g = document.createElement('div'); g.className = 'grp';
    const h = document.createElement('div'); h.className = 'grp-hdr';
    h.innerHTML = '<span class="arr">▶</span><span class="ico">◐</span><span class="ttl">2D Проекции</span>';
    const bd = document.createElement('div'); bd.className = 'grp-body'; bd.appendChild(grid);
    const hint = document.createElement('p'); hint.className = 'preset-hint';
    hint.textContent = 'Пресет включает нужные фигуры и контуры. Ручная настройка фигур завершает режим проекции.';
    bd.appendChild(hint);
    h.addEventListener('click', e => { if (e.target.closest('a')) return; h.classList.toggle('open'); tog(bd); });
    g.append(h, bd); groupsEl.prepend(g);
  }

  // G6: Recursion
  {
    const rd = document.createElement('div'); rd.style.padding = '8px 12px 8px 28px';
    const lr = document.createElement('div'); lr.className = 'ctrl'; lr.style.marginBottom = '6px';
    lr.innerHTML = '<label>Уровни</label>';
    const bw = document.createElement('div'); bw.style.display = 'flex'; bw.style.gap = '4px';
    [1, 2, 3].forEach(lv => {
      const b = document.createElement('button'); b.textContent = lv;
      b.style.cssText = 'width:28px;height:24px;border:1px solid rgba(255,255,255,.1);border-radius:5px;background:rgba(255,255,255,.04);color:#bbb;cursor:pointer;font-size:.8em';
      b.addEventListener('click', () => actions.recursion({ depth: lv }));
      settingBindings.push(() => {
        const selected = lv === getState().recursion.depth;
        b.style.background = selected ? 'rgba(68,136,255,.3)' : 'rgba(255,255,255,.04)';
        b.style.color = selected ? '#fff' : '#bbb';
        b.setAttribute('aria-pressed', selected);
      });
      bw.appendChild(b);
    });
    lr.appendChild(bw); rd.appendChild(lr);
    const sr = document.createElement('div'); sr.className = 'ctrl'; sr.innerHTML = '<label>Масштаб</label>';
    const sv = document.createElement('span'); sv.className = 'val'; sv.textContent = getState().recursion.scale.toFixed(2);
    const scaleSlider = mkSl(getState().recursion.scale, .15, .55, .01, v => actions.recursion({ scale: v }));
    settingBindings.push(() => { scaleSlider.value = getState().recursion.scale; sv.textContent = getState().recursion.scale.toFixed(2); });
    sr.append(scaleSlider, sv);
    rd.appendChild(sr);
    const g = document.createElement('div'); g.className = 'grp';
    const h = document.createElement('div'); h.className = 'grp-hdr';
    h.innerHTML = '<span class="arr">▶</span><span class="ico">∞</span><span class="ttl">Рекурсия</span>';
    const bd = document.createElement('div'); bd.className = 'grp-body'; bd.appendChild(rd);
    h.addEventListener('click', e => { if (e.target.closest('a')) return; h.classList.toggle('open'); tog(bd); }); g.append(h, bd); groupsEl.appendChild(g);
  }

  // G7: Display settings
  {
    const dd = document.createElement('div'); dd.style.padding = '6px 12px 6px 28px';
    { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Авто-вращ.</label>'; c.appendChild(mkTgl(false, v => actions.display({ autoRotate: v }), () => getState().display.autoRotate)); dd.appendChild(c); }
    { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Скорость</label>';
      const vs = document.createElement('span'); vs.className = 'val'; vs.textContent = '.15';
      const speed = mkSl(getState().display.speed, 0, .5, .01, v => actions.display({ speed: v }));
      settingBindings.push(() => { speed.value = getState().display.speed; vs.textContent = getState().display.speed.toFixed(2); });
      c.append(speed, vs); dd.appendChild(c); }
    { const c = document.createElement('div'); c.className = 'ctrl'; c.innerHTML = '<label>Звёзды</label>'; c.appendChild(mkTgl(true, v => actions.display({ stars: v }), () => getState().display.stars)); dd.appendChild(c); }
    const g = document.createElement('div'); g.className = 'grp';
    const h = document.createElement('div'); h.className = 'grp-hdr';
    h.innerHTML = '<span class="arr">▶</span><span class="ico">⚙</span><span class="ttl">Отображение</span>';
    const bd = document.createElement('div'); bd.className = 'grp-body'; bd.appendChild(dd);
    h.addEventListener('click', e => { if (e.target.closest('a')) return; h.classList.toggle('open'); tog(bd); }); g.append(h, bd); groupsEl.appendChild(g);
  }

  // Stable semantic destinations; prose never queries controls by translated text.
  registerSetting('camera', panel, 'Камера и проекция');
  registerSetting('display.guide', panel.querySelector('.guide-control'), 'Направляющая проекции');
  registerSetting('camera.depth', panel.querySelector('#camera-depth'), 'Глубина перспективы');
  const groupKeys = { 'Платоновы тела': 'group.platonic', 'Меркаба': 'group.merkaba',
    'Куб Метатрона': 'group.metatron', 'Составные': 'group.compound',
    '2D Проекции': 'presets', 'Рекурсия': 'recursion', 'Отображение': 'display' };
  groupsEl.querySelectorAll('.grp').forEach(group => {
    const name = group.querySelector('.ttl').textContent;
    registerSetting(groupKeys[name], group, name);
  });
  // Stable ordering, independent of construction order and translated labels.
  const presetsGroup = document.getElementById('setting-presets');
  groupsEl.prepend(document.getElementById('setting-recursion'), document.getElementById('setting-display'), presetsGroup);
  presetsGroup.after(panel, document.getElementById('setting-display-golden'));
  groupsEl.querySelectorAll('.obj-row[data-object-id]').forEach(row => {
    const id = row.dataset.objectId;
    registerSetting(`object.${id}`, row, row.querySelector('.nm').textContent);
    const keys = id === '_metatron_' ? ['nodes', 'lines', 'opacity'] : ['edges', 'faces', 'opacity'];
    row.querySelectorAll('.ctrl').forEach((control, index) => {
      registerSetting(`detail.${id}.${keys[index]}`, control, `${row.querySelector('.nm').textContent}: ${control.querySelector('label').textContent}`);
    });
    const name = row.querySelector('.nm'); name.replaceChildren(settingLink(name.textContent, `object.${id}`));
    row.querySelectorAll('.ctrl > label:not(.tgl)').forEach((label, index) => {
      label.replaceChildren(settingLink(label.textContent, `detail.${id}.${keys[index]}`));
    });
  });
  const displayGroup = document.getElementById('setting-display');
  displayGroup.querySelectorAll('.ctrl').forEach((control, index) => {
    const key = ['autoRotate', 'speed', 'stars'][index]; const label = control.querySelector('label');
    registerSetting(`display.${key}`, control, label.textContent);
    label.replaceChildren(settingLink(label.textContent, `display.${key}`));
  });
  const recursionGroup = document.getElementById('setting-recursion');
  recursionGroup.querySelectorAll('.ctrl').forEach((control, index) => {
    const label = control.querySelector('label'); const key = index === 0 ? 'depth' : 'scale';
    registerSetting(`recursion.${key}`, control, label.textContent);
    label.replaceChildren(settingLink(label.textContent, `recursion.${key}`));
  });
  groupsEl.querySelectorAll('.grp-hdr .ttl').forEach(title => {
    const text = title.textContent; title.replaceChildren(settingLink(text, groupKeys[text]));
  });
  initSettingsNavigation();
  linkText(document.querySelector('.sb-head h1'));
  panel.querySelectorAll('.camera-hint, .camera-help').forEach(el => linkText(el));

  // Accessible group headers and labelled controls, including compact object rows.
  document.querySelectorAll('.grp-hdr, .obj-hdr').forEach(header => {
    header.tabIndex = 0; header.setAttribute('role', 'button');
    const sync = () => header.setAttribute('aria-expanded', header.nextElementSibling.classList.contains('open'));
    header.addEventListener('click', sync);
    header.addEventListener('keydown', event => {
      if (event.target === header && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); header.click();
      }
    });
    sync();
  });
  document.querySelectorAll('#groups input').forEach(input => {
    if (input.closest('.camera-settings, .golden-panel')) return;
    const row = input.closest('.obj-row');
    const name = row?.querySelector('.nm')?.textContent || row?.querySelector('.obj-hdr')?.textContent || '';
    const label = input.closest('.ctrl')?.querySelector('label')?.textContent || name || input.closest('.grp')?.querySelector('.ttl')?.textContent;
    input.setAttribute('aria-label', `${name && label !== name ? name + ': ' : ''}${label || 'Настройка'}`);
  });

  let renderedPreset;
  settingBindings.push(() => {
    const id = getState().presetId;
    if (id === renderedPreset) return;
    renderedPreset = id;
    const preset = getPreset(id);
    const label = document.getElementById('proj-label');
    label.replaceChildren(); label.classList.toggle('vis', !!preset);
    if (preset) {
      label.innerHTML = `<span class="pl-icon">${preset.icon}</span><span class="pl-text"><span class="pl-name">${preset.name}</span><span class="pl-desc">${preset.desc}</span></span>`;
      const close = document.createElement('button'); close.className = 'pl-close'; close.textContent = '✕';
      close.setAttribute('aria-label', 'Выйти из проекции'); close.addEventListener('click', actions.clearPreset);
      label.appendChild(close);
      linkText(label);
      const settings = settingLink('Настройки проекции', 'presets'); label.appendChild(settings);
    }
    document.querySelectorAll('.preset-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.pid === id);
      button.setAttribute('aria-pressed', button.dataset.pid === id);
    });
  });
  subscribe(syncSettingsUI);
  syncSettingsUI();

  // Open only the projection section; recursion and display start collapsed.
  const presetHeader = presetsGroup.querySelector('.grp-hdr');
  presetHeader.classList.add('open'); presetHeader.setAttribute('aria-expanded', 'true');
  presetHeader.nextElementSibling.classList.add('open');
}
