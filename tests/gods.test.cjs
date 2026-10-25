const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),assert=require('assert/strict');const D=path.resolve(__dirname,'..');let browser;let passed=0;const checks=[];function check(x,m){assert.ok(x,m);passed++;checks.push(m);}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || chromium.executablePath(),headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});const p=await context.newPage();const errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>requests.push(r.url().slice(0,100)));await p.goto('file://'+D+'/index.html');await p.waitForFunction(()=>window.RIVER);await p.evaluate(()=>RIVER.enterMode('journey'));
 check(await p.evaluate(()=>RIVER.npcs.filter(n=>RIVER.gods.some(g=>g.id===n.id)).length===7),'seven visible world gods');
 check(await p.evaluate(()=>RIVER.state.version===6),'separate v6 save');
 const initial=await p.evaluate(()=>JSON.stringify(RIVER.state.resources));
 for(const id of ['ra','isis','shu','apis','hapi','osiris','anubis']){
  await p.evaluate(id=>{const g=RIVER.gods.find(g=>g.id===id);RIVER.player.position.set(g.pos[0],0,g.pos[1]+1);RIVER.interact(id)},id);
  check((await p.locator('#dialogTitle').textContent()).includes(id==='ra'?'Ra':id[0].toUpperCase()+id.slice(1)),id+' world interaction');
  await p.locator('#godChallenge').click();
  // all questions exercised via actual buttons, including wrong and review paths
  for(let q=0;q<3;q++){
   const answer=await p.evaluate(({id,q})=>q===0?RIVER.gods.find(g=>g.id===id).title:q===1?'Ancient Egyptian beliefs and symbols':'Dodging magical attacks and defeating a divine shield',{id,q});
   if(q===0){const wrong=p.locator('[data-god-answer]').filter({hasNotText:answer}).first();await wrong.click();await p.locator('#godCheck').click();check((await p.locator('#godQuizFeedback').textContent()).startsWith('Not quite'),id+' wrong answer blocked');await p.locator('#godClue').click();}
   await p.locator('[data-god-answer]').filter({hasText:answer}).click();await p.locator('#godCheck').click();await p.locator('#godCheck').click();
  }
  check(await p.evaluate(id=>RIVER.state.gods.progress[id].quiz,id),id+' quiz saved');
  await p.locator('#beginGodDuel').click();await p.waitForFunction(()=>!!RIVER.battle);
  check(await p.locator('#battleHUD').isVisible(),id+' action arena');
  if(id==='ra'){
   const before=await p.evaluate(()=>RIVER.battle.hero.position.x);await p.keyboard.down('d');await p.waitForFunction(x=>RIVER.battle.hero.position.x>x+.25,before);await p.keyboard.up('d');check(await p.evaluate(x=>RIVER.battle.hero.position.x>x,before),'real battle movement');
   await p.locator('#battleDodge').click();check(await p.evaluate(()=>RIVER.battle.dodge>0),'dodge cooldown');await p.locator('#battlePause').click();const paused=await p.evaluate(()=>RIVER.battle.time);await p.waitForTimeout(350);check(await p.evaluate(t=>RIVER.battle.time===t,paused),'pause freezes battle clock');await p.locator('#resumeGodDuel').click();
   await p.screenshot({path:D+'/qa/battle-desktop.png'});
   await p.evaluate(()=>{RIVER.battle.next=RIVER.battle.time;});await p.waitForFunction(()=>RIVER.battle?.hazards.length>0);await p.screenshot({path:D+'/qa/battle-warning.png'});
  }
  // Repeated UI attacks. No direct shield/health mutation; auto-aim projectiles must collide.
  await p.evaluate(()=>{window.testFire=setInterval(()=>document.querySelector('#battleAttack')?.click(),100);});
  await p.waitForFunction(()=>RIVER.battle?.finished,{timeout:120000});await p.evaluate(()=>clearInterval(window.testFire));
  check(await p.evaluate(id=>RIVER.state.gods.progress[id].won,id),id+' defeated through real projectiles');
  check(await p.evaluate(()=>RIVER.battle.shield===0),'shield reached zero');
  if(id==='ra')await p.screenshot({path:D+'/qa/victory-desktop.png'});
  await p.locator('#returnGodWorld').click();check(await p.evaluate(()=>!RIVER.battle),'returns safely to existing world');
 }
 check(await p.evaluate(()=>RIVER.state.gods.completeReward),'7/7 collection title');check(await p.evaluate(()=>JSON.stringify(RIVER.state.resources))===initial,'duels do not mint or consume village resources');
 await p.evaluate(()=>RIVER.showGodCollection());await p.screenshot({path:D+'/qa/collection-desktop.png'});check(await p.locator('.collectionTile.owned').count()===7,'seven cards collected');
 await p.locator('[data-god-card=anubis]').click();await p.screenshot({path:D+'/qa/card-desktop.png'});await p.locator('#flipGodCard').click();check((await p.locator('.cardReverse').textContent()).includes('supplied textbook'),'card reverse source attribution');await p.locator('#equipGod').click();check(await p.evaluate(()=>RIVER.state.gods.equipped==='anubis'&&RIVER.player.children.some(o=>o.userData.outfit)),'visible wearable equipment');
 await p.evaluate(()=>RIVER.godCard('ra'));await p.locator('#placeGodStatue').click();check(await p.evaluate(()=>RIVER.state.gods.decorations.includes('ra')),'village statue placed');await p.evaluate(()=>RIVER.godCard('ra'));await p.locator('#godSalute').click();await p.waitForTimeout(250);await p.screenshot({path:D+'/qa/outfit-world.png'});
 await p.evaluate(()=>RIVER.enterMode('builder'));check(await p.evaluate(()=>RIVER.state.gods.equipped==='anubis'&&RIVER.state.gods.decorations.length===1),'outfit and statues shared with builder');
 await p.reload();await p.waitForFunction(()=>window.RIVER);check(await p.evaluate(()=>RIVER.state.gods.progress.anubis.won&&RIVER.state.gods.equipped==='anubis'&&RIVER.state.gods.completeReward),'collection and equipment survive reload');
 // save validation + old v5 migration without touching old key
 check(await p.evaluate(()=>{const x=JSON.parse(JSON.stringify(RIVER.state));x.version=5;delete x.gods;const m=RIVER.MODEL.migrateSave(x);return m.version===6&&m.gods.equipped===null}),'v5 imports with empty god progress');
 check(await p.evaluate(()=>{const x=JSON.parse(JSON.stringify(RIVER.state));x.gods.progress.ra.won=false;try{RIVER.MODEL.migrateSave(x);return false}catch(e){return true}}),'inconsistent/unowned collection rejected');
 await p.evaluate(()=>{RIVER.enterMode('journey');RIVER.startGodBattle('ra');});await p.waitForFunction(()=>!!RIVER.battle);await p.evaluate(()=>{RIVER.battle.next=0;RIVER.battle.hero.position.set(0,0,0);});
 const hp=await p.evaluate(()=>RIVER.battle.hp);await p.waitForFunction(n=>RIVER.battle.hp<n,hp,{timeout:20000});check(true,'hazard causes actual player damage');await p.locator('#battlePause').click();await p.locator('#quitGodDuel').click();check(await p.evaluate(()=>!RIVER.battle&&RIVER.state.gods.progress.ra.quiz),'quit preserves quiz');
 // Touch-sized browser: actual pointer actions and geometry checks.
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto('file://'+D+'/index.html');await m.waitForFunction(()=>window.RIVER);await m.locator('[data-start=journey]').tap();await m.locator('#godsBtn').tap();await m.screenshot({path:D+'/qa/collection-mobile.png'});check(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile collection no page overflow');await m.locator('[data-god-card=ra]').tap();await m.screenshot({path:D+'/qa/card-mobile.png'});await m.locator('#closeDialog').tap();
 // Isolate mobile combat input from the already-tested quiz path.
 await m.evaluate(()=>{RIVER.state.gods.progress.ra={seen:true,quiz:true,won:false};RIVER.startGodBattle('ra');});await m.waitForFunction(()=>!!RIVER.battle);await m.screenshot({path:D+'/qa/battle-mobile.png'});
 const pos=await m.evaluate(()=>RIVER.battle.hero.position.x);const rb=await m.locator('[data-battle-move=d]').boundingBox();const cdp=await mobile.newCDPSession(m);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rb.x+rb.width/2,y:rb.y+rb.height/2}]});await m.waitForFunction(x=>RIVER.battle.hero.position.x>x+.2,pos);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check(true,'real touch movement');await m.locator('#battleDodge').tap();check(await m.evaluate(()=>RIVER.battle.dodge>0),'touch dodge');await m.locator('#battleAttack').tap();await m.waitForFunction(()=>RIVER.battle.shield<100);check(true,'touch attack hits');
 check(await m.evaluate(()=>[...document.querySelectorAll('#battleMove button,.battleAction button,#battlePause')].every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44})),'44px combat targets');
 check(await m.evaluate(()=>{const nodes=['#battleMove','.battleAction','#heartPanel','.battleHeader'];const rs=nodes.map(s=>document.querySelector(s).getBoundingClientRect());return rs.every(r=>r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight)&&rs.every((a,i)=>rs.every((b,j)=>i===j||a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));}),'mobile combat controls do not overlap');
 await mobile.close();check(errors.length===0,'no browser runtime errors: '+errors.join('|'));check(requests.length===0,'no missing assets');fs.writeFileSync(D+'/qa/gods-results.json',JSON.stringify({passed,failed:0,checks,errors,requests},null,2));console.log(passed+' Gods Edition assertions passed');await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1)});
