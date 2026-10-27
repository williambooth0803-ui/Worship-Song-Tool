import assert from 'node:assert/strict';
import {navigate} from './disclosure.mjs';
import {readFile} from 'node:fs/promises';

export async function checkLyricalEvaluationFlows(browser,base) {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')));
  const human=w=>{const copy=structuredClone(w);delete copy.evaluationHistory;return copy;};
  try{
    await page.goto(base);await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
    await page.evaluate(()=>{
      const w=JSON.parse(localStorage.getItem('hymn-heart-v1')),[a,b,hidden]=w.songs;
      w.profile.aiMode='full';w.profile.setupComplete=true;a.review.notes='Human note to preserve';hidden.blacklisted=true;
      a.metadata={...a.metadata,lyrics:'Private opted-in words'};
      w.libraries=[{id:'only-library',name:'Selected library',songIds:[a.id]}];
      w.plans=[{id:'lyrical-plan',title:'Original plan context',date:'',theme:'Grace',passage:'Psalm 46',status:'draft',items:[a,a,b].map((s,i)=>({id:'lyric-item-'+i,type:'song',songId:s.id,key:'',role:'',notes:'Human item note',minutes:4}))}];
      localStorage.setItem('hymn-heart-v1',JSON.stringify(w));
    });
    await page.reload();await navigate(page,'plans');const before=await state(),a=before.songs[0],b=before.songs[1];
    await page.getByRole('button',{name:'Evaluate plan',exact:true}).click();
    assert.equal(await page.getByLabel('Recorded tempo and timing',{exact:true}).isChecked(),false);
    assert.equal(await page.getByLabel('Congregational participation',{exact:true}).isChecked(),false);
    await page.locator('#scope-words').check();await page.locator('#prepare-scope-evaluation').click();
    const request=await page.locator('#scope-request').inputValue(),snapshot=JSON.parse(request.split('Selected snapshot (reviewed by the user before copying):\n')[1]);
    assert.equal('tempo' in snapshot.songs[0],false);assert.equal('key' in snapshot.scopes[0].items[0],false);assert.equal('minutes' in snapshot.scopes[0].items[0],false);
    const response=JSON.parse(request.split('Response shape:\n')[1].split('\nSelected snapshot')[0]);
    response.summary='Overlapping ideas from verified fixture sections.';
    for(const song of response.songs){song.evidence='Synthetic fixture evidence.';if(song.id!==a.id)continue;
      song.textStatus='complete';song.sections=[
        {id:'verse',label:'Verse 1',lineCount:4,repetitions:null,repeatEvidence:'',ideas:[{criterionId:'function',category:'confession',lineCount:1,evidence:'One substantive confession line.'},{criterionId:'voice',category:'individual',lineCount:4,evidence:'Singular grammar.'}]},
        {id:'chorus',label:'Chorus',lineCount:2,repetitions:null,repeatEvidence:'',ideas:[{criterionId:'themes',category:'hope',lineCount:2,evidence:'Hope expressed throughout.'},{criterionId:'voice',category:'corporate',lineCount:2,evidence:'Plural grammar.'}]}
      ];
    }
    for(const criterion of response.criteria){for(const finding of criterion.findings)finding.observation='Text-based fixture finding.';criterion.coverage.explanation='One plan; no library comparison.';}
    await page.locator('#audit-json').fill(JSON.stringify(response));await page.locator('#preview-scope-evaluation').click();
    assert.equal(await page.locator('#scope-error').textContent(),'');assert.equal(await page.locator('meter,.audit-bar-row').count(),0);
    assert.equal((await state()).evaluationHistory.length,1);assert.ok(!(await state()).evaluationHistory[0].data.includes('Private opted-in words'));
    assert.deepEqual(human(await state()),human(before));
    const hope=page.locator('.idea-table tbody tr').filter({hasText:'hope'}).first();assert.match(await hope.locator('td').nth(1).textContent(),/33\.3%/);
    const confession=page.locator('.idea-table tbody tr').filter({hasText:'confession'}).first();assert.match(await confession.locator('td').first().textContent(),/1\/2/);
    await page.locator('.repetition-editor > summary').first().click();
    const chorus=page.locator('input[aria-label$="/ Chorus repetitions"]').first();await chorus.fill('3');await chorus.dispatchEvent('change');
    assert.match(await hope.locator('td').nth(1).textContent(),/50%/);assert.match(await confession.locator('td').first().textContent(),/1\/2/);
    await page.locator('#save-scope-evaluation').click();assert.equal((await state()).evaluationHistory.length,2);
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:900});await page.locator('.evaluation-dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);
      const header=await page.locator('.evaluation-dialog-header').boundingBox(),close=await page.getByRole('button',{name:'Close evaluation',exact:true}).boundingBox(),bounds=await page.locator('#dialog').boundingBox();
      assert.ok(close.height>=44&&close.y>=bounds.y&&close.y+close.height<=header.y+header.height+1,'Close remains in its own fixed header');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.ok(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));
      await page.screenshot({path:`/tmp/faithful-lyrical-report-${width}.png`,fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});await page.locator('.lyrical-overview').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/faithful-idea-map-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:900});await page.locator('.lyrical-overview').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/faithful-idea-map-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'Close evaluation',exact:true}).click();
    await page.evaluate(()=>{const w=JSON.parse(localStorage.getItem('hymn-heart-v1'));w.plans[0].title='Plan renamed later';localStorage.setItem('hymn-heart-v1',JSON.stringify(w));});
    await page.reload();await navigate(page,'plans');await page.getByRole('button',{name:'Evaluation History',exact:true}).click();
    assert.equal(await page.locator('[data-open-evaluation]').count(),2);await page.locator('[data-open-evaluation]').first().click();
    await page.locator('.evaluation-cohort > summary').filter({hasText:'Original plan context'}).waitFor();assert.equal(await page.locator('[data-repeat-key]').count(),0,'Saved reports are immutable views');
    const downloading=page.waitForEvent('download');await page.locator('#download-scope-evaluation').click();const file=await downloading;
    const saved=JSON.parse(await readFile(await file.path(),'utf8'));assert.ok(Object.values(saved.repeats).includes(3));assert.equal(saved.snapshot.scopes[0].name,'Original plan context');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#dialog').isVisible(),false);
    // Picker changes are staged until Add; cancel preserves everything.
    const prePicker=await state();await page.getByRole('button',{name:'Add songs',exact:true}).click();
    await page.getByRole('tab',{name:'New song',exact:true}).click();await page.locator('#picker-create-form [name="title"]').fill('Canceled draft');await page.getByRole('button',{name:'Select new song',exact:true}).click();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual(await state(),prePicker);
    await page.getByRole('button',{name:'Add songs',exact:true}).click();
    await page.locator(`#picker-songs input[value="${a.id}"]`).check();
    await page.getByRole('tab',{name:'All songs',exact:true}).click();await page.getByRole('searchbox',{name:'Find library songs',exact:true}).fill(b.title);await page.locator(`#picker-songs input[value="${b.id}"]`).check();
    const catalog=await page.evaluate(async()=>{const {allCatalogSongs}=await import(new URL('catalog.js',location.href));const w=JSON.parse(localStorage.getItem('hymn-heart-v1'));return allCatalogSongs.find(s=>!w.songs.some(p=>p.id===s.id||p.title===s.title&&p.author===s.author));});
    await page.getByRole('searchbox',{name:'Find library songs',exact:true}).fill(catalog.title);await page.locator(`#picker-songs input[value="${catalog.id}"]`).check();
    await page.getByRole('tab',{name:'New song',exact:true}).click();
    await page.locator('#picker-create-form [name="title"]').fill('Human-created plan song');await page.locator('#picker-create-form [name="author"]').fill('Our writer');await page.locator('#picker-create-form [name="minutes"]').fill('3.5');await page.locator('#picker-create-form [name="key"]').fill('C');await page.getByRole('button',{name:'Select new song',exact:true}).click();
    assert.equal(await page.locator('#picker-add').textContent(),'Add 4 songs to plan');assert.deepEqual(await state(),prePicker);
    await page.getByLabel('Add after',{exact:true}).selectOption('lyric-item-0');await page.locator('#picker-add').click();
    const after=await state(),newSong=after.songs.find(s=>s.title==='Human-created plan song');
    assert.ok(newSong);assert.equal(newSong.review.status,'unreviewed');assert.deepEqual(after.plans[0].items.slice(1,5).map(i=>i.songId),[a.id,b.id,catalog.id,newSong.id]);assert.equal(after.plans[0].items[4].minutes,3.5);
    assert.ok(!after.libraries.some(l=>l.songIds.includes(newSong.id)));assert.equal(after.songs.length,prePicker.songs.length+2);assert.deepEqual(after.evaluationHistory,prePicker.evaluationHistory);assert.equal(after.songs[0].review.notes,'Human note to preserve');
    await page.reload();await navigate(page,'plans');assert.equal((await state()).plans[0].items.length,7);
    // Existing AI visibility applies to retained evaluation reports as well.
    await page.evaluate(()=>{const w=JSON.parse(localStorage.getItem('hymn-heart-v1'));w.profile.aiMode='manual';localStorage.setItem('hymn-heart-v1',JSON.stringify(w));});
    await page.reload();await navigate(page,'plans');assert.equal(await page.getByRole('button',{name:'Evaluation History',exact:true}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: words-first selection, overlapping section ideas, one-line coverage, weighted repeats, durable immutable evaluation history/download, four responsive close controls, staged library/catalog/new-song selection, cancellation, atomic insertion, reload and AI visibility.');
  }finally{await page.close();}
}
