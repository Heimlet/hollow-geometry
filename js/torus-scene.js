/** An illustrative toroidal flow, not a simulation of a physical energy field. */
import * as THREE from 'three';
import {TORUS,TORUS_AXIS,torusPoint,torusCurve} from './torus-math.js';
const tau=Math.PI*2,phi=(1+Math.sqrt(5))/2;
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createTorusScene(scene) {
  const root=new THREE.Group();root.name='Torus finale';root.visible=false;
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...TORUS_AXIS));scene.add(root);
  const surfaceMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{alpha:{value:0},reveal:{value:1}},
    vertexShader:`varying vec3 n;varying vec3 eye;varying vec2 coord;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=-p.xyz;coord=uv;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform float alpha;uniform float reveal;varying vec3 n;varying vec3 eye;varying vec2 coord;
      void main(){if(coord.x>reveal)discard;float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.5);
      vec3 color=mix(vec3(.08,.28,.4),vec3(.43,.8,.91),rim);gl_FragColor=vec4(color,alpha*(.18+.82*rim));}`});
  const surface=new THREE.Mesh(new THREE.TorusGeometry(TORUS.major,TORUS.tube,40,160),surfaceMaterial);root.add(surface);
  function stroke(points,color,opacity,width=1.5) {
    const vertices=points.slice(1).flatMap((p,i)=>[new THREE.Vector3(...points[i]),new THREE.Vector3(...p)]);
    const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color,transparent:true,opacity,linewidth:width,depthWrite:false}));root.add(line);return line;
  }
  const meridians=Array.from({length:16},(_,i)=>stroke(torusCurve(0,1,96).map(p=>{
    const a=i*tau/16;return [p[0]*Math.cos(a),p[0]*Math.sin(a),p[2]];
  }),0x8dcfe2,.13));
  const parallels=[0,Math.PI/2,Math.PI,3*Math.PI/2].map(v=>stroke(torusCurve(1,0,256,v),0x8dcfe2,.16));
  const brush=stroke(torusCurve(0,1,128),0xf5d18a,1,2.6);
  const paths=[stroke(torusCurve(2,3),0xf3cb86,.7,2.2),stroke(torusCurve(-2,3,768,Math.PI),0x90dcec,.7,2.2)];
  const golden=stroke(torusCurve(18,18*phi,4096),0xf3cb86,0,1.8);
  const dotsGeometry=new THREE.BufferGeometry();dotsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(32*3),3));
  const dotColors=new Float32Array(32*3);for(let i=0;i<32;i++)new THREE.Color(i<16?0xf6dca3:0xa0eeff).toArray(dotColors,i*3);dotsGeometry.setAttribute('color',new THREE.BufferAttribute(dotColors,3));
  const dotsMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,uniforms:{alpha:{value:1}},
    vertexShader:`varying vec3 tint;void main(){tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=9.;}`,
    fragmentShader:`uniform float alpha;varying vec3 tint;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(tint,alpha*exp(-5.*d*d));}`});
  const dots=new THREE.Points(dotsGeometry,dotsMaterial);dots.frustumCulled=false;root.add(dots);
  const headGeometry=new THREE.SphereGeometry(.055,12,8),head=new THREE.Mesh(headGeometry,new THREE.MeshBasicMaterial({color:0xffe6a9}));root.add(head);
  function update(kind,p,elapsed=0) {
    root.visible=!!kind;if(!kind)return;
    const birth=kind==='birth',growth=kind==='golden',whole=kind==='whole';
    const sweep=birth?ease(p/.76):1,ink=birth?ease((p-.1)/.4):1;
    surfaceMaterial.uniforms.reveal.value=sweep;
    surfaceMaterial.uniforms.alpha.value=birth?.4*ease((p-.16)/.4):growth?.14:whole?.22:.32;
    meridians.forEach((line,i)=>{line.visible=i/16<=sweep;line.material.opacity=ink*(growth?.045:.11);});
    parallels.forEach(line=>{line.geometry.setDrawRange(0,2*Math.floor(256*sweep));line.material.opacity=ink*(growth?.07:.16);});
    brush.visible=birth;brush.rotation.z=tau*sweep;brush.material.opacity=1-.7*ease((p-.8)/.2);
    const pathsAlpha=birth?.55*ease((p-.7)/.3):growth?.65*(1-ease(p/.22)):whole?.5:.78;
    paths.forEach(line=>{line.material.opacity=pathsAlpha;line.geometry.setDrawRange(0,Infinity);});
    dots.visible=!growth;dotsMaterial.uniforms.alpha.value=birth?ease((p-.76)/.24):.9;
    const positions=dotsGeometry.attributes.position;
    for(let i=0;i<32;i++){const t=elapsed*.085+(i%16)/16*tau,side=i<16?1:-1;positions.setXYZ(i,...torusPoint(side*2*t,3*t+(side<0?Math.PI:0)));}positions.needsUpdate=true;
    const fraction=growth?ease((p-.08)/.84):1;
    golden.material.opacity=growth?.7:whole?.7*(1-ease(p/.24)):0;
    golden.geometry.setDrawRange(0,2*Math.floor(4096*fraction));
    head.visible=growth;head.position.set(...torusPoint(tau*18*fraction,tau*18*phi*fraction));
    // All transforms and draw ranges depend on the paused/seekable tour clock.
  }
  return {update,dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(root);}};
}
