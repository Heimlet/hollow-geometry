import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {A,PHI} from '../js/constants.js';
import {ORBIT_SEEDS,orbitPoint,spiralGuide,torusFrameFromAnchors} from '../js/torus-math.js';
import {goldenFunnelRadius,goldenFunnelCurvature,goldenFunnelBounds,funnelReveal,FUNNEL_EXTENT} from '../js/torus-funnel-math.js';
import {TOURS} from '../js/tour-data.js';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,message);
assert.equal(TOURS.torus.steps.length,14);assert.equal(TOURS.torus.steps[12].id,'torus-whole');
for(const a of [.2,A,17]){
  near(goldenFunnelRadius(0,a),a,'Waist is fixed by real edge midpoints');
  near(goldenFunnelRadius(a,a),Math.SQRT2*a,'Current supports touch the funnel and torus');
  near(goldenFunnelRadius(PHI*a,a),PHI*Math.SQRT2*a,'Next golden supports lie on the next contact ring');
  near(1/goldenFunnelCurvature(0,a),PHI*a,'Meridional curvature radius is phi times the waist radius');
  const h=a*1e-4,second=(goldenFunnelRadius(h,a)-2*a+goldenFunnelRadius(-h,a))/(h*h);
  assert.ok(Math.abs(second-1/(PHI*a))<1e-6,'Independent finite difference confirms the curvature');
  for(let i=0;i<=100;i++){const z=PHI*a*i/100;near(goldenFunnelRadius(z,a),goldenFunnelRadius(-z,a));assert.ok(goldenFunnelCurvature(z,a)>0);}
}
for(const side of [-1,1]){
  const vertices=ORBIT_SEEDS.filter(s=>s.side===side).map(s=>s.point);
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(vertices[i][2]!==vertices[j][2]){
    const midpoint=vertices[i].map((v,k)=>(v+vertices[j][k])/2);
    near(midpoint[2],0);near(Math.hypot(midpoint[0],midpoint[1]),goldenFunnelRadius(0));
  }
}
// The actual golden guide contacts coincide; intermediate guide points need not.
for(const seed of ORBIT_SEEDS)for(const turn of [0,1]){
  const point=spiralGuide(seed,turn);near(Math.hypot(point[0],point[1]),goldenFunnelRadius(point[2]));
}
for(const t of [.3,.8,1.2,2,4,10]){
 const gap=goldenFunnelRadius(A*t)**2-2*(A*t)**2;
 near(gap,A*A/PHI**2*(t*t-1)*(t*t-PHI*PHI),'Only the two marked levels meet the spiral');
}
assert.ok(FUNNEL_EXTENT>40,'Continuation reaches many body heights beyond the contact rings');
const between=spiralGuide(ORBIT_SEEDS[7],.5);
assert.ok(Math.abs(Math.hypot(between[0],between[1])-goldenFunnelRadius(between[2]))>.01);
assert.equal(funnelReveal('whole',0),0);assert.equal(funnelReveal('whole',1),funnelReveal('cosmos',0));
for(const kind of ['mechanism','golden','birth',null])assert.equal(funnelReveal(kind,1),0,'Nothing leaks into earlier chapters or the laboratory');
for(const reveal of [.1,.5,1])for(const point of goldenFunnelBounds(reveal))near(Math.abs(point[2]),A*PHI*reveal,'Camera bounds follow the reveal');

const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
async function load(name){if(cache.has(name))return cache.get(name);let s=await readFile(new URL('../js/'+name+'.js',import.meta.url),'utf8');s=s.replaceAll("'three'",JSON.stringify(three));for(const m of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));const result=url(s);cache.set(name,result);return result;}
const THREE=await import(three),{createTorusFunnels}=await import(await load('torus-funnels'));
const scene=new THREE.Scene(),surface=createTorusFunnels(scene),geometry=new Map();
scene.traverse(o=>{if(o.geometry)geometry.set(o.geometry,Array.from(o.geometry.attributes.position.array));});
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
console.log('PASS: exact current/future spiral contacts, real edge-midpoint waist, phi curvature, mirrored scaling, smooth final boundary, deterministic bounded buffers');
