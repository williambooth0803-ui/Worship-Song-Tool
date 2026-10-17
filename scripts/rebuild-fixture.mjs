import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {navigate,reveal} from './disclosure.mjs';

export async function checkRebuildFlows(browser,base) {
  // New context deliberately has no guest opt-in or account session.
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('https://www.wikidata.org/**',route=>route.fulfill({contentType:'application/json',body:'{"entities":{}}'}));
  await context.route('https://*.mzstatic.com/**',route=>route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'#about');
  await page.getByRole('heading',{name:'About Faithful Repertoire',exact:true}).waitFor();
  assert.match(await page.locator('main').textContent(),/Baylor University/);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('faithful-guest-opt-in')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hymn-heart-v1')),null);
  await page.reload();
  await page.getByRole('heading',{name:'About the Developer'}).waitFor();
  await page.getByRole('button',{name:'Return to sign in',exact:true}).click();
  await page.getByRole('heading',{name:'Sign in to keep your repertoire'}).waitFor();
  await reveal(page,'button',{name:'Use browser-only workspace',exact:true});
  await page.getByRole('button',{name:'Use browser-only workspace',exact:true}).click();
  assert.deepEqual(await page.locator('.sidebar .nav-label').allTextContents(),['Discover','Evaluate','Libraries','Plans']);
  await navigate(page,'evaluate');
  await page.getByRole('searchbox',{name:'Search songs',exact:true}).fill('Amazing Grace');
  await page.waitForTimeout(120);
  await page.locator('.song-card').first().click();
  const selected=await page.locator('.detail-panel').getAttribute('data-song-id');
  await page.locator('.workspace-tabs [data-view="profile"]').click();
  await page.getByRole('heading',{name:'Evaluation criteria',exact:true}).waitFor();
  const principles=page.locator('#profile-form textarea[name="principles"]');
  const savedPrinciples=await principles.inputValue();
  await principles.fill(savedPrinciples+' Unsaved criteria fixture.');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('.workspace-tabs [data-view="evaluate"]').click();
  assert.equal(await principles.inputValue(),savedPrinciples+' Unsaved criteria fixture.','Cancel retains the edited criteria');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.workspace-tabs [data-view="evaluate"]').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')).profile.principles),savedPrinciples,'Discard does not save form edits');
  assert.equal(await page.getByRole('searchbox',{name:'Search songs',exact:true}).inputValue(),'Amazing Grace');
  assert.equal(await page.locator('.detail-panel').getAttribute('data-song-id'),selected);
  await reveal(page,'button',{name:'Generate AI evaluation',exact:true});
  await page.getByRole('button',{name:'Generate AI evaluation',exact:true}).click();
  const request=async()=>JSON.parse((await page.locator('#evaluation-prompt').inputValue()).match(/\{\n  "schema"[\s\S]*$/)[0]);
  const old=await request();
  old.review.summary='Chosen text and version assumption.';
  await page.locator('#evaluation-json').fill(JSON.stringify(old));
  assert.equal(await page.locator('#account-save-strip').getAttribute('data-save-state'),'unsaved');
  await page.getByRole('button',{name:'Preview evaluation',exact:true}).click();
  assert.equal(await page.locator('#apply-evaluation').count(),1);
  await page.locator('#evaluation-text-override').fill('Alternate text explicitly selected by the human');
  assert.equal(await page.locator('#evaluation-json').inputValue(),'');
  assert.equal(await page.locator('#apply-evaluation').count(),0);
  await page.locator('#evaluation-json').fill(JSON.stringify(old));
  await page.getByRole('button',{name:'Preview evaluation',exact:true}).click();
  assert.match(await page.locator('#evaluation-error').textContent(),/older text\/version/);
  const fresh=await request();
  fresh.review.summary='Selected alternate text, with uncertain arrangement.';
  await page.locator('#evaluation-json').fill(JSON.stringify(fresh));
  await page.getByRole('button',{name:'Preview evaluation',exact:true}).click();
  await page.getByRole('button',{name:'Apply evaluation',exact:true}).click();
  assert.equal(await page.locator('dialog').isVisible(),false);
  const hiddenTitle=await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('hymn-heart-v1'));
    const hidden=state.songs[0],visible=state.songs[1]; hidden.blacklisted=true;
    state.libraries[0].songIds=[visible.id];
    state.plans=[{id:'history',title:'Historical fixture',date:'2026-10-17',theme:'',passage:'',status:'draft',items:[
      {id:'heading',type:'heading',title:'Gathering',minutes:0,role:'',notes:''},
      {id:'excluded',type:'song',songId:hidden.id,title:hidden.title,minutes:4,key:'',role:'',notes:'Preserved privately'},
      {id:'prayer',type:'other',title:'Prayer',minutes:2,role:'',notes:''}
    ]}];
    localStorage.setItem('hymn-heart-v1',JSON.stringify(state));return hidden.title;
  });
  await page.reload();await navigate(page,'plans');
  assert.deepEqual(await page.locator('.service-items .item-number').allTextContents(),['','01','02']);
  assert.ok(!(await page.locator('.plan-sheet').textContent()).includes(hiddenTitle));
  await page.getByRole('button',{name:'Add songs',exact:true}).click();
  assert.ok(!(await page.getByLabel('Add after',{exact:true}).textContent()).includes(hiddenTitle));
  await page.getByLabel('Find library songs',{exact:true}).fill('no match');
  assert.equal(await page.locator('#account-save-strip').getAttribute('data-save-state'),'saved','Picker search is not an edit');
  await page.getByLabel('Find library songs',{exact:true}).fill('');
  await page.locator('#picker-songs input').first().check();
  assert.equal(await page.locator('#account-save-strip').getAttribute('data-save-state'),'unsaved');
  await page.locator('#picker-songs input').first().uncheck();
  assert.equal(await page.locator('#account-save-strip').getAttribute('data-save-state'),'saved');
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.locator('.plan-toolbar .more-menu summary').click();
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export importable JSON',exact:true}).click();
  const downloaded=await downloading;
  const exported=JSON.parse(await readFile(await downloaded.path(),'utf8'));
  assert.equal(exported.items[1].title,'Excluded song');
  assert.ok(!JSON.stringify(exported).includes(hiddenTitle));
  for(const width of [320,390,900,1440]) {
    await page.setViewportSize({width,height:900});
    for(const view of ['discover','collections','evaluate','profile','library','blacklist','plans','settings']) {
      await navigate(page,view);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${view} overflows at ${width}px`);
      assert.ok(await page.getByRole('button',{name:'Settings',exact:true}).isVisible());
      if (width < 551) for (const label of await page.locator('.sidebar .nav-label').all()) {
        assert.ok(await label.evaluate(el=>el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth), 'Every mobile label must fit');
      }
      await page.screenshot({path:`/tmp/faithful-rebuild-${width}-${view}.png`});
    }
  }
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS: public About without guest/storage activation, four primary routes, criteria context, text override invalidation/request binding and excluded insertion/export isolation, continuous heading numbering, picker search/selection dirty state and eight views at 320/390/900/1440px.');
}
