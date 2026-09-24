/** Deterministic tour timeline: seeking, backward steps and replay share one path. */
import { OBJECT_OPACITY } from './constants.js';
import { TOURS, tourStep } from './tour-data.js';
import { initialLab } from './lab-state.js';
import { GOLDEN_SCENES } from './golden-scene-data.js';
import { wrapAngle } from './merkaba-motion.js';
import { cubeWitnessPhase,intersectionWitnessPhase,expansionAt,initialExpansionMotion,advanceExpansion } from './torus-math.js';
import { TOUR_RESTART_SECONDS } from './tour-motion.js';
export const initialTour=()=>({id:null,index:0,elapsed:0,playing:false,auto:true,phase:'idle'});
export const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export const tourProgress=state=>state.tour.id?Math.min(1,state.tour.elapsed/tourStep(state).seconds):0;
export function enterTourStep(state,id,index=0,auto=state.tour.auto,continueMotion=false) {
  const step=TOURS[id]?.steps[index];if(!step)throw new Error('Unknown tour step');
  const recipe=step.scene,ids=recipe.golden?GOLDEN_SCENES[recipe.golden].objects:recipe.objects;
  const objects=Object.fromEntries(Object.entries(state.objects).map(([key,o])=>[key,{...o,
    visible:ids.includes(key),edges:ids.includes(key),faces:ids.includes(key)&&(recipe.faces!==false||!!(recipe.sourceSurfaces||recipe.macro)&&['merkaba_up','merkaba_down'].includes(key)),
    nodes:key==='_metatron_'&&ids.includes(key),lines:key==='_metatron_'&&ids.includes(key)&&recipe.lines!==false,
    opacity:recipe.sourceSurfaces&&['merkaba_up','merkaba_down'].includes(key)?OBJECT_OPACITY[key]:key==='_metatron_'?(recipe.effect==='network'?.48:.3):recipe.golden?.035:.11}]));
  const lab=initialLab();
  if(recipe.rotationAxis)Object.assign(lab.rotation,{axis:recipe.rotationAxis,upAxis:recipe.rotationAxis,downAxis:recipe.rotationAxis});
  Object.assign(lab.layers,{source:ids.includes('merkaba_up')&&recipe.source!==false,
    hull:!!recipe.hull,hullEdges:!!recipe.hull,hullFaces:!!recipe.hull,
    intersection:!!recipe.intersection,intersectionEdges:!!recipe.intersection,intersectionFaces:!!recipe.intersection});
  const explode=recipe.explode??(recipe.effect==='assemble'?1:0);
  if(recipe.assembly){lab.explode.scope='components';lab.collections[recipe.assembly].explode=explode;}
  else lab.explode.value=explode;
  const next={...state,objects,lab,presetId:null,viewContext:'tour',ui:{...state.ui,mode:'simple',topic:null,topicTrail:[]},
    recursion:{depth:recipe.depth||1,scale:recipe.scale||.35},display:{...state.display,autoRotate:false,golden:false,guide:false},
    study:{...state.study,mode:'none',running:false},goldenScene:{id:recipe.golden||'none',progress:recipe.goldenFrom||0,running:false},
    tour:{id,index,elapsed:0,playing:true,auto,phase:'watch',...(recipe.expansionFrom===undefined?{}:{motion:continueMotion&&state.tour.motion?state.tour.motion:initialExpansionMotion()})}};
  return frameTour(next,0);
}
export function frameTour(state,elapsed) {
  const step=tourStep(state);if(!step)return state;
  elapsed=Math.max(0,Math.min(step.seconds,elapsed));const recipe=step.scene,p=elapsed/step.seconds;
  let lab=state.lab,goldenScene=state.goldenScene;
  if(['explode','assemble'].includes(recipe.effect)) {
    const value=recipe.effect==='explode'?smooth(p):1-smooth(p);
    lab=recipe.assembly?{...lab,collections:{...lab.collections,[recipe.assembly]:{...lab.collections[recipe.assembly],explode:value,direction:0}}}
      :{...lab,explode:{...lab.explode,value,direction:0}};
  }
  if(['counter','tradition'].includes(recipe.effect)) {
    const tradition=recipe.effect==='tradition';
    lab={...lab,rotation:{...lab.rotation,mode:tradition?'tradition':'counter',running:false,
      up:wrapAngle(elapsed*(tradition?1.15*34:recipe.counterSpeed??1.15*18)),down:wrapAngle(-elapsed*(tradition?1.15*21:recipe.counterSpeed??1.15*18))}};
  }
  if(recipe.effect==='counterCycle') {
    // A half turn around the cube's vertical face axis restores each tetrahedron.
    const from=recipe.rotationFrom??0,to=recipe.rotationTo??180;
    // Match angular velocity at chapter boundaries while retaining exact cube alignments.
    const slope=8*step.seconds/(to-from||1);
    const phase=recipe.intersectionWitness?intersectionWitnessPhase(p,slope):recipe.cubeWitness?cubeWitnessPhase(p,slope):recipe.continuousMotion?smooth(p)+slope*(p-smooth(p)):smooth((p-.05)/((recipe.rotationUntil??.95)-.05));
    const angle=recipe.expansionFrom===undefined?from+(to-from)*phase:recipe.expansionAngle+90*expansionAt(recipe,p,state.tour.motion).turns;
    lab={...lab,rotation:{...lab.rotation,mode:'counter',running:false,up:angle,down:-angle}};
  }
  if(recipe.golden)goldenScene={id:recipe.golden,progress:(recipe.goldenFrom||0)+((recipe.goldenTo??1)-(recipe.goldenFrom||0))*smooth(Math.min(1,p/(recipe.buildUntil||1))),running:false};
  return {...state,lab,goldenScene,tour:{...state.tour,elapsed}};
}
export function tickTour(state,seconds) {
  const tour=state.tour,step=tourStep(state);if(!step||!tour.playing)return state;
  if(tour.phase==='complete'&&step.scene.endless){
    const delta=seconds*.1*tour.motion.direction,motion={...tour.motion,turnOffset:tour.motion.turnOffset+delta,logOffset:tour.motion.logOffset+delta*Math.log(step.scene.expansionRatio)};
    return frameTour({...state,tour:{...tour,motion}},step.seconds);
  }
  if(tour.phase==='restarting'){
    const restartElapsed=Math.min(TOUR_RESTART_SECONDS,tour.restartElapsed+seconds);
    if(restartElapsed>=TOUR_RESTART_SECONDS)return enterTourStep(state,tour.id,0,tour.auto);
    const elapsed=Math.min(step.seconds,tour.elapsed+seconds),motion=advanceExpansion(step.scene,tour.elapsed/step.seconds,elapsed/step.seconds,tour.motion);
    const next=frameTour(motion?{...state,tour:{...tour,motion}}:state,elapsed);
    return {...next,tour:{...next.tour,restartElapsed}};
  }
  const elapsed=Math.min(step.seconds,tour.elapsed+seconds);
  const motion=advanceExpansion(step.scene,tour.elapsed/step.seconds,elapsed/step.seconds,tour.motion);
  let next=frameTour(motion?{...state,tour:{...tour,motion}}:state,elapsed);
  if(elapsed===step.seconds) {
    const last=tour.index===TOURS[tour.id].steps.length-1;
    if(tour.auto&&!last)return enterTourStep(next,tour.id,tour.index+1,tour.auto,true);
    next={...next,tour:{...next.tour,playing:last&&!!step.scene.endless,phase:last?'complete':'explore'}};
  }
  return next;
}
