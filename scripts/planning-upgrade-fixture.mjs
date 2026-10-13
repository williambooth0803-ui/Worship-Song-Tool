import assert from 'node:assert/strict';
import {reveal} from './disclosure.mjs';
export async function checkPlanningUpgradeFlows(browser,base) {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')));
 try {
  await page.goto(base);await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
  const initial=await state(),ids=initial.songs.slice(0,2).map(s=>s.id);
  await page.evaluate(ids=>{const data=JSON.parse(localStorage.getItem('hymn-heart-v1'));data.libraries[0].songIds=ids;localStorage.setItem('hymn-heart-v1',JSON.stringify(data));},ids);await page.reload();
  const attribution=page.locator('.song-title [data-action="inline-attribution"]');await attribution.click();
  const input=page.locator('#inline-artist');await input.fill('My attribution <script>unsafe()</script>');await page.locator('#inline-attribution-form button[type="submit"]').click();
  assert.equal((await state()).songs[0].author,'My attribution <script>unsafe()</script>');assert.equal(await page.locator('.song-title script').count(),0);assert.equal(await page.locator('.song-options [data-action="edit-fact"]').count(),0);
  await page.getByRole('tab',{name:'Outside links',exact:true}).click();assert.ok(await page.getByRole('link',{name:'Find hymn on Hymnary ↗',exact:true}).isVisible());
  assert.equal(new URL(await page.getByRole('link',{name:'Find hymn on Hymnary ↗',exact:true}).getAttribute('href')).hostname,'hymnary.org');
  await page.locator('.nav-item[data-view="plans"]').click();await page.getByRole('button',{name:'+ New plan',exact:true}).click();await page.getByLabel('Plan name',{exact:true}).fill('Visual order');await page.locator('#plan-form .primary').click();
  await page.getByRole('button',{name:'Add songs',exact:true}).click();assert.equal(await page.getByLabel('Add after',{exact:true}).count(),0,'An empty plan has no placement question');
  const checks=page.locator('#picker-songs input[type="checkbox"]');assert.equal(await checks.count(),2);await checks.nth(0).check();await checks.nth(1).check();assert.equal(await page.locator('#picker-add').textContent(),'Add 2 songs to plan');await page.locator('#picker-add').click();
  assert.equal(await page.getByRole('heading',{name:'Plans',exact:true}).isVisible(),true);assert.deepEqual((await state()).plans[0].items.map(i=>i.songId),ids);
  await page.getByRole('button',{name:'Add heading',exact:true}).click();await page.getByLabel('Heading',{exact:true}).fill('Gathering');assert.equal(await page.getByLabel('Duration (minutes)',{exact:true}).count(),0);await page.getByLabel('Add after',{exact:true}).selectOption('__start__');await page.locator('#item-form .primary').click();
  let plan=(await state()).plans[0];assert.equal(plan.items[0].type,'heading');assert.equal(plan.items[0].minutes,0);assert.equal(await page.getByLabel('Place in the service',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Add item',exact:true}).click();await page.getByLabel('Item title',{exact:true}).fill('Scripture');await page.getByLabel('Duration (minutes)',{exact:true}).fill('2');await page.getByLabel('Notes',{exact:true}).fill('Psalm 46');await page.locator('#item-form .primary').click();
  const itemRows=page.locator('.service-items > li');const lastId=await itemRows.last().getAttribute('data-plan-item');const target=await itemRows.first().boundingBox();await itemRows.last().dragTo(itemRows.first(),{targetPosition:{x:target.width/2,y:5}});
  plan=(await state()).plans[0];assert.equal(plan.items[0].id,lastId,'Dragging changes the stored order');
  await page.screenshot({path:'/tmp/faithful-plan-headings-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Import plan',exact:true}).click();const before=(await state()).plans.length;
  const song=(await state()).songs.find(s=>s.id===ids[1]);
  const json={schema:'faithful-plan-v1',title:'Source PDF plan',date:'2026-10-13',source:'Planning Center screenshot',uncertainties:[],items:[{type:'heading',title:'Response',minutes:0},{type:'song',title:song.title,artist:song.author,songId:song.id,minutes:4},{type:'other',title:'Closing prayer',minutes:1,notes:'From original order'}]};
  await page.locator('#plan-import-json').fill(JSON.stringify(json));await page.locator('#import-plan-now').click();assert.equal((await state()).plans.length,before+1);assert.equal(await page.locator('#plan-import-review').innerHTML(),'','Certain imports have no additional confirmation');assert.equal(await page.locator('#dialog').isVisible(),false);
  await page.getByRole('button',{name:'Import plan',exact:true}).click();json.title='Uncertain screenshot';json.items[1].minutes=null;json.items[1].uncertainty='Timing unreadable';await page.locator('#plan-import-json').fill(JSON.stringify(json));await page.locator('#import-plan-now').click();assert.equal((await state()).plans.length,before+1);assert.ok(await page.getByText('Check uncertain items',{exact:true}).isVisible());
  await page.locator('[data-resolve-minutes="1"]').fill('3.5');await page.locator('#confirm-plan-interpretation').check();await page.locator('#import-plan-now').click();assert.equal((await state()).plans.length,before+2);assert.equal((await state()).plans.at(-1).items[1].minutes,3.5);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Add songs',exact:true}).click();assert.ok(await page.getByLabel('Choose a library',{exact:true}).isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/faithful-plan-picker-mobile.png',fullPage:true});await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.reload();await page.locator('.nav-item[data-view="plans"]').click();assert.equal((await state()).plans.length,before+2);assert.ok((await state()).plans.some(p=>p.items.some(i=>i.type==='heading')));assert.deepEqual(errors,[]);
  console.log('PASS: inline attribution, Hymnary searches, in-place multi-song library picker, no empty-plan placement prompt, headings, drag ordering, certain/uncertain screenshot JSON imports, preserved plans and mobile layout.');
 }finally{await page.close();}
}
