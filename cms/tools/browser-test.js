'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const out=process.env.VL_TEST_SCREENSHOTS;fs.mkdirSync(out,{recursive:true});
const results=[];
async function check(name,fn){await fn();results.push(name);console.log('BROWSER PASS',name);}
function assert(v,label){if(!v)throw Error(label);}
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.VL_TEST_CHROMIUM,args:['--no-sandbox','--single-process','--no-zygote','--disable-dev-shm-usage']});
try{
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.VL_TEST_ADMIN);await p.locator('#login').waitFor();await p.screenshot({path:path.join(out,'login-desktop.png'),fullPage:true});
await p.locator('#username').fill('owner');await p.locator('#password').fill(process.env.VL_TEST_PASSWORD);await p.locator('#code').fill(process.env.VL_TEST_CODE);await p.locator('#login button[type=submit]').click();await p.locator('#app').waitFor({state:'visible'});
await check('login and navigation visible',async()=>assert(await p.locator('[data-view="pages"]').isVisible(),'pages nav'));
await check('privacy easy to find',async()=>{await p.locator('#page-search').fill('конфиденциальности');await p.locator('.page-link').filter({hasText:'Политика конфиденциальности'}).first().click();await p.locator('#code').waitFor();assert((await p.locator('#page-route').inputValue())==='/krupny-text-privacy/','privacy route');});
await p.locator('#page-search').fill('');await p.locator('#code').fill('<main><h1>Browser preview test</h1></main>');await p.locator('[data-tab="css"]').click();await p.locator('#code').fill('h1{color:#6d37e5}');await p.locator('[data-tab="js"]').click();await p.locator('#code').fill('document.body.dataset.preview="safe"');await p.locator('[data-tab="html"]').click();
await check('code tabs preserve edits',async()=>assert((await p.locator('#code').inputValue()).includes('Browser preview test'),'HTML persisted'));
await check('isolated preview works',async()=>{await p.locator('#preview').click();await p.locator('.preview-frame').waitFor();const frame=p.frameLocator('.preview-frame');await frame.getByText('Browser preview test',{exact:true}).waitFor();assert((await p.locator('.preview-frame').getAttribute('sandbox'))==='allow-scripts','opaque sandbox');await p.locator('#dialog-close').click();});
await check('save works in UI',async()=>{await p.locator('#save').click();await p.locator('#toast').filter({hasText:'Черновик сохранен'}).waitFor();assert(await p.locator('#code').inputValue()==='<main><h1>Browser preview test</h1></main>','saved HTML');});
await check('export ZIP download works',async()=>{await p.locator('#export').click();const dl=p.waitForEvent('download');await p.locator('#export-download').click();const d=await dl;assert(d.suggestedFilename().endsWith('.zip'),'ZIP filename');await p.locator('#dialog-close').click();});
await p.screenshot({path:path.join(out,'editor-desktop.png'),fullPage:true});
await check('create nested draft in UI',async()=>{await p.locator('#create-page').click();await p.locator('#dialog #name').fill('Тест из браузера');assert((await p.locator('#dialog #route').inputValue()).includes('test-iz-brauzera'),'auto transliteration');await p.locator('#dialog #template').selectOption('product');await p.locator('#create-form button[type=submit]').click();await p.locator('#dialog').waitFor({state:'hidden'});await p.waitForFunction(()=>document.querySelector('#page-route')?.value==='/test-iz-brauzera/');assert((await p.locator('#code').inputValue()).includes('Название продукта'),'template');});
await check('menu editor works',async()=>{await p.locator('[data-view="menu"]').click();await p.locator('#new-external').click();await p.locator('#dialog #label').fill('Браузерная ссылка');await p.locator('#dialog #url').fill('https://api.vibelink.ru/');await p.locator('#menu-form button[type=submit]').click();await p.locator('#dialog').waitFor({state:'hidden'});await p.getByText('Браузерная ссылка',{exact:true}).waitFor();});
await p.screenshot({path:path.join(out,'menu-desktop.png'),fullPage:true});
await check('file upload through UI',async()=>{await p.locator('[data-view="files"]').click();await p.locator('#upload').click();await p.locator('#upload-files').setInputFiles({name:'browser.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1xoAAAAASUVORK5CYII=','base64')});await p.locator('#upload-folder').fill('link/browser');await p.locator('#upload-form button[type=submit]').click();await p.locator('#dialog').waitFor({state:'hidden'});await p.locator('.file-name').filter({hasText:'browser.png'}).waitFor();});
await p.screenshot({path:path.join(out,'files-desktop.png'),fullPage:true});
await check('security view and audit work',async()=>{await p.locator('[data-view="security"]').click();await p.locator('#recovery-count').filter({hasText:'Осталось резервных кодов'}).waitFor();assert(await p.locator('#audit .table').isVisible(),'audit table');});
await p.setViewportSize({width:390,height:844});await p.locator('[data-view="pages"]').click();await p.screenshot({path:path.join(out,'admin-mobile.png'),fullPage:true});
await check('admin mobile has no page overflow',async()=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow'));
await check('logout and repeat login form',async()=>{await p.locator('#logout').click();await p.locator('#login').waitFor();await p.locator('#username').fill('owner');await p.locator('#password').fill(process.env.VL_TEST_PASSWORD);await p.locator('#code').fill('bad');await p.locator('#login button[type=submit]').click();await p.locator('#login .error').filter({hasText:'неверен'}).waitFor();});
await ctx.close();
const publicCtx=await browser.newContext({viewport:{width:1440,height:1000}});const q=await publicCtx.newPage();const pubErrors=[];q.on('pageerror',e=>pubErrors.push(e.message));
await check('public home renders without JS errors',async()=>{await q.goto(process.env.VL_TEST_PUBLIC,{waitUntil:'networkidle'});await q.locator('.vl-header').waitFor();assert(await q.locator('.hero h1').isVisible(),'hero');assert(!pubErrors.length,pubErrors.join('; '));});
await q.screenshot({path:path.join(out,'home-desktop.png'),fullPage:true});
await check('public navigation services expands',async()=>{await q.locator('.vl-nav summary').filter({hasText:'Услуги'}).first().click();assert(await q.locator('.vl-submenu a').filter({hasText:'Создание сайтов'}).isVisible(),'service link');});
await q.goto(process.env.VL_TEST_PUBLIC+'/sozdanie-saitov/',{waitUntil:'networkidle'});await q.screenshot({path:path.join(out,'service-desktop.png'),fullPage:true});
await q.goto(process.env.VL_TEST_PUBLIC+'/krupny-text-privacy/',{waitUntil:'networkidle'});await q.screenshot({path:path.join(out,'privacy-desktop.png'),fullPage:true});
await q.goto(process.env.VL_TEST_PUBLIC+'/produkty/',{waitUntil:'networkidle'});await q.screenshot({path:path.join(out,'products-desktop.png'),fullPage:true});
await check('products link to app privacy',async()=>assert(await q.getByRole('link',{name:'Политика конфиденциальности',exact:true}).isVisible(),'privacy link'));
await q.setViewportSize({width:390,height:844});await q.goto(process.env.VL_TEST_PUBLIC,{waitUntil:'networkidle'});await q.screenshot({path:path.join(out,'home-mobile.png'),fullPage:true});
await check('public mobile menu opens',async()=>{await q.locator('.vl-menu-toggle').click();assert(await q.locator('.vl-nav').isVisible(),'mobile nav');});
await check('public mobile has no page overflow',async()=>assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'public overflow'));
assert(!errors.length,errors.join('; '));await publicCtx.close();
fs.writeFileSync(path.join(__dirname,'../QA-browser.json'),JSON.stringify({browser_tests:results.length,passed:results},null,2));console.log('BROWSER RESULT',results.length);
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
