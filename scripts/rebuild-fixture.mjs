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
  await page.locator('.workspace-tabs [data-view="evaluate"]').click();
  assert.equal(await page.getByRole('searchbox',{name:'Search songs',exact:true}).inputValue(),'Amazing Grace');
  assert.equal(await page.locator('.detail-panel').getAttribute('data-song-id'),selected);
  await reveal(page,'button',{name:'Generate AI evaluation',exact:true});
  await page.getByRole('button',{name:'Generate AI evaluation',exact:true}).click();
  const request=async()=>JSON.parse((await page.locator('#evaluation-prompt').inputValue()).match(/\{\n  "schema"[\s\S]*$/)[0]);
  const old=await request();
  old.review.summary='Chosen text and version assumption.';
  await page.locator('#evaluation-json').fill(JSON.stringify(old));
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
  console.log('PASS: public About without guest/storage activation, four primary routes, criteria context, text override invalidation/request binding and eight views at 320/390/900/1440px.');
}
