const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const D=path.resolve(__dirname,'..');let b;let passed=0;const checks=[];const ck=(x,m)=>{assert.ok(x,m);checks.push(m);passed++;};
(async()=>{b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || chromium.executablePath(),headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+D+'/index.html');await p.waitForFunction(()=>window.RIVER);await p.evaluate(()=>RIVER.enterMode('journey'));
 for(const id of ['ra','isis','shu','apis','hapi','osiris','anubis']){
  await p.evaluate(id=>{RIVER.state.gods.progress[id]={seen:true,quiz:true,won:false};RIVER.startGodBattle(id);RIVER.battle.next=0;},id);
  await p.waitForFunction(()=>RIVER.battle.hazards.length>0);ck(await p.evaluate(()=>RIVER.battle.hazards[0].delay>=1),'visible attack warning '+id);
  await p.locator('#battlePause').click();await p.screenshot({path:D+'/qa/model-'+id+'.png'});await p.locator('#resumeGodDuel').click();
  if(id==='ra'){
   const shield=await p.evaluate(()=>RIVER.battle.shield);await p.locator('#world').focus();await p.keyboard.down('f');await p.waitForFunction(v=>RIVER.battle.shield<v,shield);await p.keyboard.up('f');ck(true,'held F fires real collision projectile');
   await p.evaluate(()=>RIVER.battle.next=RIVER.battle.time);await p.waitForFunction(()=>RIVER.battle.hazards.length>0);await p.screenshot({path:D+'/qa/battle-final-warning.png'});
   await p.evaluate(()=>RIVER.battle.hp=0);await p.waitForFunction(()=>RIVER.battle.finished);await p.locator('#closeDialog').click();ck(await p.evaluate(()=>!RIVER.battle),'closing defeat result returns safely, no stuck arena');
   await p.evaluate(()=>{RIVER.startGodBattle('ra');RIVER.battle.shield=0;});await p.waitForFunction(()=>RIVER.battle.finished);await p.locator('#closeDialog').click();ck(await p.evaluate(()=>!RIVER.battle&&RIVER.state.gods.progress.ra.won),'closing victory result returns safely and keeps earned record');
  }else await p.evaluate(()=>RIVER.endGodBattle());
 }
 // Test retry and rewards are not re-issued using pure model state; live combat covered in gods.test.cjs.
 ck(await p.evaluate(()=>{const s=JSON.parse(JSON.stringify(RIVER.state));return RIVER.MODEL.migrateSave(s).gods.progress.ra.won}),'final save round trip');
 await p.evaluate(()=>{RIVER.state.gods.progress.ra.won=false;RIVER.startGodBattle('ra');});await p.locator('#battlePause').click();await p.locator('#quitGodDuel').click();ck(await p.evaluate(()=>RIVER.state.gods.progress.ra.quiz&&!RIVER.state.gods.progress.ra.won),'quitting does not award victory');
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{RIVER.showGodCollection();});await p.screenshot({path:D+'/qa/collection-mobile-final.png'});ck(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'final mobile collection fits');
 await p.evaluate(()=>{RIVER.closeDialog();RIVER.startGodBattle('ra');});await p.screenshot({path:D+'/qa/battle-mobile-final.png'});await p.locator('#battlePause').click();await p.locator('#quitGodDuel').click();
 await p.evaluate(()=>{RIVER.godIntro('isis');});await p.screenshot({path:D+'/qa/intro-mobile-final.png'});ck(errors.length===0,'final build no runtime errors');
 fs.writeFileSync(D+'/qa/gods-final-results.json',JSON.stringify({passed,checks,errors,method:'Final-build boundary tests seed quiz records and force terminal hp/shield states; these are not live completion claims.'},null,2));console.log(passed+' final-build assertions passed');await b.close();})().catch(async e=>{console.error(e);if(b)await b.close();process.exit(1)});
