// node tests/inspection.mjs /absolute/path/to/three.module.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const threeURL = pathToFileURL(process.argv[2]).href;
const THREE = await import(threeURL);
const url = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const constants = url((await readFile(new URL('../js/constants.js', import.meta.url), 'utf8')).replace("'./compound-data.js'", JSON.stringify(new URL('../js/compound-data.js', import.meta.url).href)));
const hintsSource = (await readFile(new URL('../js/preset-hints.js', import.meta.url), 'utf8'))
  .replace("'three'", JSON.stringify(threeURL)).replace("'./constants.js'", JSON.stringify(constants));
const { TimedHint } = await import(url(hintsSource));
const { uniqueHits } = await import(url(await readFile(new URL('../js/pick-targets.js', import.meta.url), 'utf8')));
const scene = new THREE.Scene(); let now = 0;
const hint = new TimedHint(scene, () => now);
const star = { id: 'pentagram', star: true, dir: [0, (1 + Math.sqrt(5)) / 2, 1] };
hint.start({ id: 'metatron2d' });
assert.equal(scene.children[0].children.filter(child => child.isMesh).length, 1, 'cube faces exist');
let disposed = false;
scene.children[0].children[0].geometry.addEventListener('dispose', () => { disposed = true; });
now = 4999; hint.update(); assert.equal(hint.guides.length, 1);
now = 5000; hint.update(); assert.equal(scene.children.length, 0); assert.equal(hint.guides.length, 0); assert.ok(disposed);
hint.start(star); now = 8000; hint.start(star); // Reselect restarts; no previous timeout.
now = 10001; hint.update(); assert.equal(hint.guides.length, 1);
now = 13000; hint.update(); assert.equal(hint.guides.length, 0);
hint.start(star); hint.start({ id: 'square' }); assert.equal(scene.children.length, 0);
const mesh = size => new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
const outer = mesh(4), inner = mesh(2);
outer.updateMatrixWorld(); inner.updateMatrixWorld();
const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1));
const owners = new Map([[outer, { key: 'cube:0' }], [inner, { key: 'cube:1' }]]);
const hits = uniqueHits(ray.intersectObjects([outer, inner]), owners);
assert.deepEqual(hits.map(hit => hit.key), ['cube:0', 'cube:1'], 'inner figure survives front/back surface hits');
console.log('PASS: cube faces + star expire at 5000ms, guides clear, reselect restarts, cancel disposes, nested overlapping figures remain selectable');
