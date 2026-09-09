import * as THREE from './three.module.js';

const rad=THREE.MathUtils.degToRad, deg=THREE.MathUtils.radToDeg;
const V=a=>new THREE.Vector3(...a), down=new THREE.Vector3(0,-1,0);
const finite=(v,d=0)=>typeof v==='number'&&Number.isFinite(v)?v:d;
const clamp=(v,a,b,d=0)=>THREE.MathUtils.clamp(finite(v,d),a,b);
const vector=(v,a,b,d=[0,0,0])=>d.map((x,i)=>clamp(v?.[i],a,b,x));

// A quadruped hierarchy. Local axes: X = pitch, Y = yaw, Z = roll.
// These are broad artist controls, not veterinary joint range measurements.
export const JOINTS=[
  {id:'pelvis',label:'骨盆 / 全身倾斜',group:'躯干',parent:null,offset:[0,0,0]},
  {id:'lumbar',label:'腰部',group:'躯干',parent:'pelvis',offset:[0,0,.10]},
  {id:'spine',label:'背部',group:'躯干',parent:'lumbar',offset:[0,0,.19]},
  {id:'chest',label:'胸部',group:'躯干',parent:'spine',offset:[0,0,.19]},
  {id:'neck',label:'颈部',group:'头部',parent:'chest',offset:[0,.08,.12]},
  {id:'head',label:'头部',group:'头部',parent:'neck',offset:[0,.18,.065]},
  {id:'earL',label:'左耳',group:'头部',parent:'head',offset:[-.16,.20,0]},
  {id:'earR',label:'右耳',group:'头部',parent:'head',offset:[.16,.20,0]},
  {id:'jaw',label:'下颌',group:'头部',parent:'head',offset:[0,-.10,.14]}
];
export const LIMBS={};
for(const side of ['L','R']){
  const x=side==='L'?-.17:.17,cn=side==='L'?'左':'右';
  for(const front of [true,false]){
    const key=side+(front?'F':'H'),prefix=front?'前':'后',group=cn+prefix+'腿';
    if(front)JOINTS.push({id:key+'scapula',label:cn+'肩胛',group,parent:'chest',offset:[x,.03,.05],limb:key});
    const chain=front?['shoulder','elbow','wrist','paw']:['hip','knee','hock','paw'];
    const names=front?['肩','肘','腕','前爪']:['髋','膝','跗关节 / 飞节','后爪'];
    const lengths=front?[.27,.23,.055]:[.25,.25,.105];
    chain.forEach((part,i)=>JOINTS.push({id:key+part,label:cn+names[i],group,limb:key,parent:i?key+chain[i-1]:front?key+'scapula':'pelvis',offset:i?[0,-lengths[i-1],0]:front?[0,-.06,0]:[x,-.035,0]}));
    LIMBS[key]={label:cn+prefix+'爪',front,chain:chain.map(p=>key+p),lengths};
  }
}
for(let i=0;i<6;i++)JOINTS.push({id:'tail'+i,label:i===0?'尾根':'尾巴第 '+(i+1)+' 节',group:'尾巴',parent:i?'tail'+(i-1):'pelvis',offset:i?[0,0,-.14]:[0,.025,-.18]});
export const JOINT_MAP=Object.fromEntries(JOINTS.map(j=>[j.id,j]));
export function jointLimits(id){
  if(/(elbow|knee|hock)/.test(id))return[[-175,175],[-100,100],[-100,100]];
  if(id==='jaw')return[[0,45],[0,0],[0,0]];
  if(/^ear/.test(id))return[[-65,85],[-80,80],[-65,65]];
  if(id==='pelvis')return[[-180,180],[-180,180],[-180,180]];
  return[[-150,150],[-150,150],[-150,150]];
}

