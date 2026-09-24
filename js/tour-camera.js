import * as THREE from 'three';
import { TORUS_AXIS,TORUS_POLE,ORBIT_SEEDS,torusBounds,expansionAt,cubeWitnessView } from './torus-math.js';
import { fruitVolume,FRUIT_PLANAR } from './fruit-life.js';
import { dimensionFrame } from './dimension-scene.js';
import { TOUR_ENTRY_SECONDS,tourEntryScale,tourRestartScale } from './tour-motion.js';
import { camera,controls,projectionDepth,getViewHeight,setViewHeight,setDepth,setCameraFrameOffset,settleControls } from './scene.js';
import { levels } from './levels.js';
import { derivedObjects,traditionalFields } from './lab.js';
import { getState } from './state.js';
import { tourStep } from './tour-data.js';
import { tourProgress,smooth } from './tour-state.js';
import { goldenSceneView } from './golden-scenes.js';
import { cancelCameraAnimation } from './presets.js';
import { shotAt,stageViewport,fitTourFrame } from './tour-camera-math.js';
let pending=false,flight=null,base=null,baseKey=null,active=false,viewport=null,finishedKey=null,holdTimeline=true,entrance=false,restartPose=null;
const torusOrientation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...TORUS_AXIS));
const torusFramePoints=torusBounds().map(p=>new THREE.Vector3(...p).applyQuaternion(torusOrientation));
export function queueTourShot(options={}){cancelCameraAnimation();settleControls();pending=true;flight=null;baseKey=null;holdTimeline=options.holdTimeline!==false;entrance=!!options.entrance;}
export function cancelTourShot(){pending=false;flight=null;entrance=false;}
export function tourCameraBusy(){return holdTimeline&&(pending||!!flight);}
function scenePoints() {
  if(tourStep(getState())?.scene.dimensions){const f=fruitVolume(),t=dimensionFrame(tourProgress(getState())).network,scale=f.halfSide/(f.halfSide+2*f.radius)*(1-t)+t;return f.flowerBounds.map(p=>new THREE.Vector3(...p).multiplyScalar(scale));}
  if(tourStep(getState())?.scene.fruit){const f=fruitVolume(),kind=tourStep(getState()).scene.fruit;return (FRUIT_PLANAR.includes(kind)||['spheres','flower','network'].includes(kind)?f.flowerBounds:f.bounds).map(p=>new THREE.Vector3(...p));}
  const points=[];
  if(tourStep(getState())?.scene.torus){const r=tourStep(getState()).scene;points.push(...torusFramePoints.map(p=>p.clone().multiplyScalar(expansionAt(r,tourProgress(getState())).scale)));}
  else if(tourStep(getState())?.scene.axisGuide)points.push(new THREE.Vector3(0,TORUS_POLE,0),new THREE.Vector3(0,-TORUS_POLE,0));
  if(tourStep(getState())?.scene.cubeWitness)points.push(...ORBIT_SEEDS.map(s=>new THREE.Vector3(...s.point).applyQuaternion(torusOrientation).multiplyScalar(cubeWitnessView(tourProgress(getState())))));
  for(const level of levels){
    for(const object of Object.values(level.objs)) {
      if(!object.group.visible)continue;
      const attr=object.edges.geometry.attributes.position;
      for(let i=0;i<attr.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(object.group.matrixWorld));
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
  if(pending||flight)return {locked:true,moving:true,flight:true};
  const recipe=tourStep(state).scene;
  return {locked:state.tour.playing&&shotAt(recipe,base?.direction||new THREE.Vector3(1,1,1),tourProgress(state)).locked,moving:state.tour.playing};
}
export function updateTourCamera(dt,panelHeight,panelWidth) {
  const state=getState(),recipe=tourStep(state)?.scene;
  if(!recipe) {
    restartPose=null;if(active){setCameraFrameOffset(0);controls.enabled=true;controls.enablePan=true;active=false;cancelTourShot();}
    return;
  }
  active=true;controls.enablePan=false;controls.autoRotate=false;
  const resized=viewport&&(viewport.width!==innerWidth||viewport.height!==innerHeight);
  viewport=stageViewport(innerWidth,innerHeight,panelHeight,panelWidth);
  setCameraFrameOffset(viewport.offsetY,viewport.offsetX);
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
  controls.enabled=!state.ui.topic&&!flight&&(!state.tour.playing||!shot.locked);
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
  goal.height/=shot.zoom;
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
  controls.update();camera.updateMatrixWorld(true);
  if(finish&&!flight)finishedKey=chapterKey;
}
