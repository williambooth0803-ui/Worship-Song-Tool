import assert from 'node:assert/strict';
import {navigate} from './disclosure.mjs';
import {validateWorkspace} from '../public/backup.js';

export async function checkLandingFlows(browser,base) {
  const context=await browser.newContext(),publicPage=await context.newPage();
  const errors=[];
  publicPage.on('pageerror',error=>errors.push(error.message));
  try {
    await publicPage.goto(base+'#home');await publicPage.locator('.landing-page').waitFor();
    assert.equal(await publicPage.locator('.sidebar').count(),0);
    for(const width of [320,390,768,1024,1440]) {
      await publicPage.setViewportSize({width,height:950});
      assert.ok(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Public home overflow at ${width}`);
      assert.ok(await publicPage.locator('main').evaluate(el=>{const box=el.getBoundingClientRect();return Math.abs((box.left+box.right)/2-innerWidth/2)<1;}),'Public Home must be centered without reserving a sidebar rail');
      const about=await publicPage.locator('.landing-about-link').evaluate(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
      assert.ok(about.height>=50&&about.font>=14,'Landing About link must be prominent');
      await publicPage.screenshot({path:`/tmp/faithful-home-public-${width}.png`,fullPage:true});
    }
    await publicPage.locator('.landing-about-link').click();await publicPage.getByRole('heading',{name:'About Faithful Repertoire',exact:true}).waitFor();
    await publicPage.locator('.public-brand').click();await publicPage.locator('.landing-page').waitFor();
    await publicPage.reload();await publicPage.locator('.landing-page').waitFor();
    assert.equal(await publicPage.evaluate(()=>sessionStorage.getItem('faithful-guest-opt-in')),null);
    assert.equal(await publicPage.evaluate(()=>localStorage.getItem('hymn-heart-v1')),null,'Public Home/About must not create a workspace');
    await publicPage.getByRole('button',{name:'Sign in to begin',exact:true}).click();await publicPage.locator('#auth-form').waitFor();
    await publicPage.locator('.auth-home-link').click();await publicPage.locator('.landing-page').waitFor();
  }finally{await context.close();}

  const page=await browser.newPage({viewport:{width:1440,height:950}});
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(base);await page.getByRole('heading',{name:'Discover songs',exact:true}).waitFor();
    await page.evaluate(()=>{
      const state=JSON.parse(localStorage.getItem('hymn-heart-v1'));
      state.songs[0].review.notes='Keep this personal note through Home navigation.';
      state.libraries[0].songIds=[state.songs[0].id];
      localStorage.setItem('hymn-heart-v1',JSON.stringify(state));
    });
    await page.reload();await navigate(page,'plans');await page.getByRole('button',{name:'+ New plan',exact:true}).click();
    await page.getByLabel('Plan name',{exact:true}).fill('A service kept through Home navigation');await page.locator('#plan-form .primary').click();
    const before=validateWorkspace(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1'))));
    await page.locator('.brand').click();await page.locator('.landing-page').waitFor();assert.ok(page.url().endsWith('#home'));
    for(const [view,title] of [['discover','Discover songs'],['evaluate','Evaluate a song'],['library','Your song libraries'],['plans','Plans']]) {
      await page.locator(`.landing-tool [data-view="${view}"]`).click();await page.locator('.page h1').filter({hasText:title}).waitFor();
      await page.locator('.brand').click();await page.locator('.landing-page').waitFor();
    }
    await page.reload();await page.locator('.landing-page').waitFor();
    for(const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:950});await page.evaluate(()=>scrollTo(0,0));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Workspace home overflow at ${width}`);
      await page.screenshot({path:`/tmp/faithful-home-workspace-${width}.png`,fullPage:true});
      const footer=page.locator('.site-footer .about-link');await footer.scrollIntoViewIfNeeded();
      const style=await footer.evaluate(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
      assert.ok(style.height>=44&&style.font>=14,'Footer About must no longer inherit 9px text');
    }
    await page.locator('.site-footer .about-link').click();await page.getByRole('heading',{name:'About Faithful Repertoire',exact:true}).waitFor();
    await page.locator('.header-home').click();await page.locator('.landing-page').waitFor();
    assert.deepEqual(validateWorkspace(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')))),before,'Home navigation preserves notes, membership, plans, criteria and evaluations');
    await navigate(page,'profile');const lensName=page.getByLabel('Lens name',{exact:true});await lensName.fill('Unsaved home-navigation fixture');
    page.once('dialog',dialog=>dialog.dismiss());await page.locator('.brand').click();assert.equal(await lensName.inputValue(),'Unsaved home-navigation fixture');
    page.once('dialog',dialog=>dialog.dismiss());await page.evaluate(()=>location.hash='#home');
    await page.waitForURL(url=>!url.hash);assert.equal(await lensName.inputValue(),'Unsaved home-navigation fixture');
    page.once('dialog',dialog=>dialog.accept());await page.locator('.brand').click();await page.locator('.landing-page').waitFor();
    assert.deepEqual(validateWorkspace(await page.evaluate(()=>JSON.parse(localStorage.getItem('hymn-heart-v1')))),before);
    assert.deepEqual(errors,[]);
    console.log('PASS: public Home/About without guest activation, menu/header/sign-in logo links, all four tool entries, #home reload, prominent About controls, five responsive sizes, unsaved-criteria guards and preserved notes/libraries/plans.');
  }finally{await page.close();}
}
