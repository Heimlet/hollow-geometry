/** Deterministic tour timeline: seeking, backward steps and replay share one path. */
import { TOURS, tourStep } from './tour-data.js';
import { initialLab } from './lab-state.js';
import { GOLDEN_SCENES } from './golden-scene-data.js';
import { wrapAngle } from './merkaba-motion.js';
export const initialTour=()=>({id:null,index:0,elapsed:0,playing:false,auto:true,phase:'idle'});
export const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export const tourProgress=state=>state.tour.id?Math.min(1,state.tour.elapsed/tourStep(state).seconds):0;
export function enterTourStep(state,id,index=0,auto=state.tour.auto) {
  const step=TOURS[id]?.steps[index];if(!step)throw new Error('Unknown tour step');
  const recipe=step.scene,ids=recipe.golden?GOLDEN_SCENES[recipe.golden].objects:recipe.objects;
  const objects=Object.fromEntries(Object.entries(state.objects).map(([key,o])=>[key,{...o,
    visible:ids.includes(key),edges:ids.includes(key),faces:ids.includes(key)&&recipe.faces!==false,
    nodes:key==='_metatron_'&&ids.includes(key),lines:key==='_metatron_'&&ids.includes(key)&&recipe.lines!==false,
    opacity:key==='_metatron_'?.17:recipe.golden?.035:.11}]));
  const lab=initialLab();
  Object.assign(lab.layers,{source:ids.includes('merkaba_up')&&recipe.source!==false,
    hull:!!recipe.hull,hullEdges:!!recipe.hull,hullFaces:!!recipe.hull,
    intersection:!!recipe.intersection,intersectionEdges:!!recipe.intersection,intersectionFaces:!!recipe.intersection});
  const explode=recipe.explode??(recipe.effect==='assemble'?1:0);
  if(recipe.assembly){lab.explode.scope='components';lab.collections[recipe.assembly].explode=explode;}
  else lab.explode.value=explode;
  const next={...state,objects,lab,presetId:null,viewContext:'tour',ui:{...state.ui,mode:'simple',topic:null},
    recursion:{depth:recipe.depth||1,scale:recipe.scale||.35},display:{...state.display,autoRotate:false,golden:false,guide:false},
    study:{...state.study,mode:'none',running:false},goldenScene:{id:recipe.golden||'none',progress:recipe.goldenFrom||0,running:false},
    tour:{id,index,elapsed:0,playing:true,auto,phase:'watch'}};
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
      up:wrapAngle(elapsed*1.15*(tradition?34:18)),down:wrapAngle(-elapsed*1.15*(tradition?21:18))}};
  }
  if(recipe.golden)goldenScene={id:recipe.golden,progress:(recipe.goldenFrom||0)+((recipe.goldenTo??1)-(recipe.goldenFrom||0))*smooth(Math.min(1,p/(recipe.buildUntil||1))),running:false};
  return {...state,lab,goldenScene,tour:{...state.tour,elapsed}};
}
export function tickTour(state,seconds) {
  const tour=state.tour,step=tourStep(state);if(!step||!tour.playing)return state;
  const elapsed=Math.min(step.seconds,tour.elapsed+seconds);
  let next=frameTour(state,elapsed);
  if(elapsed===step.seconds) {
    const last=tour.index===TOURS[tour.id].steps.length-1;
    if(tour.auto&&!last)return enterTourStep(next,tour.id,tour.index+1,tour.auto);
    next={...next,tour:{...next.tour,playing:false,phase:last?'complete':'explore'}};
  }
  return next;
}
