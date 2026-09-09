import * as T from './three.module.js';

export const HOME_TYPES={
  'home-floor':'家庭地面','home-study':'书房地台与台阶','home-walls':'家庭外墙',
  'home-ceiling':'家庭顶面','home-window':'格栅窗与窗帘','home-bookcase':'书房书架',
  'home-kitchen':'厨房操作台','home-pendant':'吊灯','home-armchair':'阅读椅',
  'home-plant':'盆栽','home-rug':'地毯','person':'人物比例白模'
};
export const HOME_VIEWS={
  overview:{name:'全屋总览',position:[10,8,11],target:[1,.7,-.5],focal:28},
  sofa:{name:'沙发 → 后方书房',position:[2,1.6,3.05],target:[-.25,1.05,-1.7],focal:24},
  tv:{name:'电视墙',position:[-.25,1.28,.55],target:[-.25,1.25,3.4],focal:28},
  study:{name:'书房',position:[1.9,1.8,-.65],target:[-.65,1.40,-3.6],focal:24},
  dining:{name:'餐厨区',position:[3.05,1.6,3.2],target:[5.0,1.10,.0],focal:24},
  cat:{name:'猫咪低机位',position:[.95,.34,1.85],target:[-.2,.60,-.85],focal:24}
};
export const homeCamera=view=>({...HOME_VIEWS[view],position:[...HOME_VIEWS[view].position],target:[...HOME_VIEWS[view].target],roll:0,aspect:'16:9'});

export function homeLayout(make){
  const out=[
    make('home-floor','地面 · 客厅与餐厨',[0,0,0]),
    make('home-study','书房 · 沙发后方地台',[0,0,0]),
    make('home-walls','外墙 · 单面取景',[0,0,0]),
    {...make('home-ceiling','顶面 · 默认隐藏',[0,0,0]),visible:false},
    make('sofa','客厅 · 沙发',[0,0,.45]),
    make('home-rug','客厅 · 互动地毯',[0,0,1.7]),
    make('screen','客厅 · 电视',[-.25,0,3.32],[.88,.88,.88],[0,180,0]),
    make('cabinet','客厅 · 电视边柜',[1.30,0,3.25],[.65,.72,.8],[0,180,0]),
    make('home-plant','电视边 · 陶花瓶',[1.3,.79,3.25],[.55,.55,.55]),
    make('home-window','客厅 · 电视侧窗',[-2.05,0,3.65],[.52,1,1],[0,180,0]),
    make('home-window','客厅 · 侧窗',[-2.8,0,.7],[1.1,1,1],[0,90,0]),
    make('home-window','书房 · 后窗',[0,.32,-4.9],[1.35,.88,1]),
    make('home-bookcase','书房 · 整墙书架',[-2.56,.32,-3.25],[1,1,1],[0,90,0]),
    make('home-armchair','书房 · 阅读椅',[-.55,.32,-3.62],[1,1,1],[0,12,0]),
    make('table','书房 · 书桌',[2.12,.32,-3.45],[.77,1,.68],[0,90,0]),
    make('chair','书房 · 书桌椅',[1.30,.32,-3.45],[1,1,1],[0,90,0]),
    make('home-plant','书房 · 绿植',[-1.70,.32,-4.30]),
    make('home-pendant','书房 · 纸吊灯',[0,0,-3.15],[.8,1,.8]),
    make('home-pendant','客厅 · 吊灯',[0,0,1.0]),
    make('home-kitchen','餐厨 · 台面与橱柜',[4.65,0,-1.11]),
    make('home-window','餐厨 · 水槽窗',[4.45,.22,-1.45],[.7,.85,1]),
    make('home-window','餐厅 · 侧窗',[6.6,0,1.45],[1.12,1,1],[0,-90,0]),
    make('table','餐厅 · 餐桌',[4.67,0,1.56]),
    make('home-pendant','餐厅 · 纸吊灯',[4.67,0,1.56],[.85,1,.85]),
    make('bowl','餐桌 · 果盘',[4.65,.77,1.55],[.75,.75,.75]),
    make('cup','餐桌 · 杯子',[5.1,.77,1.65],[.65,.65,.65]),
    make('tuantuan','团团',[-.50,.025,1.6],[.38,.38,.38],[0,25,0]),
    make('jiujiu','久久',[.40,.025,1.5],[.40,.40,.40],[0,-25,0]),
    {...make('person','人物 · 1.70 m 比例参考',[1.72,0,1.40]),visible:false}
  ];
  for(const x of [4.18,5.16]){
    out.push(make('chair','餐厅 · 前侧餐椅',[x,0,2.28],[.9,.9,.9],[0,180,0]));
    out.push(make('chair','餐厅 · 后侧餐椅',[x,0,.85],[.9,.9,.9]));
  }
  return out;
}

