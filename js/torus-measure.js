/** Drafting dimensions read actual world vertices, never a second animation clock. */
import * as THREE from 'three';
import { A,PHI,GOLDEN_CYCLE_SCALE } from './constants.js';
import { torusFrameFromAnchors } from './torus-math.js';
const NS='http://www.w3.org/2000/svg';
export const hasTorusHeight=recipe=>['birth','weave','golden','whole','cosmos'].includes(recipe?.torus);
export function torusHeightDimension(anchors,camera){
  // These are the two illuminated vertices followed by the paired spirals.
  const supports=[anchors[0],anchors[7]].map(([x,z,y])=>new THREE.Vector3(x,y,-z)).sort((a,b)=>a.y-b.y);
  const height=supports[1].y-supports[0].y,frame=torusFrameFromAnchors(anchors,height/2);
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;
  if(right.lengthSq()<1e-8)right.set(1,0,0);right.normalize();
  const column=right.multiplyScalar(-frame.shape.major-frame.shape.tube*1.28);
  const ends=supports.map(p=>new THREE.Vector3(column.x,p.y,column.z));
  return {supports,ends,height};
}
// Keep the true vertical dimension on screen even when a macro shot crops the
// torus. Sliding its whole column in a horizontal plane preserves its length.
export function placeHeightDimension(data,camera,viewport){
  const ends=data.ends.map(p=>p.clone()),project=p=>{const v=p.clone().project(camera);return [(v.x+1)*viewport.width/2,(1-v.y)*viewport.height/2];};
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();
  const minX=viewport.centerX-viewport.usableWidth/2+8;
  for(let i=0;i<2;i++){
    const points=ends.map(project),edge=Math.min(...points.map(p=>p[0]));if(edge>=minX)break;
    const delta=data.height*.5,slope=Math.min(...ends.map((p,j)=>(project(p.clone().addScaledVector(right,delta))[0]-points[j][0])/delta));
    if(slope<=1e-8)break;ends.forEach(p=>p.addScaledVector(right,(minX-edge)/slope));
  }
  return {ends,supports:data.supports,height:data.height};
}
// Scene rebasing divides all rendered lengths by φ⁴. Recover physical growth in
// log space so the counter stays continuous, including an indefinite finale.
export const heightGrowthLog=(height,units=0)=>Math.log(height/(2*A))+units*2*Math.log(GOLDEN_CYCLE_SCALE);
export const formatGoldenHeight=log=>(Math.round(log/Math.log(PHI)*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2,useGrouping:false});
export function formatHeightGrowth(log){
  if(log>=Math.log(.001)&&log<Math.log(1e6))return '×'+Math.exp(log).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:Math.max(2,-Math.floor(log/Math.LN10)+1)});
  const exponent=Math.floor(log/Math.LN10),mantissa=Math.exp(log-exponent*Math.LN10);
  const superscript=String(exponent).split('').map(c=>c==='-'?'⁻':'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]).join('');
  return `×${mantissa.toFixed(2).replace('.',',')} · 10${superscript}`;
}
export function createTorusHeightMeasure(parent=document.body){
  const make=(tag,attrs={})=>{const node=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;};
  const overlay=document.createElement('div');overlay.className='torus-height-measure';overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
  const svg=make('svg'),lower=make('path',{class:'height-leader cyan'}),upper=make('path',{class:'height-leader pink'}),dimension=make('path',{class:'height-dimension'}),dots=[make('circle',{r:3,class:'cyan'}),make('circle',{r:3,class:'pink'})];
  svg.append(lower,upper,dimension,...dots);
  const rulerText=make('text',{class:'height-ruler-text','text-anchor':'middle',dy:-8});
  const rulerExponent=make('tspan',{'baseline-shift':'super','font-size':'70%'});
  rulerText.append('H₀ × φ',rulerExponent);svg.append(rulerText);
  const label=document.createElement('div');label.className='torus-height-label';
  const title=document.createElement('span');title.textContent='Высота тора';
  const value=document.createElement('strong'),exponent=document.createElement('sup');
  value.append('H₀ × φ',exponent);
  label.append(title,value);overlay.append(svg,label);parent.append(overlay);
  const project=(p,camera,w,h)=>{const v=p.clone().project(camera);return [(v.x+1)*w/2,(1-v.y)*h/2];};
  const path=points=>points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join(' ');
  return {update({enabled,anchors,camera,units=0,viewport,opacity=1,obstacles=[],panelTop}){
    overlay.hidden=!enabled||!anchors||opacity<=0;if(overlay.hidden)return;
    const {width,height}=viewport,data=placeHeightDimension(torusHeightDimension(anchors,camera),camera,viewport),ends=data.ends.map(p=>project(p,camera,width,height)),starts=data.supports.map(p=>project(p,camera,width,height));
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);overlay.style.opacity=opacity;
    const log=heightGrowthLog(data.height,units),power=formatGoldenHeight(log);
    if(exponent.textContent!==power){exponent.textContent=power;rulerExponent.textContent=power;}
    const [a,b]=ends,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),visible=length>=24;
    svg.style.opacity=String(Math.min(1,Math.max(0,(length-12)/24)));
    const readable=length>=Math.max(76,52+power.length*5);let textAngle=Math.atan2(dy,dx)*180/Math.PI;
    if(textAngle>90)textAngle-=180;if(textAngle< -90)textAngle+=180;
    rulerText.setAttribute('transform',`translate(${(a[0]+b[0])/2} ${(a[1]+b[1])/2}) rotate(${textAngle})`);
    rulerText.style.display=readable?'':'none';overlay.setAttribute('data-ruler-text',String(readable));
    [lower,upper].forEach((line,i)=>line.setAttribute('d',path([starts[i],ends[i]])));
    dots.forEach((dot,i)=>{dot.setAttribute('cx',starts[i][0]);dot.setAttribute('cy',starts[i][1]);});
    const ux=length?dx/length:0,uy=length?dy/length:1,arrow=6,tick=5;
    const arrowAt=(p,sign)=>path([[p[0]+ux*arrow*sign-uy*3,p[1]+uy*arrow*sign+ux*3],p,[p[0]+ux*arrow*sign+uy*3,p[1]+uy*arrow*sign-ux*3]]);
    dimension.setAttribute('d',[path(ends),...ends.map(p=>path([[p[0]-uy*tick,p[1]+ux*tick],[p[0]+uy*tick,p[1]-ux*tick]])),arrowAt(a,1),arrowAt(b,-1)].join(' '));
    const left=viewport.centerX-viewport.usableWidth/2,right=viewport.centerX+viewport.usableWidth/2,top=viewport.centerY-viewport.usableHeight/2,bottom=viewport.centerY+viewport.usableHeight/2;
    const compact=width<=700||(width<=1000&&height<=600);
    overlay.setAttribute('data-compact',String(compact));
    if(compact){
      // The phone's stage reserves a gap above its player. Keep the number there
      // while the actual dimension lines continue to follow the source vertices.
      label.style.left=`${width/2}px`;
      label.style.top=`${Math.max(76,(panelTop??bottom+30)-28)}px`;
      return;
    }
    // The same projected bracket follows free orbit. At a polar view its true
    // height is foreshortened to zero; retain the number without a false ruler.
    const labelWidth=136,labelHeight=48;
    const x=visible?(a[0]+b[0])/2+10:left+8,y=visible?(a[1]+b[1])/2-labelHeight/2:viewport.centerY-labelHeight/2;
    const labelX=Math.max(left+4,Math.min(right-labelWidth-4,x)),clampY=y=>Math.max(top+4,Math.min(bottom-labelHeight-4,y));
    const candidates=[y,...obstacles.flatMap(r=>[r.bottom+7,r.top-labelHeight-7]),top+4,bottom-labelHeight-4].map(clampY);
    const cost=cy=>obstacles.reduce((sum,r)=>sum+Math.max(0,Math.min(labelX+labelWidth,r.right)-Math.max(labelX,r.left))*Math.max(0,Math.min(cy+labelHeight,r.bottom+5)-Math.max(cy,r.top-5)),0)*100+Math.abs(cy-y);
    candidates.sort((a,b)=>cost(a)-cost(b));
    label.style.left=`${labelX}px`;label.style.top=`${candidates[0]}px`;
  },dispose(){overlay.remove();}};
}
