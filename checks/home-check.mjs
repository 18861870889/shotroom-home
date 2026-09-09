import assert from 'node:assert/strict';
import * as T from '../dist/three.module.js';
import {defaultScene,createModel,disposeModel} from '../dist/blocking-models.js';
import {validateProject,DEFAULT_REFERENCES} from '../dist/project-model.js';
import {homeCamera,HOME_VIEWS} from '../dist/home-models.js';
import {supportDelta} from '../dist/placement.js';

const records=defaultScene('home');assert.ok(records.length<80);
const roots=new Map(records.map(item=>{
  const root=createModel(item);root.position.set(...item.position);root.rotation.set(...item.rotation.map(T.MathUtils.degToRad));root.scale.set(...item.scale);root.visible=item.visible;root.updateMatrixWorld(true);return[item.kind+':'+item.name,root];
}));
const get=kind=>[...roots].find(([k])=>k.startsWith(kind+':'))[1];
const sofa=get('sofa'),study=get('home-study'),tv=get('screen');
const back=new T.Box3().setFromObject(study),couch=new T.Box3().setFromObject(sofa);
assert.ok(back.max.z<couch.min.z-.7,'Reading room must be behind sofa with a clear rear passage');
assert.ok(tv.position.z>sofa.position.z,'TV must face the front of the sofa');
const bookcase=new T.Box3().setFromObject(get('home-bookcase'));
assert.ok(bookcase.max.z<couch.min.z&&bookcase.min.y>=.31);
const walls=get('home-walls');
function wallRay(p,d){return new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d),0,1).intersectObject(walls,true);}
assert.equal(wallRay([0,1,4],[0,0,-1]).length,0,'Outside wall must reveal the scene');
assert.ok(wallRay([0,1,3.1],[0,0,1]).length,'Inside camera must see the front wall');
assert.equal(wallRay([-2.5,1.10,.7],[-1,0,0]).length,0,'Window aperture must be clear');
const floor=get('home-floor');
for(const [x,z,height] of [[0,-3,.32],[0,1,0],[5,2,0],[0,-1.0,.16]]){
  const hits=new T.Raycaster(new T.Vector3(x,4,z),new T.Vector3(0,-1,0)).intersectObjects([floor,study],true);
  assert.ok(Math.abs(hits[0].point.y-height)<1e-5);
}
const probe=createModel({kind:'box',name:'test'});probe.position.set(0,1,-3);probe.updateMatrixWorld(true);
assert.ok(Math.abs(supportDelta(probe,[floor,study])+.68)<1e-5,'Drop must land on raised reading floor');disposeModel(probe);
let meshes=0,instances=0,triangles=0;
for(const root of roots.values())root.traverse(o=>{
  if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);}
  if(o.isInstancedMesh)instances+=o.count;
  if(o.geometry?.attributes.position)assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
});
assert.ok(instances>=144);assert.ok(meshes<600,'Room should stay within the white-model draw budget');
for(const key of Object.keys(HOME_VIEWS)){
  const raw={format:'shotroom-blocking',version:4,objects:records,camera:homeCamera(key),references:DEFAULT_REFERENCES};
  const saved=validateProject(JSON.parse(JSON.stringify(raw)));assert.deepEqual(saved.objects,records);assert.deepEqual(saved.camera.position,raw.camera.position);
}
for(const root of roots.values())disposeModel(root);
console.log(`PASS: ${records.length} editable objects; study behind sofa; wall cutaway and aperture; raised-floor placement; all 6 camera/project round trips; ${meshes} meshes / ${instances} instanced books / ${Math.round(triangles)} triangles.`);