export const PRESETS=[
  {id:'sit',name:'端坐',group:'休息'},
  {id:'loaf',name:'揣爪 / 猫面包',group:'休息'},
  {id:'lie',name:'前爪伸直趴卧',group:'休息'},
  {id:'sideL',name:'左侧躺',group:'休息'},
  {id:'sideR',name:'右侧躺',group:'休息'},
  {id:'curl',name:'蜷卧',group:'休息'},
  {id:'belly',name:'仰卧露肚皮',group:'休息'},
  {id:'sleep',name:'趴着低头睡',group:'休息'},
  {id:'stand',name:'四足站立',group:'注意 / 情绪'},
  {id:'lookUp',name:'坐着仰望',group:'注意 / 情绪'},
  {id:'lookBack',name:'站立回头',group:'注意 / 情绪'},
  {id:'sniff',name:'低头闻地面',group:'注意 / 情绪'},
  {id:'alert',name:'警觉竖尾',group:'注意 / 情绪'},
  {id:'arch',name:'拱背',group:'注意 / 情绪'},
  {id:'reach',name:'坐姿抬左爪',group:'互动'},
  {id:'reachR',name:'坐姿抬右爪',group:'互动'},
  {id:'bat',name:'拨弄面前物品',group:'互动'},
  {id:'drink',name:'低头饮水',group:'互动'},
  {id:'wash',name:'抬爪洗脸',group:'互动'},
  {id:'groom',name:'坐姿低头舔毛',group:'互动'},
  {id:'tableReach',name:'前爪搭高处',group:'互动'},
  {id:'crouch',name:'伏低观察',group:'动作瞬间'},
  {id:'stretch',name:'前伸懒腰',group:'动作瞬间'},
  {id:'walk',name:'迈步 · 左前',group:'动作瞬间'},
  {id:'walkR',name:'迈步 · 右前',group:'动作瞬间'},
  {id:'stalk',name:'压低身体潜行',group:'动作瞬间'},
  {id:'pounce',name:'扑出瞬间',group:'动作瞬间'},
  {id:'land',name:'落地缓冲',group:'动作瞬间'},
  {id:'upright',name:'双足站起（拟人）',group:'拟人表演'},
  {id:'hold',name:'双爪抱物（拟人）',group:'拟人表演'}
];
export const POSES=Object.fromEntries(PRESETS.map(p=>[p.id,p.name]));

function neutralPose(preset='stand'){
  const joints=Object.fromEntries(JOINTS.map(j=>[j.id,[0,0,0]]));
  for(const side of ['L','R']){
    joints[side+'Fshoulder']=[12,0,0];joints[side+'Felbow']=[-22,0,0];joints[side+'Fwrist']=[10,0,0];
    joints[side+'Hhip']=[-25,0,0];joints[side+'Hknee']=[75,0,0];joints[side+'Hhock']=[-45,0,0];
  }
  joints.tail0=[-20,0,0];joints.tail1=[-12,15,0];joints.tail2=[-10,15,0];
  return{rigVersion:1,preset,root:[0,.60,-.30],joints,poles:{LF:0,RF:0,LH:0,RH:0}};
}

export function kinematics(pose){
  const result={};
  for(const joint of JOINTS){
    const angles=pose.joints[joint.id]||[0,0,0],q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles.map(rad),'XYZ'));
    const parent=result[joint.parent];
    result[joint.id]={position:parent?V(joint.offset).applyQuaternion(parent.quaternion).add(parent.position):V(pose.root),quaternion:parent?parent.quaternion.clone().multiply(q):q};
  }
  return result;
}
function setWorldDirection(pose,id,direction){
  const joint=JOINT_MAP[id],fk=kinematics(pose),parent=joint.parent?fk[joint.parent].quaternion:new THREE.Quaternion();
  const worldQ=new THREE.Quaternion().setFromUnitVectors(down,direction.clone().normalize());
  const e=new THREE.Euler().setFromQuaternion(parent.clone().invert().multiply(worldQ),'XYZ');
  pose.joints[id]=[e.x,e.y,e.z].map(deg);
}

