/** Orthographic illustrations built from the same vertices as the tours. */
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
  if(kind==='dimensions'){
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
  }else if(kind==='flower'){
    drawFlower(pane(row,'Цветок жизни',[1,1,1],15),true);drawFlower(pane(row,'Объёмная модель',[3,1,-1],15),false);
  }
  return figure;
}
