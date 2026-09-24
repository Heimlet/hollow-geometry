/** One render-only change of coordinates for source and derived bodies.
 * updateLab computes the original geometry first; source vertices stay intact. */
import * as THREE from 'three';
const vertical=new THREE.Vector3(0,1,0);
export function applyTourReference(levels,derivedObjects,yaw,active=false){
  for(const level of levels){level.group.quaternion.setFromAxisAngle(vertical,yaw);level.group.updateMatrixWorld(true);}
  // Finale whole-body rotation is zero. The live hull/intersection already
  // contains the relative rotations, so it receives the observer transform once.
  if(active)for(const owner of derivedObjects){owner.object.group.quaternion.setFromAxisAngle(vertical,yaw);owner.object.group.updateMatrixWorld(true);}
}
