import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
import {navigate} from './disclosure.mjs';
import {validateWorkspace} from '../public/backup.js';

const root=fileURLToPath(new URL('../docs/',import.meta.url));
const states=new Map([['/',{version:1}],['/Worship-Song-Tool/',{version:1}]]);
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const prefix=url.pathname.startsWith('/Worship-Song-Tool/')?'/Worship-Song-Tool/':'/';
  const state=states.get(prefix),name=url.pathname.slice(prefix.length)||'index.html';
  if(name==='index.html'&&url.pathname!==prefix){res.writeHead(302,{Location:prefix});res.end();return;}
  if(name==='api/private') {res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"private":"never-cache-this"}');return;}
  if(name.includes('..')||name.includes('/')||state.fail===name){res.writeHead(503);res.end();return;}
  try {
    let body=await readFile(path.join(root,name));
    if(name==='sw.js')body=Buffer.from(body.toString().replace(/(const BUILD = ")([^"]+)/,`$1test-${state.version}-$2`));
    res.writeHead(200,{'Content-Type':types[path.extname(name)]||'text/plain','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const contexts=[],profiles=[];
const errors=[];
async function preparedContext(options={}){
  const profile=await mkdtemp(path.join(tmpdir(),'faithful-pwa-'));profiles.push(profile);
  const context=await chromium.launchPersistentContext(profile,{...options,headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  contexts.push(context);
  // Test manual installation help deterministically; actual installability is
  // checked through Chromium's native manifest/installability diagnostics.
  await context.addInitScript(()=>window.addEventListener('beforeinstallprompt',event=>{
    if(event.isTrusted){event.preventDefault();event.stopImmediatePropagation();}
  },true));
  await context.route(/https:\/\//,route=>route.abort());
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  return context;
}
async function waitForShell(page){
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  await page.reload();await page.locator('.landing-page').waitFor();
  assert.equal(await page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),true);
}
try{
  for(const prefix of ['/','/Worship-Song-Tool/']){
    const base=origin+prefix,context=await preparedContext();
    const page=await context.newPage();await page.goto(base+'#home');await page.locator('.landing-page').waitFor();
    await waitForShell(page);
    const client=await context.newCDPSession(page);
    const nativeManifest=await client.send('Page.getAppManifest');
    assert.deepEqual(nativeManifest.errors,[]);
    const manifest=JSON.parse(nativeManifest.data);
    assert.equal(new URL(manifest.scope,base).pathname,prefix);
    assert.equal(new URL(manifest.start_url,base).pathname,prefix);
    assert.equal(manifest.display,'standalone');
    const installability=await client.send('Page.getInstallabilityErrors');
    assert.deepEqual(installability.installabilityErrors,[],'Chromium must accept the real manifest and install requirements');
    for(const icon of manifest.icons){
      const bytes=await (await context.request.get(new URL(icon.src,base).href)).body();
      assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
    }
    await page.getByRole('button',{name:'Install app',exact:true}).click();
    await page.getByRole('heading',{name:'Install Faithful Repertoire',exact:true}).waitFor();
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:950});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.screenshot({path:`/tmp/faithful-pwa-install-${prefix==='/'?'root':'subpath'}.png`,fullPage:true});
    await page.locator('[data-pwa-close]').click();
    await page.evaluate(()=>{
      const event=new Event('beforeinstallprompt',{cancelable:true});
      event.prompt=async()=>{window.testPrompted=true;};event.userChoice=Promise.resolve({outcome:'dismissed'});
      window.dispatchEvent(event);
    });
    await page.getByRole('button',{name:'Install app',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.testPrompted),true);
    assert.equal(await page.getByRole('button',{name:'Install app',exact:true}).isEnabled(),true);
    assert.equal(await page.locator('#pwa-dialog').evaluate(el=>el.open),false);
    assert.equal((await page.evaluate(url=>fetch(url).then(r=>r.json()),base+'api/private')).private,'never-cache-this');
    const cacheKeys=await page.evaluate(async()=>Promise.all((await caches.keys()).map(async name=>({name,urls:(await(await caches.open(name)).keys()).map(r=>r.url)}))));
    assert.equal(cacheKeys.length,1);
    assert.ok(cacheKeys[0].urls.length>=60);
    assert.ok(cacheKeys[0].urls.every(url=>url.startsWith(base)&&!/[?]|api\/|connect\.html|review\.html/.test(url)));
    assert.equal(await page.evaluate(()=>localStorage.getItem('hymn-heart-v1')),null);
    await context.setOffline(true);
    // Recent Chromium separates blocked network transport from the browser's
    // reported connection state. Exercise both, including across navigation.
    await client.send('Network.overrideNetworkState',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await page.reload();await page.locator('.landing-page').waitFor();
    await page.getByText('Offline',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Dismiss offline notice',exact:true}).click();
    await page.locator('#pwa-notice').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(url=>fetch(url).then(()=>false,()=>true),base+'api/private'),true,'Private responses must remain unavailable offline');
    await page.getByRole('button',{name:'Sign in to begin',exact:true}).click();
    await page.getByText('Existing browser-only work or offline use',{exact:true}).click();
    await page.getByRole('button',{name:'Use browser-only workspace',exact:true}).click();
    await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
    await page.evaluate(()=>{
      const state=JSON.parse(localStorage.getItem('hymn-heart-v1'));
      state.songs[0].review.notes='Offline note retained through app updates';
      state.libraries[0].songIds=[state.songs[0].id];
      localStorage.setItem('hymn-heart-v1',JSON.stringify(state));
    });
    await page.reload();await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
    await navigate(page,'plans');await page.getByRole('button',{name:'+ New plan',exact:true}).click();
    await page.getByLabel('Plan name',{exact:true}).fill('Offline service plan');await page.locator('#plan-form .primary').click();
    const before=validateWorkspace(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1'))));
    await page.reload();await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
    await navigate(page,'plans');await page.getByText('Offline service plan',{exact:true}).first().waitFor();
    await page.setViewportSize({width:390,height:950});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`/tmp/faithful-pwa-offline-${prefix==='/'?'root':'subpath'}.png`,fullPage:true});
    await context.setOffline(false);
    await client.send('Network.overrideNetworkState',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await page.locator('#pwa-notice').waitFor({state:'hidden'});
    await navigate(page,'settings');await page.getByRole('button',{name:'Install app',exact:true}).click();
    await page.locator('[data-pwa-close]').click();
    // A partial new deploy cannot replace the working shell.
    states.get(prefix).version=2;states.get(prefix).fail='app.js';
    assert.equal(await page.evaluate(async()=>{
      const r=await navigator.serviceWorker.getRegistration();
      return new Promise(async resolve=>{
        r.addEventListener('updatefound',()=>{const worker=r.installing;worker.addEventListener('statechange',()=>{if(worker.state==='redundant')resolve(true);});},{once:true});
        await r.update();
      });
    }),true);
    assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),false);
    states.get(prefix).fail=null;states.get(prefix).version=3;
    await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});
    await page.getByRole('button',{name:'Update app',exact:true}).waitFor();
    await navigate(page,'profile');await page.getByLabel('Lens name',{exact:true}).fill('Unsaved lens');
    await page.getByRole('button',{name:'Update app',exact:true}).click();
    await page.getByText('Save or finish editing before updating the app.',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('Lens name',{exact:true}).inputValue(),'Unsaved lens');
    page.once('dialog',dialog=>dialog.accept());await navigate(page,'settings');
    const other=await context.newPage();await other.addInitScript(()=>sessionStorage.setItem('faithful-guest-opt-in','1'));
    await other.goto(base);await other.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
    await navigate(other,'profile');await other.getByLabel('Lens name',{exact:true}).fill('Unsaved in another window');
    await page.getByRole('button',{name:'Update app',exact:true}).click();
    await page.getByText('Finish editing in other Faithful Repertoire windows, or close them, then try again.',{exact:true}).waitFor();
    assert.equal(await other.getByLabel('Lens name',{exact:true}).inputValue(),'Unsaved in another window');
    await other.close();
    await page.getByRole('button',{name:'Update app',exact:true}).click();
    await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
    await page.locator('#pwa-notice').waitFor({state:'hidden'});
    assert.deepEqual(validateWorkspace(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')))),before);
    assert.equal(await page.evaluate(async()=>(await caches.keys()).length),1,'Old shell cache should be cleaned up');
    await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
    await navigate(page,'settings');assert.equal(await page.getByRole('button',{name:'App installed',exact:true}).isDisabled(),true);
    await context.close();
    console.log(`PASS: ${prefix} native installability, icon sizes, manual/native-dismissed installation, offline shell/notes/plans, network-only private responses, failed-install recovery, guarded multiwindow updates and cache cleanup.`);
  }
  // iOS instructions and an already-installed window use the proper affordance.
  const apple=await preparedContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  const applePage=await apple.newPage();await applePage.goto(origin+'/#home');await applePage.getByRole('button',{name:'Install app',exact:true}).click();
  await applePage.getByText('Add to Home Screen',{exact:true}).waitFor();await apple.close();
  const installed=await preparedContext();await installed.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{value:true});});
  const installedPage=await installed.newPage();await installedPage.goto(origin+'/#home');
  assert.equal(await installedPage.getByRole('button',{name:'App installed',exact:true}).isDisabled(),true);await installed.close();
  assert.deepEqual(errors,[]);
}finally{
  await Promise.all(contexts.map(context=>context.close()));
  await new Promise(resolve=>server.close(resolve));
  await Promise.all(profiles.map(profile=>rm(profile,{recursive:true,force:true})));
}
