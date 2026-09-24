/** Surface of revolution of the actual golden guides, not an interpolated shell.
 * A guide scales both rho=sqrt(2)*a and |z|=a by phi^u. Eliminating u gives
 * rho=sqrt(2)*|z| on every turn, in either direction. Thus the two sheets are
 * cones. There is no finite circular waist; their common apex is singular.
 * Local Z maps to world Y. The moving support frame carries the entire surface.
 */
import { A,PHI } from './constants.js';
import { SPIRAL_WINDOW } from './torus-math.js';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const FUNNEL_EXTENT=PHI**SPIRAL_WINDOW.to;
export const funnelExtensionReveal=(kind,p)=>kind==='whole'?ease((p-.48)/.45):kind==='cosmos'?1:0;
export const funnelReveal=(kind,p)=>kind==='whole'?ease(p/.58):kind==='cosmos'?1:0;
export function goldenFunnelRadius(z){return Math.SQRT2*Math.abs(z);}
export function goldenFunnelPoint(angle,t,a=A){const z=t*a,r=goldenFunnelRadius(z);return [r*Math.cos(angle),r*Math.sin(angle),z];}
export function goldenFunnelBounds(reveal=1){
  if(reveal<=0)return [];
  return [-1,1].flatMap(sign=>Array.from({length:32},(_,i)=>goldenFunnelPoint(i*Math.PI/16,sign*PHI*reveal)));
}
