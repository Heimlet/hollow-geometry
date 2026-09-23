/** Pixel-width strokes without changing the geometry used by picking/projections. */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export function createScreenLines(scene) {
  const root=new THREE.Group();root.name='Screen-space strokes';scene.add(root);
  const copies=new Map(),hidden=new Map();
  function restore(){for(const [material,visible]of hidden)material.visible=visible;hidden.clear();}
  function drop(source){const entry=copies.get(source);root.remove(entry.line);entry.line.geometry.dispose();entry.line.material.dispose();copies.delete(source);}
  function prepare(touring=false) {
    restore();scene.updateMatrixWorld(true);
    const sources=[];scene.traverseVisible(object=>{if(object.isLineSegments&&object.geometry.attributes.position?.count>=2&&object.material.visible)sources.push(object);});
    const live=new Set(sources);for(const source of copies.keys())if(!live.has(source))drop(source);
    for(const source of sources) {
      const geometry=source.geometry,attribute=geometry.attributes.position,start=geometry.drawRange.start;
      let entry=copies.get(source);
      if(!entry||entry.sourceGeometry!==geometry||entry.version!==attribute.version||entry.start!==start) {
        if(entry)drop(source);
        const positions=[];
        for(let i=start;i<(geometry.index?.count??attribute.count);i++) {const j=geometry.index?geometry.index.getX(i):i;positions.push(attribute.getX(j),attribute.getY(j),attribute.getZ(j));}
        const stroke=new LineSegmentsGeometry();stroke.setPositions(positions);
        const line=new LineSegments2(stroke,new LineMaterial({transparent:true,depthWrite:false}));
        line.matrixAutoUpdate=false;line.frustumCulled=false;root.add(line);
        entry={line,sourceGeometry:geometry,version:attribute.version,start};copies.set(source,entry);
      }
      const {line}=entry,material=source.material;
      line.matrix.copy(source.matrixWorld);line.renderOrder=source.renderOrder;
      line.geometry.instanceCount=Math.min(line.geometry.attributes.instanceStart.count,Math.floor(geometry.drawRange.count/2));
      line.visible=material.opacity>0&&line.geometry.instanceCount>0;
      line.material.color.copy(material.color);line.material.opacity=material.opacity;
      line.material.depthTest=material.depthTest;line.material.toneMapped=material.toneMapped;
      line.material.linewidth=Math.max(material.linewidth,source.userData.network?(touring?2.2:1.8):(touring?1.8:1.5));
      if(!hidden.has(material))hidden.set(material,material.visible);
      material.visible=false;
    }
  }
  return {prepare,restore,dispose(){restore();for(const source of copies.keys())drop(source);scene.remove(root);}};
}
