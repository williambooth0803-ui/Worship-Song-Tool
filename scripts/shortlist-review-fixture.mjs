import assert from 'node:assert/strict';
import {shortlistEntries} from '../public/shortlist-data.js';
import {reviewStore,emptyReview,setReviewDecision} from '../public/shortlist-review.js';

export async function checkShortlistReviewFlows(browser,base) {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const marker=JSON.stringify({songs:[{id:'private-marker'}],libraries:['private'],plans:['private']});
  await page.addInitScript(({reviewStore,marker})=>{
    if(!sessionStorage.getItem('shortlist-fixture')){localStorage.removeItem(reviewStore);localStorage.removeItem(reviewStore+'-ai');localStorage.setItem('hymn-heart-v1',marker);sessionStorage.setItem('shortlist-fixture','1');}
  },{reviewStore,marker});
  const card=page.locator('#review-card'),read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),reviewStore);
  try {
    await page.goto(base+'review.html');await card.getByRole('heading',{name:'Speechless',exact:true}).waitFor();
    assert.match(await page.locator('#review-counts').textContent(),/143 \/ 150 decided/);
    assert.match(await page.locator('.review-rating').textContent(),/Highly rated.*8\.6/);
    assert.equal(await page.locator('#review-filter').inputValue(),'later');
    await page.getByRole('button',{name:'Show evaluation',exact:true}).click();
    assert.equal(await card.locator('.analysis-reasons dt').count(),3);
    assert.ok(await card.getByRole('link',{name:/Find lyrics/}).isVisible());
    await page.locator('#review-note').fill('My note survives a reload.');
    await page.locator('#review-note').press('k');
    assert.match(await page.locator('#review-note').inputValue(),/reload\.k/,'Typing a shortcut letter in notes does not decide');
    await page.locator('#review-note').fill('My note survives a reload.');
    await card.getByRole('button',{name:/^Keep/}).click();
    assert.equal((await read()).decisions[shortlistEntries[1].id].choice,'keep');
    await card.getByRole('heading').focus();await page.keyboard.press('r');
    assert.equal((await read()).decisions[shortlistEntries[15].id].choice,'remove');
    await page.locator('#review-note').fill('A note on the next card.');
    await page.getByRole('button',{name:'Undo last choice'}).click();
    assert.equal((await read()).decisions[shortlistEntries[15].id].choice,'later');
    assert.equal((await read()).decisions[shortlistEntries[16].id].note,'A note on the next card.');
    await page.reload();await card.getByRole('heading').waitFor();
    assert.equal((await read()).decisions[shortlistEntries[1].id].note,'My note survives a reload.');
    await page.locator('#review-filter').selectOption('all');
    await page.getByRole('searchbox',{name:'Find a song'}).fill('Cinderella');
    await card.getByRole('heading',{name:'Cinderella',exact:true}).waitFor();
    assert.match(await card.textContent(),/Retired default/);assert.match(await page.locator('.review-rating').textContent(),/Last listed.*6\.1/);
    await page.locator('#review-high').check();assert.ok(await card.getByRole('heading',{name:'No matching songs'}).isVisible());
    await page.locator('#review-ai').uncheck();
    assert.equal(await page.locator('.review-rating').count(),0);assert.equal(await card.locator('.catalog-analysis').count(),0);
    assert.ok(await page.locator('#review-high').isDisabled());
    await page.getByRole('searchbox',{name:'Find a song'}).fill('Speechless');
    await page.locator('#review-ai').check();
    for(const width of [1440,900,390,320]){
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow at '+width);
      assert.ok(await card.getByRole('button',{name:/^Keep/}).isVisible());
    }
    await page.locator('.review-results > summary').click();
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download backup',exact:true}).click();
    const download=await downloadPromise;assert.equal(download.suggestedFilename(),'faithful-150-review.json');
    await page.locator('#review-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"songs":[]}')});
    await page.waitForFunction(()=>document.querySelector('#review-message').textContent.includes('Could not restore'));
    assert.match(await page.locator('#review-message').textContent(),/Could not restore/);
    assert.equal((await read()).decisions[shortlistEntries[1].id].choice,'keep');
    const incoming=setReviewDecision(emptyReview(),shortlistEntries[1].id,'later','Imported later choice','2099-01-01T00:00:00Z');
    await page.locator('#review-import').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
    await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).decisions[id].note==='Imported later choice',{key:reviewStore,id:shortlistEntries[1].id});
    assert.equal((await read()).decisions[shortlistEntries[1].id].note,'Imported later choice');
    assert.equal(await page.evaluate(()=>localStorage.getItem('hymn-heart-v1')),marker,'No private workspace reads or writes');
    assert.deepEqual(errors,[]);
    const unavailable=await browser.newPage();
    await unavailable.addInitScript(key=>{const save=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Storage full','QuotaExceededError');return save.call(this,name,value);};},reviewStore);
    try{
      await unavailable.goto(base+'review.html');await unavailable.locator('#review-card h2').waitFor();
      await unavailable.locator('[data-choice="keep"]').click();
      assert.match(await unavailable.locator('#review-counts').textContent(),/144 \/ 150/);
      assert.match(await unavailable.locator('#review-save').textContent(),/before leaving/);
    }finally{await unavailable.close();}
    const corrupt=await browser.newPage();
    await corrupt.addInitScript(key=>localStorage.setItem(key,'unreadable preserved copy'),reviewStore);
    try{
      await corrupt.goto(base+'review.html');await corrupt.locator('#review-card h2').waitFor();
      await corrupt.locator('[data-choice="keep"]').click();
      assert.equal(await corrupt.evaluate(key=>localStorage.getItem(key),reviewStore),'unreadable preserved copy');
      assert.match(await corrupt.locator('#review-save').textContent(),/copy is preserved/);
    }finally{await corrupt.close();}
    console.log('PASS: shortlist baseline, deferred cards, high-rating flags, evaluations, notes, keyboard choices, undo, reload, retired records, AI hiding, mobile, backups and workspace preservation.');
  }finally{await page.close();}
}
