import * as THREE from './three.module.js';
import { createCatRig, POSES, POSE_DEFAULT, poseFromPreset } from './cat-rig.js';
import { HOME_TYPES, createHomeModel, homeLayout } from './home-models.js';
export { POSES, POSE_DEFAULT } from './cat-rig.js';

export const TYPES = {
  tuantuan:'团团', jiujiu:'久久', table:'桌子', chair:'椅子', sofa:'沙发',
  box:'方盒', ball:'小球', cup:'杯子', bowl:'碗', cabinet:'矮柜', screen:'电视',
  wall:'墙体', doorway:'门框', platform:'台阶', ...HOME_TYPES
};
export const isCat=kind=>kind==='tuantuan'||kind==='jiujiu';
const rad=THREE.MathUtils.degToRad;
const v=a=>new THREE.Vector3(...a);
function mesh(group,geometry,mat,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function box(g,m,pos,size){return mesh(g,new THREE.BoxGeometry(...size),m,pos);}
function ell(g,m,pos,scale){return mesh(g,new THREE.SphereGeometry(1,24,16),m,pos,scale);}
function segment(g,m,a,b,r1=.055,r2=.05){const d=v(b).sub(v(a));const mid=v(a).add(v(b)).multiplyScalar(.5);const piece=mesh(g,new THREE.CylinderGeometry(r2,r1,Math.max(.001,d.length()),16),m,mid.toArray());piece.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return piece;}
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0});}

export function createModel(record){
  if(Object.hasOwn(HOME_TYPES,record.kind))return createHomeModel(record);
  const g=new THREE.Group(),mat=material(isCat(record.kind)?'#e2e4e7':'#cbd0d5'),dark=material('#65717e');
  g.name=record.name;g.userData.kind=record.kind;
  if(isCat(record.kind)){mat.dispose();dark.dispose();return createCatRig(record.kind,record.pose);}
  switch(record.kind){
    case 'table':box(g,mat,[0,.72,0],[1.6,.10,.9]);for(const x of [-.66,.66])for(const z of [-.32,.32])box(g,mat,[x,.34,z],[.09,.68,.09]);break;
    case 'chair':box(g,mat,[0,.44,0],[.55,.08,.55]);box(g,mat,[0,.76,-.24],[.55,.65,.07]);for(const x of [-.22,.22])for(const z of [-.21,.21])box(g,mat,[x,.21,z],[.055,.42,.055]);break;
    case 'sofa':box(g,mat,[0,.24,0],[2.8,.4,.88]);box(g,mat,[0,.69,-.35],[2.8,.66,.2]);for(const x of [-1.36,1.36])box(g,mat,[x,.5,0],[.18,.55,.9]);for(const x of [-.86,0,.86]){box(g,mat,[x,.48,.035],[.82,.13,.62]);const c=box(g,mat,[x,.75,-.15],[.75,.48,.13]);c.rotation.x=-.1;}break;
    case 'cabinet':box(g,mat,[0,.57,0],[1.2,.95,.5]);for(const x of [-.48,.48])for(const z of [-.17,.17])box(g,mat,[x,.07,z],[.06,.14,.06]);box(g,dark,[0,.57,.258],[.015,.8,.015]);break;
    case 'screen':box(g,mat,[0,1.16,0],[1.8,1.03,.065]);box(g,dark,[0,1.16,.036],[1.70,.92,.012]);segment(g,mat,[-.48,.64,0],[-.58,.03,.07],.025,.025);segment(g,mat,[.48,.64,0],[.58,.03,.07],.025,.025);break;
    case 'wall':box(g,mat,[0,1.5,0],[3,3,.12]);break;
    case 'doorway':box(g,mat,[-.7,1.25,0],[.13,2.5,.16]);box(g,mat,[.7,1.25,0],[.13,2.5,.16]);box(g,mat,[0,2.5,0],[1.53,.13,.16]);break;
    case 'platform':box(g,mat,[0,.14,0],[2.8,.28,1.6]);break;
    case 'box':box(g,mat,[0,.2,0],[.4,.4,.4]);break;
    case 'ball':ell(g,mat,[0,.15,0],[.15,.15,.15]);break;
    case 'cup':{const profile=[[.035,0],[.09,.015],[.10,.24],[.095,.25],[.08,.24],[.075,.04],[0,.035]].map(p=>new THREE.Vector2(...p));mesh(g,new THREE.LatheGeometry(profile,32),mat);mesh(g,new THREE.TorusGeometry(.067,.015,10,24),mat,[.115,.14,0]);break;}
    case 'bowl':{const profile=[[0,0],[.075,0],[.16,.07],[.22,.17],[.22,.18],[.2,.18],[.145,.08],[.06,.025],[0,.025]].map(p=>new THREE.Vector2(...p));mesh(g,new THREE.LatheGeometry(profile,32),mat);break;}
  }
  return g;
}

export function disposeModel(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.removeFromParent();}
export function newObject(kind,name=TYPES[kind]){return{id:crypto.randomUUID(),kind,name,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,...(isCat(kind)?{pose:poseFromPreset()}:{})};}
export function defaultScene(layout='living'){
  const make=(kind,name,p,s=[1,1,1],r=[0,0,0])=>({...newObject(kind,name),position:p,scale:s,rotation:r});
  if(layout==='home')return homeLayout(make);
  const tuan=make('tuantuan','团团',[-1.05,0,1.0]);const jiu=make('jiujiu','久久',[.95,0,-.38],[1.06,1.06,1.06]);
  const core=[tuan,jiu,make('table','中间的桌子',[0,0,.12]),make('box','核心方盒',[-.18,.77,.18],[.72,.72,.72]),make('cup','杯子',[.38,.77,.18]),make('bowl','碗',[.04,.77,-.12],[.8,.8,.8])];
  if(layout==='empty')return[tuan,jiu];
  if(layout==='dining')return[...core,make('chair','餐椅',[-1.6,0,-.8],[1,1,1],[0,35,0]),make('cabinet','餐边柜',[1.4,0,-2.2],[1.5,1.2,1]),make('doorway','门框',[-1.6,0,-2.7])];
  return[...core,make('sofa','沙发',[-1,0,-2.0]),make('cabinet','矮柜',[2.0,0,-2.1]),make('screen','电视',[1.7,0,-3],[.8,.8,.8])];
}
