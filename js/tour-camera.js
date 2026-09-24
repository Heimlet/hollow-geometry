import { GOLDEN_CYCLE_SCALE } from './constants.js';
import * as THREE from 'three';
import { TORUS_AXIS,TORUS_POLE,ORBIT_SEEDS,torusBounds,expansionAt,expansionZoom,cubeWitnessView,traceEntrance,torusMacroFocus,torusReferenceYaw,EXPANSION_TARGET_SCALE } from './torus-math.js';
import { fruitVolume,FRUIT_PLANAR } from './fruit-life.js';
import { goldenFunnelBounds,funnelReveal } from './torus-funnel-math.js';
import { dimensionFrame,dimensionSequence } from './dimension-scene.js';
import { torusOpeningHandoff } from './tour-effects.js';
import { TOUR_ENTRY_SECONDS,tourEntryScale,tourRestartScale } from './tour-motion.js';
import { camera,controls,projectionDepth,getViewHeight,setViewHeight,setDepth,setCameraFrameOffset,settleControls } from './scene.js';
import { levels } from './levels.js';
import { derivedObjects,traditionalFields } from './lab.js';
import { getState } from './state.js';
import { tourStep } from './tour-data.js';
import { tourProgress,smooth } from './tour-state.js';
import { goldenSceneView } from './golden-scenes.js';
import { cancelCameraAnimation } from './presets.js';
import { shotAt,stageViewport,fitTourFrame,exactPolarView } from './tour-camera-math.js';
let pending=false,flight=null,base=null,baseKey=null,active=false,viewport=null,finishedKey=null,holdTimeline=true,entrance=false,restartPose=null;
let expansionUnits=null,frameOffset=null;
let manualView=false,manualGesture=false,idleElapsed=0;
function clearManualView(){manualView=false;manualGesture=false;idleElapsed=0;}
export function beginTourCameraInteraction(){
  const state=getState();
  if(!tourStep(state)?.scene.camera?.idleReturnSeconds||state.ui.topic||state.tour.phase==='restarting')return;
  cancelTourShot();manualView=true;manualGesture=true;idleElapsed=0;
}
export function endTourCameraInteraction(){manualGesture=false;idleElapsed=0;}

