import { COMPOUNDS } from './compound-data.js';
import { compoundCoordinates, hull, packGeometry, packEdges } from './polyhedra-math.js';
/**
 * Recursion levels — each level contains a complete set of all objects
 * (Metatron's Cube + all Platonic solids + Merkaba + cuboctahedron)
 * scaled by recursionScale^levelIndex.
 *
 * Level 0 = main scene. Level 1+ = nested inner copies.
 */
import * as THREE from 'three';
import { R_META, S2, PHI, COLORS } from './constants.js';
import { SObj, MCube, mkGeom, mkEdges, cuboctData, tetraVerts, TF, TE } from './geometry.js';
import { scene } from './scene.js';
import { getState, subscribe } from './state.js';
import { getPreset } from './preset-data.js';

const coordinates = compoundCoordinates(1);
const templates = Object.fromEntries(['tetra5','tetra5Mirror','tetra10','cube5'].map(key=>[key,coordinates[key].map(points=>hull(points))]));
export const levels = [];
function applySettings(level, state) {
  const presetFocus = getPreset(state.presetId)?.obj;
  const metaSettings = state.objects._metatron_;
  const attenuation = 1 / (level.idx + 1);
  for (const [id, object] of Object.entries(level.objs)) {
    const settings = state.objects[id];
    object.vis = settings.visible; object.eVis = settings.edges; object.fVis = settings.faces;
    object.op = settings.opacity * attenuation;
    const selected = presetFocus?.includes(id);
    object.fMat.opacity = presetFocus && !selected ? object.op * .08 : object.op;
    object.eMat.opacity = presetFocus ? (selected ? 1 : .04) : .85;
    if(state.goldenScene.id!=='none')object.eMat.opacity=id==='dodecahedron'?.16:.08;
    object.fMat.emissiveIntensity = presetFocus ? (selected ? .2 : .01) : .05;
  }
  const meta = level.mc;
  meta.vis = metaSettings.visible; meta.nVis = metaSettings.nodes; meta.lVis = metaSettings.lines;
  meta.op = metaSettings.opacity * attenuation;
  const dim = presetFocus && !presetFocus.includes('_metatron_');
  if (dim) meta.lMat.opacity *= .075;
  meta.nodes.forEach(node => { node.material.transparent = true; node.material.opacity = dim ? .05 : 1; });
}
export function refreshLevelAppearance() { levels.forEach(level=>applySettings(level,getState())); }
// ── Create a single recursion level ──

function createLevel(scale, idx) {
  const R  = R_META * scale;
  const a  = R * S2;
  const cR = a * Math.sqrt(3);
  const oR = a;
  const iR = a * Math.sqrt(PHI + 2) / (PHI * PHI);

  const lvl = { scale, idx, group: new THREE.Group(), objs: {}, mc: null };

  // Metatron's Cube
  lvl.mc = new MCube(
    R,
    new THREE.Color(COLORS.metatron).lerp(new THREE.Color(0x4466aa), idx * 0.3),
    idx,
  );
  lvl.group.add(lvl.mc.group);

  // Helper to create + register an SObj
  const make = (id, geom, eG, col) => {
    const o = new SObj(id, geom, eG, col, 0);
    lvl.objs[id] = o;
    lvl.group.add(o.group);
  };

  // Platonic solids (radii derived from cuboctahedron)
  make('tetrahedron',  new THREE.TetrahedronGeometry(cR),    null, COLORS.tetrahedron);
  const tetraPositions=lvl.objs.tetrahedron.mesh.geometry.attributes.position;
  const mirror=hull(Array.from({length:tetraPositions.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(tetraPositions,i).negate()));
  make('tetrahedron_mirror',packGeometry(mirror),packEdges(mirror),COLORS.tetrahedron_mirror);
  make('cube',         new THREE.BoxGeometry(2*a, 2*a, 2*a), null, COLORS.cube);
  make('octahedron',   new THREE.OctahedronGeometry(oR),     null, COLORS.octahedron);
  make('dodecahedron', new THREE.DodecahedronGeometry(cR),   null, COLORS.dodecahedron);
  make('icosahedron',  new THREE.IcosahedronGeometry(iR),    null, COLORS.icosahedron);

  // Merkaba (two tetrahedra — same circumradius as cube)
  for (const inv of [false, true]) {
    const key = inv ? 'merkaba_down' : 'merkaba_up';
    const vv  = tetraVerts(cR, inv);
    make(key, mkGeom(vv, TF), mkEdges(vv, TE), inv ? COLORS.merkaba_down : COLORS.merkaba_up);
  }

  // Cuboctahedron
  {
    const d = cuboctData(R);
    make('cuboctahedron', mkGeom(d.v, d.f), mkEdges(d.v, d.e), COLORS.cuboctahedron);
  }

  for(const compound of COMPOUNDS.filter(c=>c.id!=='merkaba')) {
    const key=compound.id==='tetra5' && getState().lab.collections.tetra5.mirror?'tetra5Mirror':compound.id;
    compound.members.forEach((id,i)=>make(id,packGeometry(templates[key][i]).scale(cR,cR,cR),packEdges(templates[key][i]).scale(cR,cR,cR),COLORS[id]));
  }
  return lvl;
}

/** Rebuild all levels from scratch. */
function buildLevels(state) {
  const resources = new Set();
  levels.forEach(level => {
    scene.remove(level.group);
    level.group.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) resources.add(object.material);
    });
    resources.add(level.mc.nMat);
  });
  resources.forEach(resource => resource.dispose());
  levels.length = 0;
  for (let i = 0; i < state.recursion.depth; i++) {
    const l = createLevel(Math.pow(state.recursion.scale, i), i);
    levels.push(l);
    scene.add(l.group);
    applySettings(l, state);
  }
}

// Rebuild is a rendering consequence, never a second UI command.
subscribe((state, previous) => {
  if (state.lab.collections.tetra5.mirror !== previous.lab.collections.tetra5.mirror || state.recursion.depth !== previous.recursion.depth || state.recursion.scale !== previous.recursion.scale) {
    buildLevels(state);
  } else if (state.objects !== previous.objects || state.presetId !== previous.presetId || state.goldenScene.id!==previous.goldenScene.id) {
    levels.forEach(level => applySettings(level, state));
  }
});
buildLevels(getState());
