let godBattle=null, godEmote=0;
function godIntro(id){
 const g=godById(id);if(!g)return;const p=godRecord(id);p.seen=true;if(!state.visitedGods.includes(id))state.visitedGods.push(id);persist();
 openDialog(`<div class="eyebrow">GODS OF THE NILE · ${g.theme}</div><div class="godIntro"><img src="${GOD_ART[id]}" alt="${g.name}, cropped from your supplied textbook"><div><h2 id="dialogTitle">${g.name}</h2><div class="godSubtitle">${g.title}</div><p>${g.fact}</p><p class="fine">The 3D encounter and magical duel are fantasy interpretations. The portrait uses your textbook illustration.</p><div class="badge">${p.won?'COLLECTED · VICTORY':p.quiz?'QUIZ COMPLETE · DUEL READY':'DISCOVERED · QUIZ FIRST'}</div></div></div><div class="callout"><b>A challenge, not a history lesson about combat.</b><br>Complete three knowledge questions, then move, dodge and attack to defeat ${g.name}'s shield. No blood, no resource loss.</div><div class="row"><button class="gold" id="godChallenge">${p.quiz?(p.won?'Challenge again':'Prepare to duel'):'Begin knowledge quiz'}</button><button id="godCollection">Gods Collection</button><button id="godRemember">Return to the river</button></div>`);
 $('#godRemember').onclick=closeDialog;$('#godCollection').onclick=()=>showGodCollection();$('#godChallenge').onclick=()=>p.quiz?godReady(id):godQuiz(id,0);
}
function godQuiz(id,index){
 const g=godById(id),qs=godQuestions(g);if(index>=qs.length){godRecord(id).quiz=true;persist();godReady(id);return;}
 const q=qs[index]; // deterministic shuffle prevents always choosing the same slot
 const shift=(GOD_IDS.indexOf(id)+index+1)%q.options.length;const opts=q.options.map((_,i)=>(i+shift)%q.options.length);let selected=-1,correct=false;
 openDialog(`<div class="eyebrow">${g.name.toUpperCase()} · KNOWLEDGE ${index+1} / ${qs.length}</div><h2 id="dialogTitle">Before the duel</h2><p>${q.q}</p><div class="answers">${opts.map((oi,i)=>`<button data-god-answer="${i}" aria-pressed="false">${q.options[oi]}</button>`).join('')}</div><div id="godQuizFeedback" class="feedback" role="status">Choose an answer. You may review the clue at any time.</div><div class="row"><button class="gold" id="godCheck">Check answer</button><button id="godClue">Review clue</button><button id="godQuizBack">Leave quiz</button></div>`);
 $$('[data-god-answer]').forEach(b=>b.onclick=()=>{if(correct)return;selected=+b.dataset.godAnswer;$$('[data-god-answer]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');});});
 $('#godCheck').onclick=()=>{if(correct){godQuiz(id,index+1);return;}if(selected<0){$('#godQuizFeedback').textContent='Choose an answer first.';return;}correct=opts[selected]===q.answer;$('#godQuizFeedback').className='feedback '+(correct?'good':'bad');$('#godQuizFeedback').textContent=(correct?'Correct. ':'Not quite. ')+q.explain; if(correct)$('#godCheck').textContent=index===qs.length-1?'Prepare to duel →':'Next question →';};
 $('#godClue').onclick=()=>{$('#godQuizFeedback').textContent=g.fact+' The magical duel is fictional.';};$('#godQuizBack').onclick=()=>godIntro(id);
}
function godReady(id){
 const g=godById(id);openDialog(`<div class="eyebrow">QUIZ COMPLETE · ACTION CHALLENGE</div><h2 id="dialogTitle">Duel with ${g.name}</h2><p>Move out of the marked danger zones. Attack to break the divine shield. ${g.name} stays in the world after your victory.</p><div class="callout"><b>WASD / arrows</b> · Move<br><b>F or click Attack</b> · Fire an aimed practice bolt<br><b>Space or click Dodge</b> · Dodge in your movement direction<br><b>Esc</b> · Pause / exit<br>On touch screens, use the movement pad and two action buttons.</div><label class="setting">Gentler duel: slower attacks, longer warnings, 8 hearts. Same rewards.<input id="godAssist" type="checkbox" ${state.gods.assist?'checked':''}></label><p class="fine">No time limit. Lose no grain, gems, learning progress or collected items.</p><div class="row"><button id="beginGodDuel" class="gold">Begin duel</button><button id="godReadyBack">Not now</button></div>`);
 $('#godAssist').onchange=e=>{state.gods.assist=e.target.checked;persist();};$('#beginGodDuel').onclick=()=>startGodBattle(id);$('#godReadyBack').onclick=()=>godIntro(id);
}
function showGodCollection(selected=null,back=false){
 const count=GOD_IDS.filter(i=>state.gods.progress[i]?.won).length;
 openDialog(`<div class="eyebrow">YOUR JOURNAL · GODS COLLECTION</div><h2 id="dialogTitle">Guardians of the Nile <span class="collectionCount">${count} / 7</span></h2><p>Meet a god in the world → complete the quiz → win the action duel. First victories award a textbook card, an outfit, a celebration and a village statue.</p>${state.gods.completeReward?'<div class="callout">Complete collection · Guardians of the Nile title and golden display frame unlocked.</div>':''}<div class="godCollectionGrid">${GOD_LIST.map((g,i)=>{const p=state.gods.progress[g.id],won=p?.won;return `<button class="collectionTile ${won?'owned':''}" data-god-card="${g.id}"><span class="cardNumber">${String(i+1).padStart(2,'0')} / 07</span><img src="${GOD_ART[g.id]}" alt="Textbook portrait of ${g.name}" ${won?'':'class="unownedPortrait"'}><strong>${g.name}</strong><small>${g.title}</small><span class="collectStatus">${won?'COLLECTED':p?.quiz?'DUEL READY':p?.seen?'DISCOVERED':'NOT YET MET'}</span></button>`;}).join('')}</div><div class="row"><button id="collectionOutfitOff">Remove outfit</button><button id="collectionClose" class="gold">Return to world</button></div>`,true);
 $$('[data-god-card]').forEach(b=>b.onclick=()=>godCard(b.dataset.godCard));$('#collectionOutfitOff').onclick=()=>{state.gods.equipped=null;applyGodOutfit(player,null);persist();toast('Original farmer outfit restored.');};$('#collectionClose').onclick=closeDialog;
}
function godCard(id,flipped=false){
 const g=godById(id),p=state.gods.progress[id],won=p?.won,placed=state.gods.decorations.includes(id);
 openDialog(`<div class="eyebrow">${won?'COLLECTED':'COLLECTION PREVIEW'} · ${GOD_IDS.indexOf(id)+1} / 7</div><h2 id="dialogTitle">${g.name} · ${g.title}</h2><div class="cardDetail"><button id="flipGodCard" class="portraitCard ${state.gods.completeReward?'completeFrame':''}" aria-label="Flip ${g.name} collection card">${flipped?`<div class="cardReverse"><span class="eyebrow">BELIEFS & EVIDENCE</span><h3>${g.name}</h3><p>${g.fact}</p><p>The magical duel is a game invention.</p><small>Image source: supplied textbook photograph, cropped. Not an original illustration.</small></div>`:`<img src="${GOD_ART[id]}" alt="${g.name} textbook collection card"><span>${g.name}<small>${g.title}</small></span>`}</button><div><h3>${won?'Your victory collection':'Win the duel to collect'}</h3><p>${g.reward}<br>${g.cape}<br>${g.name}'s Salute<br>${g.name} Village Statue</p><p class="fine">Decorative rewards only. No crop or combat bonus. Click the card to flip and read.</p><div class="row">${won?`<button class="gold" id="equipGod">Equip outfit</button><button id="godSalute">Play salute</button><button id="placeGodStatue">${placed?'Remove village statue':'Place village statue'}</button>`:`<button class="gold" id="trackGod">${state.mode==='journey'&&state.chapter==='egypt'?'Walk to '+g.name:'Visit Nile Valley'}</button>`}<button id="backGodCollection">All seven cards</button></div><p class="fine">The supplied photograph has printed texture and some cropped edges. Original colours and identifying details are retained.</p></div></div>`,true);
 $('#flipGodCard').onclick=()=>godCard(id,!flipped);$('#backGodCollection').onclick=showGodCollection;
 if(won){$('#equipGod').onclick=()=>{state.gods.equipped=id;applyGodOutfit(player,id);persist();closeDialog();toast(g.reward+' and '+g.cape+' equipped.');};$('#godSalute').onclick=()=>{closeDialog();godEmote=2.3;toast(g.name+"'s Salute");};$('#placeGodStatue').onclick=()=>{state.gods.decorations=placed?state.gods.decorations.filter(x=>x!==id):[...state.gods.decorations,id];persist();closeDialog();buildScene();toast(placed?'Statue removed.':'Statue displayed on the south promenade.');};}
 else $('#trackGod').onclick=()=>{closeDialog();if(state.mode!=='journey'||state.chapter!=='egypt'){state.chapter='egypt';enterMode('journey');}navigate(id);toast('Follow the path to '+g.name+'.');};
}
function mountGodUI(){
 const btn=document.createElement('button');btn.id='godsBtn';btn.innerHTML='<span aria-hidden="true">☀</span><span>Gods</span>';btn.onclick=()=>showGodCollection();$('.tools').prepend(btn);
 const ui=document.createElement('section');ui.id='battleHUD';ui.hidden=true;ui.innerHTML=`<div class="battleHeader"><div><div class="eyebrow" id="battleTheme"></div><h2 id="battleName"></h2><div class="shieldLine"><span>DIVINE SHIELD</span><span id="shieldText"></span></div><progress id="godShield" max="100" value="100" aria-label="Divine shield"></progress></div><button id="battlePause">Pause / exit</button></div><div class="battleBottom"><div id="heartPanel"><span class="eyebrow">YOUR SPIRIT</span><strong id="battleHearts"></strong><small id="battleHint" role="status">Watch the marked danger zones.</small></div><div class="battleAction"><button id="battleDodge">Dodge <small>Space</small></button><button id="battleAttack">Attack <small>F</small></button></div></div><div id="battleMove" aria-label="Duel movement">${[['w','↑','Forward'],['a','←','Left'],['s','↓','Back'],['d','→','Right']].map(([k,l,a])=>`<button data-battle-move="${k}" aria-label="${a}">${l}</button>`).join('')}</div>`;$('#app').append(ui);
 $('#battleAttack').onclick=fireGodBolt;$('#battleDodge').onclick=dodgeGod;$('#battlePause').onclick=pauseGodBattle;
 $$('[data-battle-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.battleMove]=true;};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>delete keys[b.dataset.battleMove]);});
 document.addEventListener('keydown',e=>{if(!godBattle)return;const k=e.key.toLowerCase();if(dialogOpen){if(k==='escape'){e.preventDefault();e.stopImmediatePropagation();closeDialog();}return;}if(k==='tab'||(e.target.matches('button')&&(k==='enter'||k===' ')))return;e.preventDefault();e.stopImmediatePropagation();if(k==='escape'){pauseGodBattle();return;}if(k==='f'){keys.f=true;fireGodBolt();return;}if(k===' '){dodgeGod();return;}keys[k]=true;},true);
 window.addEventListener('blur',()=>{if(godBattle&&!dialogOpen)pauseGodBattle();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&godBattle&&!dialogOpen)pauseGodBattle();});
}
function startGodBattle(id){
 const g=godById(id);if(!g||!godRecord(id).quiz||state.mode!=='journey')return;
 closeDialog();path=[];running=false;Object.keys(keys).forEach(k=>delete keys[k]);persist();
 const arena=new THREE.Scene();arena.background=new THREE.Color('#112b34');arena.fog=null;
 arena.add(new THREE.HemisphereLight('#fff2d2','#28494f',2.8));const light=new THREE.DirectionalLight('#fff1d4',3);light.position.set(-5,12,8);arena.add(light);
 const floor=group(arena);cylinder(9.6,9.9,.35,'#c4b58e',floor,0,-.2,0,64);cylinder(8.9,8.9,.04,'#d5c39b',floor,0,.005,0,64);
 for(let i=0;i<32;i++){const a=i*Math.PI/16;const tile=box(.60,.07,.30,i%4===0?g.color:'#a79772',floor,Math.sin(a)*9.15,.02,Math.cos(a)*9.15);tile.rotation.y=a;}
 for(const x of [-6,6])for(const z of [-6,6]){cylinder(.45,.55,.28,'#aa9570',floor,x,.14,z);cylinder(.28,.34,2.3,'#c9b587',floor,x,1.3,z);orb(.18,.23,.18,g.color,floor,x,2.65,z);}
 const boss=deityModel(arena,g);boss.position.set(0,0,-4);boss.scale.setScalar(g.id==='apis'?2:2.2);
 const hero=character(arena);hero.position.set(0,0,4.5);applyGodOutfit(hero,state.gods.equipped);hero.rotation.y=Math.PI;
 const cam=new THREE.PerspectiveCamera(43,camera.aspect,.1,80);cam.position.set(0,17.5,19);cam.lookAt(0,0,0);
 godBattle={id,g,arena,cam,boss,hero,hp:state.gods.assist?8:5,maxHp:state.gods.assist?8:5,shield:100,time:0,next:2,round:0,shots:[],hazards:[],fire:0,dodge:0,dodgeTime:0,invincible:0,lastDir:new THREE.Vector3(1,0,0),finished:false,paused:false};
 $('#app').classList.add('combat');$('#battleHUD').hidden=false;$('#battleTheme').textContent=g.theme+' · FANTASY DUEL';$('#battleName').textContent=g.name;updateBattleHUD();$('#world').focus();
}
function updateBattleHUD(msg){if(!godBattle)return;const b=godBattle;$('#shieldText').textContent=Math.max(0,b.shield)+' / 100';$('#godShield').value=Math.max(0,b.shield);$('#battleHearts').textContent='♥'.repeat(Math.max(0,b.hp))+' ♡'.repeat(b.maxHp-Math.max(0,b.hp));if(msg)$('#battleHint').textContent=msg;$('#battleDodge').disabled=b.dodge>0;}
function fireGodBolt(){
 const b=godBattle;if(!b||dialogOpen||b.finished||b.fire>0)return;b.fire=.34;
 const dir=b.boss.position.clone().sub(b.hero.position);dir.y=0;dir.normalize();b.hero.rotation.y=Math.atan2(dir.x,dir.z);
 const mesh=orb(.12,.12,.24,'#fff0b2',b.arena,b.hero.position.x,.95,b.hero.position.z);mesh.material= new THREE.MeshBasicMaterial({color:'#ffe9a4'});mesh.rotation.y=Math.atan2(dir.x,dir.z);
 b.shots.push({mesh,dir,life:2});if(audioCtx&&state.settings.music)tone(520,.06,.025);
}
function dodgeGod(){const b=godBattle;if(!b||dialogOpen||b.finished||b.dodge>0)return;b.dodge=1.5;b.dodgeTime=.24;b.invincible=Math.max(b.invincible,.4);updateBattleHUD('Dodge! Keep moving out of the marked area.');}
function pauseGodBattle(){if(!godBattle||godBattle.finished)return;openDialog(`<div class="eyebrow">DUEL PAUSED · VILLAGE SAFE</div><h2 id="dialogTitle">Take a breath</h2><p>Your village is paused. Resume this duel or return to the river. Your completed quiz is kept.</p><div class="row"><button id="resumeGodDuel" class="gold">Resume duel</button><button id="quitGodDuel">Return to river</button></div>`);$('#resumeGodDuel').onclick=closeDialog;$('#quitGodDuel').onclick=()=>endGodBattle();}
function clearBattleObject(o){if(!o)return;godBattle?.arena.remove(o);o.traverse(n=>{if(n.geometry)n.geometry.dispose();if((n.material?.isMeshBasicMaterial||n.material?.isLineBasicMaterial))n.material.dispose();});}
function endGodBattle(){if(!godBattle)return;const old=godBattle;godBattle=null;$('#battleHUD').hidden=true;$('#app').classList.remove('combat');old.arena.traverse(o=>{if(o.geometry)o.geometry.dispose();if((o.material?.isMeshBasicMaterial||o.material?.isLineBasicMaterial))o.material.dispose();});Object.keys(keys).forEach(k=>delete keys[k]);path=[];closeDialog();renderHUD();renderer.shadowMap.needsUpdate=true;}
function finishGodBattle(won){
 const b=godBattle;if(!b||b.finished)return;b.finished=true;const id=b.id,g=b.g;let first=false;if(won){first=grantGodVictory(id);persist();}
 openDialog(`<div class="eyebrow">${won?'DIVINE SHIELD BROKEN':'CHALLENGE COMPLETE'}</div><h2 id="dialogTitle">${won?g.name+' recognises your victory':'Try a new approach'}</h2><p>${won?'The god remains here as a guardian of the stories. This fantasy duel is not a historical event.':'Move out of marked zones, use Dodge, then attack. Your village and all collections are safe.'}</p>${won&&first?`<div class="victoryLoot"><img src="${GOD_ART[id]}" alt="Unlocked ${g.name} textbook card"><div><h3>Collection unlocked</h3><p>${g.name} Card<br>${g.reward} + ${g.cape}<br>${g.name}'s Salute<br>${g.name} Village Statue</p><span class="badge">${saveWarning?'UNLOCKED · EXPORT SAVE FROM MENU':'SAVED · FIXED FIRST-VICTORY REWARDS'}</span></div></div>`:won?'<div class="callout">Already collected. Your existing rewards are kept; no duplicate items.</div>':''}<div class="row">${won?'<button id="victoryCollection" class="gold">View collection</button>':'<button id="retryGodDuel" class="gold">Retry duel</button><button id="retryGentle">Retry gentler duel</button>'}<button id="returnGodWorld">Return to river</button></div>`);
 $('#returnGodWorld').onclick=()=>endGodBattle();if(won)$('#victoryCollection').onclick=()=>{endGodBattle();godCard(id);};else {$('#retryGodDuel').onclick=()=>{endGodBattle();startGodBattle(id);};$('#retryGentle').onclick=()=>{state.gods.assist=true;endGodBattle();startGodBattle(id);};}
}
function addGodHazard(type,pos,size,angle=0,delay=1.2,extra={}){
 const b=godBattle;if(!b)return;const geo=type==='circle'?new THREE.CircleGeometry(size,48):type==='ring'?new THREE.RingGeometry(Math.max(.01,size-.55),size+.55,64):new THREE.PlaneGeometry(size[0],size[1]);
 const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#e29e40',transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.rotation.z=-angle;mesh.position.set(pos.x,.07,pos.z);b.arena.add(mesh);
 // white borders communicate area without relying solely on colour
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:'#793e24'}));mesh.add(edges);
 const h={mesh,type,pos:pos.clone(),size,angle,t:0,delay:delay*(state.gods.assist?1.5:1),active:.42,hit:false,...extra};b.hazards.push(h);return h;
}
function hazardContains(h,pos){const dx=pos.x-h.pos.x,dz=pos.z-h.pos.z;if(h.type==='circle')return Math.hypot(dx,dz)<h.size+.25;if(h.type==='ring')return Math.abs(Math.hypot(dx,dz)-h.size)<.80;const c=Math.cos(h.angle),s=Math.sin(h.angle);return Math.abs(dx*c+dz*s)<h.size[0]/2+.22&&Math.abs(-dx*s+dz*c)<h.size[1]/2+.22;}
function planGodAttack(){
 const b=godBattle,p=b.hero.position.clone(),r=b.round++,g=b.g,origin=new THREE.Vector3();
 if(g.pattern==='sun'){addGodHazard('circle',p,1.55);addGodHazard('circle',new THREE.Vector3((r%2?1:-1)*3,0,-1),1.5,0,1.55);updateBattleHUD('SUNBEAMS — leave the marked circles.');}
 if(g.pattern==='seals'){for(let i=0;i<3;i++)addGodHazard('circle',new THREE.Vector3(-4+i*4,0,r%2?2:-1),1.65,0,1.15+i*.30);updateBattleHUD('LIGHT SEALS — watch the order and find a gap.');}
 if(g.pattern==='wind'){addGodHazard('rect',new THREE.Vector3(p.x,0,0),[2.4,15],r%2?Math.PI/5:-Math.PI/5,1.35);updateBattleHUD('WIND LANE — move sideways out of the band.');}
 if(g.pattern==='water'){for(let i=0;i<2;i++)addGodHazard('rect',new THREE.Vector3(0,0,-2+i*5),[15,1.6],0,1.25+i*.50);updateBattleHUD('RIVER WAVES — stand between the marked bands.');}
 if(g.pattern==='rings'){addGodHazard('ring',origin,3,0,1.2);addGodHazard('ring',origin,6,0,1.8);updateBattleHUD('SEAL RINGS — cross a ring before it flashes.');}
 if(g.pattern==='charge'||g.pattern==='dash'){
  const start=b.boss.position.clone(),dir=p.clone().sub(start).setY(0).normalize(),length=g.pattern==='charge'?11:7;
  const center=start.clone().addScaledVector(dir,length/2);const angle=-Math.atan2(dir.x,dir.z);addGodHazard('rect',center,[g.pattern==='charge'?2.2:1.6,length],angle,1.4,{charge:{start,dir,length}});updateBattleHUD(g.pattern==='charge'?'BULL CHARGE — step out of the long lane.':'JACKAL DASH — dodge sideways from the marked lane.');
 }
}
function frameGodBattle(dt){
 const b=godBattle;if(!b)return;
 b.cam.aspect=camera.aspect;b.cam.updateProjectionMatrix();const narrow=camera.aspect<.75;const fit=narrow?.75/camera.aspect:1;b.cam.position.set(0,narrow?23*fit:17.5,narrow?25*fit:19);b.cam.lookAt(0,0,0);
 if(!dialogOpen&&!b.finished){
  b.time+=dt;b.fire=Math.max(0,b.fire-dt);b.dodge=Math.max(0,b.dodge-dt);b.invincible=Math.max(0,b.invincible-dt);b.dodgeTime=Math.max(0,b.dodgeTime-dt);
  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);const moving=!!(dx||dz);
  if(moving){b.lastDir.set(dx,0,dz).normalize();}
  if(moving||b.dodgeTime>0){b.hero.position.addScaledVector(b.lastDir,dt*(b.dodgeTime>0?15:4.6));if(b.hero.position.length()>8)b.hero.position.setLength(8);b.hero.rotation.y=Math.atan2(b.lastDir.x,b.lastDir.z);}
  animateCharacter(b.hero,moving,b.time,dt);animateCharacter(b.boss,false,b.time,dt);
  b.hero.visible=b.invincible<=0||Math.sin(b.time*25)>-.2||state.settings.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(keys.f)fireGodBolt();
  if(b.time>b.next){planGodAttack();b.next=b.time+(state.gods.assist?3.8:2.9);}
  for(let i=b.shots.length-1;i>=0;i--){const s=b.shots[i];s.life-=dt;s.mesh.position.addScaledVector(s.dir,14*dt);const radius=b.id==='apis'?1.45:.90;if(s.mesh.position.distanceTo(b.boss.position.clone().setY(.95))<radius){b.shield=Math.max(0,b.shield-10);s.life=0;updateBattleHUD('HIT — divine shield weakened.');}if(s.life<=0){clearBattleObject(s.mesh);b.shots.splice(i,1);}}
  for(let i=b.hazards.length-1;i>=0;i--){const h=b.hazards[i];h.t+=dt;const live=h.t>=h.delay;h.mesh.material.opacity=live?.8:.30+.12*Math.min(1,h.t/h.delay);h.mesh.material.color.set(live?'#b33d27':'#b56a26');
   if(live&&h.charge){const t=Math.min(1,(h.t-h.delay)/h.active);b.boss.position.copy(h.charge.start).addScaledVector(h.charge.dir,h.charge.length*t);b.boss.rotation.y=Math.atan2(h.charge.dir.x,h.charge.dir.z);b.boss.position.clampLength(0,7);}
   if(live&&!h.hit&&b.invincible<=0&&hazardContains(h,b.hero.position)){h.hit=true;b.hp--;b.invincible=1.1;updateBattleHUD('Hit! Move outside the next warning area.');}
   if(h.t>h.delay+h.active){clearBattleObject(h.mesh);b.hazards.splice(i,1);}
  }
  updateBattleHUD();if(b.shield<=0)finishGodBattle(true);else if(b.hp<=0)finishGodBattle(false);
 }
 renderer.render(b.arena,b.cam);
}
