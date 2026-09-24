import { GOLDEN_CYCLE_SCALE } from './constants.js';
/** Render-only surface choreography. Base laboratory opacity is never overwritten. */
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Temporary sky choreography follows tour time, never the saved display setting. */
export const tourStarDensity=(recipe,elapsed=0)=>recipe?.starFadeDuration
  ?1-ease((recipe.timelineFrom+elapsed)/recipe.starFadeDuration):null;
export function tourFaceOpacity(recipe,p) {
  if(recipe.faces===false)return 0;
  const count=recipe.objects?.filter(id=>id!=='_metatron_').length||1;
  const low=recipe.faceFloor??(recipe.golden?.018:.035);
  const high=recipe.facePeak??(recipe.golden?.16:count>3?.24:.46);
  const fadeAt=recipe.faceDissolveAt??recipe.camera?.symbol?.from??.9;
  // First reveal a readable shell; dissolve it before the symmetry becomes exact.
  const reveal=ease(p/.3),dissolve=1-ease((p-(fadeAt-.23))/.23);
  return low+(high-low)*reveal*dissolve;
}

/** A copy contracts from its parent's size; its final geometry is untouched. */
export function recursionMoment(p,index,ratio=.38) {
  const start=index===1?.08:.32;
  const build=index===0?1:ease((p-start)/.25);
  const reveal=index===0?1:ease((p-start)/.1);
  const retreat=index<2?1-.82*ease((p-.43)/.18)*(1-ease((p-.82)/.16)):1;
  return {scale:index===0?1:1+(1/ratio-1)*(1-build),alpha:reveal*retreat};
}

/** Stagger whole objects without changing the underlying visibility settings. */
export function tourObjectAlpha(recipe,p,level,id) {
  const key=`${level}:${id}`,appear=recipe.appear?.[key]??recipe.appear?.[id];
  const dim=recipe.dim?.[key]??recipe.dim?.[id];
  const visible=appear?ease((p-appear[0])/(appear[1]-appear[0])):1;
  return visible*(dim?1-(1-(dim[2]??0))*ease((p-dim[0])/(dim[1]-dim[0])):1);
}

/** Carry the same pair through the intersection, cube witness and growth. Only emphasis changes. */
export function tetraWitnessAppearance(p,id='merkaba_up'){
  const handoff=ease((p-.82)/.18),focus=ease(p/.16)*(1-handoff),start=id==='merkaba_up'?.38:.5;
  return {edges:start*(1-handoff)+.2*handoff+(1-start)*focus,
    faces:.07*focus,coreFaces:.18*(1-focus)*(1-handoff)+.34*handoff,
    coreEdges:.85*(1-focus)*(1-handoff)+.16*focus+handoff,handoff};
}

/** Last three chapters exchange the derived core for its actual source bodies. */
export const torusSourceMix=(recipe,p)=>recipe.sourceSurfaces==='reveal'?ease(p/.12):recipe.sourceSurfaces==='hold'?1:0;

/** Keep the completed opening network at its last scale, reveal its cube there,
 * then carry that same cube to the normal scene size as the network dissolves. */
export function torusOpeningHandoff(p){
  return {network:1-ease(p/.18),scale:GOLDEN_CYCLE_SCALE**(1-ease((p-.18)/.2)),bounds:1-ease(p/.38)};
}
