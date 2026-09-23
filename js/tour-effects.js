/** Render-only surface choreography. Base laboratory opacity is never overwritten. */
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function tourFaceOpacity(recipe,p) {
  if(recipe.faces===false)return 0;
  const count=recipe.objects?.filter(id=>id!=='_metatron_').length||1;
  const low=recipe.faceFloor??(recipe.golden?.018:.035);
  const high=recipe.golden?.14:count>3?.21:.42;
  const fadeAt=recipe.camera?.symbol?.from??.9;
  // First reveal a readable shell; dissolve it before the symmetry becomes exact.
  const reveal=ease(p/.3),dissolve=1-ease((p-(fadeAt-.23))/.23);
  return low+(high-low)*reveal*dissolve;
}
