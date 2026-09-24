import { GOLDEN_CYCLE_SCALE } from '../js/constants.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {initialState,reduce} from '../js/state.js';
import {TOURS,tourStep} from '../js/tour-data.js';
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
async function load(name){if(cache.has(name))return cache.get(name);let s=await readFile(new URL('../js/'+name+'.js',import.meta.url),'utf8');s=s.replaceAll("'three'",JSON.stringify(three));for(const m of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));const value=url(s);cache.set(name,value);return value;}
const THREE=await import(three),{torusHeightDimension,placeHeightDimension,heightGrowthLog,formatGoldenHeight,formatHeightGrowth,createTorusHeightMeasure,hasTorusHeight}=await import(await load('torus-measure'));
const {tetraVerts,mkGeom}=await import(await load('geometry')),{merkabaAnchors,cubeHalfHeight}=await import(await load('torus-witness'));
const {CR,A,PHI}=await import(await load('constants'));
const near=(a,b,m,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${m}: ${a} vs ${b}`);
class Node{children=[];style={};attributes={};hidden=false;textContent='';setAttribute(k,v){this.attributes[k]=String(v);}append(...nodes){this.children.push(...nodes);}remove(){this.removed=true;}}
globalThis.document={createElement:()=>new Node(),createElementNS:()=>new Node()};
const host=new Node(),measure=createTorusHeightMeasure(host),overlay=host.children[0],svg=overlay.children[0],label=overlay.children[1];
const parent=new THREE.Group(),level={objs:{}};
for(const [id,inverse]of [['merkaba_up',false],['merkaba_down',true]]){const mesh=new THREE.Mesh(mkGeom(tetraVerts(CR,inverse)));parent.add(mesh);level.objs[id]={mesh};}
const cube=new THREE.Mesh(new THREE.BoxGeometry(2*A,2*A,2*A));parent.add(cube);level.objs.cube={mesh:cube};
const viewport={width:1280,height:800,usableWidth:720,usableHeight:650,centerX:390,centerY:400};
const cameras=[new THREE.OrthographicCamera(-12,12,7.5,-7.5,.01,500),new THREE.PerspectiveCamera(32,1280/800,.01,500)];
for(const camera of cameras)for(const scale of [.15,1,8.99])for(const angle of [0,.37,1.8,4.5])for(const direction of [[3,1,6],[0,1,.001],[-4,5,-4]]){
 parent.scale.setScalar(scale);parent.rotation.y=angle*.8;
 level.objs.merkaba_up.mesh.rotation.y=angle;level.objs.merkaba_down.mesh.rotation.y=-angle;parent.updateMatrixWorld(true);
 camera.position.set(...direction).normalize().multiplyScalar(100);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const anchors=merkabaAnchors(level),data=torusHeightDimension(anchors,camera);
 near(data.height,2*cubeHalfHeight(level),'Measured distance is the actual cube and torus height');
 near(data.ends[0].distanceTo(data.ends[1]),data.height,'The outside dimension is a true vertical length');
 for(let i=0;i<2;i++){near(data.supports[i].y,data.ends[i].y,'Each extension is horizontal in 3D');near(data.ends[i].x,data.ends[0].x,'Both height ends share one vertical column');near(data.ends[i].z,data.ends[0].z,'Both height ends share one vertical column');}
 near(Math.exp(heightGrowthLog(data.height)),scale,'Growth is read from source vertices');
 const placed=placeHeightDimension(data,camera,viewport);near(placed.ends[0].distanceTo(placed.ends[1]),data.height,'Moving the dimension column never changes the measured height');
 for(const end of placed.ends){const x=(end.clone().project(camera).x+1)*viewport.width/2;assert.ok(x>=viewport.centerX-viewport.usableWidth/2+7.99,'The bracket remains visible during macro framing');}

 measure.update({enabled:true,anchors,camera,viewport});assert.equal(overlay.hidden,false);
 for(let i=0;i<2;i++){
  const p=data.supports[i].clone().project(camera),dot=svg.children[i+3];
  near(+dot.attributes.cx,(p.x+1)*viewport.width/2,'Extension starts at the current rendered support');
  near(+dot.attributes.cy,(1-p.y)*viewport.height/2,'No one-frame lag under free orbit');
 }
 assert.ok(Number.parseFloat(label.style.left)>=30&&Number.parseFloat(label.style.left)<=viewport.centerX+viewport.usableWidth/2,'Caption remains inside the stage');
}
const camera=cameras[0],anchors=merkabaAnchors(level);
measure.update({enabled:true,anchors,camera,viewport});
const previousTop=parseFloat(label.style.top),previousLeft=parseFloat(label.style.left);
const obstacle={left:previousLeft,right:previousLeft+136,top:previousTop,bottom:previousTop+48};
measure.update({enabled:true,anchors,camera,viewport,obstacles:[obstacle]});
const shiftedTop=parseFloat(label.style.top);
assert.ok(shiftedTop+48<=obstacle.top-5||shiftedTop>=obstacle.bottom+5,'Height caption avoids existing geometric annotations');
for(const [width,height,panelTop,stageBottom]of [[390,844,624,594],[390,844,410,380],[320,568,350,320],[844,390,104,166]]){
 const phone={width,height,usableWidth:width-48,usableHeight:stageBottom-76,centerX:width/2,centerY:(stageBottom+76)/2};
 measure.update({enabled:true,anchors,camera,viewport:phone,panelTop});
 assert.equal(overlay.attributes['data-compact'],'true');
 const top=parseFloat(label.style.top);assert.ok(top>=76&&top+24<panelTop,'Compact caption clears the header and player even in landscape');
 if(height>600||width<700)assert.ok(top>=stageBottom,'Phone height text is outside the geometry stage, with either folded or expanded text');
 near(parseFloat(label.style.left),width/2,'Compact caption stays centred above the player');
}
measure.update({enabled:true,anchors,camera,viewport});assert.equal(overlay.attributes['data-compact'],'false','Returning to desktop restores the drafting caption');
for(const units of [-10,0,10,100000])for(const scale of [1.001,4,8.99]){
 near(heightGrowthLog(2*A*scale,units),Math.log(scale)+units*2*Math.log(GOLDEN_CYCLE_SCALE),'Counter restores physical units');
 near(heightGrowthLog(2*A*scale,units),heightGrowthLog(2*A*scale/GOLDEN_CYCLE_SCALE**2,units+1),'Numerical rebasing cannot reset the counter');
 assert.ok(!/Infinity|NaN/.test(formatHeightGrowth(heightGrowthLog(2*A*scale,units))),'The endless finale has a finite notation');
}
near(heightGrowthLog(2*A*PHI)-heightGrowthLog(2*A),Math.log(PHI),'A golden step multiplies the measured height by phi');
assert.equal(formatGoldenHeight(0),'0');assert.equal(formatGoldenHeight(Math.log(PHI)*3),'3');assert.equal(formatGoldenHeight(-Math.log(PHI)*1.5),'-1,5');
assert.equal(formatHeightGrowth(0),'×1,00');assert.equal(formatHeightGrowth(Math.log(PHI)),'×1,62');
measure.update({enabled:false});assert.equal(overlay.hidden,true,'Toggle hides lines and label together');
measure.update({enabled:true,anchors:null});assert.equal(overlay.hidden,true,'Leaving the geometric scene clears the measure');
measure.dispose();assert.equal(overlay.removed,true);
let state=reduce(initialState(),{type:'tour/start',id:'torus',index:TOURS.torus.steps.findIndex(s=>s.id==='torus-birth')});
const before=state.tour;assert.equal(state.display.torusHeight,true);assert.equal(hasTorusHeight(tourStep(state).scene),true);
state=reduce(state,{type:'display/change',patch:{torusHeight:false}});assert.equal(state.tour,before,'Hiding dimensions does not pause, restart or exit the tour');
state=reduce(state,{type:'tour/step',index:state.tour.index+1});assert.equal(state.display.torusHeight,false,'Hidden setting survives chapters');
state=reduce(state,{type:'tour/start',id:'fruit'});assert.equal(hasTorusHeight(tourStep(state).scene),false);
assert.throws(()=>reduce(state,{type:'display/change',patch:{torusHeight:1}}));
for(const o of Object.values(level.objs))o.mesh.geometry.dispose();
console.log('PASS: actual spiral supports and cube-height dimension, current camera projection, continuous growth through rebasing, reverse-scale notation and independent toggle');
