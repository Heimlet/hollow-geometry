import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {A,PHI} from '../js/constants.js';
import {ORBIT_SEEDS,orbitPoint,spiralGuide,SPIRAL_WINDOW,torusFrameFromAnchors} from '../js/torus-math.js';
import {goldenFunnelRadius,goldenFunnelBounds,funnelReveal,FUNNEL_EXTENT} from '../js/torus-funnel-math.js';
import {TOURS} from '../js/tour-data.js';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,message);
assert.equal(TOURS.torus.steps.length,14);assert.equal(TOURS.torus.steps[12].id,'torus-whole');
// Independent elimination of the actual guide parameter: rho / |z| = sqrt(2).
for(const seed of ORBIT_SEEDS)for(const a of [.2,A,17])for(let i=0;i<=1024;i++){
  const turn=SPIRAL_WINDOW.from+(SPIRAL_WINDOW.to-SPIRAL_WINDOW.from)*i/1024;
  const point=spiralGuide({point:seed.point.map(x=>x*a/A),side:seed.side},turn);
  assert.ok(Math.abs(Math.hypot(point[0],point[1])-goldenFunnelRadius(point[2]))/Math.max(a,Math.abs(point[2]))<1e-12,
    'Every point on every mirrored guide lies on the surface, including fractional and distant turns');
}
assert.equal(goldenFunnelRadius(0),0,'The guides converge at a common apex, not an arbitrary circular waist');
near(FUNNEL_EXTENT,PHI**SPIRAL_WINDOW.to,'Surface and spirals share their far height limit');
for(const a of [.2,A,17])for(const z of [-100*a,-PHI*a,-a,0,a,PHI*a,100*a]){
 near(goldenFunnelRadius(z),Math.SQRT2*Math.abs(z));
 near(goldenFunnelRadius(-z),goldenFunnelRadius(z));
}
assert.equal(funnelReveal('whole',0),0);assert.equal(funnelReveal('whole',1),funnelReveal('cosmos',0));
for(const kind of ['mechanism','golden','birth',null])assert.equal(funnelReveal(kind,1),0,'Nothing leaks into earlier chapters or the laboratory');
for(const reveal of [.1,.5,1])for(const point of goldenFunnelBounds(reveal))near(Math.abs(point[2]),A*PHI*reveal,'Camera bounds follow the reveal');

const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
async function load(name){if(cache.has(name))return cache.get(name);let s=await readFile(new URL('../js/'+name+'.js',import.meta.url),'utf8');s=s.replaceAll("'three'",JSON.stringify(three));for(const m of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));const result=url(s);cache.set(name,result);return result;}
const THREE=await import(three),{createTorusFunnels}=await import(await load('torus-funnels'));
const scene=new THREE.Scene(),surface=createTorusFunnels(scene),geometry=new Map();
scene.traverse(o=>{if(o.geometry)geometry.set(o.geometry,Array.from(o.geometry.attributes.position.array));});
scene.traverse(o=>{
 if(!['Upper phi funnel','Lower phi funnel'].includes(o.name))return;
 const p=o.geometry.attributes.position;
 for(let i=0;i<p.count;i++)assert.ok(Math.abs(Math.hypot(p.getX(i),p.getY(i))-Math.SQRT2*Math.abs(p.getZ(i)))/Math.max(A,Math.abs(p.getZ(i)))<2e-7,'Rendered mesh obeys the spiral surface, including distant extension');
});
const snapshot=()=>{const result=[];scene.traverse(o=>{if(o.material)result.push([o.material.opacity,o.geometry.drawRange.count,o.position.toArray(),o.rotation.toArray(),o.material.uniforms?.reveal?.value]);});return result;};
for(const scale of [.4,1,PHI,8.9])for(const angle of [0,.32,2,5.8]){
  const anchors=ORBIT_SEEDS.map(seed=>orbitPoint(seed,angle).map(x=>x*scale)),frame=torusFrameFromAnchors(anchors);
  surface.update('whole',0,frame,anchors);assert.equal(surface.group.visible,false);
  surface.update('whole',1,frame,anchors);scene.updateMatrixWorld(true);
  const now=snapshot();surface.update('cosmos',0,frame,anchors);assert.deepEqual(snapshot(),now,'13 → 14 keeps all surfaces, contacts and opacity continuous');
  const markers=[];scene.traverse(o=>{if(o.name==='Next phi contact'||o.name==='Current funnel contact')markers.push(o);});
  markers.forEach((marker,i)=>{
    const source=i<2?7:0,turn=i%2,expected=new THREE.Vector3(...spiralGuide({point:anchors[source],side:ORBIT_SEEDS[source].side},turn));
    assert.ok(marker.getWorldPosition(new THREE.Vector3()).distanceTo(expected)<1e-9,'Both mirrored live anchors and their successors match the visible contacts');
  });
  surface.update('golden',.5,frame,anchors);assert.equal(surface.group.visible,false);
  surface.update('whole',1,frame,anchors);assert.deepEqual(snapshot(),now,'Seek and backward navigation are deterministic');
}
scene.traverse(o=>{if(o.geometry)assert.ok(geometry.has(o.geometry),'Buffers are reused during indefinite expansion');});
for(const [buffer,data]of geometry)assert.deepEqual(Array.from(buffer.attributes.position.array),data,'No original vertices are modified');
assert.ok([...geometry.values()].reduce((n,a)=>n+a.length/3,0)<25000,'Bounded mobile geometry budget');
console.log('PASS: entire mirrored golden guides lie on the surface, shared extent, rendered mesh, live contacts, smooth final boundary and bounded reusable buffers');
