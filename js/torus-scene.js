/** Two illustrative shells share the exact vertical axis of the live Merkaba. */
import * as THREE from 'three';
import {TORI,TORUS_AXIS,TORUS_POLE,torusPoint,torusCurve} from './torus-math.js';
const tau=Math.PI*2,phi=(1+Math.sqrt(5))/2;
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createTorusScene(scene) {
  const root=new THREE.Group();root.name='Torus finale';root.visible=false;
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...TORUS_AXIS));scene.add(root);
  function stroke(parent,points,color,opacity,width=1.5) {
    const vertices=points.slice(1).flatMap((p,i)=>[new THREE.Vector3(...points[i]),new THREE.Vector3(...p)]);
    const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color,transparent:true,opacity,linewidth:width,depthWrite:false}));parent.add(line);return line;
  }
  const pole=stroke(root,[[0,0,-TORUS_POLE],[0,0,TORUS_POLE]],0xffd277,.84,2.3);pole.name='Shared vertical axis';
  const shells=TORI.map((shape,index)=>{
    const group=new THREE.Group();group.name=index?'Outer torus · hull':'Inner torus · intersection';root.add(group);
    const color=index?0xb7a3ff:0x76dcb8;
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{alpha:{value:0},reveal:{value:1},tint:{value:new THREE.Color(color)}},
      vertexShader:`varying vec3 n;varying vec3 eye;varying vec2 coord;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=-p.xyz;coord=uv;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform float alpha;uniform float reveal;uniform vec3 tint;varying vec3 n;varying vec3 eye;varying vec2 coord;
        void main(){if(coord.x>reveal)discard;float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.5);
        gl_FragColor=vec4(tint,alpha*(.08+.92*rim));}`});
    const surface=new THREE.Mesh(new THREE.TorusGeometry(shape.major,shape.tube,48,128).scale(1,1,shape.height/shape.tube),material);group.add(surface);
    const meridians=Array.from({length:8},(_,i)=>stroke(group,torusCurve(0,1,96,0,shape).map(p=>{
      const a=i*tau/8;return [p[0]*Math.cos(a),p[0]*Math.sin(a),p[2]];
    }),color,.1,1.2));
    const parallels=[0,Math.PI/2,Math.PI,3*Math.PI/2].map(v=>stroke(group,torusCurve(1,0,192,v,shape),color,.12,1.2));
    const brush=stroke(group,torusCurve(0,1,128,0,shape),color,.9,2.3);
    const side=index?-1:1;
    const path=stroke(group,torusCurve(side*2,3,768,index*Math.PI,shape),index?0xc2b3ff:0x8be8c5,.65,2);
    const golden=stroke(group,torusCurve(side*18,18*phi,3072,index*Math.PI,shape),index?0xc7b1f4:0xf3cb86,0,1.6);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:index?0xd5c6ff:0xffe6a9}));group.add(head);
    return {shape,group,material,meridians,parallels,brush,path,golden,head,side};
  });
  const dotsGeometry=new THREE.BufferGeometry();dotsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(24*3),3));
  const colors=new Float32Array(24*3);for(let i=0;i<24;i++)new THREE.Color(i<12?0xa0ffe0:0xd2c4ff).toArray(colors,i*3);dotsGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const dotsMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,uniforms:{alpha:{value:1}},
    vertexShader:`varying vec3 tint;void main(){tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=8.;}`,
    fragmentShader:`uniform float alpha;varying vec3 tint;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(tint,alpha*exp(-5.*d*d));}`});
  const dots=new THREE.Points(dotsGeometry,dotsMaterial);dots.frustumCulled=false;root.add(dots);
  function update(kind,p,elapsed=0,{axis=false}={}) {
    root.visible=!!kind||axis;pole.visible=axis||!!kind;
    shells.forEach(s=>s.group.visible=!!kind);dots.visible=!!kind&&kind!=='golden';
    if(!kind)return;
    const birth=kind==='birth',growth=kind==='golden',whole=kind==='whole';
    const fraction=growth?ease((p-.08)/.84):1;
    shells.forEach((s,index)=>{
      // Reveal the inner shell first, then its close outer companion.
      const sweep=birth?ease((p-index*.22)/.65):1,ink=birth?ease((p-.08-index*.22)/.36):1;
      s.material.uniforms.reveal.value=sweep;
      s.material.uniforms.alpha.value=ink*(growth?.075:whole?.13:.18);
      s.meridians.forEach((line,i)=>{line.visible=i/8<=sweep;line.material.opacity=ink*(growth?.028:.06);});
      s.parallels.forEach(line=>{line.geometry.setDrawRange(0,2*Math.floor(192*sweep));line.material.opacity=ink*(growth?.04:.1);});
      s.brush.visible=birth;s.brush.rotation.z=tau*sweep;s.brush.material.opacity=(1-ease((p-.86)/.14))*.8;
      s.path.material.opacity=birth?.5*ease((p-.76)/.24):growth?.6*(1-ease(p/.2)):whole?.45:.6;
      s.golden.material.opacity=growth?.46:whole?.46*(1-ease(p/.24)):0;
      s.golden.geometry.setDrawRange(0,2*Math.floor(3072*fraction));
      s.head.visible=growth;s.head.position.set(...torusPoint(s.side*tau*18*fraction,tau*18*phi*fraction+index*Math.PI,s.shape));
    });
    dotsMaterial.uniforms.alpha.value=birth?ease((p-.8)/.2):.8;
    const positions=dotsGeometry.attributes.position;
    for(let i=0;i<24;i++){const t=elapsed*.085+(i%12)/12*tau,index=i<12?0:1,s=shells[index];positions.setXYZ(i,...torusPoint(s.side*2*t,3*t+index*Math.PI,s.shape));}positions.needsUpdate=true;
  }
  return {update,dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(root);}};
}
