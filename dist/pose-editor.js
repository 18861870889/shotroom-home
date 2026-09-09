import * as THREE from './three.module.js';
import { JOINTS, JOINT_MAP, LIMBS, PRESETS, POSES, poseFromPreset, mirrorPose, kinematics, solvePaw, jointLimits } from './cat-rig.js';

export function createPoseEditor({scene,transform,roots,getItem,updateRoot,syncInspector,mark,commit,toast,editorOnly,setTool}){
  const $=id=>document.getElementById(id),deg=THREE.MathUtils.radToDeg;
  let mode='object',joint='head',paw='LF';
  const proxy=new THREE.Object3D();scene.add(proxy);
  const handles=new THREE.Group();scene.add(handles);handles.visible=false;
  const dotGeometry=new THREE.SphereGeometry(.037,12,8),dots=new Map();
  for(const j of JOINTS){const dot=new THREE.Mesh(dotGeometry,new THREE.MeshBasicMaterial({color:'#427788',depthTest:false,transparent:true,opacity:.8}));dot.renderOrder=10;dot.userData.rigJoint=j.id;editorOnly(dot);handles.add(dot);dots.set(j.id,dot);}
  const boneLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#398096',depthTest:false,transparent:true,opacity:.7}));boneLines.renderOrder=9;editorOnly(boneLines);handles.add(boneLines);
  function isCat(){return !!getItem()?.pose;}
  function model(){return roots.get(getItem()?.id)?.children[0];}
  function rig(){return model()?.userData.rig;}
  function activeId(){return mode==='paw'?LIMBS[paw].chain[3]:joint;}
  function bindProxy(){
    if(mode==='object'||!isCat()||!getItem().visible){handles.visible=false;return;}
    const bone=rig()?.bones[activeId()];if(!bone)return;
    model().updateWorldMatrix(true,true);bone.getWorldPosition(proxy.position);bone.getWorldQuaternion(proxy.quaternion);proxy.scale.set(1,1,1);
    transform.attach(proxy);setTool(mode==='paw'?'translate':'rotate',false);
    transform.showX=true;transform.showY=transform.showZ=!(mode==='joint'&&joint==='jaw');refreshHelpers();
  }
  function exit(){mode='object';handles.visible=false;transform.showX=transform.showY=transform.showZ=true;}
  function setMode(next){
    if(!isCat())return;mode=next;transform.detach();
    if(mode==='object'){handles.visible=false;transform.showX=transform.showY=transform.showZ=true;transform.attach(roots.get(getItem().id));setTool('translate',false);}
    else bindProxy();sync();markView();
  }
  function markView(){refreshHelpers();syncInspector();}
  function refreshHelpers(){
    const item=getItem(),m=model(),r=rig();handles.visible=mode!=='object'&&!!item?.visible&&!!r;if(!handles.visible)return;
    m.updateWorldMatrix(true,true);const positions=[];
    for(const j of JOINTS){const dot=dots.get(j.id),active=j.id===activeId();dot.visible=mode==='joint'||Object.values(LIMBS).some(l=>l.chain[3]===j.id);r.bones[j.id].getWorldPosition(dot.position);const scale=new THREE.Vector3();m.getWorldScale(scale);dot.scale.setScalar(Math.max(.7,Math.min(2,scale.x))*(active?1.7:1));dot.material.color.set(active?'#d5ff87':mode==='paw'?'#316276':'#3c8ca6');dot.material.opacity=active?1:.8;
      if(j.parent){const a=r.bones[j.parent].getWorldPosition(new THREE.Vector3());positions.push(...a.toArray(),...dot.position.toArray());}
    }
    boneLines.visible=mode==='joint';boneLines.geometry.dispose();boneLines.geometry=new THREE.BufferGeometry();boneLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    if(!transform.dragging){const bone=r.bones[activeId()];bone.getWorldPosition(proxy.position);bone.getWorldQuaternion(proxy.quaternion);}
  }
  function capturedFeet(){const pose=getItem().pose,fk=kinematics(pose);return Object.fromEntries(Object.entries(LIMBS).map(([key,l])=>[key,fk[l.chain[3]].position.toArray()]));}
  function keepFeet(targets){let limited=false;if(targets)for(const [key,p] of Object.entries(targets))limited=solvePaw(getItem().pose,key,p).clamped||limited;return limited;}
  function apply(limited=false){updateRoot(getItem(),true);sync();refreshHelpers();mark();$('ik-status').textContent=limited?'已到腿长可达范围；可移动身体或调整肘 / 膝朝向。':'拖动彩色坐标轴，腿部会跟随爪子弯曲。';}
  function rotateJoint(angles){
    const item=getItem();if(!item?.pose)return;
    const targets=$('pin-paws').checked&&['pelvis','lumbar','spine','chest'].includes(joint)?capturedFeet():null;
    const ranges=jointLimits(joint);item.pose.joints[joint]=angles.map((v,i)=>THREE.MathUtils.clamp(v,...ranges[i]));apply(keepFeet(targets));
  }
  function handleTransform(){
    if(mode==='object'||!isCat()||transform.object!==proxy)return false;
    if(mode==='paw'){const local=model().worldToLocal(proxy.position.clone());const solved=solvePaw(getItem().pose,paw,local.toArray());apply(solved.clamped);}
    else{const bone=rig().bones[joint],parentQ=bone.parent.getWorldQuaternion(new THREE.Quaternion()),q=parentQ.invert().multiply(proxy.quaternion),e=new THREE.Euler().setFromQuaternion(q,'XYZ');rotateJoint([e.x,e.y,e.z].map(deg));}
    return true;
  }
  function pick(raycaster){
    if(mode==='object'||!isCat()||!handles.visible)return false;
    const hits=raycaster.intersectObjects([...dots.values()].filter(d=>d.visible),false);if(!hits.length)return false;
    const id=hits[0].object.userData.rigJoint;if(mode==='paw')paw=Object.keys(LIMBS).find(k=>LIMBS[k].chain[3]===id)||paw;else joint=id;
    bindProxy();sync();return true;
  }
  function renderPresets(){const group=$('pose-category').value;const list=$('pose-grid');list.replaceChildren();for(const p of PRESETS.filter(p=>p.group===group)){const button=document.createElement('button');button.dataset.pose=p.id;button.textContent=p.name;button.addEventListener('click',()=>{const item=getItem();if(!item?.pose)return;item.pose=poseFromPreset(p.id);updateRoot(item,true);bindProxy();syncInspector();commit();});list.append(button);}sync();}
  function sync(){
    const item=getItem();if(!item?.pose)return;
    document.querySelectorAll('[data-pose]').forEach(b=>{const active=b.dataset.pose===item.pose.preset;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $('pose-current').textContent='基础：'+POSES[item.pose.preset];
    document.querySelectorAll('[data-pose-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.poseMode===mode);b.setAttribute('aria-pressed',String(b.dataset.poseMode===mode));});
    $('paw-controls').hidden=mode!=='paw';$('joint-controls').hidden=mode!=='joint';
    document.querySelectorAll('[data-paw]').forEach(b=>{b.classList.toggle('active',b.dataset.paw===paw);b.setAttribute('aria-pressed',String(b.dataset.paw===paw));});
    $('joint-select').value=joint;
    const fk=kinematics(item.pose),p=fk[LIMBS[paw].chain[3]].position.toArray(),ranges=jointLimits(joint);
    for(const [i,a] of ['x','y','z'].entries()){$('paw-'+a).value=p[i].toFixed(3);$('body-'+a).value=item.pose.root[i].toFixed(3);for(const prefix of ['joint','angle']){const input=$(prefix+'-'+a);input.min=ranges[i][0];input.max=ranges[i][1];input.disabled=ranges[i][0]===ranges[i][1];input.value=item.pose.joints[joint][i].toFixed(1);}$('joint-'+a+'-out').textContent=Math.round(item.pose.joints[joint][i])+'°';}
    $('paw-pole').value=item.pose.poles[paw];$('paw-pole-out').textContent=Math.round(item.pose.poles[paw])+'°';
    $('pose-help').textContent=mode==='paw'?'点选四爪的圆点，再拖动坐标轴。坐标相对角色原点；左右按正视白模时标记。':mode==='joint'?'点选关节圆点或下拉列表，再拖动旋转环。浅色骨架只在工作视图显示。':'先选姿势，再拖动四爪或旋转关节。左右按正视白模时的画面标记。';
  }
  const groups=[...new Set(JOINTS.map(j=>j.group))];for(const group of groups){const optgroup=document.createElement('optgroup');optgroup.label=group;for(const j of JOINTS.filter(x=>x.group===group)){const option=document.createElement('option');option.value=j.id;option.textContent=j.label;optgroup.append(option);}$('joint-select').append(optgroup);}
  document.querySelectorAll('[data-pose-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.poseMode)));
  document.querySelectorAll('[data-paw]').forEach(b=>b.addEventListener('click',()=>{paw=b.dataset.paw;bindProxy();sync();markView();}));
  $('joint-select').addEventListener('change',()=>{joint=$('joint-select').value;bindProxy();sync();markView();});
  $('pose-category').addEventListener('change',renderPresets);
  $('reset-pose').addEventListener('click',()=>{if(!isCat())return;getItem().pose=poseFromPreset(getItem().pose.preset);apply();bindProxy();commit();});
  $('mirror-pose').addEventListener('click',()=>{if(!isCat())return;getItem().pose=mirrorPose(getItem().pose);apply();bindProxy();commit();});
  for(const [i,a] of ['x','y','z'].entries()){
    for(const prefix of ['joint','angle']){const input=$(prefix+'-'+a);input.addEventListener(prefix==='joint'?'input':'change',()=>{if(!isCat()||!Number.isFinite(+input.value))return;const angles=[...getItem().pose.joints[joint]];angles[i]=+input.value;rotateJoint(angles);bindProxy();if(prefix==='angle')commit();});if(prefix==='joint')input.addEventListener('change',commit);}
    $('paw-'+a).addEventListener('change',()=>{if(!isCat())return;const p=['x','y','z'].map(a=>+$('paw-'+a).value);if(!p.every(Number.isFinite))return;const solved=solvePaw(getItem().pose,paw,p);apply(solved.clamped);bindProxy();commit();});
    $('body-'+a).addEventListener('change',()=>{if(!isCat())return;const value=+$('body-'+a).value;if(!Number.isFinite(value))return;const feet=$('pin-paws').checked?capturedFeet():null;getItem().pose.root[i]=THREE.MathUtils.clamp(value,-4,4);apply(keepFeet(feet));bindProxy();commit();});
  }
  $('paw-pole').addEventListener('input',()=>{if(!isCat())return;const p=capturedFeet()[paw];getItem().pose.poles[paw]=+$('paw-pole').value;apply(solvePaw(getItem().pose,paw,p).clamped);bindProxy();});$('paw-pole').addEventListener('change',commit);
  $('ground-paws').addEventListener('click',()=>{if(!isCat())return;const m=model(),scale=m.getWorldScale(new THREE.Vector3()),targets=capturedFeet();for(const key of Object.keys(LIMBS)){const p=m.localToWorld(new THREE.Vector3(...targets[key]));p.y=.064*Math.abs(scale.y);targets[key]=m.worldToLocal(p).toArray();}const limited=keepFeet(targets);apply(limited);bindProxy();commit();toast(limited?'部分爪子够不到地面，请降低身体高度。':'已将四爪放到地面。');});
  transform.addEventListener('mouseUp',()=>{if(mode!=='object'){bindProxy();sync();markView();}});
  renderPresets();
  return{exit,sync,refreshHelpers,handleTransform,pick,toolMode:requested=>mode==='object'?requested:mode==='paw'?'translate':'rotate'};
}
