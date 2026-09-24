import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { TOURS } from '../js/tour-data.js';
import { tourFaceOpacity,tourObjectAlpha } from '../js/tour-effects.js';
const threeURL=pathToFileURL(process.argv[2]).href,THREE=await import(threeURL);
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const projectionURL=url((await readFile(new URL('../js/projection.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`));
const {frameCamera,configureProjection}=await import(projectionURL);
const {shotAt,fitTourFrame,stageViewport}=await import(url((await readFile(new URL('../js/tour-camera-math.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`).replace("from './projection.js'",`from '${projectionURL}'`)));
const base=new THREE.Vector3(3,2,4).normalize(),diagonal=new THREE.Vector3(1,1,1).normalize();
for(const id of ['platonic','metatron'])for(const p of [.88,.92,1]) {
  const shot=shotAt(TOURS[id].steps.at(-1).scene,base,p);
  assert.ok(shot.direction.distanceTo(diagonal)<1e-12);assert.equal(shot.depth,0);
}
const bridge=TOURS.platonic.steps[9].scene;
for(const p of [.68,.74,.81]) {
  const shot=shotAt(bridge,base,p);assert.ok(shot.direction.distanceTo(new THREE.Vector3(0,0,1))<1e-12);assert.equal(shot.depth,0);
}
assert.ok(shotAt(bridge,base,1).direction.distanceTo(new THREE.Vector3(0,0,1))>.3);
assert.ok(shotAt(bridge,base,1).depth>0);
for(const tour of Object.values(TOURS))for(const chapter of tour.steps) {
  let previous=shotAt(chapter.scene,base,0);
  for(let i=1;i<=1000;i++) {
    const p=i/1000,shot=shotAt(chapter.scene,base,p),opacity=tourFaceOpacity(chapter.scene,p);
    assert.ok(shot.direction.distanceTo(previous.direction)<.07,chapter.title);
    assert.ok(Math.abs(shot.depth-previous.depth)<.02,chapter.title);
    assert.ok(Math.abs(shot.direction.length()-1)<1e-12);
    assert.ok(opacity>=0&&opacity<=.4600000001);
    previous=shot;
  }
  if(chapter.scene.faces!==false)assert.ok(tourFaceOpacity(chapter.scene,.32)>tourFaceOpacity(chapter.scene,1)*2,chapter.title);
}
// Cubes precede octahedra, the paired tetrahedra precede the exact star.
const intro=TOURS.merkaba.steps.slice(0,5).map(step=>step.scene);
assert.deepEqual(intro[0].objects,['cube']);assert.deepEqual(intro[1].objects,['cube']);
assert.equal(intro[1].depth,2);assert.equal(intro[1].scale,1/3);
assert.deepEqual(intro[2].objects,['cube','octahedron']);
assert.equal(tourObjectAlpha(intro[1],0,1,'cube'),0);assert.equal(tourObjectAlpha(intro[1],1,1,'cube'),1);
assert.equal(tourObjectAlpha(intro[1],0,0,'cube'),1);
for(const level of [0,1]) {
  assert.equal(tourObjectAlpha(intro[3],.3,level,'merkaba_up'),1);
  assert.equal(tourObjectAlpha(intro[3],.3,level,'merkaba_down'),0);
  assert.equal(tourObjectAlpha(intro[3],.6,level,'merkaba_down'),1);
}
for(const p of [.7,.9,1]){const shot=shotAt(intro[4],base,p);assert.ok(shot.direction.distanceTo(diagonal)<1e-12);assert.equal(shot.depth,0);}
// Rendering with real projection matrices: actual bounds stay above the player,
// at both desktop/mobile aspect ratios, during all stages of separation.
let checks=0;
for(const [width,height,panel] of [[1280,900,330],[1366,768,340],[1920,1080,440],[2560,1080,440],[3440,1440,440],[5120,1440,620],[2560,720,400],[390,844,360],[320,568,340]]) {
  const viewport=stageViewport(width,height,panel);
  if(viewport.compact){
    const panelLeft=width-viewport.panelRight-440,sceneRight=viewport.centerX+viewport.usableWidth/2;
    assert.ok(Math.abs(panelLeft-sceneRight-32)<1e-8,'Model and narration share a fixed 32px gutter');
    assert.ok(viewport.usableWidth<=1160&&viewport.usableWidth<=viewport.usableHeight*1.25,'Ultrawide screens do not stretch the composition');
    assert.ok(viewport.centerY-panel/2>=76&&viewport.centerY+panel/2<=height-28,'Centred narration stays clear of the header and screen edge');
    const left=viewport.centerX-viewport.usableWidth/2;
    assert.ok(Math.abs(left-viewport.panelRight)<1e-8,'The complete composition has equal outer margins');
  }
  for(const explode of [0,.1,.35,.7,1]) {
    const points=[];
    for(let body=0;body<6;body++)for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]) {
      const angle=body*Math.PI/3;
      points.push(new THREE.Vector3(x*(1+body*.2)+explode*10*Math.cos(angle),y*(1+body*.2)+explode*8*Math.sin(angle),z*(1+body*.2)+explode*body));
    }
    for(const direction of [base,diagonal,new THREE.Vector3(0,0,1)])for(const depth of [0,.01,.35,.65,1]) {
      const goal=fitTourFrame(points,direction,viewport,depth);
      const expected=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
      assert.ok(goal.center.distanceTo(expected)<1e-10,'Orbit target is the actual centre');
      let camera=new THREE.OrthographicCamera();frameCamera(camera,goal.height,width/height);
      camera.position.copy(goal.center).addScaledVector(direction,30);camera.lookAt(goal.center);camera.updateMatrixWorld(true);
      camera=configureProjection(camera,depth?new THREE.PerspectiveCamera():camera,goal.center,depth,width/height);
      camera.setViewOffset(width,height,goal.offsetX,goal.offsetY,width,height);camera.updateMatrixWorld(true);
      const centre=goal.center.clone().project(camera);
      assert.ok(Math.abs((1+centre.x)*width/2-viewport.centerX)<1e-8,'Horizontal framing preserves the target');
      assert.ok(Math.abs((1-centre.y)*height/2-viewport.centerY)<1e-8,'Framing does not move the target');
      for(const point of points) {
        const projected=point.clone().project(camera),x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
        assert.ok(x>viewport.centerX-viewport.usableWidth/2&&x<viewport.centerX+viewport.usableWidth/2,`horizontal fit ${width} ${depth}`);
        assert.ok(y>75&&y<76+viewport.usableHeight,`vertical fit ${width} ${depth}: ${y}`);checks++;
      }
    }
  }
}
const vp=stageViewport(1280,900,330),small=[new THREE.Vector3(-2,-2,-2),new THREE.Vector3(2,2,2)];
assert.ok(fitTourFrame(small,base,vp).height<14,'A compact scene does not inherit the exploded endpoint zoom');
const wide=stageViewport(3440,1440,440),wider=stageViewport(5120,1440,440);
assert.equal(wide.usableWidth,wider.usableWidth,'Extra monitor width becomes breathing room outside the model and text');
assert.equal(fitTourFrame(small,base,wide).height,fitTourFrame(small,base,wider).height,'32:9 preserves the model scale of 21:9');
console.log(`PASS: ${Object.values(TOURS).reduce((n,t)=>n+t.steps.length,0)} continuous camera/opacity scripts, exact symmetric finales, golden pass-through, ${checks} projected bounds checks with true object-centred framing`);
