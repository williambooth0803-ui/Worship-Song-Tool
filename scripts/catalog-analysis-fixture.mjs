import assert from 'node:assert/strict';
import {allCatalogSongs} from '../public/catalog.js';
import {catalogAnalysisData as data} from '../public/catalog-analysis-data.js';
import {chooseSong,navigate} from './disclosure.mjs';
export async function checkCatalogAnalysisFlows(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const song=allCatalogSongs.find(s=>s.id==='catalog-in-christ-alone');
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')));
 try{
  await page.goto(base);await chooseSong(page,song);
  await page.getByRole('tab',{name:'Evaluation',exact:true}).click();
  await page.locator('.primary-evaluation > summary').click();
  assert.equal(await page.locator('.primary-evaluation .catalog-analysis').count(),1,'Expanded content stays inside the AI evaluation');
  const report=page.locator('.primary-evaluation .catalog-analysis');
  assert.equal(await report.locator('.analysis-reasons dt').count(),3);
  assert.ok(await report.getByText('Lyrical reasoning and preliminary scores',{exact:true}).isVisible());
  assert.match(await report.textContent(),/incarnation/i);assert.match(await report.textContent(),/John 10:28/);
  assert.ok(await report.getByRole('link',{name:/source transcription/}).isVisible());
  const before=await stored();
  for(const width of [320,390,900,1440]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`/tmp/faithful-analysis-${width}.png`});
  }
  assert.deepEqual(await stored(),before,'Reading and layout changes never change saved judgments');
  await navigate(page,'evaluate');assert.match(await page.locator('.catalog-analysis-coverage').textContent(),new RegExp(data.coverage.reviewed+' expanded'));
  assert.equal(await page.locator('.workspace-tabs .button').count(),0,'Page tabs do not reuse action button styling');
  assert.equal(await page.locator('.workspace-tab.selected').evaluate(el=>getComputedStyle(el).borderBottomLeftRadius),'0px');
  await page.evaluate(()=>{
   const state=JSON.parse(localStorage.getItem('hymn-heart-v1'));state.profile.aiMode='manual';localStorage.setItem('hymn-heart-v1',JSON.stringify(state));
  });
  await page.reload();await chooseSong(page,song);await page.getByRole('tab',{name:'Evaluation',exact:true}).click();
  assert.equal(await page.locator('.catalog-analysis').count(),0,'Human-only mode hides catalog drafts');
  await page.evaluate(()=>{
   const state=JSON.parse(localStorage.getItem('hymn-heart-v1'));state.profile.aiMode='full';const song=state.songs.find(s=>s.id==='catalog-in-christ-alone');song.review.status='manual';song.review.notes='Human conviction remains primary';song.review.scores.accuracy=2;song.recordings=[];localStorage.setItem('hymn-heart-v1',JSON.stringify(state));
  });
  await page.reload();await chooseSong(page,song);await page.getByRole('tab',{name:'Evaluation',exact:true}).click();
  assert.match(await page.locator('.primary-evaluation > summary').textContent(),/Your evaluation/);
  assert.equal(await page.locator('.primary-evaluation .catalog-analysis').count(),0);
  await page.locator('.secondary-evaluation > summary').click();
  assert.equal(await page.locator('.secondary-evaluation .catalog-analysis').count(),1);
  const kept=(await stored()).songs.find(s=>s.id===song.id);assert.equal(kept.review.scores.accuracy,2);assert.deepEqual(kept.recordings,[]);
  assert.deepEqual(errors,[]);
  console.log('PASS: sourced catalog lyric reasons, Scripture excerpts, source links, distinct page tabs, four layouts, read-only browsing, human-only hiding and primary human conviction preservation.');
 }finally{await page.close();}
}
