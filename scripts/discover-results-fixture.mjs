import assert from "node:assert/strict";
import {reveal} from "./disclosure.mjs";

export async function checkDiscoverResultsFlows(browser,base) {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("hymn-heart-v1")));
  const ids=()=>page.locator(".song-card").evaluateAll(rows=>rows.map(row=>row.dataset.id));
  try {
    await page.goto(base);await page.getByRole("heading",{name:"Discover songs",exact:true}).waitFor();
    const original=await state();
    assert.equal(await page.locator("#sort-order").inputValue(),"rating");
    assert.equal(await page.locator(".detail-panel").getAttribute("data-song-id"),(await ids())[0],"Initial details show the highest visible rating");
    const values=await page.locator(".song-card .card-score > span:first-child").allTextContents();
    const scores=values.map(value=>Number(value.split("/10")[0]));
    assert.ok(scores.every((value,index)=>index===0||value<=scores[index-1]));
    const listBox=await page.locator(".song-list").boundingBox();assert.ok(listBox.width<=385,"Results leave most desktop width for song details");
    const heights=await page.locator(".song-card").evaluateAll(rows=>rows.slice(0,8).map(row=>row.getBoundingClientRect().height));
    assert.ok(heights.every(height=>height<160),`Compact typical rows: ${heights.join(", ")}`);
    await page.screenshot({path:"/tmp/faithful-results-desktop.png",fullPage:true});
    await page.setViewportSize({width:1920,height:1080});
    assert.ok((await page.locator(".song-list").boundingBox()).width<=385);
    assert.ok(await page.locator(".song-card").evaluateAll(rows=>rows.every(row=>Math.abs(row.getBoundingClientRect().x-rows[0].getBoundingClientRect().x)<1)),"Wide screens retain one clear results column");
    await page.screenshot({path:"/tmp/faithful-results-wide.png",fullPage:true});
    await reveal(page,"combobox",{name:"Sort by",exact:true});await page.getByLabel("Sort by",{exact:true}).selectOption("title");
    await page.locator('.nav-item[data-view="library"]').click();assert.equal(await page.locator("#sort-order").inputValue(),"default","Library keeps its own initial catalog order");
    await page.locator('.nav-item[data-view="discover"]').click();assert.equal(await page.locator("#sort-order").inputValue(),"title","An explicit sorting choice survives navigation");
    assert.deepEqual(await state(),original,"Browsing cannot change songs, recordings, ratings or plans");

    // Separate evidence cases: personal override, zero score, unknown score, hidden AI,
    // title relevance, active criteria and long content are all distinct records.
    await page.evaluate(()=>{
      const w=JSON.parse(localStorage.getItem("hymn-heart-v1"));
      w.profile={...w.profile,setupComplete:true,aiMode:"full",criteria:[{id:"accuracy",label:"Accuracy",rubric:"Recorded accuracy",active:true},{id:"language",label:"Language",rubric:"Recorded language",active:false}],weights:{accuracy:1,language:1,substance:0,time:0}};
      for(const song of w.songs){song.aiDismissed=true;song.review={...song.review,status:"manual",scores:{accuracy:null,substance:null,language:null,time:null},customScores:{},aiFields:[],notes:""};}
      const [exact,author,zero,unknown,ai,hidden]=w.songs;
      exact.title="Compact Search Title";exact.author="Writer";exact.review.scores={accuracy:2,substance:null,language:10,time:null};
      author.title="Different title";author.author="Compact Search Title";author.review.scores={accuracy:9,substance:null,language:0,time:null};
      zero.title="Zero is an assessed score";zero.review.scores.accuracy=0;
      unknown.title="No assigned rating";
      ai.title="Hidden AI rating";ai.review.status="ai";ai.review.scores.accuracy=10;ai.review.previous=undefined;ai.aiDismissed=false;
      hidden.title="Blacklisted highest score";hidden.review.scores.accuracy=10;hidden.blacklisted=true;
      exact.recordings=[...(exact.recordings||[])];
      w.libraries=[{id:"compact-fixture",name:"Compact library",songIds:[exact.id,author.id,zero.id,unknown.id,ai.id,hidden.id]}];
      localStorage.setItem("hymn-heart-v1",JSON.stringify(w));
    });
    await page.reload();await page.getByRole("heading",{name:"Discover songs",exact:true}).waitFor();
    let snapshot=await state(),expected=snapshot.songs.slice(0,6).map(song=>song.id);
    assert.deepEqual((await ids()).slice(0,4),[expected[4],expected[1],expected[0],expected[2]],"Visible active criterion controls ordering, including assessed zero before unknown");
    assert.ok(!(await ids()).includes(expected[5]));
    await page.locator("#search").fill("Compact Search Title");await page.locator(".song-card").first().locator("h3").filter({hasText:"Compact Search Title"}).waitFor();
    assert.deepEqual(await ids(),[expected[0],expected[1]],"Exact title beats a higher-rated artist match");
    assert.deepEqual(await state(),snapshot);
    await page.evaluate(()=>{const w=JSON.parse(localStorage.getItem("hymn-heart-v1"));w.profile.aiMode="manual";w.songs[0].title="An intentionally very long song title that should wrap naturally without forcing the search results or ratings outside the page";w.songs[0].author="An author attribution with plenty of detail to verify compact wrapping on a small screen";localStorage.setItem("hymn-heart-v1",JSON.stringify(w));});
    await page.reload();await page.getByRole("heading",{name:"Discover songs",exact:true}).waitFor();
    assert.deepEqual((await ids()).slice(0,3),[expected[1],expected[0],expected[2]],"Hidden AI scores cannot reorder human-only discovery");
    snapshot=await state();await page.locator("#search").fill("intentionally very long");await page.locator(".song-card").first().locator("h3").filter({hasText:"intentionally very long"}).waitFor();
    for(const width of [900,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator(".song-card").evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:`/tmp/faithful-results-${width}.png`,fullPage:true});}
    await page.locator(".song-card").first().focus();await page.keyboard.press("Enter");assert.ok(await page.getByRole("heading",{name:snapshot.songs[0].title,exact:true,level:2}).isVisible());assert.deepEqual(await state(),snapshot);
    assert.deepEqual(errors,[]);
    console.log("PASS: compact single-column results, default highest visible rating and initial details, independent sorting, title relevance, active criteria, personal overrides, zero/unknown ordering, hidden-AI and blacklist isolation, keyboard selection, narrow desktop and wrapping on tablet/mobile.");
  }finally{await page.close();}
}
