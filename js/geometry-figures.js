/** Orthographic illustrations built from the same vertices as the tours. */
import { ORBIT_SEEDS,spiralGuide,torusCurve } from './torus-math.js';
import { A,PHI } from './constants.js';
import { fruitVolume } from './fruit-life.js';
import { el } from './lab-controls.js';
const NS='http://www.w3.org/2000/svg',gold='#edcb8b',blue='#91cfe6',violet='#c4b0ef';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>a.map(v=>v/Math.hypot(...a));
function svgNode(tag,attrs){const node=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;}
function pane(parent,label,dir=[0,0,1],scale=38){
  const box=el('div',null,'geometry-pane'),svg=svgNode('svg',{viewBox:'0 0 180 150',role:'img','aria-label':label});
  box.append(svg,el('span',label));parent.append(box);
  const n=unit(dir),right=unit(cross([0,1,0],n)),up=cross(n,right);
  const project=p=>[90+scale*dot(p,right),75-scale*dot(p,up)];
  const path=(points,color=gold,opacity=1,close=false)=>{
    svg.append(svgNode('path',{d:points.map((p,i)=>(i?'L':'M')+project(p).join(',')).join(' ')+(close?'Z':''),fill:'none',stroke:color,'stroke-width':1.55,'stroke-opacity':opacity,'stroke-linejoin':'round','stroke-linecap':'round'}));
  };
  const circle=(p,r,color=gold,opacity=1)=>{const [cx,cy]=project(p);svg.append(svgNode('circle',{cx,cy,r:r*scale,fill:r<.1?color:'none',stroke:color,'stroke-width':1.25,'stroke-opacity':opacity}));};
  return {path,circle};
}
const cube=Array.from({length:8},(_,i)=>[i&1?1:-1,i&2?1:-1,i&4?1:-1]);
const edges=[];for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if(cube[i].filter((v,k)=>v!==cube[j][k]).length===1)edges.push([i,j]);
function drawCube(pen){for(const [a,b]of edges)pen.path([cube[a],cube[b]],blue);}
function drawStar(pen){for(const sign of [-1,1]){const vertices=cube.filter(p=>p[0]*p[1]*p[2]===sign);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)pen.path([vertices[i],vertices[j]],sign>0?gold:violet,.95);}}
function drawFlower(pen,flat){
  const data=fruitVolume(1.6),r=data.radius*2,axis=unit([1,1,1]),u=unit([1,0,-1]),v=cross(axis,u);
  data.allCenters.forEach((center,index)=>{
    if(flat&&index===0)return;
    if(!flat)pen.circle(center,r,blue,.28);
    const points=Array.from({length:65},(_,i)=>center.map((value,k)=>value+r*(u[k]*Math.cos(i*Math.PI/32)+v[k]*Math.sin(i*Math.PI/32))));
    pen.path(points,flat?gold:blue,flat?.9:.42);
  });
  if(!flat){for(const [a,b]of data.cubeEdges)pen.path([data.centers[a],data.centers[b]],violet,.9);for(const pair of data.tetrahedra)for(const [a,b]of pair)pen.path([data.centers[a],data.centers[b]],gold,.65);}
}
export function geometryFigure(kind){
  const figure=el('figure',null,`geometry-figure geometry-${kind}`),row=el('div',null,'geometry-views');figure.append(row);
  if(kind==='torus-cover'){
    const pen=pane(row,'Меркаба, золотые спирали и тор',[3,1.5,6],24);
    for(let i=0;i<16;i++)pen.path(torusCurve(0,1,64).map(([x,y,z])=>[x*Math.cos(i*Math.PI/8)/A,z/A,-x*Math.sin(i*Math.PI/8)/A]),blue,.22);
    for(const v of [0,Math.PI/2,Math.PI,3*Math.PI/2])pen.path(torusCurve(1,0,128,v).map(([x,y,z])=>[x/A,z/A,-y/A]),v===Math.PI/2?gold:blue,.5);
    for(const index of [0,7])pen.path(Array.from({length:257},(_,i)=>spiralGuide(ORBIT_SEEDS[index],-3+5*i/256).map((x,k,a)=>k===0?x/A:k===1?a[2]/A:-a[1]/A)),index===7?gold:blue,.8);
    drawStar(pen);
  }else if(kind==='dimensions'){
    pane(row,'0D · точка').circle([0,0,0],.065);
    pane(row,'1D · отрезок').path([[-1,0,0],[1,0,0]]);
    pane(row,'2D · квадрат').path([[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]],gold,1,true);
    drawCube(pane(row,'3D · куб',[3,2,4],31));
  }else if(kind==='cube'){
    drawCube(pane(row,'Взгляд на грань',[0,0,1],39));
    drawCube(pane(row,'Тот же куб',[3,2,4],32));
    drawCube(pane(row,'Взгляд по диагонали',[1,1,1],34));
  }else if(kind==='merkaba'){
    drawStar(pane(row,'Звезда Давида',[1,1,1],34));drawStar(pane(row,'Два тетраэдра',[3,1,4],34));
  }else if(kind==='spiral-growth'){
    const spiral=pane(row,'90° → ×φ',[0,0,1],22);
    for(const index of [0,7]){
      const points=Array.from({length:129},(_,i)=>spiralGuide(ORBIT_SEEDS[index],-2+4*i/128).map(x=>x/A));
      spiral.path(points,index===7?gold:blue,.9);
      for(const turn of [0,1]){const p=spiralGuide(ORBIT_SEEDS[index],turn);spiral.circle([p[0]/A,p[1]/A,0],.07,index===7?gold:blue);}
    }
    const pair=pane(row,'Те же вершины · следующий размер',[3,1,4],23);
    for(const size of [.7,.7*PHI**2])drawStar({path:(points,color)=>pair.path(points.map(p=>p.map(x=>x*size)),color,size<1?.35:.9)});
    const shell=pane(row,'Опоры ведут за собой тор',[3,2,4],23);
    drawStar({path:(points,color)=>shell.path(points,color,.8)});
    for(let i=0;i<8;i++)shell.path(torusCurve(0,1,64).map(([x,y,z])=>[x*Math.cos(i*Math.PI/4)/A,z/A,-x*Math.sin(i*Math.PI/4)/A]),blue,.4);
    for(const v of [Math.PI/2,3*Math.PI/2])shell.path(torusCurve(1,0,96,v).map(([x,y,z])=>[x/A,z/A,-y/A]),gold,.8);
  }else if(kind==='flower'){
    drawFlower(pane(row,'Цветок жизни',[1,1,1],15),true);drawFlower(pane(row,'Объёмная модель',[3,1,-1],15),false);
  }
  return figure;
}
