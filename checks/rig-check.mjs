import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/three.module.js';
import { JOINTS, LIMBS, PRESETS, poseFromPreset, normalizePose, kinematics, solvePaw, mirrorPose, createCatRig } from '../dist/cat-rig.js';
import { newObject, disposeModel, defaultScene } from '../dist/blocking-models.js';
import { validateProject, DEFAULT_CAMERA, DEFAULT_REFERENCES } from '../dist/project-model.js';

const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
assert.equal(PRESETS.length,30);assert.equal(JOINTS.length,33);
const fingerprints=new Set();
for(const preset of PRESETS){
  const pose=poseFromPreset(preset.id),fk=kinematics(pose);
  fingerprints.add(JSON.stringify(pose.joints)+JSON.stringify(pose.root));
  assert.deepEqual(normalizePose(pose),pose);
  for(const kind of ['tuantuan','jiujiu']){
    const model=createCatRig(kind,pose),bones=model.userData.rig.bones;
    for(const j of JOINTS){const p=bones[j.id].getWorldPosition(new T.Vector3());near(p.distanceTo(fk[j.id].position),0);assert.ok(bones[j.id].isBone);}
    const b=new T.Box3().setFromObject(model,true);assert.ok(b.min.y>=-.01,`${kind} ${preset.id} passes below ground: ${b.min.y}`);
    assert.ok(b.max.y<2.5&&b.max.x-b.min.x>.2&&b.max.z-b.min.z>.2);
    model.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
    disposeModel(model);
  }
  const mirrored=mirrorPose(pose),mfk=kinematics(mirrored);
  for(const key of Object.keys(LIMBS)){const other=(key[0]==='L'?'R':'L')+key[1];const a=fk[LIMBS[key].chain[3]].position,b=mfk[LIMBS[other].chain[3]].position;near(a.x,-b.x);near(a.y,b.y);near(a.z,b.z);}
  assert.deepEqual(mirrorPose(mirrored),pose);
}
assert.equal(fingerprints.size,30,'Every preset must contain a distinct pose');

for(const key of Object.keys(LIMBS)){
  const pose=poseFromPreset('stand'),limb=LIMBS[key],start=kinematics(pose)[limb.chain[0]].position;
  const target=start.clone().add(new T.Vector3(key[0]==='L'?-.06:.06,-.37,.10));
  const result=solvePaw(pose,key,target.toArray());assert.equal(result.clamped,false);assert.ok(result.error<1e-7);
  const far=solvePaw(pose,key,[3,3,3]);assert.equal(far.clamped,true);
  const fk=kinematics(pose);for(let i=0;i<3;i++)near(fk[limb.chain[i]].position.distanceTo(fk[limb.chain[i+1]].position),limb.lengths[i]);
}
const pose=poseFromPreset('stand'),before=kinematics(pose);pose.joints.LHknee[0]+=20;const after=kinematics(pose);
near(before.RHpaw.position.distanceTo(after.RHpaw.position),0);assert.ok(before.LHpaw.position.distanceTo(after.LHpaw.position)>.02);
const old=normalizePose({preset:'reach',headYaw:37,rightPaw:20});assert.equal(old.rigVersion,1);near(old.joints.head[1],poseFromPreset('reach').joints.head[1]+37);
const a=newObject('tuantuan'),b=newObject('tuantuan');a.pose.joints.head[1]=47;assert.notEqual(b.pose.joints.head[1],47,'Cats must not share mutable pose objects');
for(const version of [2,3]){
  const objects=defaultScene();objects[0].pose=poseFromPreset('stretch');objects[0].pose.joints.tail4[1]=51;
  const raw={format:'shotroom-blocking',version,objects,camera:DEFAULT_CAMERA,references:DEFAULT_REFERENCES};
  const restored=validateProject(JSON.parse(JSON.stringify(raw)));assert.deepEqual(restored.objects,objects);
}
assert.throws(()=>validateProject({format:'shotroom-blocking',version:3,objects:[],references:[{src:'https://example.com/unsafe.png'}]}));

const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs');
for(const name of ['app.js','pose-editor.js']){const code=fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');for(const match of code.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),`Missing element ${match[1]} in ${name}`);}
for(const file of fs.readdirSync(new URL('../dist/',import.meta.url)).filter(f=>f.endsWith('.js'))){const code=fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');for(const match of code.matchAll(/from ['"](\.\/[^'"]+)['"]/g))assert.ok(fs.existsSync(new URL('../dist/'+match[1],import.meta.url)),`Missing import in ${file}`);}
console.log('PASS: 60 cat/preset combinations; 33-joint hierarchy; paw reach and bone lengths; mirror; independent poses; old/new project restoration; HTML and local imports.');
