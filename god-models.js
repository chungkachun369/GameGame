/* Original editable low-poly 3D interpretations; 2D collection portraits use textbook pixels. */
function deityHead(parent,g,cosmetic=false){
 const h=group(parent);const gold='#c9a65c',blue='#233e50',red='#a73e37';
 if(g.symbol==='jackal'){
  orb(.18,.22,.17,'#252d30',h,0,0,0);orb(.13,.075,.25,'#252d30',h,0,-.04,.20);
  for(const s of [-1,1]){const e=shape(new THREE.ConeGeometry(.068,.42,6),'#252d30',h,s*.12,.30,-.015);e.rotation.z=-s*.12;orb(.022,.018,.018,gold,h,s*.11,.035,.13,6);}
 }else if(g.symbol==='sun'){
  orb(.17,.22,.16,'#e7e2cd',h);const beak=shape(new THREE.ConeGeometry(.085,.23,6),gold,h,0,-.035,.22);beak.rotation.x=Math.PI/2;
  for(const s of [-1,1]){box(.10,.40,.15,blue,h,s*.18,-.07,-.03);orb(.025,.026,.02,'#152f3a',h,s*.105,.04,.13);}
 }else if(g.symbol==='bull'){
  orb(.23,.19,.24,'#5a5849',h);orb(.23,.12,.13,'#ac9d7a',h,0,-.10,.22);
 }else if(!cosmetic){
  orb(.17,.21,.16,g.head,h);box(.37,.35,.20,blue,h,0,-.04,-.12);
  for(const s of [-1,1]){box(.08,.38,.13,blue,h,s*.17,-.08,.01);orb(.022,.025,.02,'#292c25',h,s*.065,.03,.15);}
 }
 if(['sun','horn','bull'].includes(g.symbol)){
  const disk=cylinder(.22,.22,.045,red,h,0,.42,0,24);disk.rotation.x=Math.PI/2;
  const rim=shape(new THREE.TorusGeometry(.225,.016,5,30),gold,h,0,.42,.025);
  if(g.symbol!=='sun')for(const s of [-1,1]){const horn=shape(new THREE.ConeGeometry(.055,.43,8),gold,h,s*.25,.48,0);horn.rotation.z=-s*.24;}
 }
 if(g.symbol==='feather'){
  const f=orb(.045,.33,.025,'#363c2c',h,0,.45,0);f.rotation.z=-.17;box(.012,.55,.018,gold,h,0,.40,.027);
 }
 if(g.symbol==='reeds')for(let i=-1;i<=1;i++){const stem=box(.018,.42,.018,gold,h,i*.09,.42,0);stem.rotation.z=-i*.16;const flower=orb(.055,.07,.025,'#4b8b9a',h,i*.12,.64,0);}
 if(g.symbol==='crown'){
  cylinder(.09,.18,.43,'#f1e8d1',h,0,.36,0,10);
  for(const s of [-1,1]){const f=orb(.055,.30,.025,gold,h,s*.22,.36,0);f.rotation.z=-s*.25;}
 }
 return h;
}
function deityModel(parent,g){
 if(g.id==='apis'){
  const b=group(parent),root=group(b);orb(.70,.39,.32,g.skin,root,0,.78,0);
  for(let i=0;i<8;i++){const s=i%2?1:-1;orb(.13,.10,.016,'#d7ccad',root,Math.sin(i*2)*.48,.76+Math.cos(i*3)*.16,s*.30);}
  for(const x of [-.44,.44])for(const z of [-.21,.21]){cylinder(.065,.055,.55,g.skin,root,x,.29,z,8);box(.13,.09,.13,'#252a28',root,x,.055,z);}
  const neck=group(root,0,.92,.56);orb(.25,.28,.24,g.skin,neck);const head=deityHead(neck,g);head.position.y=.15;
  const tail=cylinder(.024,.014,.65,g.skin,root,-.75,.70,-.03,6);tail.rotation.z=-.6;
  b.userData={bull:true,root};return b;
 }
 const b=character(parent,{god:g.id,skin:g.skin,robe:g.robe});const h=b.userData.head;h.clear();deityHead(h,g);
 const collar=cylinder(.255,.24,.12,'#c6a052',b.userData.torso,0,.39,0,12);collar.scale.z=.79;
 if(['ra','osiris','hapi'].includes(g.id)){const staff=group(b,.42,.80,.08);box(.035,1.42,.035,'#bd9f5c',staff);const hook=shape(new THREE.TorusGeometry(.09,.018,5,12,Math.PI*1.5),'#c9b26a',staff,0,.73,0);}
 if(g.id==='osiris'){b.userData.arms.forEach((a,i)=>{a.rotation.x=-.8;a.rotation.z=(i?-.6:.6);});}
 return b;
}
function applyGodOutfit(actor,id){
 if(!actor?.userData?.head)return;
 for(const old of [...actor.children])if(old.userData.outfit){actor.remove(old);old.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
 // adornment is on actor root to remain aligned with the animated body
 const g=godById(id);if(!g)return;const set=group(actor);set.userData.outfit=true;
 const crown=deityHead(set,g,true);crown.position.set(0,1.57,0);crown.scale.setScalar(.90);
 const cape=box(.48,.43,.045,g.accent,set,0,1.08,-.16);cape.rotation.x=.12;
 cylinder(.22,.22,.065,g.color,set,0,.94,0,12).scale.z=.78;
}
function buildGodDecorations(){
 for(const [i,id] of state.gods.decorations.entries()){
  const g=godById(id);const stand=group(actors, -1+i*1.45,0,19.6);
  cylinder(.50,.56,.22,'#d2bc88',stand,0,.11,0,12);const statue=deityModel(stand,g);statue.scale.setScalar(.55);statue.position.y=.22;statue.rotation.y=Math.PI;
 }
}
function attachGodSites(){for(const g of GOD_LIST){SITES[g.id]={x:g.pos[0],z:g.pos[1],name:g.name,role:g.title+' · Optional duel'};EGYPT_NAMES[g.id]=g.name;}}
