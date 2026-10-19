import assert from 'node:assert/strict';
import {navigate,chooseSong,reveal,keepAIIfOffered} from './disclosure.mjs';
import {catalogSongs,allCatalogSongs} from '../public/catalog.js';
export async function checkLensFlows(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')));
 try{
  await page.goto(base);
  await page.getByLabel('Analysis lens',{exact:true}).waitFor();
  await page.evaluate(()=>{const w=JSON.parse(localStorage.getItem('hymn-heart-v1'));w.profile.setupComplete=true;w.songs[0].review.status='manual';w.songs[0].review.notes='Keep my personal note';w.songs[0].review.scores={accuracy:10,substance:2,language:4,time:null};w.songs[0].recordings=[];w.libraries[0].songIds=[w.songs[0].id];w.plans=[{id:'lens-sunday',title:'Sunday service',date:'2026-10-18',theme:'Grace',passage:'Ephesians 2',status:'draft',items:[{id:'lens-song',type:'song',songId:w.songs[0].id,role:'Opening praise',key:'D',minutes:4,notes:'Human order'}]}];localStorage.setItem('hymn-heart-v1',JSON.stringify(w));});
  await page.reload();const before=await stored();
  await navigate(page,'profile');await page.getByRole('button',{name:'New lens',exact:true}).click();
  await page.locator('#new-lens-form [name=name]').fill('Prayer night');await page.locator('#new-lens-form [name=purpose]').fill('Small acoustic gathering');await page.locator('#new-lens-form button').click();
  assert.equal(await page.getByLabel('Analysis lens',{exact:true}).locator('option:checked').textContent(),'Prayer night');
  const form=page.locator('#profile-form');
  for(const [id,weight]of Object.entries({accuracy:0,substance:0,language:100,time:0}))await form.locator(`[data-criterion="${id}"] [name=criterion-weight]`).fill(String(weight));
  await form.getByRole('button',{name:'Save evaluation criteria',exact:true}).click();
  await chooseSong(page,catalogSongs[0]);await reveal(page,'button',{name:'Edit evaluation',exact:true});await page.getByRole('button',{name:'Edit evaluation',exact:true}).click();
  await page.locator('#review-form [name=score-language]').fill('9');await page.locator('#review-form').getByRole('button',{name:'Save evaluation',exact:true}).click();await keepAIIfOffered(page);
  let current=await stored();const prayerId=current.activeLensId;assert.equal(current.profile.weights.language,100);assert.equal(current.songs[0].review.scores.language,9);
  await page.getByLabel('Analysis lens',{exact:true}).selectOption('main');
  current=await stored();assert.equal(current.songs[0].review.scores.language,4);assert.equal(current.profile.weights.language,before.profile.weights.language);assert.equal(current.songs[0].review.notes,'Keep my personal note');assert.deepEqual(current.libraries,before.libraries);assert.deepEqual(current.plans,before.plans);assert.deepEqual(current.songs[0].recordings,[]);
  await page.getByLabel('Analysis lens',{exact:true}).selectOption(prayerId);await page.reload();current=await stored();assert.equal(current.activeLensId,prayerId);assert.equal(current.songs[0].review.scores.language,9);assert.equal(current.profile.evaluationPurpose,'Small acoustic gathering');
  await navigate(page,'profile');await page.locator('#profile-form [name=evaluationPurpose]').fill('Unsaved change');await page.getByLabel('Analysis lens',{exact:true}).selectOption('main');assert.equal(await page.getByLabel('Analysis lens',{exact:true}).inputValue(),prayerId);
  await page.locator('#profile-form').getByRole('button',{name:'Save evaluation criteria',exact:true}).click();
  for(const width of [320,390,900,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Lens controls fit ${width}px`);}
  await page.goto(base+'#about');await page.getByRole('heading',{name:'Recommended use',exact:true}).waitFor();assert.match(await page.locator('.recommended-use').textContent(),/last year's services/);assert.match(await page.locator('.recommended-use').textContent(),/youth, college, children and Sunday school/);
  assert.equal(allCatalogSongs.length,835);assert.deepEqual(errors,[]);
  console.log('PASS: 835-song catalog, independent lens criteria/reviews, shared notes and plans, reload, unsaved-edit guard, four layouts and recommended workflows.');
 }finally{await page.close();}
}