export function createHomeModel(record){
  const g=new T.Group();g.name=record.name;g.userData.kind=record.kind;
  const white=new T.MeshStandardMaterial({color:'#dedfdf',roughness:.9});
  const mid=new T.MeshStandardMaterial({color:'#b8bec3',roughness:.92});
  const dark=new T.MeshStandardMaterial({color:'#63717c',roughness:.82});
  const mats=[white,mid,dark];
  function add(geo,mat,pos,scale){const m=new T.Mesh(geo,mat);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  const box=(p,d,m=white)=>add(new T.BoxGeometry(...d),m,p);
  const ell=(p,d,m=white)=>add(new T.SphereGeometry(1,20,12),m,p,d);
  function rod(a,b,r=.02,m=white){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const ob=add(new T.CylinderGeometry(r,r,v.length(),12),m,av.add(bv).multiplyScalar(.5).toArray());ob.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return ob;}
  function wall(center,width,height,rotation=0){const ob=add(new T.PlaneGeometry(width,height),white,center);ob.rotation.y=rotation;ob.castShadow=false;}
  function windowWall(origin,length,rotation,openings=[]){
    const h=2.85,group=new T.Group();g.add(group);group.position.set(...origin);group.rotation.y=rotation;
    function part(x,y,w,hh){if(w<=0||hh<=0)return;const ob=new T.Mesh(new T.PlaneGeometry(w,hh),white);ob.position.set(x,y,0);ob.receiveShadow=true;group.add(ob);}
    let start=-length/2;
    for(const [cx,w,sill,wh] of openings){part((start+cx-w/2)/2,h/2,cx-w/2-start,h);part(cx,sill/2,w,sill);part(cx,(sill+wh+h)/2,w,h-sill-wh);start=cx+w/2;}
    part((start+length/2)/2,h/2,length/2-start,h);
  }
  switch(record.kind){
    case 'home-floor':
      box([0,-.08,1.1],[5.6,.16,5.1],mid);box([4.7,-.08,1.1],[3.8,.16,5.1],mid);break;
    case 'home-study':
      box([0,.16,-3.175],[5.6,.32,3.45],mid);
      box([0,.08,-1.14],[5.6,.16,.62],mid);box([0,.24,-1.30],[5.6,.16,.30],mid);break;
    case 'home-walls':
      // Interior-facing planes reveal the interior when viewed from outside.
      windowWall([0,0,-4.9],5.6,0,[[0,2.7,1.0,1.40]]);
      windowWall([-2.8,0,-.625],8.55,Math.PI/2,[[-1.325,2.2,.75,1.60]]);
      windowWall([1.9,0,3.65],9.4,Math.PI,[[3.95,1.04,.75,1.60]]);
      windowWall([6.6,0,1.1],5.1,-Math.PI/2,[[.35,2.24,.75,1.60]]);
      windowWall([4.7,0,-1.45],3.8,0,[[-.25,1.40,.86,1.36]]);
      windowWall([2.8,0,-3.175],3.45,-Math.PI/2);
      box([0,2.66,-1.45],[5.6,.38,.20]);
      box([-2.67,1.425,-1.45],[.26,2.85,.25]);box([2.67,1.425,-1.45],[.26,2.85,.25]);break;
    case 'home-ceiling':{
      const roof=(x,z,w,d)=>{const ob=add(new T.PlaneGeometry(w,d),white,[x,2.85,z]);ob.rotation.x=Math.PI/2;ob.castShadow=false;};
      roof(0,-.625,5.6,8.55);roof(4.7,1.1,3.8,5.1);break;}
    case 'home-window':{
      const w=2,h=1.6,s=.75;
      for(const x of [-w/2,w/2])box([x,s+h/2,0],[.065,h+.06,.10]);
      for(const y of [s,s+h])box([0,y,0],[w+.12,.065,.10]);
      for(const x of [-.5,0,.5])box([x,s+h/2,.02],[.025,h,.045]);
      for(let i=1;i<4;i++)box([0,s+h*i/4,.02],[w,.025,.045]);
      box([0,s-.05,.09],[w+.2,.07,.32]);
      rod([-1.4,2.68,.20],[1.4,2.68,.20],.015,mid);
      for(const side of [-1,1]){
        const verts=[],ids=[],nx=24,nz=12;
        for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)verts.push(side*1.17+(i/nx-.5)*.40,.035+j/nz*2.60,.22+.045*Math.sin(i/nx*Math.PI*12));
        for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;ids.push(k,k+1,k+nx+2,k,k+nx+2,k+nx+1);}
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();
        const curtain=white.clone();curtain.side=T.DoubleSide;add(geo,curtain,[0,0,0]);
      }break;}
    case 'home-bookcase':{
      box([0,1.15,-.15],[2.7,2.3,.04],mid);
      for(let i=0;i<=4;i++)box([-1.35+i*.675,1.15,0],[.035,2.3,.34]);
      for(let i=0;i<=6;i++)box([0,Math.max(.015,i*.38),0],[2.74,.03,.35]);
      const books=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mid,144),obj=new T.Object3D();
      let n=0;
      for(let row=0;row<6;row++)for(let col=0;col<4;col++)for(let i=0;i<6;i++){
        const height=.20+.065*((i+row*3+col)%4)/3;
        obj.position.set(-1.27+col*.675+i*.085,row*.38+.025+height/2,.025);obj.scale.set(.052+(i%3)*.008,height,.20);obj.rotation.z=(i===5?.07:0);obj.updateMatrix();books.setMatrixAt(n,obj.matrix);books.setColorAt(n,new T.Color().setScalar(.65+((i+col+row)%4)*.085));n++;
      }
      books.instanceMatrix.needsUpdate=true;books.castShadow=true;books.receiveShadow=true;g.add(books);break;}
    case 'home-kitchen':{
      // Back run; left sink, right hob/oven and a right return counter.
      box([0,.43,0],[3.35,.86,.62],mid);box([0,.90,.02],[3.45,.07,.72]);
      for(let i=0;i<5;i++){box([-1.34+i*.67,.46,.328],[.64,.73,.024]);rod([-1.45+i*.67,.77,.36],[-1.25+i*.67,.77,.36],.008,dark);}
      box([-.65,.94,.01],[.62,.012,.40],dark);
      rod([-.96,.95,-.18],[-.96,1.21,-.18],.015,dark);rod([-.96,1.21,-.18],[-.96,1.21,.02],.015,dark);rod([-.96,1.21,.02],[-.96,1.15,.02],.015,dark);
      box([.7,.945,.02],[.67,.025,.48],dark);
      box([.7,.48,.352],[.57,.52,.018],dark);rod([.47,.68,.39],[.93,.68,.39],.012);
      for(const x of [.50,.91])for(const z of [-.11,.16]){const ring=add(new T.TorusGeometry(.075,.004,6,20),white,[x,.96,z]);ring.rotation.x=Math.PI/2;}
      for(const x of [.30,.96]){box([x,2.05,-.11],[.62,.84,.32]);rod([x-.09,1.68,.07],[x+.09,1.68,.07],.006,dark);}
      box([1.56,1.30,.15],[.38,2.6,.9],mid);box([1.56,1.34,.61],[.35,2.49,.025]);rod([1.43,1.18,.66],[1.43,1.55,.66],.009,dark);
      box([1.40,.43,1.16],[.62,.86,1.2],mid);box([1.40,.90,1.16],[.70,.07,1.2]);break;}
    case 'home-pendant':
      rod([0,2.81,0],[0,2.13,0],.006,mid);ell([0,1.98,0],[.35,.20,.35]);ell([0,2.81,0],[.07,.02,.07],mid);break;
    case 'home-armchair':
      ell([0,.47,0],[.38,.16,.36]);ell([0,.80,-.22],[.36,.42,.12]);
      for(const x of [-.30,.30])ell([x,.63,0],[.10,.15,.28]);
      for(const x of [-.25,.25])for(const z of [-.20,.20])rod([x*1.1,0,z*1.1],[x,.4,z],.025,mid);break;
    case 'home-plant':
      add(new T.CylinderGeometry(.15,.12,.28,20),mid,[0,.14,0]);rod([0,.25,0],[0,.85,0],.014,mid);
      for(let i=0;i<12;i++){const a=i*2.4,y=.38+i*.045;rod([0,y-.12,0],[Math.cos(a)*.2,y,Math.sin(a)*.2],.006,mid);const leaf=ell([Math.cos(a)*.22,y,Math.sin(a)*.22],[.045,.025,.10],mid);leaf.rotation.y=-a;}
      break;
    case 'home-rug':box([0,.012,0],[3.45,.025,2.35],white);break;
    case 'person':
      ell([0,1.57,0],[.095,.13,.095]);ell([0,1.24,0],[.20,.25,.11]);ell([0,.95,0],[.15,.10,.11]);
      for(const sign of [-1,1]){
        rod([sign*.09,.95,0],[sign*.10,.50,0],.064);rod([sign*.10,.50,0],[sign*.10,.10,.01],.045);
        ell([sign*.10,.06,.065],[.06,.06,.13]);rod([sign*.19,1.38,0],[sign*.25,1.08,0],.045);rod([sign*.25,1.08,0],[sign*.26,.87,.04],.033);ell([sign*.26,.84,.04],[.038,.055,.028]);
      }break;
  }
  const used=new Set();g.traverse(o=>{if(o.material)used.add(o.material);});for(const m of mats)if(!used.has(m))m.dispose();
  return g;
}
