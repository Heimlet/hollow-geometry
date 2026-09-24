/** Two mirrored phi surfaces, built once and carried by the actual supports. */
import * as THREE from 'three';
import { PHI } from './constants.js';
import { spiralGuide,ORBIT_SEEDS } from './torus-math.js';
import { goldenFunnelPoint,funnelReveal,funnelExtensionReveal,FUNNEL_EXTENT } from './torus-funnel-math.js';
const tau=2*Math.PI,coreRows=48,outerRows=32,rows=coreRows+outerRows,columns=96;
// Dense at the supports, logarithmic outside: a finite static buffer extends far
// beyond the frame without fitting the camera to its remote open ends.
const heights=Array.from({length:rows+1},(_,i)=>i<=coreRows?i/coreRows*PHI:PHI*(FUNNEL_EXTENT/PHI)**((i-coreRows)/outerRows));
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createTorusFunnels(parent){
  const group=new THREE.Group();group.name='Paired golden funnels';group.visible=false;parent.add(group);
  function stroke(points,color,width=1.2){
    const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
    const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,linewidth:width,transparent:true,opacity:0,depthWrite:false}));group.add(line);return line;
  }
  const halves=[1,-1].map(sign=>{
    const positions=[],uv=[],weights=[],indices=[];
    for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++){
      positions.push(...goldenFunnelPoint(j/columns*tau,sign*heights[i]));uv.push(j/columns,i/rows);weights.push(1/(1+.4*Math.max(0,heights[i]-PHI)**2));
      if(i<rows&&j<columns){const a=i*(columns+1)+j,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('opacityWeight',new THREE.Float32BufferAttribute(weights,1));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{alpha:{value:0},reveal:{value:0},tint:{value:new THREE.Color(sign>0?0xb3a2ff:0x8bcfe8)}},
      vertexShader:`attribute float opacityWeight;varying float fade;varying vec3 n;varying vec3 eye;varying vec2 coord;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=-p.xyz;coord=uv;fade=opacityWeight;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`varying float fade;uniform float alpha;uniform float reveal;uniform vec3 tint;varying vec3 n;varying vec3 eye;varying vec2 coord;
        void main(){float edge=1.-smoothstep(reveal-.045,reveal,coord.y);float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.);
        gl_FragColor=vec4(tint,alpha*(.12+.88*rim)*edge*fade);}`});
    const surface=new THREE.Mesh(geometry,material);surface.name=sign>0?'Upper phi funnel':'Lower phi funnel';group.add(surface);
    const meridianPoints=[];
    for(let i=0;i<rows;i++)for(let j=0;j<12;j++)for(const k of [i,i+1])meridianPoints.push(goldenFunnelPoint(j/12*tau,sign*heights[k]));
    const meridians=stroke(meridianPoints,sign>0?0xb3a2ff:0x8bcfe8);
    const rings=[.25,.5,.75,1,1.25,PHI].map(t=>{
      const contact=t===1||t===PHI;
      const points=Array.from({length:96},(_,j)=>[goldenFunnelPoint(j/96*tau,sign*t),goldenFunnelPoint((j+1)/96*tau,sign*t)]).flat();
      const line=stroke(points,contact?0xffd277:sign>0?0xb3a2ff:0x8bcfe8,contact?2.6:1.2);
      line.name=`${sign>0?'Upper':'Lower'} ${t===PHI?'next golden contact':t===1?'current contact':'funnel section'}`;
      return {t,line,contact};
    });
    return {surface,meridians,rings};
  });
  const waist=stroke(Array.from({length:96},(_,j)=>[goldenFunnelPoint(j/96*tau,0),goldenFunnelPoint((j+1)/96*tau,0)]).flat(),0xffe0a3,2);
  waist.name='Waist from tetrahedron edge midpoints';
  // One real vertex from each tetrahedron and its next mirrored spiral position.
  const supports=[7,0].map(index=>{
    const seed=ORBIT_SEEDS[index],curve=stroke(Array.from({length:96},(_,i)=>[spiralGuide(seed,i/96),spiralGuide(seed,(i+1)/96)]).flat(),index===7?0xffd277:0x94e6ff,2.6);
    curve.name='Spiral between exact funnel contacts';
    const partner=ORBIT_SEEDS[index===7?1:6].point,midpoint=seed.point.map((x,k)=>(x+partner[k])/2);
    const edge=stroke([seed.point,partner],index===7?0xffa4d7:0x94e6ff,2.5);edge.name='Actual edge defining the funnel waist';
    const mid=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),new THREE.MeshBasicMaterial({color:0xffe0a3,transparent:true,opacity:0,depthWrite:false}));
    mid.name='Real edge midpoint on the waist';group.add(mid);
    const points=[0,1].map(turn=>{
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),new THREE.MeshBasicMaterial({color:index===7?0xffdfa3:0xa4efff,transparent:true,opacity:0,depthWrite:false}));
      marker.name=turn?'Next phi contact':'Current funnel contact';group.add(marker);return marker;
    });
    return {index,curve,points,edge,mid,midpoint};
  });
  return {group,update(kind,p,frame,anchors){
    const reveal=funnelReveal(kind,p);group.visible=reveal>0;if(!group.visible)return;
    group.scale.set(frame.radialScale,frame.radialScale,frame.axialScale);
    const ink=ease(reveal/.12),drawRows=coreRows*reveal+outerRows*funnelExtensionReveal(kind,p),surfaceReveal=drawRows/rows;
    waist.material.opacity=.62*ink;
    halves.forEach(({surface,meridians,rings})=>{
      surface.material.uniforms.reveal.value=surfaceReveal===1?1.05:surfaceReveal;surface.material.uniforms.alpha.value=.24*ink;
      meridians.geometry.setDrawRange(0,2*12*Math.floor(drawRows));meridians.material.opacity=.11*ink;
      rings.forEach(({t,line,contact})=>{line.material.opacity=(contact?.82:.18)*ease((reveal*PHI-t+.1)/.1);});
    });
    supports.forEach(({index,curve,points,edge,mid,midpoint})=>{
      const base=ORBIT_SEEDS[index],actual=anchors[index],angle=Math.atan2(actual[1],actual[0])-Math.atan2(base.point[1],base.point[0]);
      const reachable=Math.max(0,Math.min(1,Math.log(Math.max(1,reveal*PHI))/Math.log(PHI)));
      curve.rotation.z=angle;curve.geometry.setDrawRange(0,2*Math.floor(96*reachable));curve.material.opacity=.9*ink;
      const witness=kind==='whole'?ink*(1-ease((p-.4)/.22)):0;
      edge.rotation.z=angle;edge.material.opacity=.85*witness;
      mid.position.set(...midpoint).applyAxisAngle(new THREE.Vector3(0,0,1),angle);mid.material.opacity=witness;
      points.forEach((point,turn)=>{
        const position=new THREE.Vector3(...spiralGuide(base,turn)).applyAxisAngle(new THREE.Vector3(0,0,1),angle);
        point.position.copy(position);point.material.opacity=ease((reveal*PHI-PHI**turn+.08)/.08);
      });
    });
  }};
}