// Analytic two-bone IK plus a separately oriented wrist/hock segment.
// The pole is behind a foreleg and in front of a hind leg in cat-local space.
// Targets outside reach are clamped without stretching bones.
export function solvePaw(pose,key,targetInput){
  const limb=LIMBS[key];if(!limb)throw Error('未知爪子');
  const [a,b,c,end]=limb.chain,[l1,l2,l3]=limb.lengths,target=V(vector(targetInput,-4,4));
  const fk=kinematics(pose),start=fk[a].position;
  const footDirection=limb.front?V([0,-1,0]):V([0,-.90,.436]).normalize();
  const ankle=target.clone().addScaledVector(footDirection,-l3),difference=ankle.clone().sub(start);
  const originalDistance=difference.length(),distance=THREE.MathUtils.clamp(originalDistance,Math.abs(l1-l2)+.0001,l1+l2-.0001);
  const direction=originalDistance>.00001?difference.divideScalar(originalDistance):V([0,-1,0]);
  const reachedAnkle=start.clone().addScaledVector(direction,distance);
  let pole=V([0,limb.front?1:.5,limb.front?-.8:1]);pole.addScaledVector(direction,-pole.dot(direction));
  if(pole.lengthSq()<.00001){pole=V([key[0]==='L'?-1:1,0,0]);pole.addScaledVector(direction,-pole.dot(direction));}
  pole.normalize().applyAxisAngle(direction,rad(pose.poles?.[key]||0));
  const along=(l1*l1+distance*distance-l2*l2)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const middle=start.clone().addScaledVector(direction,along).addScaledVector(pole,height);
  setWorldDirection(pose,a,middle.clone().sub(start));
  setWorldDirection(pose,b,reachedAnkle.clone().sub(middle));
  setWorldDirection(pose,c,footDirection);
  // Paw stays level after an IK edit; manual paw rotation is still available.
  const after=kinematics(pose),q=after[c].quaternion.clone().invert(),e=new THREE.Euler().setFromQuaternion(q,'XYZ');
  pose.joints[end]=[e.x,e.y,e.z].map(deg);
  const reached=kinematics(pose)[end].position;
  return{position:reached.toArray(),clamped:reached.distanceTo(target)>.002,error:reached.distanceTo(target)};
}

