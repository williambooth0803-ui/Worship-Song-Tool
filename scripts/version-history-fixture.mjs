import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {navigate} from './disclosure.mjs';

export async function checkVersionHistoryFlows(browser,base) {
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(base);await page.getByRole('heading',{name:'Discover songs'}).waitFor();
    // Real IndexedDB: isolated storage keys, immutable capture, throttling,
    // retention, serialized writes, and an unavailable-storage failure.
    await page.evaluate(async()=>{
      const {VersionHistory}=await import('./version-history.js');
      const workspace=JSON.parse(localStorage.getItem('hymn-heart-v1'));
      let now=1000;
      const history=new VersionHistory({now:()=>now});
      const first=history.capture('fixture:first',workspace);workspace.libraries[0].name='Changed after capture';
      const id=await first;
      if((await history.get('fixture:first',id)).workspace.libraries[0].name==='Changed after capture')throw new Error('Snapshot mutated');
      if((await history.list('fixture:second')).length)throw new Error('History crossed workspace keys');
      now+=1000;await history.capture('fixture:first',workspace);
      if((await history.list('fixture:first')).length!==1)throw new Error('Automatic checkpoint was not throttled');
      now+=300_000;await history.capture('fixture:first',workspace);
      if((await history.list('fixture:first')).length!==2)throw new Error('Later automatic checkpoint was skipped');
      for(let i=0;i<33;i++){now++;await history.capture('fixture:retention',workspace,{force:true,label:'Saved '+i});}
      const retained=await history.list('fixture:retention');
      if(retained.length!==30 || retained[0].label!=='Saved 32')throw new Error('History retention failed');
      await Promise.all([history.capture('fixture:retention',workspace,{force:true}),new VersionHistory({now:()=>now+1}).capture('fixture:retention',workspace,{force:true})]);
      if((await history.list('fixture:retention')).length!==30)throw new Error('Concurrent writers exceeded retention');
      let failed=false;try{await new VersionHistory({indexedDB:null}).capture('fixture:blocked',workspace,{force:true});}catch{failed=true;}
      if(!failed)throw new Error('Unavailable history did not report failure');
    });
    await navigate(page,'settings');await page.getByRole('switch',{name:'AI labels',exact:true}).click();await page.getByRole('button',{name:'Version history',exact:true}).click();
    await page.locator('#version-name').fill('Before library edits');await page.locator('#history-save').click();
    await page.locator('.history-row').filter({hasText:'Before library edits'}).waitFor();
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    await navigate(page,'library');await page.getByRole('button',{name:'+ New library',exact:true}).click();
    await page.getByLabel('Library name',{exact:true}).fill('Christmas rehearsal');await page.getByRole('button',{name:'Create library',exact:true}).click();
    await navigate(page,'profile');await page.getByLabel('AI content preference',{exact:true}).selectOption('manual');await page.getByRole('button',{name:'Save evaluation criteria',exact:true}).click();
    await page.reload();await navigate(page,'settings');await page.getByRole('button',{name:'Version history',exact:true}).click();
    await page.locator('.history-row').filter({hasText:'Automatic checkpoint'}).first().waitFor();
    await page.locator('.history-row').filter({hasText:'Before library edits'}).getByRole('button').click();
    await page.getByRole('heading',{name:'Preview this version',exact:true}).waitFor();
    const libraries=page.locator('.history-comparison tbody tr').filter({has:page.getByRole('rowheader',{name:'Libraries',exact:true})});
    assert.equal(await libraries.locator('td').last().textContent(),'1','Restore preview reports the removed library');
    const downloading=page.waitForEvent('download');await page.locator('#history-download').click();
    const downloaded=JSON.parse(await readFile(await (await downloading).path(),'utf8'));
    assert.ok(!downloaded.libraries.some(row=>row.name==='Christmas rehearsal'));
    await page.locator('#history-confirm').click();await page.locator('#history-cancel').click();
    assert.ok(await page.locator('#history-confirmation').isHidden());
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')).libraries.some(row=>row.name==='Christmas rehearsal')),'Cancel preserves the current workspace');
    await page.screenshot({path:'/tmp/faithful-history-preview-mobile.png'});
    await page.evaluate(async()=>{
      const {VersionHistory}=await import('./version-history.js'),capture=VersionHistory.prototype.capture;
      VersionHistory.prototype.capture=function(...args){
        if(args[2]?.label!=='Before restoring a version')return capture.apply(this,args);
        return new Promise((resolve,reject)=>{window.releaseRecoveryCheckpoint=()=>{VersionHistory.prototype.capture=capture;capture.apply(this,args).then(resolve,reject);};});
      };
    });
    await page.locator('#history-confirm').click();await page.locator('#history-restore').click();
    await page.waitForFunction(()=>Boolean(window.releaseRecoveryCheckpoint));
    assert.equal(await page.locator('#history-restore').textContent(),'Restoring…');
    assert.ok(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;}),'Reload is guarded while recovery is pending');
    assert.ok(await page.evaluate(()=>{const event=new Event('cancel',{cancelable:true});document.querySelector('#dialog').dispatchEvent(event);return event.defaultPrevented;}),'Escape cannot dismiss a running restore');
    await page.evaluate(()=>window.releaseRecoveryCheckpoint());
    await page.locator('#dialog').waitFor({state:'hidden'});
    assert.ok(!await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')).libraries.some(row=>row.name==='Christmas rehearsal')));
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')).profile.aiMode),'manual','Restoring old data keeps human-only visibility');
    await page.reload();await navigate(page,'settings');await page.getByRole('button',{name:'Version history',exact:true}).click();
    await page.locator('.history-row').filter({hasText:'Before restoring a version'}).getByRole('button').click();
    await page.locator('#history-confirm').click();await page.locator('#history-restore').click();
    await page.locator('#dialog').waitFor({state:'hidden'});
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')).libraries.some(row=>row.name==='Christmas rehearsal')),'Recovery version restores the workspace replaced by the first restore');
    // A stale browser preview cannot overwrite an edit from another tab.
    await navigate(page,'settings');await page.getByRole('button',{name:'Version history',exact:true}).click();
    await page.locator('.history-row').filter({hasText:'Before library edits'}).getByRole('button').click();
    await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('hymn-heart-v1'));state.libraries.push({id:'other-tab',name:'Another current library',songIds:[]});localStorage.setItem('hymn-heart-v1',JSON.stringify(state));});
    await page.locator('#history-confirm').click();await page.locator('#history-restore').click();
    await page.getByText('Another tab changed this workspace.',{exact:false}).waitFor();
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')).libraries.some(row=>row.id==='other-tab')));
    await page.evaluate(()=>document.querySelector('#dialog').close());await page.reload();
    for(const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:950});
      for(const view of ['discover','collections','evaluate','index','profile','library','blacklist','plans','settings']) {
        await navigate(page,view);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${view} overflow at ${width}`);
        const alignment=await page.locator('.lens-switch').evaluate(label=>{
          const text=label.querySelector('span').getBoundingClientRect(),select=label.querySelector('select').getBoundingClientRect();
          return {difference:Math.abs(text.y+text.height/2-select.y-select.height/2),selectHeight:select.height,labelHeight:text.height};
        });
        assert.ok(alignment.difference<2,`Lens label is not centered at ${width}`);assert.ok(alignment.selectHeight>=44);assert.ok(alignment.labelHeight<25,'Lens label must not wrap');
        if(width<=600)for(const tab of await page.locator('.workspace-tab').all())assert.ok(await tab.evaluate(el=>el.getBoundingClientRect().right<=innerWidth),'Every workspace tab fits on a phone');
      }
      await page.getByRole('button',{name:'Version history',exact:true}).click();await page.locator('#history-save').waitFor();
      assert.ok(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),`History overflow at ${width}`);
      await page.screenshot({path:`/tmp/faithful-history-list-${width}.png`});await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: real IndexedDB history isolation/throttling/retention, immutable checkpoints, named/automatic snapshots, preview/download/cancel/restore/recovery/reload and ten screens with centered 44px lens controls at five widths.');
  }finally{await page.close();}
}
