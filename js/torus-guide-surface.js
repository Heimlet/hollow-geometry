/** Exact spiral carrier, layered with the separate rounded phi construction. */
import * as THREE from 'three';
import { PHI } from './constants.js';
import { spiralFunnelPoint,SPIRAL_FUNNEL_EXTENT } from './torus-funnel-math.js';
const coreRows=8,outerRows=24,rows=coreRows+outerRows,columns=64;
export function createSpiralSurface(parent){
  const group=new THREE.Group();group.name='Exact spiral surfaces';parent.add(group);
  const meshes=[1,-1].map(sign=>{
    const positions=[],normals=[],uv=[],indices=[];
    for(let i=0;i<=rows;i++){
      const t=i<=coreRows?PHI*i/coreRows:PHI*(SPIRAL_FUNNEL_EXTENT/PHI)**((i-coreRows)/outerRows);
      for(let j=0;j<=columns;j++){
        const angle=j/columns*2*Math.PI;
        positions.push(...spiralFunnelPoint(angle,sign*t));
        normals.push(Math.cos(angle)/Math.sqrt(3),Math.sin(angle)/Math.sqrt(3),-sign*Math.sqrt(2/3));
        uv.push(j/columns,i/rows);
        if(i<rows&&j<columns){const a=i*(columns+1)+j,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1);}
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{reveal:{value:0},alpha:{value:0},tint:{value:new THREE.Color(sign>0?0xffd58f:0xe7c899)}},
      vertexShader:`varying vec3 n;varying vec3 eye;varying vec2 coord;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=-p.xyz;coord=uv;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform float reveal;uniform float alpha;uniform vec3 tint;varying vec3 n;varying vec3 eye;varying vec2 coord;
        void main(){float edge=1.-smoothstep(reveal-.025,reveal,coord.y);float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.);
        float fade=1./(1.+12.*pow(max(0.,coord.y-.25),2.));gl_FragColor=vec4(tint,alpha*(.14+.86*rim)*edge*fade);}`});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=sign>0?'Upper spiral cone':'Lower spiral cone';group.add(mesh);return mesh;
  });
  return {group,update(core,extension){
    const reveal=(coreRows*core+outerRows*extension)/rows;
    for(const mesh of meshes){mesh.material.uniforms.reveal.value=reveal===1?1.05:reveal;mesh.material.uniforms.alpha.value=.16*Math.min(1,core/.12);}
  }};
}
