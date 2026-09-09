import * as T from './three.module.js';

// Drop to the closest upward-facing surface below the object's feet/base.
export function supportDelta(root,others){
  root.updateWorldMatrix(true,true);
  const bounds=new T.Box3().setFromObject(root),center=bounds.getCenter(new T.Vector3());
  const ray=new T.Raycaster(new T.Vector3(center.x,bounds.min.y+.04,center.z),new T.Vector3(0,-1,0),0,50);
  const candidates=others.filter(o=>o!==root&&o.visible);
  candidates.forEach(o=>o.updateWorldMatrix(true,true));
  const hit=ray.intersectObjects(candidates,true).find(h=>h.face&&h.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(h.object.matrixWorld)).normalize().y>.5);
  return (hit?.point.y??0)-bounds.min.y;
}
