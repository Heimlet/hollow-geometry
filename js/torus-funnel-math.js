/** A chosen smooth continuation through exact Merkaba / golden-spiral rings.
 * Local Z is the common axis. a = current cube half-side.
 * The waist comes from inclined tetrahedron-edge midpoints: rho(0) = a.
 * Current vertices give rho(a) = sqrt(2)a; their next golden positions give
 * rho(phi*a) = phi*sqrt(2)a. The lowest-degree even polynomial for rho²
 * interpolating these three rings is a²(1 + t²/phi + t⁴/phi²), t=z/a.
 * This extra interpolation rule is explicit; the surface is not a torus,
 * nor the swept surface of rigid edges (which would be a hyperboloid).
 */
import { A,PHI } from './constants.js';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// A fixed logarithmic display window, outside the camera's contact-ring bounds.
export const FUNNEL_EXTENT=PHI**8;
export const funnelExtensionReveal=(kind,p)=>kind==='whole'?ease((p-.48)/.45):kind==='cosmos'?1:0;
export const funnelReveal=(kind,p)=>kind==='whole'?ease(p/.58):kind==='cosmos'?1:0;
export function goldenFunnelRadius(z,a=A){const t=z/a;return a*Math.sqrt(1+t*t/PHI+t**4/PHI**2);}
export function goldenFunnelPoint(angle,t,a=A){const r=goldenFunnelRadius(t*a,a);return [r*Math.cos(angle),r*Math.sin(angle),t*a];}
export function goldenFunnelCurvature(z,a=A){
  const t=z/a,f=1+t*t/PHI+t**4/PHI**2,fp=2*t/PHI+4*t**3/PHI**2,fpp=2/PHI+12*t*t/PHI**2;
  const slope=fp/(2*Math.sqrt(f)),second=(2*f*fpp-fp*fp)/(4*a*f**1.5);
  return second/(1+slope*slope)**1.5;
}
export function goldenFunnelBounds(reveal=1){
  if(reveal<=0)return [];
  return [-1,1].flatMap(sign=>Array.from({length:32},(_,i)=>goldenFunnelPoint(i*Math.PI/16,sign*PHI*reveal)));
}