function presetDefinition(id){
  const pose=neutralPose(id),j=pose.joints;
  let feet={LF:[-.18,.065,.28],RF:[.18,.065,.28],LH:[-.19,.075,-.32],RH:[.19,.075,-.32]};
  const seated=['sit','lookUp','reach','reachR','wash','groom','upright','hold'].includes(id);
  if(seated){pose.root=[0,.25,-.24];j.pelvis=[-55,0,0];j.lumbar=[10,0,0];j.neck=[32,0,0];j.head=[13,0,0];feet={LF:[-.18,.065,.23],RF:[.18,.065,.23],LH:[-.25,.075,-.12],RH:[.25,.075,-.12]};j.tail0=[35,0,0];j.tail1=[20,30,0];j.tail2=[15,30,0];}
  if(['lie','sleep','loaf'].includes(id)){pose.root=[0,.24,-.30];j.neck=[-5,0,0];feet={LF:[-.18,.065,.62],RF:[.18,.065,.62],LH:[-.25,.075,-.19],RH:[.25,.075,-.19]};j.tail0=[-5,35,0];j.tail1=[0,35,0];j.tail2=[0,30,0];}
  if(id==='loaf'){feet.LF=[-.10,.15,.18];feet.RF=[.10,.15,.18];j.head=[5,0,0];}
  if(id==='sleep'){j.neck=[32,0,0];j.head=[40,0,0];feet.LF[2]=feet.RF[2]=.48;}
  if(['sideL','sideR','curl'].includes(id)){
    const s=id==='sideR'?-1:1;pose.root=[0,.28,-.30];j.pelvis=[0,0,s*90];j.neck=[10,0,0];
    feet={LF:[s*.40,.10,.36],RF:[s*.37,.16,.40],LH:[s*.40,.10,-.42],RH:[s*.40,.17,-.38]};
    if(id==='curl'){j.lumbar=[-32,0,0];j.spine=[-32,0,0];j.neck=[28,25,0];j.head=[20,28,0];feet.LF=[.40,.11,.08];feet.RF=[.40,.16,.09];j.tail1=[0,-40,0];j.tail2=[0,-40,0];}
  }
  if(id==='belly'){pose.root=[0,.245,-.30];j.pelvis=[0,0,180];j.neck=[100,0,0];feet={LF:[-.28,.55,.40],RF:[.28,.55,.40],LH:[-.30,.45,-.38],RH:[.30,.45,-.38]};}
  if(id==='lookUp'){j.neck=[8,0,0];j.head=[0,0,0];}
  if(id==='lookBack'){j.chest=[0,15,0];j.neck=[0,35,0];j.head=[-5,55,0];}
  if(id==='sniff'||id==='drink'){pose.root[1]=id==='drink'?.47:.52;j.spine=[12,0,0];j.neck=[48,0,0];j.head=[35,0,0];if(id==='drink'){feet.LF[2]=feet.RF[2]=.38;}}
  if(id==='alert'){j.neck=[-12,0,0];j.tail0=[70,0,0];j.tail1=[15,0,0];j.tail2=[10,0,0];}
  if(id==='arch'){pose.root[1]=.53;j.pelvis=[-32,0,0];j.lumbar=[-8,0,0];j.spine=[48,0,0];j.chest=[18,0,0];j.neck=[-15,0,0];feet.LF[2]=feet.RF[2]=.19;j.tail0=[-25,0,0];}
  if(id==='reach')feet.LF=[-.26,.49,.53];
  if(id==='reachR')feet.RF=[.26,.49,.53];
  if(id==='bat'){pose.root[1]=.48;j.chest=[8,-10,0];feet.LF=[-.30,.13,.58];feet.RF=[.20,.065,.32];j.head=[22,-16,0];}
  if(id==='wash'){feet.LF=[-.17,.74,.35];j.head=[15,-15,0];}
  if(id==='groom'){j.neck=[68,-25,0];j.head=[42,0,0];feet.LF=[-.25,.10,.27];feet.RF=[.25,.10,.27];}
  if(id==='tableReach'){pose.root=[0,.55,-.25];j.pelvis=[-35,0,0];j.neck=[32,0,0];feet={LF:[-.19,.78,.48],RF:[.19,.78,.48],LH:[-.21,.075,-.38],RH:[.21,.075,-.38]};}
  if(['crouch','stalk','land','pounce'].includes(id)){pose.root[1]=.34;j.chest=[5,0,0];feet.LF=[-.23,.065,.48];feet.RF=[.23,.065,.48];feet.LH=[-.28,.075,-.23];feet.RH=[.28,.075,-.23];j.tail0=[-5,0,0];j.tail1=[0,5,0];}
  if(id==='stretch'){pose.root=[0,.57,-.36];j.lumbar=[30,0,0];j.spine=[25,0,0];j.neck=[-28,0,0];j.head=[-22,0,0];feet.LF=[-.21,.065,.49];feet.RF=[.21,.065,.49];feet.LH=[-.20,.075,-.42];feet.RH=[.20,.075,-.42];}
  if(id==='walk'||id==='walkR'){feet.LF=[-.18,.16,.49];feet.RF=[.18,.065,.09];feet.LH=[-.19,.075,-.46];feet.RH=[.19,.15,-.14];j.spine=[0,-6,0];if(id==='walkR'){[feet.LF,feet.RF]=[feet.RF,feet.LF];[feet.LH,feet.RH]=[feet.RH,feet.LH];Object.entries(feet).forEach(([key,p])=>p[0]=key[0]==='L'?-Math.abs(p[0]):Math.abs(p[0]));j.spine[1]=6;}}
  if(id==='stalk'){feet.LF=[-.22,.10,.60];feet.RH=[.27,.13,-.10];j.head=[5,-12,0];}
  if(id==='pounce'){pose.root[1]=.79;j.pelvis=[12,0,0];j.neck=[-8,0,0];feet={LF:[-.24,.67,.77],RF:[.24,.67,.77],LH:[-.22,.45,-.67],RH:[.22,.45,-.67]};}
  if(id==='land'){j.pelvis=[12,0,0];feet.LF=[-.29,.065,.52];feet.RF=[.29,.065,.52];feet.LH=[-.27,.17,-.44];feet.RH=[.27,.17,-.44];}
  if(id==='upright'||id==='hold'){pose.root=[0,.62,-.22];j.pelvis=[-80,0,0];j.lumbar=[0,0,0];j.neck=[60,0,0];j.head=[20,0,0];feet={LF:[-.25,.88,.28],RF:[.25,.88,.28],LH:[-.22,.075,-.21],RH:[.22,.075,-.21]};if(id==='hold'){feet.LF=[-.15,.96,.35];feet.RF=[.15,.96,.35];j.head=[30,0,0];}}
  if(['sideL','sideR','curl','arch','tableReach'].includes(id)){for(let i=0;i<6;i++)j['tail'+i]=[i===0?-j.pelvis[0]:0,0,0];}
  for(const [key,target] of Object.entries(feet))solvePaw(pose,key,target);
  return pose;
}
const PRESET_CACHE=new Map();
export function poseFromPreset(id='sit'){
  if(!Object.hasOwn(POSES,id))id='sit';
  if(!PRESET_CACHE.has(id))PRESET_CACHE.set(id,presetDefinition(id));
  return structuredClone(PRESET_CACHE.get(id));
}
export const POSE_DEFAULT=poseFromPreset('sit');

