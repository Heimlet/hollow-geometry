/** 34:21 is an attributed visual convention, not a claim about physical speeds. */
export const MERKABA_SOURCE='https://avalonlibrary.net/ebooks/Drunvalo%20Melchizedek%20-%20Merkaba%20Meditation.pdf';
export const wrapAngle=value=>((value+180)%360+360)%360-180;
export function advanceRotation(rot,elapsed) {
  const patch={};
  if(rot.mode==='tradition') {
    patch.up=wrapAngle(rot.up+elapsed*rot.speed*rot.direction);
    patch.down=wrapAngle(rot.down-elapsed*rot.speed*21/34*rot.direction);
  } else {
    if(rot.mode==='whole')patch.angle=wrapAngle(rot.angle+elapsed*rot.speed*rot.direction);
    if(['up','counter','independent'].includes(rot.mode))patch.up=wrapAngle(rot.up+elapsed*(rot.mode==='independent'?rot.upSpeed*rot.upDirection:rot.speed*rot.direction));
    if(['down','counter','independent'].includes(rot.mode))patch.down=wrapAngle(rot.down+elapsed*(rot.mode==='independent'?rot.downSpeed*rot.downDirection:rot.speed*rot.direction*(rot.mode==='counter'?-1:1)));
  }
  return patch;
}
