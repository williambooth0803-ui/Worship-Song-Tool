import {navigate} from "./disclosure.mjs";
import assert from'node:assert/strict';
import{allCatalogSongs,syncCatalog}from'../public/catalog.js';import{defaultProfile}from'../public/core.js';import{songCollections}from'../public/collections.js';
import{validateWorkspace}from'../public/backup.js';import{reveal}from'./disclosure.mjs';
const stateFor=()=>syncCatalog({version:1,songs:structuredClone(allCatalogSongs),profile:{...defaultProfile,setupComplete:true},libraries:[{id:'all',name:'Test library',songIds:allCatalogSongs.map(s=>s.id)}],plans:[]});
export async function checkSearchCollectionFlows(browser,base) {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));
 const pack=songCollections.find(pack=>pack.name==='Chris Tomlin'),popular=allCatalogSongs.find(song=>song.id===pack.songIds[0]);
 const state=stateFor();state.plans=[{id:'used',title:'Completed fixture',date:'2026-10-13',theme:'',passage:'',status:'completed',items:[{id:'use1',type:'song',songId:popular.id,key:'',minutes:4,role:'',notes:''}]}];validateWorkspace(state);
 await page.addInitScript(state=>{if(sessionStorage.getItem('collection-fixture'))return;sessionStorage.setItem('collection-fixture','1');sessionStorage.setItem('faithful-guest-opt-in','1');localStorage.setItem('hymn-heart-v1',JSON.stringify(state));},state);
 await page.route('https://*.mzstatic.com/**',route=>route.abort());
 await page.route('https://www.wikidata.org/**',route=>{const title=new URL(route.request().url()).searchParams.get('titles').split('|')[0];requests.push(title);return route.fulfill({contentType:'application/json',body:JSON.stringify({entities:{Qfixture:{sitelinks:{enwiki:{title}},claims:{P18:[{rank:'normal',mainsnak:{snaktype:'value',datavalue:{value:'Fixture photo.jpg'}}}]}}}})});});
 await page.route('https://commons.wikimedia.org/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({query:{pages:{1:{imageinfo:[{thumburl:'https://upload.wikimedia.org/wikipedia/commons/fixture/Fixture.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Fixture.jpg',extmetadata:{Artist:{value:'<a>Test author</a>'},LicenseShortName:{value:'CC BY-SA 4.0'}}}]}}}})}));
 await page.route('https://upload.wikimedia.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=','base64')}));
 try {
  await page.goto(base);await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
  await page.evaluate(()=>window.fixtureInput=document.querySelector('#search'));
  await page.locator('#search').pressSequentially('How Great Is Our God',{delay:8});await page.locator('.song-list h3').filter({hasText:'How Great Is Our God'}).first().waitFor();
  assert.ok(await page.evaluate(()=>window.fixtureInput===document.querySelector('#search')),'Typing never replaces the active search input');
  const times=[];for(const text of ['Amazing Grace','Yet Not I','Living Hope','How Great Is Our God','Holy','all sufficent merit']) {
   times.push(await page.evaluate(text=>new Promise(resolve=>{const input=document.querySelector('#search'),target=document.querySelector('.result-count'),start=performance.now();const observer=new MutationObserver(()=>{observer.disconnect();requestAnimationFrame(()=>resolve(performance.now()-start));});observer.observe(target,{childList:true,subtree:true});input.value=text;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));}),text));
  }
  assert.ok(Math.max(...times)<600,'Catalog search updates must avoid long input-blocking renders');
  await page.evaluate(()=>{const input=document.querySelector('#search');input.value='Living Hope';input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});
  assert.ok(await page.evaluate(()=>window.fixtureInput===document.querySelector('#search')));await page.locator('#search').dispatchEvent('compositionend');await page.locator('.song-list h3').filter({hasText:'Living Hope'}).first().waitFor();
  await navigate(page,"collections");await page.evaluate(()=>window.collectionInput=document.querySelector('#collection-search'));
  await page.locator('#collection-search').pressSequentially('How Great Is Our God',{delay:8});await page.locator('.collection-title-matches li').filter({hasText:'How Great Is Our God'}).first().waitFor();assert.ok(await page.evaluate(()=>window.collectionInput===document.querySelector('#collection-search')));
  await page.locator('#collection-search').fill('Chris Tomlin');await page.locator(`[data-collection="${pack.id}"]`).waitFor();
  await page.locator('#collection-search').fill('');await page.waitForFunction(()=>!document.querySelector('.collection-title-matches'));
  const row=page.locator(`[data-collection="${pack.id}"]`);await row.locator('summary').first().click();await row.locator('.collection-song-results').waitFor();
  const titles=await row.locator('.collection-song-title').allTextContents();const sorted=[...titles].sort(new Intl.Collator('en',{numeric:true,sensitivity:'base'}).compare);assert.deepEqual(titles,sorted,'Each collection defaults to alphabetical song titles');
  await row.locator('[data-collection-depth]').selectOption('essentials');assert.equal(await row.locator('.collection-song-title').count(),5);
  await row.locator('[data-collection-sort]').selectOption('popularity');assert.equal(await row.locator('.collection-song-title').first().textContent(),popular.title);
  await row.locator('[data-collection-depth]').selectOption('all');await row.locator('[data-collection-sort]').selectOption('oldest');
  const dates=await row.locator('.collection-song-results small').allTextContents();const known=dates.filter(value=>value.startsWith('Recording release: ')&&!value.includes('Unknown')).map(value=>value.split(': ')[1]);assert.ok(known.length);assert.deepEqual(known,[...known].sort());
  await row.locator('[data-collection-search]').fill('How Great Is Our God');await page.waitForFunction(id=>document.querySelector(`[data-collection="${id}"]`).querySelectorAll('.collection-song-title').length===1,pack.id);assert.match(await row.locator('.collection-song-title').textContent(),/How Great Is Our God/);
  await row.locator('[data-collection-depth]').selectOption('standards');assert.equal(await row.locator('[data-collection-depth]').inputValue(),'standards');assert.equal(await page.locator('#collection-depth').inputValue(),'all','Per-collection depth does not overwrite defaults');assert.equal(await row.locator('.collection-subtitle').textContent(),'Artists · Standards');
  await row.locator('[data-collection-search]').fill('');await row.locator('.collection-song-title').nth(1).waitFor();
  await page.locator('#collection-depth').selectOption('essentials');assert.equal(await row.locator('[data-collection-depth]').inputValue(),'standards','Explicit collection settings survive a default-depth change');assert.equal(await row.locator('[data-collection-sort]').inputValue(),'oldest');await page.locator('#collection-depth').selectOption('all');
  await row.locator('.collection-portrait img').first().waitFor();assert.ok(await row.locator('.portrait-credit a').count());assert.ok(requests.every(title=>!title.includes('How Great Is Our God')),'Only fixed public artist identities go to portrait APIs');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/faithful-collections-mobile.png',fullPage:true});await page.screenshot({path:'/tmp/faithful-collections-mobile-viewport.png'});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/faithful-collections-desktop.png',fullPage:true});await row.locator('summary').first().scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/faithful-collections-desktop-viewport.png'});
  await page.locator('.nav-item[data-view="plans"]').click();await page.getByRole('button',{name:'Add songs',exact:true}).click();
  assert.equal(await page.locator('#picker-songs input[type="checkbox"]').count(),100,'Large libraries render one bounded page at a time');
  await page.locator('#picker-songs input[type="checkbox"]').first().check();await page.locator('#picker-next').click();assert.match(await page.locator('#picker-count').textContent(),/^1 selected/);await page.locator('#picker-previous').click();assert.equal(await page.locator('#picker-songs input[type="checkbox"]').first().isChecked(),true);
  await page.evaluate(()=>window.fixturePickerInput=document.querySelector('#picker-search'));await page.locator('#picker-search').pressSequentially('How Great Is Our God',{delay:8});assert.ok(await page.evaluate(()=>window.fixturePickerInput===document.querySelector('#picker-search')));assert.ok(await page.locator('#picker-songs input[type="checkbox"]').count()<100);await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  assert.deepEqual(errors,[]);console.log('PASS: 2,044-record search input stability/IME, direct collection song lookup, per-collection search/depth, alphabetical and evidence-based sorts, attributed portrait loading and mobile layout. Search updates: '+times.map(value=>Math.round(value)+' ms').join(', '));
 }finally{await page.close();}
}
export async function checkRememberAndSaveFlows(browser,base) {
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const user={id:'00000000-0000-0000-0000-000000000075',email:'remember@fixture.test'},session={access_token:'fixture-access',refresh_token:'fixture-refresh',user};let workspace=stateFor(),version='2026-10-13T12:00:00.000Z',uploads=0;
 await page.addInitScript(({workspace,user})=>{sessionStorage.removeItem('faithful-guest-opt-in');if(sessionStorage.getItem('remember-fixture'))return;sessionStorage.setItem('remember-fixture','1');localStorage.removeItem('faithful-repertoire-session');localStorage.removeItem('faithful-repertoire-remember');localStorage.setItem('faithful-repertoire-user:'+user.id,JSON.stringify(workspace));},{workspace,user});
 await page.route('https://*.mzstatic.com/**',route=>route.abort());
 await page.route('https://*.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url());const answer=(value,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'},body:status===204?'':JSON.stringify(value)});
  if(request.method()==='OPTIONS')return answer(null,204);if(url.pathname.endsWith('/token'))return answer(session);if(url.pathname.endsWith('/user'))return answer(user);if(url.pathname.endsWith('/logout'))return answer(null,204);if(url.pathname.endsWith('/rpc/org_list'))return answer({organizations:[],invitations:[]});
  if(url.pathname.endsWith('/profiles'))return answer(request.method()==='GET'?[{profile:workspace.profile}]:null,request.method()==='GET'?200:204);
  if(url.pathname.endsWith('/workspaces')){if(request.method()==='GET')return answer([{workspace,updated_at:version}]);uploads++;await new Promise(resolve=>setTimeout(resolve,500));workspace=request.postDataJSON().workspace;version=new Date().toISOString();return answer([{updated_at:version}]);}
  throw new Error('Unexpected account fixture request: '+url.pathname);
 });
 try {
  await page.goto(base);await page.getByRole('heading',{name:'Sign in to keep your repertoire'}).waitFor();assert.equal(await page.locator('#remember-me').isChecked(),true);
  await page.locator('#login-email').fill(user.email);await page.getByRole('button',{name:'Use saved password',exact:true}).click();assert.equal(await page.locator('#login-password').evaluate(input=>input===document.activeElement),true);assert.equal(await page.locator('#login-password').getAttribute('autocomplete'),'current-password');
  await page.locator('#login-password').fill('Browser fixture password');await page.locator('#auth-form .primary').click();await page.getByRole('button',{name:'My account',exact:true}).waitFor();await page.locator('#account-save-strip[data-save-state="saved"]').waitFor();assert.notEqual(await page.locator('#account-save-strip').evaluate(node=>getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)','Saved status has a visible colored background');
  await page.locator('.song-title [data-action="inline-attribution"]').click();await page.locator('#inline-artist').fill('Human edited attribution');await page.locator('#account-save-strip[data-save-state="unsaved"]').waitFor();assert.match(await page.locator('#account-save-strip summary').textContent(),/Unsaved changes/);assert.notEqual(await page.locator('#account-save-strip').evaluate(node=>getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)','Unsaved status has a visible colored background');
  await page.locator('#inline-attribution-form button[type="submit"]').click();await page.locator('#account-save-strip[data-save-state="saving"]').waitFor();await page.locator('#account-save-strip[data-save-state="saved"]').waitFor();assert.ok(uploads);
  const signOut=async()=>{await page.getByRole('button',{name:'My account',exact:true}).click();await reveal(page,'button',{name:'Sign out',exact:true});await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('heading',{name:'Sign in to keep your repertoire'}).waitFor();};
  await signOut();assert.equal(await page.locator('#login-email').inputValue(),user.email);assert.equal(await page.locator('#login-password').inputValue(),'');assert.ok(await page.locator('#login-password').getAttribute('autofocus')!==null);
  await page.locator('#remember-me').uncheck();await page.locator('#login-password').fill('Tab fixture password');await page.locator('#auth-form .primary').click();await page.getByRole('button',{name:'My account',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('faithful-repertoire-session')),null);assert.ok(await page.evaluate(()=>sessionStorage.getItem('faithful-repertoire-session')));await page.reload();await page.getByRole('button',{name:'My account',exact:true}).waitFor();
  const other=await page.context().newPage();try{await other.goto(base);await other.getByRole('heading',{name:'Sign in to keep your repertoire'}).waitFor();assert.equal(await other.locator('#login-email').inputValue(),'');assert.equal(await other.locator('#remember-me').isChecked(),false);}finally{await other.close();}
  await signOut();assert.equal(await page.locator('#login-email').inputValue(),'');assert.equal(await page.locator('#remember-me').isChecked(),false);assert.deepEqual(errors,[]);
  console.log('PASS: colored unapplied/pending/saving/saved states, real queue transitions, remembered email, native password-manager focus, no stored passwords and tab-only opt-out/reload/new-tab isolation.');
 }finally{await context.close();}
}
