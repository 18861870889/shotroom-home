import { normalizePose } from './cat-rig.js';
import { TYPES, POSES, POSE_DEFAULT, defaultScene, isCat, newObject } from './blocking-models.js';
export const DEFAULT_REFERENCES=[
  {id:'ref-tuantuan',name:'团团角色设定',role:'tuantuan',src:'./references/tuantuan.png'},
  {id:'ref-jiujiu',name:'久久角色设定',role:'jiujiu',src:'./references/jiujiu.png'},
  {id:'ref-living',name:'客厅沙发区',role:'environment',src:'./references/living-room.png'},
  {id:'ref-tv',name:'客厅电视墙',role:'environment',src:'./references/tv-wall.png'},
  {id:'ref-dining',name:'餐厅',role:'environment',src:'./references/dining-room.png'}
];
export const DEFAULT_CAMERA={position:[2.9,2.15,6.4],target:[0,.72,0],focal:35,roll:0,aspect:'16:9'};
export const ASPECTS=['16:9','9:16','4:3','3:4','1:1','2.39:1'];
export const aspectValue=a=>{const [w,h]=a.split(':').map(Number);return w/h;};
const n=(a,min,max,d)=>typeof a==='number'&&Number.isFinite(a)?Math.min(max,Math.max(min,a)):d;
const vec=(a,lo,hi,d)=>[0,1,2].map(i=>n(a?.[i],Array.isArray(lo)?lo[i]:lo,Array.isArray(hi)?hi[i]:hi,d[i]));
const text=(s,d,max=80)=>typeof s==='string'&&s.trim()?s.slice(0,max):d;
const safeImage=s=>typeof s==='string'&&s.length<=24*1024*1024&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
export function validateProject(p){
  let migrated=false;
  if(p?.format==='shotroom-project'&&p.version===1){
    const refs=[],objects=defaultScene();(p.actors||[]).slice(0,8).forEach((a,i)=>{const kind=/团团/.test(a.name)?'tuantuan':/久久/.test(a.name)?'jiujiu':i===0?'tuantuan':'jiujiu';if(safeImage(a.data))refs.push({id:crypto.randomUUID(),role:kind,name:a.name||TYPES[kind],src:a.data});});
    if(safeImage(p.background?.data))refs.push({id:crypto.randomUUID(),role:'environment',name:p.background.name||'环境',src:p.background.data});
    p={format:'shotroom-blocking',version:2,objects,camera:DEFAULT_CAMERA,references:refs.length?refs:DEFAULT_REFERENCES};migrated=true;
  }
  if(p?.format!=='shotroom-blocking'||![2,3,4].includes(p.version)||!Array.isArray(p.objects)||p.objects.length>80)throw Error('请选择镜场三维工程文件，最多支持 80 个对象。');
  const used=new Set();
  const objects=p.objects.map(o=>{
    if(!o||!Object.hasOwn(TYPES,o.kind))throw Error('工程包含不支持的对象类型。');
    let id=text(o.id,crypto.randomUUID(),100);if(used.has(id))id=crypto.randomUUID();used.add(id);
    const item={id,kind:o.kind,name:text(o.name,TYPES[o.kind],60),position:vec(o.position,-20,20,[0,0,0]),rotation:vec(o.rotation,-180,180,[0,0,0]),scale:vec(o.scale,.05,15,[1,1,1]),visible:o.visible!==false};
    if(isCat(o.kind))item.pose=normalizePose(o.pose||{});
    return item;
  });
  const c=p.camera||{},camera={position:vec(c.position,[-30,.05,-30],30,DEFAULT_CAMERA.position),target:vec(c.target,[-30,-5,-30],30,DEFAULT_CAMERA.target),focal:n(c.focal,18,120,35),roll:n(c.roll,-45,45,0),aspect:ASPECTS.includes(c.aspect)?c.aspect:'16:9'};
  if(Math.hypot(...camera.position.map((x,i)=>x-camera.target[i]))<.05)camera.target[2]-=1;
  const references=(Array.isArray(p.references)?p.references:DEFAULT_REFERENCES).slice(0,16).map(r=>{
    if(!r||!safeImage(r.src)&&!DEFAULT_REFERENCES.some(d=>d.src===r.src))throw Error('参考图必须是工程内的图片或内置参考。');
    return{id:crypto.randomUUID(),name:text(r.name,'参考图'),role:['tuantuan','jiujiu','environment','prop'].includes(r.role)?r.role:'prop',src:r.src};
  });
  const e=p.editor||{};
  return{objects,camera,references,editor:{position:vec(e.position,-40,40,[6,5,8]),target:vec(e.target,-20,20,[0,.6,0])},brief:typeof p.brief==='string'?p.brief.slice(0,12000):'',migrated};
}
