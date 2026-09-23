/** Render-only surface choreography. Base laboratory opacity is never overwritten. */
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function tourFaceOpacity(recipe,p) {
  if(recipe.faces===false)return 0;
  const count=recipe.objects?.filter(id=>id!=='_metatron_').length||1;
  const low=recipe.faceFloor??(recipe.golden?.018:.035);
  const high=recipe.golden?.16:count>3?.24:.46;
  const fadeAt=recipe.camera?.symbol?.from??.9;
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