export function normalizePose(input={}){
  const preset=Object.hasOwn(POSES,input.preset)?input.preset:'sit';
  const result=poseFromPreset(preset);
  if(input.rigVersion===1&&input.joints){
    result.root=vector(input.root,-4,4,result.root);
    for(const joint of JOINTS)result.joints[joint.id]=vector(input.joints[joint.id],-180,180,result.joints[joint.id]);
    for(const key of Object.keys(LIMBS))result.poles[key]=clamp(input.poles?.[key],-180,180);
  }else{
    // Preserve older projects' available adjustments while upgrading their rig.
    result.joints.head[1]+=clamp(input.headYaw,-75,75);
    result.joints.head[0]-=clamp(input.headPitch,-45,55);
    result.joints.spine[0]+=clamp(input.bodyLean,-30,30);
    for(const [old,key] of [['left','LF'],['right','RF']]){result.joints[key+'shoulder'][0]-=clamp(input[old+'Paw'],-25,100);result.joints[key+'elbow'][0]-=clamp(input[old+'Elbow'],-60,70);}
    if(input.tail!==undefined)result.joints.tail0[0]+=clamp(input.tail,0,90)-15;
  }
  return result;
}
export function mirrorPose(input){
  const out=structuredClone(input);out.root[0]*=-1;
  for(const joint of JOINTS){let source=joint.id;if(/^[LR][FH]/.test(source))source=(source[0]==='L'?'R':'L')+source.slice(1);else if(source==='earL')source='earR';else if(source==='earR')source='earL';const a=input.joints[source];out.joints[joint.id]=[a[0],-a[1],-a[2]];}
  for(const key of Object.keys(LIMBS))out.poles[key]=-input.poles[(key[0]==='L'?'R':'L')+key[1]];
  const pairs={sideL:'sideR',sideR:'sideL',reach:'reachR',reachR:'reach',walk:'walkR',walkR:'walk'};out.preset=pairs[out.preset]||out.preset;
  return out;
}

