import { COMPOUNDS } from './compound-data.js';
export function initialLab() {return {
  rotation:{axis:'y',upAxis:'y',downAxis:'y',upSpeed:25,downSpeed:25,upDirection:1,downDirection:-1,vector:[0,1,0],angle:0,up:0,down:0,speed:25,direction:1,mode:'counter',running:false},
  layers:{hull:false,intersection:false,projection:false,source:true,hullFaces:true,hullEdges:true,intersectionFaces:true,intersectionEdges:true,hullOpacity:.12,intersectionOpacity:.45,axis:'star'},
  explode:{value:0,direction:0,links:true,scope:'scene'},
  collections:Object.fromEntries(COMPOUNDS.map(c=>[c.id,{explode:0,direction:0,mirror:false,restore:null}]))
};}
export function labChange(lab,section,patch,id) {
  const fail=()=>{throw new Error('Invalid laboratory settings');};
  const current=section==='collections'?lab.collections[id]:lab[section];if(!current)fail();
  for(const [key,value] of Object.entries(patch)) {
    if(!(key in current))fail();
    if(['running','hull','intersection','projection','source','hullFaces','hullEdges','intersectionFaces','intersectionEdges','links','mirror'].includes(key)){if(typeof value!=='boolean')fail();}
    else if(key==='restore'){if(value!==null && typeof value!=='object')fail();}
    else if(key==='vector'){if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite)||Math.hypot(...value)<1e-8)fail();}
    else if(['axis','upAxis','downAxis'].includes(key)){if(!(section==='layers'?['star','hexagon','square','triangles','free']:['x','y','z','diagonal','custom']).includes(value))fail();}
    else if(key==='mode'){if(!['whole','up','down','counter','independent'].includes(value))fail();}
    else if(key==='scope'){if(!['scene','components'].includes(value))fail();}
    else if(!Number.isFinite(value)||(['value','explode','hullOpacity','intersectionOpacity'].includes(key)&&(value<0||value>1))|| (['direction','upDirection','downDirection'].includes(key)&&![-1,0,1].includes(value)) || (['speed','upSpeed','downSpeed'].includes(key)&&(value<0||value>180)))fail();
  }
  return section==='collections'?{...lab,collections:{...lab.collections,[id]:{...current,...patch}}}:{...lab,[section]:{...current,...patch}};
}