const torusOrientation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...TORUS_AXIS));
const torusFramePoints=torusBounds().map(p=>new THREE.Vector3(...p).applyQuaternion(torusOrientation));
export function queueTourShot(options={}){clearManualView();cancelCameraAnimation();settleControls();pending=true;flight=null;baseKey=null;holdTimeline=options.holdTimeline!==false;entrance=!!options.entrance;}
export function cancelTourShot(){pending=false;flight=null;entrance=false;}
export function tourCameraBusy(){return holdTimeline&&(pending||!!flight);}
function scenePoints() {
  if(tourStep(getState())?.scene.dimensions){const f=fruitVolume(),sequence=dimensionSequence(tourProgress(getState()),tourStep(getState()).scene.dimensionUntil),t=dimensionFrame(sequence.build).network,scale=(f.halfSide/(f.halfSide+2*f.radius)*(1-t)+t)*sequence.framingScale;return f.flowerBounds.map(p=>new THREE.Vector3(...p).multiplyScalar(scale));}
  if(tourStep(getState())?.scene.fruit){const f=fruitVolume(),kind=tourStep(getState()).scene.fruit;return (FRUIT_PLANAR.includes(kind)||['spheres','flower','network'].includes(kind)?f.flowerBounds:f.bounds).map(p=>new THREE.Vector3(...p));}
  const state=getState(),recipe=tourStep(state)?.scene;
  const referenceRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),torusReferenceYaw(recipe,tourProgress(state),state.lab.rotation.up));
  const referenceOrientation=referenceRotation.clone().multiply(torusOrientation);
  const points=[];
  if(tourStep(getState())?.scene.networkHandoff){
    const handoff=torusOpeningHandoff(tourProgress(getState()));
    const scale=GOLDEN_CYCLE_SCALE/1.35*handoff.bounds;
    if(scale>0)points.push(...fruitVolume().flowerBounds.map(p=>new THREE.Vector3(...p).multiplyScalar(scale)));
  }
  if(tourStep(getState())?.scene.torus){
    const r=tourStep(getState()).scene,e=expansionAt(r,tourProgress(getState()),getState().tour.motion),macro=r.macro?torusMacroFocus(tourProgress(getState())):0;
    if(['growth','traces'].includes(r.torus)){
      // Until the torus exists, frame the cube being reached, not the future shell.
      // Its world size stays fixed while the original core grows towards it.
      const phase=e.turns-2*Math.floor(e.turns/2),reveal=e.turns<.2?1:smooth(phase/.2);
      let target=e.scale*(1+(EXPANSION_TARGET_SCALE-1)*reveal)/((1+Math.sqrt(5))/2)**phase;
      if(r.torus==='traces'){target=THREE.MathUtils.lerp(e.scale*1.8,target,traceEntrance(tourProgress(getState())));target=THREE.MathUtils.lerp(target,e.scale*1.15,macro);}
      points.push(...ORBIT_SEEDS.map(s=>new THREE.Vector3(...s.point).applyQuaternion(referenceOrientation).multiplyScalar(target)));
    }else if(['pair','golden-step'].includes(r.torus)){
      const span=r.torus==='golden-step'?EXPANSION_TARGET_SCALE:THREE.MathUtils.lerp(EXPANSION_TARGET_SCALE,1.15,macro);
      // The supports can lie outside the canonical cube during relative rotation.
      for(const seed of ORBIT_SEEDS){const q=new THREE.Vector3(...seed.point).applyAxisAngle(new THREE.Vector3(0,0,1),state.lab.rotation.up*Math.PI/180*seed.side);points.push(q.applyQuaternion(referenceOrientation).multiplyScalar(e.scale*span));}
    }
    else if(r.torus==='spiral')points.push(...ORBIT_SEEDS.map(s=>new THREE.Vector3(...s.point).applyQuaternion(referenceOrientation).multiplyScalar(e.scale*1.8)));
    else points.push(...torusFramePoints.map(p=>p.clone().applyQuaternion(referenceRotation).multiplyScalar(e.scale)));
    points.push(...goldenFunnelBounds(funnelReveal(r.torus,tourProgress(state))).map(p=>new THREE.Vector3(...p).applyQuaternion(referenceOrientation).multiplyScalar(e.scale)));
  }

  if(tourStep(getState())?.scene.axisGuide&&!tourStep(getState())?.scene.torus)points.push(new THREE.Vector3(0,TORUS_POLE,0),new THREE.Vector3(0,-TORUS_POLE,0));
  if(tourStep(getState())?.scene.cubeWitness)points.push(...ORBIT_SEEDS.map(s=>new THREE.Vector3(...s.point).applyQuaternion(referenceOrientation).multiplyScalar(cubeWitnessView(tourProgress(getState())))));
  for(const level of levels){
    for(const object of Object.values(level.objs)) {
      if(!object.group.visible)continue;
      const attr=object.edges.geometry.attributes.position;
      for(let i=0;i<attr.count;i++){
        const point=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(object.group.matrixWorld);points.push(point);
        if(tourStep(getState())?.scene.spiralPreview)points.push(point.clone().multiplyScalar(1+(EXPANSION_TARGET_SCALE-1)*smooth((tourProgress(getState())-(tourStep(getState()).scene.intersectionWitness?.34:.1))/.2)));
      }
    }
    if(level.mc.vis)for(const p of level.mc.pos)points.push(new THREE.Vector3(...p).applyMatrix4(level.mc.group.matrixWorld));
  }
  for(const owner of derivedObjects)if(owner.object.vis&&owner.data)for(const p of owner.data.vertices)points.push(p.clone().applyMatrix4(owner.object.group.matrixWorld));
  for(const field of traditionalFields)if(field.group.visible)for(const part of field.group.children){const attr=part.geometry.attributes.position;for(let i=0;i<attr.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(part.matrixWorld));}
  return points;
}
export function tourCameraStatus() {
  const state=getState();if(!state.tour.id)return {locked:false,moving:false};
  if(state.ui.topic)return {locked:true,moving:false,reading:true};
  if(state.tour.phase==='restarting')return {locked:state.tour.playing,moving:state.tour.playing,restarting:true};
  const recipe=tourStep(state).scene;
  if(recipe.camera?.idleReturnSeconds)return {locked:false,moving:state.tour.playing&&!manualView,
    interactive:true,returning:!!flight||pending,idleReturnSeconds:recipe.camera.idleReturnSeconds};
  if(pending||flight)return {locked:true,moving:true,flight:true};
  return {locked:state.tour.playing&&(shotAt(recipe,base?.direction||new THREE.Vector3(1,1,1),tourProgress(state)).locked||!!recipe.endless&&state.tour.phase==='complete'),moving:state.tour.playing};
}
export function updateTourCamera(dt,panelHeight,panelWidth) {
  const state=getState(),recipe=tourStep(state)?.scene;
  if(!recipe) {
    clearManualView();restartPose=null;expansionUnits=null;frameOffset=null;if(active){setCameraFrameOffset(0);controls.enabled=true;controls.enablePan=true;active=false;cancelTourShot();}
    return;
  }
  active=true;controls.enablePan=false;controls.autoRotate=false;
  const interactive=!!recipe.camera?.idleReturnSeconds;
  if(!interactive)clearManualView();
  if(manualView&&state.tour.playing&&!state.ui.topic&&!manualGesture){
    idleElapsed+=Math.max(0,dt);
    if(idleElapsed+1e-8>=recipe.camera.idleReturnSeconds)queueTourShot({holdTimeline:false});
  }
  const expansion=expansionAt(recipe,tourProgress(state),state.tour.motion);
  // Coordinate rebasing is shared by objects, torus and camera. This keeps
  // indefinite growth/reverse numerically small without clamping real motion.
  if(expansion.active&&expansionUnits!==null&&expansion.units!==expansionUnits){
    const factor=GOLDEN_CYCLE_SCALE**(2*(expansionUnits-expansion.units));setViewHeight(getViewHeight()*factor);
    if(flight)flight.height*=factor;
    if(restartPose)restartPose.height*=factor;
  }
  expansionUnits=expansion.active?expansion.units:null;
  const resized=viewport&&(viewport.width!==innerWidth||viewport.height!==innerHeight);
  viewport=stageViewport(innerWidth,innerHeight,panelHeight,panelWidth);
  // A changed chapter paragraph/control row must not teleport the projection
  // on narrow screens. Keep the real target fixed; ease only the UI offset.
  const offsetBlend=frameOffset&&(recipe.continuousMotion||recipe.networkHandoff)&&!resized?1-Math.exp(-8*Math.min(dt,.05)):1;
  frameOffset={x:(frameOffset?.x??viewport.offsetX)+(viewport.offsetX-(frameOffset?.x??viewport.offsetX))*offsetBlend,
    y:(frameOffset?.y??viewport.offsetY)+(viewport.offsetY-(frameOffset?.y??viewport.offsetY))*offsetBlend};
  setCameraFrameOffset(frameOffset.y,frameOffset.x);
  if(state.tour.phase==='restarting'){
    cancelTourShot();
    const scale=tourRestartScale(state.tour.restartElapsed),direction=camera.position.clone().sub(controls.target).normalize();
    if(!restartPose||!state.tour.playing)restartPose={direction,height:getViewHeight()/scale,target:controls.target.clone(),distance:camera.position.distanceTo(controls.target)};
    controls.enabled=!state.tour.playing&&!state.ui.topic;
    if(state.ui.topic)return;
    controls.target.copy(restartPose.target);camera.position.copy(restartPose.target).addScaledVector(restartPose.direction,restartPose.distance);
    setViewHeight(restartPose.height*scale);controls.update();camera.updateMatrixWorld(true);return;
  }
  restartPose=null;
  const chapterKey=`${state.tour.id}:${state.tour.index}`,unframed=baseKey!==chapterKey;
  // Pausing before the first animation frame can cancel a queued flight, but
  // must still initialize and frame the chapter once before releasing orbit.
  const cut=pending&&recipe.camera?.cut&&!entrance||unframed&&!pending;
  if(pending||unframed) {
    base=recipe.golden?goldenSceneView(recipe.golden,recipe.detail):{direction:new THREE.Vector3(3,2,4).normalize(),target:new THREE.Vector3()};
    if(recipe.dir)base.direction=new THREE.Vector3(...recipe.dir).normalize();
    flight=cut?null:{elapsed:0,entrance,direction:camera.position.clone().sub(controls.target).normalize(),target:controls.target.clone(),height:getViewHeight(),depth:projectionDepth};pending=false;entrance=false;baseKey=chapterKey;
  }
  const p=tourProgress(state),finish=p===1&&finishedKey!==chapterKey&&recipe.camera?.mode!=='free'&&(recipe.camera?.releaseAt??1)>=1;
  if(p<1)finishedKey=null;
  const shot=shotAt(recipe,base.direction,p);
  if(recipe.endless&&state.tour.phase==='complete')shot.locked=true;
  controls.enabled=!state.ui.topic&&(interactive||!flight&&(!state.tour.playing||!shot.locked));
  // Free orbit and zoom hold their view while the mechanism keeps running.
  // Shared coordinate rebasing above still preserves the apparent manual scale.
  if(manualView&&!cut&&!flight)return;
  if(!cut&&(state.ui.topic||!finish&&!flight&&(!state.tour.playing||!shot.locked))) {
    // Responsive framing may change on resize, but never the viewer's free angle.
    if(resized){const points=scenePoints();if(points.length){const direction=camera.position.clone().sub(controls.target).normalize();setViewHeight(fitTourFrame(points,direction,viewport,projectionDepth,controls.target).height);controls.update();camera.updateMatrixWorld(true);}}
    return;
  }
  const points=scenePoints();if(!points.length)return;
  // A detail shot fits a patch on the actual face, not the whole dodecahedron.
  const focus=recipe.detail?base.target:null;
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),shot.direction).normalize();
  const up=new THREE.Vector3().crossVectors(shot.direction,right).normalize();
  const detailSize=recipe.focusSize??.34;
  const detailPoints=focus?[-1,1].flatMap(x=>[-1,1].map(y=>focus.clone().addScaledVector(right,x*detailSize).addScaledVector(up,y*detailSize))):points;
  const goal=fitTourFrame(detailPoints,shot.direction,viewport,shot.depth,focus);
  // An explicit detail zoom can let the faded outer shell pass beyond the frame.
  // It never shifts the shared geometric centre.
  goal.height/=recipe.expansionFrom!==undefined?(['growth','traces','pair','golden-step','spiral'].includes(recipe.torus)?1:expansionZoom(expansionAt(recipe,p,state.tour.motion))):shot.zoom;
  if(recipe.goldenCoupling)goal.height/=1+1.1*smooth(p/.16)*(1-smooth((p-.55)/.25));
  let direction=shot.direction,height=goal.height,target=goal.center,depth=shot.depth;
  if(flight) {
    flight.elapsed+=Math.min(dt,.05);const t=smooth(flight.elapsed/(flight.entrance?TOUR_ENTRY_SECONDS:recipe.golden?1.5:1.3));
    if(flight.entrance)height=goal.height*tourEntryScale(flight.elapsed);
    else {
      direction=flight.direction.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(flight.direction,shot.direction).slerp(new THREE.Quaternion(),1-t));
      height=THREE.MathUtils.lerp(flight.height,goal.height,t);target=flight.target.clone().lerp(goal.center,t);depth=THREE.MathUtils.lerp(flight.depth,shot.depth,t);
    }
    if(t>=1)flight=null;
  } else {
    // Follow the actual growing bounds, rather than zooming out to an endpoint
    // before separation starts. Padding absorbs this short smoothing lag.
    height=finish||cut?goal.height:THREE.MathUtils.lerp(getViewHeight(),goal.height,1-Math.exp(-12*Math.min(dt,.05)));
  }
  controls.target.copy(target);camera.up.set(0,1,0);camera.position.copy(target).addScaledVector(direction,30);
  setViewHeight(height);
  if(Math.abs(projectionDepth-depth)>1e-6 || (depth===0&&projectionDepth!==0))setDepth(depth,{automatic:true});
  // Orthographic scale is independent of distance. Keep an enlarged finale
  // wholly in front of the near plane, including when Depth reaches zero.
  if(camera.isOrthographicCamera){const radius=points.reduce((max,p)=>Math.max(max,p.distanceTo(target)),0);camera.position.copy(target).addScaledVector(direction,Math.max(30,radius*1.3));}
  controls.update();exactPolarView(camera,target,direction);camera.updateMatrixWorld(true);
  if(finish&&!flight)finishedKey=chapterKey;
}