export function createCatRig(kind,initialPose){
  const model=new THREE.Group(),bones={},long=kind==='jiujiu';
  const mat=new THREE.MeshStandardMaterial({color:'#e2e4e7',roughness:.85}),dark=new THREE.MeshStandardMaterial({color:'#6c7985',roughness:1});
  const ballGeometry=new THREE.SphereGeometry(1,20,14);
  const ell=(parent,p,s,material=mat)=>{const mesh=new THREE.Mesh(ballGeometry,material);mesh.position.set(...p);mesh.scale.set(...s);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const seg=(parent,offset,width)=>{const length=V(offset).length(),mesh=new THREE.Mesh(new THREE.CapsuleGeometry(width,Math.max(.01,length-width*1.2),6,12),mat);mesh.position.copy(V(offset).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),V(offset).normalize());mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);};
  for(const joint of JOINTS){const b=new THREE.Bone();b.name=joint.id;b.position.set(...joint.offset);b.userData.jointId=joint.id;bones[joint.id]=b;(bones[joint.parent]||model).add(b);}
  ell(bones.pelvis,[0,0,-.02],[.22,.21,.24]);
  ell(bones.lumbar,[0,0,.07],[.19,.18,.23]);
  ell(bones.spine,[0,0,.035],[.21,.20,.22]);
  ell(bones.chest,[0,0,0],[.235,.235,.22]);
  seg(bones.chest,JOINT_MAP.neck.offset,long?.17:.115);seg(bones.neck,JOINT_MAP.head.offset,long?.18:.12);
  if(long)ell(bones.neck,[0,.02,.025],[.245,.22,.18]);
  ell(bones.head,[0,0,0],long?[.225,.225,.22]:[.255,.24,.235]);
  for(const sign of [-1,1]){ell(bones.head,[sign*.071,-.072,.188],[.090,.065,.075]);ell(bones.head,[sign*.10,.031,.206],[.035,.039,.020],dark);}
  ell(bones.head,[0,-.045,.251],[.026,.018,.015],dark);ell(bones.jaw,[0,-.018,.045],[.11,.04,.09]);
  for(const side of ['L','R']){const ear=new THREE.Mesh(new THREE.ConeGeometry(long?.115:.105,long?.25:.145,3),mat);ear.position.y=long?.06:.018;ear.rotation.x=long?0:.78;ear.rotation.z=side==='L'?.12:-.12;bones['ear'+side].add(ear);ear.castShadow=true;}
  for(const [key,limb] of Object.entries(LIMBS)){
    const [a,b,c,end]=limb.chain;
    if(limb.front)ell(bones[key+'scapula'],[0,-.015,0],[.07,.12,.11]);
    else ell(bones[a],[0,-.07,0],[.13,.17,.16]);
    seg(bones[a],JOINT_MAP[b].offset,limb.front?.063:.084);
    ell(bones[b],[0,0,0],[.068,.071,.067]);seg(bones[b],JOINT_MAP[c].offset,limb.front?.049:.051);
    ell(bones[c],[0,0,0],[.045,.045,.045]);seg(bones[c],JOINT_MAP[end].offset,.039);
    ell(bones[end],[0,0,.040],[limb.front?.078:.082,.063,.115]);
  }
  for(let i=0;i<6;i++){const size=(long?.083:.045)*(1-i*.095);seg(bones['tail'+i],[0,0,-.145],size);}
  function apply(pose){bones.pelvis.position.set(...pose.root);for(const j of JOINTS)bones[j.id].rotation.set(...pose.joints[j.id].map(rad),'XYZ');model.updateMatrixWorld(true);}
  model.userData.rig={bones,apply};apply(normalizePose(initialPose));
  return model;
}
