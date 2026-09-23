/**
 * Geometry helper functions + SObj (Sacred Object) and MCube (Metatron's Cube) classes.
 *
 * Mathematical note: cuboctahedron vertices sit at edge-midpoints of the cube.
 * If cube half-side = a, then cuboctahedron circumradius = a√2.
 */
import * as THREE from 'three';
import { S2, S3 } from './constants.js';

// ── Low-level helpers ──

export function mkGeom(verts, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts.flat()), 3));
  if (idx) g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function mkEdges(verts, pairs) {
  const p = [];
  for (const [a, b] of pairs) p.push(...verts[a], ...verts[b]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return g;
}

/** Cuboctahedron data: 12 vertices, 24 edges, 20 triangulated faces. */
export function cuboctData(R) {
  const s = R * S2;
  const v = [
    [s,s,0],[s,-s,0],[-s,s,0],[-s,-s,0],
    [0,s,s],[0,s,-s],[0,-s,s],[0,-s,-s],
    [s,0,s],[s,0,-s],[-s,0,s],[-s,0,-s],
  ];
  const f = [
    0,4,8, 0,9,5, 1,8,6, 1,7,9,
    2,10,4, 2,5,11, 3,6,10, 3,11,7,
    0,4,2, 0,2,5, 1,7,3, 1,3,6,
    8,6,10, 8,10,4, 9,5,11, 9,11,7,
    0,9,1, 0,1,8, 2,10,3, 2,3,11,
  ];
  const e = [
    [0,4],[0,5],[0,8],[0,9],[1,6],[1,7],[1,8],[1,9],
    [2,4],[2,5],[2,10],[2,11],[3,6],[3,7],[3,10],[3,11],
    [4,8],[4,10],[5,9],[5,11],[6,8],[6,10],[7,9],[7,11],
  ];
  return { v, f, e };
}

/** Tetrahedron vertices inscribed in a cube of circumradius R. */
export function tetraVerts(R, inverted) {
  const s = R * S3;
  const m = inverted ? -1 : 1;
  return [
    [m*s, m*s, m*s],
    [m*s, -m*s, -m*s],
    [-m*s, m*s, -m*s],
    [-m*s, -m*s, m*s],
  ];
}

export const TF = [0,2,1, 0,3,2, 0,1,3, 1,2,3];
export const TE = [[0,1],[0,2],[0,3],[1,2],[2,3],[3,1]];

// ── SObj: wraps a mesh + edges into a toggleable group ──

export class SObj {
  constructor(id, geom, eGeom, color, opacity = 0.2) {
    this.id = id;
    this.color = color;
    this._vis = true;
    this._eVis = true;
    this._fVis = true;
    this._op = opacity;
    this.group = new THREE.Group();

    this.fMat = new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity, side: THREE.DoubleSide,
      depthWrite: false, roughness: 0.35, metalness: 0.05,
      emissive: color, emissiveIntensity: 0.05,
    });
    this.mesh = new THREE.Mesh(geom, this.fMat);
    this.mesh.renderOrder = 1;
    this.group.add(this.mesh);

    this.eMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    this.edges = new THREE.LineSegments(
      eGeom || new THREE.EdgesGeometry(geom, 1), this.eMat,
    );
    this.edges.renderOrder = 2;
    this.group.add(this.edges);
  }

  get vis()  { return this._vis; }   set vis(v)  { this._vis = v; this.group.visible = v; }
  get eVis() { return this._eVis; }  set eVis(v) { this._eVis = v; this.edges.visible = v; }
  get fVis() { return this._fVis; }  set fVis(v) { this._fVis = v; this.mesh.visible = v; }
  get op()   { return this._op; }    set op(v)   { this._op = v; this.fMat.opacity = v; }
}

// ── MCube: Metatron's Cube (13 nodes + K₁₃ lines) ──

export class MCube {
  constructor(R, color, levelIndex) {
    this.R = R;
    this.color = color;
    this.lv = levelIndex;
    this.group = new THREE.Group();
    this._vis = true;
    this._nVis = true;
    this._lVis = true;
    this._op = 0.4;

    const s = R * S2;
    this.pos = [
      [0,0,0],
      [s,s,0],[s,-s,0],[-s,s,0],[-s,-s,0],
      [0,s,s],[0,s,-s],[0,-s,s],[0,-s,-s],
      [s,0,s],[s,0,-s],[-s,0,s],[-s,0,-s],
    ];

    // Nodes (spheres)
    const sg = new THREE.SphereGeometry(R * 0.04, 10, 10);
    this.nMat = new THREE.MeshPhysicalMaterial({
      color, emissive: color, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.3, transparent: true, opacity: 1,
    });
    this.nodes = [];
    for (const p of this.pos) {
      const m = new THREE.Mesh(sg, this.nMat.clone());
      m.position.set(...p);
      this.nodes.push(m);
      this.group.add(m);
    }

    // Lines (complete graph K₁₃ = 78 edges)
    const lp = [];
    for (let i = 0; i < 13; i++)
      for (let j = i + 1; j < 13; j++)
        lp.push(...this.pos[i], ...this.pos[j]);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    this.lMat = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: this._op, depthWrite: false,
    });
    this.lines = new THREE.LineSegments(lg, this.lMat);
    this.group.add(this.lines);
  }

  get vis()  { return this._vis; }   set vis(v)  { this._vis = v; this.group.visible = v; }
  get nVis() { return this._nVis; }  set nVis(v) { this._nVis = v; this.nodes.forEach(n => n.visible = v); }
  get lVis() { return this._lVis; }  set lVis(v) { this._lVis = v; this.lines.visible = v; }
  get op()   { return this._op; }    set op(v)   { this._op = v; this.lMat.opacity = v; }
}
