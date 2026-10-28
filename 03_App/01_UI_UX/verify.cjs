// Uses the browser runtime bundled with Codex; no project dependencies are installed.
const { chromium } = require('C:/Users/trand/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 const page = await browser.newPage({viewport:{width:1440,height:1040},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=pathToFileURL(path.join(__dirname,'index.html')).href;
 const user=base+'?experience=user-app';
 const web=base+'?experience=operator-web';
 const mobile=base+'?experience=operator-app';
 await page.goto(user+'#home');
 await page.locator('.quick a[href="#vehicles"]').click();
 await page.locator('[data-vehicle="EB-024"]').click();
 await page.locator('[data-action="reserve"]').click();
 await page.locator('a.primary[href="#pickup"]').click();
 await page.locator('#vehicle-code').fill('WRONG');
 await page.locator('#pickup-form button').click();
 await page.waitForTimeout(50);assert.equal(new URL(page.url()).hash,'#pickup');
 await page.locator('#vehicle-code').fill('EB-024');
 await page.locator('#pickup-form button').click();
 await page.waitForURL('**#trip');
 await page.locator('#return-form input[type="checkbox"]').check();
 await page.locator('#return-form button.primary').click();
 await page.locator('#dialog-confirm').click();await page.waitForURL('**#home');
 await page.goto(user+'#charging');
 await page.locator('#charge-hub').selectOption('2');await page.locator('#charging-form button').click();
 assert.match(await page.locator('#toast').textContent(),/không còn cổng/);
 await page.goto(web+'#redistribute');await page.locator('#quantity').fill('13');await page.locator('#dispatch-form button').click();
 assert.match(await page.locator('#toast').textContent(),/vượt/);
 await page.locator('#quantity').fill('6');await page.locator('#dispatch-form button').click();await page.locator('#dialog-confirm').click();
 assert.match(await page.locator('table').textContent(),/DC-028/);
 await page.goto(web+'#simulation');await page.locator('#simulation-form button').click();await page.waitForURL('**#results');
 const first=await page.locator('.comparison').textContent();
 await page.goto(web+'#simulation');await page.locator('#demand').fill('100');await page.locator('#simulation-form button').click();await page.waitForURL('**#results');
 assert.notEqual(await page.locator('.comparison').textContent(),first);
 const ids=['home','map','vehicles','reserve','ticket','pickup','trip','parking','charging','notifications','account','overview','resources','redistribute','incidents','schedule','simulation','results'];
 for(const id of ids){
   await page.goto((ids.indexOf(id)<11?user:web)+'&capture=1#'+id);await page.waitForTimeout(60);
   await page.locator('#app').screenshot({path:path.join(__dirname,'screens',id+'.png')});
   assert.equal(await page.locator('#app').evaluate(el=>el.scrollWidth>el.clientWidth),false,'overflow: '+id);
 }
 await page.goto(user+'#home');await page.screenshot({path:path.join(__dirname,'preview.png')});
 await page.setViewportSize({width:390,height:900});
 for(const id of ['home','map','parking','overview','simulation']){
   await page.goto((['overview','simulation'].includes(id)?web:user)+'#'+id);await page.waitForTimeout(50);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'responsive overflow: '+id);
 }
 const opIds=['overview','resources','redistribute','incidents','schedule','simulation','results','op-menu'];
 await page.goto(user+'#overview');assert.equal(new URL(page.url()).hash,'#home');
 assert.equal(await page.locator('#screen-select option[value="overview"]').count(),0);
 await page.goto(web+'#reserve');assert.equal(new URL(page.url()).hash,'#overview');
 for(const id of opIds){
   await page.goto(mobile+'&capture=1#'+id);await page.waitForTimeout(60);
   assert.equal(await page.locator('.op-side').count(),0);
   assert.equal(await page.locator('.bottom').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'operator app overflow: '+id);
   await page.locator('#app').screenshot({path:path.join(__dirname,'screens','op-mobile-'+id+'.png')});
 }
 await page.goto(mobile+'#op-menu');await page.locator('.menu-item[href="#redistribute"]').click();
 await page.locator('#quantity').fill('4');await page.locator('#dispatch-form button').click();await page.locator('#dialog-confirm').click();
 assert.match(await page.locator('table').textContent(),/DC-028/);
 await page.goto(mobile+'#incidents');await page.locator('[data-action="incident"]').click();await page.locator('#dialog-confirm').click();
 assert.match(await page.locator('.op-main').textContent(),/Đang xử lý/);
 for(const [entry,mode,route] of [['user-app','user-app','home'],['operator-app','operator-app','overview'],['operator-web','operator-web','overview']]){
   await page.goto(pathToFileURL(path.join(__dirname,entry+'.html')).href);
   await page.waitForURL('**index.html?experience='+mode+'&standalone=1#'+route);
   assert.equal(await page.locator('.studio').isVisible(),false);
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({screens:ids.length+opIds.length,checks:['reserve → wrong code rejected → pickup → return','charging without a free port rejected','dispatch capacity validation and confirmation','simulation responds to parameters','all screens render without JavaScript errors','mobile and desktop overflow checks','user and operator route separation','operator app navigation, dispatch and incident handling','separate entry points hide design controls'],passed:true},null,2));
 console.log('PASS: '+(ids.length+opIds.length)+' screens, workflow checks, responsive checks.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

