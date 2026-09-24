/** Two illustrative shells share the exact vertical axis of the live Merkaba. */
import * as THREE from 'three';
import {TORI,TORUS_AXIS,TORUS_AXIS_EXTENT,TORUS_CONTACT,ORBIT_SEEDS,orbitPoint,expansionPath,spiralGuide,spiralGuidePath,torusFrameFromAnchors,torusPoint,torusCurve,expansionReferences,cubeWitnessInk,traceEntrance,EXPANSION_TARGET_SCALE,EXPANSION_TARGET_TURNS} from './torus-math.js';
const tau=Math.PI*2,phi=(1+Math.sqrt(5))/2;
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createTorusScene(scene) {
  const root=new THREE.Group();root.name='Torus finale';root.visible=false;
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...TORUS_AXIS));scene.add(root);
  const rootOrientation=root.quaternion.clone(),localAxis=new THREE.Vector3(0,0,1),worldAxis=new THREE.Vector3(...TORUS_AXIS),referenceRotation=new THREE.Quaternion(),referenceInverse=new THREE.Quaternion();
  function stroke(parent,points,color,opacity,width=1.5,segments=false) {
    const vertices=segments?points.map(p=>new THREE.Vector3(...p)):points.slice(1).flatMap((p,i)=>[new THREE.Vector3(...points[i]),new THREE.Vector3(...p)]);
    const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color,transparent:true,opacity,linewidth:width,depthWrite:false}));parent.add(line);return line;
  }
  const pole=stroke(root,[[0,0,-TORUS_AXIS_EXTENT],[0,0,TORUS_AXIS_EXTENT]],0xffd277,.84,2.3);pole.name='Shared vertical axis';
  const polePoint=new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]),new THREE.PointsMaterial({color:0xffd277,size:4,sizeAttenuation:false,transparent:true,opacity:.84,depthWrite:false,depthTest:false}));
  polePoint.name='Vertical axis seen end-on';polePoint.renderOrder=20;polePoint.visible=false;root.add(polePoint);
  const traces=new THREE.Group();traces.name='Actual tetrahedron vertex orbits';root.add(traces);
  const orbitLines=ORBIT_SEEDS.map(seed=>{
    const line=stroke(traces,Array.from({length:193},(_,i)=>orbitPoint(seed,i/192*Math.PI)),seed.side>0?0xff9edb:0x94e6ff,.65,2);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.057,12,8),new THREE.MeshBasicMaterial({color:seed.side>0?0xffb9e5:0xacf0ff,transparent:true}));traces.add(head);return {seed,line,head};
  });
  const guides=[phi].map(ratio=>{
    const group=new THREE.Group();group.name=`Spiral coupling · ${ratio===3?'cube':'phi'}`;root.add(group);
    const lines=[0,7].map(index=>({index,line:stroke(group,spiralGuidePath(ORBIT_SEEDS[index],ratio),index===7?0xffd277:0x94e6ff,.72,2.5)}));
    return {ratio,group,lines};
  });
  const contacts=new THREE.Group();contacts.name='Measured torus supports';root.add(contacts);
  const contactLines=[0,7].map(index=>{const p=ORBIT_SEEDS[index].point,factor=TORI[1].major/TORI[0].major;return {index,line:stroke(contacts,[p,p.map((x,k)=>k===2?x:x*factor)],0xffdc95,.9,2.2)};});
  const arrows=[0,7].map(index=>{const arrow=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,10),new THREE.MeshBasicMaterial({color:ORBIT_SEEDS[index].side>0?0xff9edb:0x94e6ff}));arrow.name='Signed spiral direction';root.add(arrow);return {index,arrow};});
  const reference=new THREE.Group();reference.name='Fixed scale reference';root.add(reference);
  const corners=ORBIT_SEEDS.map(s=>s.point);
  for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if(corners[i].filter((v,k)=>v!==corners[j][k]).length===1)stroke(reference,[corners[i],corners[j]],0xe5ca8d,.24,1.2);
  // Six real crossings of the canonical source edges, then the twelve
  // intersection edges. These points are also the small cube's face centres.
  const intersectionProof=new THREE.Group();intersectionProof.name='Octahedron from six edge crossings';root.add(intersectionProof);
  const octaPoints=[0,1,2].flatMap(axis=>[-1,1].map(sign=>{const p=[0,0,0];p[axis]=sign*Math.abs(corners[0][0]);return p;}));
  const crossingMarks=octaPoints.map(p=>{
    const group=new THREE.Group();intersectionProof.add(group);
    for(const side of [-1,1]){const vertices=ORBIT_SEEDS.filter(seed=>seed.side===side).map(seed=>seed.point);
      for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(vertices[i].every((x,k)=>Math.abs((x+vertices[j][k])/2-p[k])<1e-7))stroke(group,[vertices[i],vertices[j]],side>0?0xff9edb:0x94e6ff,0,2.8);
    }
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),new THREE.MeshBasicMaterial({color:0xffe5ae,transparent:true,depthWrite:false}));dot.position.set(...p);group.add(dot);return group;
  });
  const intersectionEdges=[];
  for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)if(Math.floor(i/2)!==Math.floor(j/2))intersectionEdges.push(stroke(intersectionProof,[octaPoints[i],octaPoints[j]],0x76ffc2,0,2.5));
  const heightGuide=new THREE.Group();heightGuide.name='Torus height · current cube';root.add(heightGuide);
  for(const sign of [-1,1])stroke(heightGuide,[[-.24,0,sign*TORI[0].height],[TORI[0].major+.24,0,sign*TORI[0].height]],0xffd277,0,2);
  stroke(heightGuide,[[TORI[0].major,0,-TORI[0].height],[TORI[0].major,0,TORI[0].height]],0xffd277,0,1.5);
  const futureCube=reference.clone();futureCube.name='Future cube · next scale';futureCube.scale.setScalar(EXPANSION_TARGET_SCALE);root.add(futureCube);
  futureCube.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.color.set(0xffd277);o.material.linewidth=2.6;}});
  const futureVertices=corners.map(p=>{const head=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),new THREE.MeshBasicMaterial({color:0xffe1a0,transparent:true}));head.position.set(...p.map(x=>x*EXPANSION_TARGET_SCALE));root.add(head);return head;});
  const bridge=new THREE.Group();bridge.name='Octahedron linking the two cube scales';root.add(bridge);
  const futureA=Math.abs(corners[0][0])*EXPANSION_TARGET_SCALE;
  const bridgeVertices=[0,1,2].flatMap(axis=>[-1,1].map(sign=>{const p=[0,0,0];p[axis]=sign*futureA;return p;}));
  for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)if(Math.floor(i/2)!==Math.floor(j/2))stroke(bridge,[bridgeVertices[i],bridgeVertices[j]],0x76dcb8,0,1.6);
  const bridgeFaces=corners.flatMap(p=>p.map((value,axis)=>{const vertex=[0,0,0];vertex[axis]=Math.sign(value)*futureA;return new THREE.Vector3(...vertex);}));
  const bridgeSurface=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(bridgeFaces),new THREE.MeshBasicMaterial({color:0x76dcb8,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));bridge.add(bridgeSurface);
  const inscription=new THREE.Group();inscription.name='Cube octahedron cube · exact factor three';root.add(inscription);
  const oldCube=reference.clone();oldCube.scale.setScalar(3);oldCube.traverse(o=>{if(o.material)o.material=o.material.clone();});inscription.add(oldCube);
  const oldOcta=bridge.clone();oldOcta.scale.setScalar(3/EXPANSION_TARGET_SCALE);oldOcta.traverse(o=>{if(o.material)o.material=o.material.clone();});inscription.add(oldOcta);
  const innerCube=reference.clone();innerCube.traverse(o=>{if(o.material)o.material=o.material.clone();});inscription.add(innerCube);
  const centroids=corners.map(p=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(.06,10,8),new THREE.MeshBasicMaterial({color:0xffde94,transparent:true}));marker.position.set(...p);inscription.add(marker);return marker;});
  const cubeFaceProof=new THREE.Group();cubeFaceProof.name='Six cube faces to octahedron vertices';inscription.add(cubeFaceProof);
  const outerA=3*Math.abs(corners[0][0]);
  const faceCentres=octaPoints.map(p=>p.map(x=>3*x));
  const squareProofs=faceCentres.map((center,index)=>{
    const group=new THREE.Group();cubeFaceProof.add(group);const axis=Math.floor(index/2),other=[0,1,2].filter(k=>k!==axis);
    const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(pair=>{const p=[...center];other.forEach((k,i)=>p[k]=outerA*pair[i]);return p;});
    for(const pair of [[0,2],[1,3]])stroke(group,pair.map(i=>points[i]),0xffd277,0,1.5);
    const plane=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([0,1,2,0,2,3].map(i=>new THREE.Vector3(...points[i]))),new THREE.MeshBasicMaterial({color:0xffd277,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));group.add(plane);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),new THREE.MeshBasicMaterial({color:0xffdc95,transparent:true,depthWrite:false}));dot.position.set(...center);group.add(dot);return {group,plane,dot};
  });
  const medians=new THREE.Group();medians.name='Octahedron face medians to small cube vertex';inscription.add(medians);
  const triangle=[[outerA,0,0],[0,outerA,0],[0,0,outerA]];
  triangle.forEach((p,i)=>stroke(medians,[p,triangle[(i+1)%3].map((x,k)=>(x+triangle[(i+2)%3][k])/2)],0xffd277,0,1.8));
  // One reusable half-turn growth path per original vertex. Matrices and
  // draw ranges advance along it; no buffers or thick-line proxies are rebuilt.
  const futurePaths=ORBIT_SEEDS.map(seed=>{
    const group=new THREE.Group();group.name='Vertex to next cube';root.add(group);
    const points=expansionPath(seed).reverse(),color=seed.side>0?0xff9edb:0x94e6ff;
    const line=stroke(group,points,color,0,1.7);
    const outward=stroke(group,[...points].reverse(),seed===ORBIT_SEEDS[7]?0xffd277:color,0,2);
    const target=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0}));target.position.set(...points[0]);group.add(target);
    return {group,line,outward,target,seed,endpoint:points[0]};
  });
  // A fixed pool, not an ever-growing collection. Invisible endpoints are
  // recycled when the next scale enters; matching contours never jump.
  const nextCages=Array.from({length:8},(_,index)=>{
    const group=reference.clone();group.name=`Scale echo · ${index}`;root.add(group);group.traverse(o=>{if(o.material)o.material=o.material.clone();});
    const core=bridge.clone();core.name=`Intersection scale echo · ${index}`;root.add(core);core.traverse(o=>{if(o.material)o.material=o.material.clone();});
    const halo=new THREE.Group();halo.name=`Torus scale echo · ${index}`;root.add(halo);
    for(let i=0;i<2;i++)stroke(halo,torusCurve(0,1,96).map(([x,y,z])=>i?[y,x,z]:[x,y,z]),0x76dcb8,0,1.1);
    return {group,core,halo};
  });
  const futureBodies=[-1,1].map(side=>{
    const indices=ORBIT_SEEDS.map((seed,i)=>seed.side===side?i:-1).filter(i=>i>=0),pairs=indices.flatMap((a,i)=>indices.slice(i+1).map(b=>[a,b]));
    const line=stroke(root,pairs.flatMap(pair=>pair.map(index=>ORBIT_SEEDS[index].point)),side>0?0xff9edb:0x94e6ff,0,1.4,true);line.name='Next tetrahedron preview';line.frustumCulled=false;
    return {line,pairs,side};
  });
  const futureCore=new THREE.Group();futureCore.name='Next live intersection preview';root.add(futureCore);
  function streamedPart(surface){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(512*3),3));
    const material=surface?new THREE.MeshBasicMaterial({color:0x76dcb8,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}):new THREE.LineBasicMaterial({color:0x76dcb8,transparent:true,opacity:0,linewidth:1.8,depthWrite:false});
    const object=surface?new THREE.Mesh(geometry,material):new THREE.LineSegments(geometry,material);object.frustumCulled=false;futureCore.add(object);return object;
  }
  const futureCoreSurface=streamedPart(true),futureCoreEdges=streamedPart(false),streamPoint=new THREE.Vector3();
  function streamGeometry(source,target,matrix){
    const attribute=source.attributes.position,index=source.index,count=Math.min(512,index?.count??attribute.count),out=target.geometry.attributes.position;
    for(let i=0;i<count;i++){streamPoint.fromBufferAttribute(attribute,index?index.getX(i):i).applyMatrix4(matrix).applyQuaternion(referenceInverse).multiplyScalar(EXPANSION_TARGET_SCALE);out.setXYZ(i,streamPoint.x,-streamPoint.z,streamPoint.y);}
    out.needsUpdate=true;target.geometry.setDrawRange(0,count);
  }
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
    const brush=stroke(group,torusCurve(0,1,128,-TORUS_CONTACT,shape),color,.9,2.3);
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
  const dots=new THREE.Points(dotsGeometry,dotsMaterial);dots.name='Moving torus particles';dots.frustumCulled=false;root.add(dots);
  function update(kind,p,elapsed=0,{axis=false,rotation=0,startRotation=0,scale=1,expansion=null,anchors=null,cubeHalfHeight=null,direction=1,intersectionSource=null,intersectionWitness=false,referenceYaw=0,showHeightGuide=true}={}) {
    const mechanism=kind==='mechanism',cage=kind==='cage',growing=kind==='growth',paired=kind==='pair'||kind==='inscription',spiral=kind==='spiral',orbit=kind==='traces'||cage||growing||mechanism||paired||spiral,birth=kind==='birth',growth=kind==='golden',whole=kind==='whole'||kind==='cosmos';
    root.quaternion.copy(rootOrientation).multiply(referenceRotation.setFromAxisAngle(localAxis,referenceYaw));
    referenceInverse.setFromAxisAngle(worldAxis,-referenceYaw);
    const c=Math.cos(referenceYaw),s=Math.sin(referenceYaw);
    const localAnchors=anchors?.map(([x,y,z])=>[c*x+s*y,-s*x+c*y,z]);
    const actual=localAnchors||ORBIT_SEEDS.map(seed=>orbitPoint(seed,rotation).map(x=>x*scale)),frame=torusFrameFromAnchors(actual,cubeHalfHeight);
    const carry=cage?1-ease(p/.12):0,traceIn=kind==='traces'?traceEntrance(p):1;
    const handoff=cage?ease((p-.82)/.18):1,sourceFocus=growth?ease(p/.12):whole?1:0;
    const proofInk=intersectionWitness?1-ease((p-.25)/.05):0;
    intersectionProof.visible=proofInk>0;intersectionProof.scale.setScalar(scale);
    crossingMarks.forEach((group,i)=>group.children.forEach(part=>{part.material.opacity=proofInk*ease((p-.025-i*.012)/.035)*(part.isMesh?1:i===0?.85:.18);}));
    intersectionEdges.forEach((line,i)=>line.material.opacity=proofInk*ease((p-.13-i*.006)/.025));
    root.visible=!!kind||axis;
    const teachingInk=paired?ease(p/.12)*(1-ease((p-.87)/.13)):0,alignment=ease((Math.abs(Math.cos(rotation*2))-.92)/.08);
    inscription.visible=kind==='inscription';inscription.scale.setScalar(scale);
    oldCube.children.forEach(line=>line.material.opacity=kind==='inscription'?teachingInk*.24:0);
    const octaBuild=kind==='inscription'?ease((p-.23)/.2):1,smallBuild=kind==='inscription'?ease((p-.58)/.2):1;
    oldOcta.children.forEach((part,i)=>{part.material.opacity=teachingInk*(part.isMesh?.035:.55)*(part.isMesh?octaBuild:ease(octaBuild*12-i));part.material.color.set(kind==='inscription'?0xffd277:0x76dcb8);});
    cubeFaceProof.visible=kind==='inscription';
    squareProofs.forEach(({group,plane,dot},i)=>{const ink=teachingInk*ease((p-.035-i*.025)/.07)*(1-.75*ease((p-.45)/.2));group.children.forEach(part=>part.material.opacity=part===dot?ink:part===plane?ink*.035:ink*.24);});
    medians.visible=kind==='inscription';medians.children.forEach(line=>line.material.opacity=teachingInk*ease((p-.43)/.13)*.75);
    innerCube.children.forEach(line=>line.material.opacity=teachingInk*.42*smallBuild*(kind==='inscription'?1:alignment));
    centroids.forEach(marker=>marker.material.opacity=kind==='inscription'?teachingInk*smallBuild*(.7+.3*alignment):0);pole.visible=axis||!!kind;polePoint.visible=false;pole.scale.setScalar(scale);
    reference.visible=cage&&handoff<1;reference.scale.setScalar(scale);
    reference.children.forEach(line=>line.material.opacity=(1-carry)*(1-handoff)*(.1+.75*ease((Math.abs(Math.cos(rotation*2))-.9)/.1)));
    const witness=cage?cubeWitnessInk(p):0,preparation=mechanism?ease((p-(intersectionWitness?.34:.12))/.18):0;
    const turns=expansion?.turns||0,phase=turns-EXPANSION_TARGET_TURNS*Math.floor(turns/EXPANSION_TARGET_TURNS),contracting=direction<0,nextScale=scale*phi**((contracting?0:EXPANSION_TARGET_TURNS)-phase);
    const heightInk=birth?ease(p/.15)*(1-ease((p-.6)/.22)):0;
    heightGuide.visible=showHeightGuide&&heightInk>0;heightGuide.scale.set(frame.radialScale,frame.radialScale,frame.axialScale);heightGuide.children.forEach(line=>line.material.opacity=heightInk*.6);
    const arrival=expansion?(1-ease((phase-1.88)/.12))*(turns<.12?1:ease(phase/.12)):0,futureInk=cage?Math.max(witness,handoff):birth?heightInk*.28:growing||kind==='traces'?arrival*traceIn:0;
    futureCube.visible=futureInk>0;futureCube.scale.setScalar(cage?scale*EXPANSION_TARGET_SCALE:birth?scale:nextScale);
    const edgesReveal=cage?ease((p-.42)/.13):1,coreReveal=cage?ease((p-.51)/.1):1;
    futureCube.children.forEach((line,i)=>line.material.opacity=futureInk*(cage?.3+.3*handoff:.6)*(cage?ease(edgesReveal*12-i):1));
    futureVertices.forEach((head,i)=>{head.visible=futureInk>0&&!birth;head.material.opacity=futureInk*(cage?ease((p-.4)/.06):1);head.scale.setScalar(scale);head.position.set(...corners[i].map(x=>x*(cage?scale*EXPANSION_TARGET_SCALE:nextScale)));});
    const preview=cage?Math.max(witness,handoff):mechanism?preparation*ease((p-.3)/.28)*(1-ease((p-.85)/.15)):growing||kind==='traces'?arrival*traceIn:0;
    bridge.visible=futureInk>0&&!birth;bridge.scale.setScalar(cage?scale:nextScale/EXPANSION_TARGET_SCALE);
    bridge.children.forEach(part=>part.material.opacity=futureInk*coreReveal*(part.isMesh?.032:.46)*(cage?.18+.82*ease((p-.82)/.18):1));
    futurePaths.forEach(({group,line,outward,target,seed,endpoint})=>{
      group.visible=preview>0;group.scale.setScalar(scale/phi**phase);group.rotation.z=(rotation-phase*Math.PI/2)*seed.side;
      line.geometry.setDrawRange(0,384-2*Math.ceil(phase/EXPANSION_TARGET_TURNS*192));
      line.visible=(!cage||handoff>0)&&!contracting;outward.visible=cage&&handoff<1||contracting;
      const reveal=cage?ease((p-.18)/.24):contracting?phase/EXPANSION_TARGET_TURNS:1;
      outward.geometry.setDrawRange(0,2*Math.floor(192*reveal));outward.material.opacity=preview*(seed===ORBIT_SEEDS[7]?.85:.24)*(cage?1-handoff:1);
      target.position.set(...(cage?spiralGuide(seed,EXPANSION_TARGET_TURNS*reveal):contracting?seed.point:endpoint));
      line.material.opacity=preview*(seed===ORBIT_SEEDS[7]?.8:.18)*(cage?handoff:1);target.material.opacity=preview*.85;
    });
    futureBodies.forEach(({line,pairs,side})=>{
      const bodyInk=mechanism?preparation:cage?1:growing||kind==='traces'?arrival*.65*traceIn:0;
      line.visible=bodyInk>0;line.material.opacity=bodyInk*(cage?.4+.1*(1-carry)-.24*handoff:.4);
      if(!line.visible)return;
      const index=pairs[0][0],base=ORBIT_SEEDS[index].point,anchor=actual[index];
      const delta=(growing||kind==='traces'?((contracting?0:2)-phase):2)*Math.PI/2;
      const size=growing||kind==='traces'?nextScale/scale:EXPANSION_TARGET_SCALE;
      line.rotation.z=Math.atan2(anchor[1],anchor[0])-Math.atan2(base[1],base[0])+side*delta;
      line.scale.set(frame.radialScale*size,frame.radialScale*size,frame.axialScale*size);
    });
    const corePreview=mechanism?preparation:carry;
    futureCore.visible=corePreview>0&&!!intersectionSource;
    if(futureCore.visible){streamGeometry(intersectionSource.mesh.geometry,futureCoreSurface,intersectionSource.mesh.matrixWorld);streamGeometry(intersectionSource.edges.geometry,futureCoreEdges,intersectionSource.edges.matrixWorld);}
    futureCoreSurface.material.opacity=corePreview*.045;futureCoreEdges.material.opacity=corePreview*.55;
    const echoes=expansionReferences(turns,scale),haloInk=!kind||orbit?0:birth?ease((p-.85)/.15):1;
    const proofFocus=growth?1-.8*ease(p/.14)*(1-ease((p-.6)/.2)):1;
    nextCages.forEach(({group,core,halo},i)=>{
      const echo=echoes[i];group.visible=(!!expansion||cage&&handoff>0)&&!paired&&!spiral;halo.visible=!!expansion&&haloInk>0;
      core.visible=(!!expansion||cage&&handoff>0)&&!paired&&!spiral&&sourceFocus<1;core.scale.setScalar(echo.scale/EXPANSION_TARGET_SCALE);group.scale.setScalar(echo.scale);halo.scale.setScalar(echo.scale);
      const alpha=traceIn*handoff*echo.alpha*(.13+.27*Math.exp(-8*Math.log(echo.scale/scale)**2));
      group.children.forEach(line=>line.material.opacity=alpha*(orbit?.18:.35)*proofFocus);
      core.children.forEach(part=>part.material.opacity=traceIn*handoff*echo.alpha*(part.isMesh?.012:orbit?.12:.24)*proofFocus*(1-sourceFocus));
      halo.children.forEach(line=>line.material.opacity=echo.alpha*.17*haloInk*proofFocus);
    });
    guides.forEach(({ratio,group,lines})=>{
      group.visible=(!!expansion||mechanism||cage)&&!!kind;group.scale.set(frame.radialScale,frame.radialScale,frame.axialScale);
      const ink=mechanism?ease((p-(intersectionWitness?.52:.34))/.28):1;
      lines.forEach(({line,index})=>{line.rotation.z=rotation*ORBIT_SEEDS[index].side;line.material.opacity=(spiral?.95:kind==='traces'?.95-.23*traceIn:.72)*ink*(birth?1-.2*ease(p/.3):1);});
    });
    arrows.forEach(({index,arrow})=>{
      arrow.visible=!!kind&&(!!expansion||cage&&handoff>0);arrow.material.transparent=true;arrow.material.opacity=handoff;
      const [x,y,z]=actual[index],k=Math.log(expansion?.ratio||phi),w=ORBIT_SEEDS[index].side*Math.PI/2;
      const tangent=new THREE.Vector3(k*x-w*y,k*y+w*x,k*z).normalize().multiplyScalar(direction);
      arrow.position.set(x,y,z).addScaledVector(tangent,scale*.23);arrow.scale.setScalar(scale);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tangent);
    });
    traces.visible=!!kind;traces.scale.setScalar(scale);
    orbitLines.forEach(({seed,line,head},i)=>{
      const portion=kind==='traces'?ease(p/.7):1;
      line.visible=kind==='traces'||birth;line.geometry.setDrawRange(0,2*Math.floor(192*portion));
      line.material.opacity=(birth?1-ease((p-.4)/.32):1)*.52;
      head.visible=(orbit&&!spiral)||i===0||i===7;head.material.opacity=i===0||i===7?1:traceIn;head.scale.setScalar(i===0||i===7?1.8:1);head.position.set(...actual[i].map(x=>x/scale));
    });
    contacts.visible=!!kind&&!orbit&&(!birth||p>.85);
    contactLines.forEach(({index,line})=>{
      const p=actual[index],base=ORBIT_SEEDS[index].point;
      line.rotation.z=Math.atan2(p[1],p[0])-Math.atan2(base[1],base[0]);line.scale.set(frame.radialScale,frame.radialScale,frame.axialScale);
    });
    shells.forEach(s=>{s.group.visible=!!kind&&!orbit;s.group.scale.set(frame.radialScale,frame.radialScale,frame.axialScale);});
    dots.visible=!!kind&&!orbit&&!growing&&!growth;dots.scale.set(frame.radialScale,frame.radialScale,frame.axialScale);
    if(!kind)return;
    const fraction=growth?ease((p-.08)/.84):1;
    shells.forEach((s,index)=>{
      // First extend one meridian through the vertex trails, then sweep it
      // around their shared axis. The surface is exactly the swept circular meridian.
      const sweep=birth?ease((p-.25-index*.12)/.6):1,ink=birth?ease((p-.26-index*.12)/.18):1;
      s.material.uniforms.reveal.value=sweep;
      s.material.uniforms.alpha.value=ink*(growth?.13:whole?.13:.18);
      s.meridians.forEach((line,i)=>{line.visible=i/8<=sweep;line.material.opacity=ink*(growth?.028:.06);});
      s.parallels.forEach(line=>{line.geometry.setDrawRange(0,2*Math.floor(192*sweep));line.material.opacity=ink*(growth?.04:.1);});
      s.brush.visible=birth;s.brush.rotation.z=tau*sweep;
      s.brush.geometry.setDrawRange(0,2*Math.floor(128*ease((p-index*.12)/.24)));
      s.brush.material.opacity=(1-ease((p-.89)/.11))*.88;
      s.path.geometry.setDrawRange(0,2*Math.floor(768*(kind==='weave'?ease(p/.82):1)));
      s.path.material.opacity=birth?.5*ease((p-.87)/.13):growth?.1:whole?.25:.6;
      s.golden.material.opacity=kind==='whole'?.16*ease(p/.3):kind==='cosmos'?.16:0;
      s.golden.geometry.setDrawRange(0,2*Math.floor(3072*fraction));
      s.head.visible=false;s.head.position.set(...torusPoint(s.side*tau*18*fraction,tau*18*phi*fraction+index*Math.PI,s.shape));
    });
    dotsMaterial.uniforms.alpha.value=birth?ease((p-.9)/.1):kind==='weave'?ease((p-.4)/.4)*.8:.8;
    const positions=dotsGeometry.attributes.position;
    for(let i=0;i<24;i++){const t=elapsed*.085+(i%12)/12*tau,index=i<12?0:1,s=shells[index];positions.setXYZ(i,...torusPoint(s.side*2*t,3*t+index*Math.PI,s.shape));}positions.needsUpdate=true;
  }
  function updateAxisView(camera,width,height){
    polePoint.visible=false;if(!root.visible)return;
    root.updateMatrixWorld(true);
    const a=new THREE.Vector3().fromBufferAttribute(pole.geometry.attributes.position,0).applyMatrix4(pole.matrixWorld).project(camera);
    const b=new THREE.Vector3().fromBufferAttribute(pole.geometry.attributes.position,1).applyMatrix4(pole.matrixWorld).project(camera);
    const endOn=Math.hypot((a.x-b.x)*width/2,(a.y-b.y)*height/2)<2.3;
    // A pixel-width line shader has no direction when both endpoints coincide.
    // Render that same world-axis projection as one point, not a screen streak.
    pole.visible=!endOn;polePoint.visible=endOn;
  }
  return {update,updateAxisView,dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(root);}};
}
