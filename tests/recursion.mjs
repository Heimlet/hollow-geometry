// Run with the same Three.js version as index.html:
// node tests/recursion.mjs /absolute/path/to/three.module.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const three = pathToFileURL(process.argv[2]).href;
const moduleURL = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  let text = name === 'scene' ? `import { Scene } from 'three'; export const scene = new Scene();`
    : await readFile(new URL(`../js/${name}.js`, import.meta.url), 'utf8');
  text = text.replaceAll("'three'", JSON.stringify(three));
  for (const match of [...text.matchAll(/'\.\/([\w-]+)\.js'/g)]) {
    text = text.replaceAll(match[0], JSON.stringify(await load(match[1])));
  }
  const url = moduleURL(text); cache.set(name, url); return url;
}
const { getState, actions, subscribe, ALL_IDS, groupVisibility, createStore } = await import(await load('state'));
const { PRESETS } = await import(await load('preset-data'));
const { levels } = await import(await load('levels'));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);
let notifications = 0;
subscribe(() => notifications++);
function assertConsistent() {
  const state = getState(), preset = PRESETS.find(p => p.id === state.presetId);
  assert.equal(levels.length, state.recursion.depth);
  for (const level of levels) {
    near(level.scale, state.recursion.scale ** level.idx);
    for (const id of ALL_IDS) {
      const setting = state.objects[id], object = id === '_metatron_' ? level.mc : level.objs[id];
      assert.equal(object.vis, setting.visible, `${id} visibility disagrees with state`);
      near(object.op, setting.opacity / (level.idx + 1));
      if (id === '_metatron_') {
        assert.equal(object.nVis, setting.nodes); assert.equal(object.lVis, setting.lines);
      } else {
        assert.equal(object.eVis, setting.edges); assert.equal(object.fVis, setting.faces);
        near(object.eMat.opacity, preset ? (preset.obj.includes(id) ? 1 : .04) : .85);
      }
      if (preset?.obj.includes(id)) {
        assert.equal(object.vis, true);
        if (id === '_metatron_') assert.ok(object.lVis && object.lMat.opacity > 0);
        else assert.ok(object.eVis && object.eMat.opacity > 0);
      }
    }
  }
}
assert.equal(getState().recursion.depth, 1);
assert.ok(ALL_IDS.every(id => !getState().objects[id].visible && !getState().objects[id].edges && !getState().objects[id].faces && !getState().objects[id].nodes && !getState().objects[id].lines));
// Regression: all visibility/detail controls off -> ANY preset -> recurse/resize.
for (const preset of PRESETS) {
  actions.objects(ALL_IDS, { visible: false, edges: false, faces: false, nodes: false, lines: false, opacity: 0 });
  const before = notifications;
  actions.preset(preset.id);
  assert.equal(notifications, before + 1, 'preset selection must be atomic');
  assert.equal(getState().presetId, preset.id);
  assert.equal(groupVisibility(getState(), preset.obj), true);
  assertConsistent();
  for (const depth of [3, 1, 2]) {
    actions.recursion({ depth, scale: .2 + depth * .05 }); assertConsistent();
    assert.equal(getState().presetId, preset.id);
  }
  actions.preset(preset.id); // Repeated click exits preset mode.
  assert.equal(getState().presetId, null); assertConsistent();
  actions.preset(preset.id);
  assert.equal(getState().presetId, preset.id);
  actions.objects([preset.obj[0]], { visible: false });
  assert.equal(getState().presetId, null, 'manual override ends preset'); assertConsistent();
}
// Previous regression: custom settings survive reconstruction and show-all.
actions.objects(ALL_IDS, { visible: false });
actions.objects(['cube'], { visible: true, edges: false, faces: true, opacity: .37 });
assert.equal(groupVisibility(getState(), ['cube', 'tetrahedron']), 'mixed');
for (const depth of [1, 3, 2]) {
  actions.recursion({ depth, scale: .45 }); assertConsistent();
  assert.equal(getState().objects.cube.edges, false);
  assert.equal(getState().objects.tetrahedron.visible, false);
}
actions.objects(ALL_IDS, { visible: true });
assert.equal(getState().objects.cube.edges, false);
assert.equal(groupVisibility(getState(), ALL_IDS), true);
actions.objects(ALL_IDS, {visible: false});
for (const id of ALL_IDS) {
  const object = getState().objects[id];
  for (const key of ['visible','edges','faces','nodes','lines']) assert.equal(object[key],false);
}
actions.recursion({depth:3});assertConsistent();
actions.objects(['cube'],{visible:true});
assert.equal(getState().objects.cube.edges,true);assert.equal(getState().objects.cube.faces,true);
actions.objects(['cube'],{visible:false});actions.objects(['cube'],{edges:true});
assert.equal(getState().objects.cube.visible,true);
assert.equal(getState().objects.cube.faces,false);
// Deterministic mixed action sequences check invariants after EACH transition.
let seed = 7937;
for (let i = 0; i < 300; i++) {
  seed = (1664525 * seed + 1013904223) >>> 0;
  const id = ALL_IDS[seed % ALL_IDS.length];
  switch (seed % 6) {
    case 0: actions.preset(PRESETS[(seed >>> 8) % PRESETS.length].id); break;
    case 1: actions.objects([id], { visible: !!(seed & 256) }); break;
    case 2: actions.recursion({ depth: 1 + ((seed >>> 8) % 3), scale: .35 }); break;
    case 3: actions.objects([id], { edges: false, lines: false, opacity: 0 }); break;
    case 4: actions.clearPreset(); break;
    case 5: actions.display({ stars: !!(seed & 256), autoRotate: !!(seed & 512) }); break;
  }
  assertConsistent();
}
// Snapshots cannot be mutated, invalid actions cannot corrupt committed state.
const store = createStore(), snapshot = store.getState();
assert.throws(() => { snapshot.objects.cube.visible = false; }, TypeError);
assert.throws(() => store.dispatch({ type: 'preset/select', id: 'missing' }));
assert.equal(store.getState(), snapshot);
console.log('PASS: all 8 presets after hidden/transparent objects, atomic commands, manual overrides, recursion, group selectors, immutable state, 300 mixed transitions + Three.js rendering invariants');
