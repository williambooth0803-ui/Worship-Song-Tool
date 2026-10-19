import {catalogRecordings} from './catalog-recordings.js';
import {allCatalogSongs} from './catalog.js';
import {shortlistEntries} from './shortlist-data.js';
import {overall,defaultProfile} from './core.js';
import {catalogAnalysisFor,catalogAnalysisMarkup} from './catalog-analysis.js';
import {songArtwork} from './song-visuals.js';
import {songResourceLinks} from './song-resources.js';
import {recordingLinks} from './recordings.js';
import {reviewStore,emptyReview,validateShortlistReview,reviewCounts,setReviewDecision,mergeReviewBackup,decisionCSV,decisionSummary,choiceLabels} from './shortlist-review.js';

const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deck=shortlistEntries.map((entry,i)=>{const song=allCatalogSongs.find(s=>s.id===entry.id);return {...entry,...song,recordings:song?.recordings??catalogRecordings[entry.id],number:i+1};});
const score=song=>song.review?overall(song.review,defaultProfile):song.rating??null;
let review=emptyReview(),history=[],expanded=false,storageBlocked=false,showAI=true,unreadableCopy=null;
try {
  const stored=localStorage.getItem(reviewStore);
  if(stored)try{review=validateShortlistReview(JSON.parse(stored));}catch{unreadableCopy=stored;storageBlocked=true;}
  showAI=localStorage.getItem(reviewStore+'-ai')!=='hidden';
}catch{storageBlocked=true;}
$('#review-ai').checked=showAI;
const say=message=>{$('#review-message').textContent=message;};

function persist() {
  if(storageBlocked){$('#review-save').textContent=unreadableCopy?'Saved progress could not be read. That copy is preserved. New choices stay in this tab; Download backup saves these new choices.':'Browser storage is unavailable. Choices stay in this tab; download a backup before leaving.';return;}
  try {
    const cursor=review.cursor,stored=localStorage.getItem(reviewStore);
    if(stored)review=mergeReviewBackup(review,JSON.parse(stored));
    review.cursor=cursor;
    localStorage.setItem(reviewStore,JSON.stringify(review));
    $('#review-save').textContent='Saved in this browser · Download a backup to keep a copy or move devices.';
  }catch{storageBlocked=true;$('#review-save').textContent='Progress could not be saved. Your choices remain in this tab; download a backup before leaving.';}
}

function matches() {
  const filter=$('#review-filter').value,q=$('#review-search').value.trim().toLocaleLowerCase();
  return deck.filter(song=>{
    const choice=review.decisions[song.id]?.choice||'unreviewed';
    return (filter==='all'||choice===filter) && (!q||`${song.number} ${song.title} ${song.author}`.toLocaleLowerCase().includes(q)) &&
      (!showAI||!$('#review-high').checked||score(song)>=8);
  });
}

function updateProgress() {
  const c=reviewCounts(review);
  $('#review-counts').innerHTML=`<strong>${c.decided} / ${c.total} decided</strong><span>${c.keep} keep · ${c.remove} remove · ${c.later} later · ${c.unreviewed} not reviewed</span>`;
  $('#review-progress').value=c.decided;
  $('#review-undo').disabled=!history.length;
  $('#review-high').disabled=!showAI;
  $('#review-summary').innerHTML=Object.keys(choiceLabels).map(choice=>{
    const rows=deck.filter(s=>review.decisions[s.id]?.choice===choice);
    return `<details><summary>${choiceLabels[choice]} · ${rows.length}</summary>${rows.length?`<ul>${rows.map(song=>`<li><button type="button" data-revisit="${escape(song.id)}">#${song.number} · ${escape(song.title)}</button><span>${escape(song.author.replace(/^Associated recording:\s*/,''))}</span>${review.decisions[song.id].note?`<p>${escape(review.decisions[song.id].note)}</p>`:''}</li>`).join('')}</ul>`:'<p>No songs here yet.</p>'}</details>`;
  }).join('');
}

function render(focus=false) {
  const filtered=matches();
  if(!filtered.some(s=>s.id===review.cursor)&&filtered.length)review.cursor=filtered[0].id;
  const song=filtered.find(s=>s.id===review.cursor),index=filtered.indexOf(song);
  $('#review-position').textContent=song?`${index+1} of ${filtered.length} in this view`: 'No songs in this view';
  $('#review-previous').disabled=!song||index===0;
  $('#review-next').disabled=!song||index===filtered.length-1;
  if(!song){
    const c=reviewCounts(review),searching=Boolean($('#review-search').value||$('#review-high').checked);
    $('#review-card').innerHTML=`<div class="review-empty"><h2 tabindex="-1">${searching?'No matching songs':c.decided===150?'All 150 songs decided.':'You’re caught up in this view.'}</h2><p>${searching?'Try another search or show all ratings.':c.later?`${c.later} songs are waiting for another look.`:'You can revisit and change any choice.'}</p><button type="button" data-view="all">Review all decisions</button>${c.later?'<button type="button" data-view="later">Review deferred songs</button>':''}</div>`;
  }else{
    const value=score(song),entry=review.decisions[song.id],art=songArtwork(song),links=songResourceLinks(song),analysis=showAI?catalogAnalysisFor(song):null;
    const listen=recordingLinks(song).find(r=>r.provider==='youtube');
    $('#review-card').innerHTML=`<article class="review-flashcard" data-song="${escape(song.id)}"><div class="review-card-top"><span>List #${song.number} of 150${!song.review?' · Retired default':''}</span><span class="review-choice-status">${entry?.choice?choiceLabels[entry.choice]:'Not reviewed'}</span></div><div class="review-identity">${art?`<img src="${escape(art.url)}" alt="" width="88" height="88" loading="lazy" referrerpolicy="no-referrer">`:''}<h2 tabindex="-1">${escape(song.title)}</h2><p>${escape(song.author.replace(/^Associated recording:\s*/,''))}</p></div>${showAI?`<p class="review-rating ${value>=8?'review-rating-high':''}">${value>=8?'★ Highly rated · ':''}${song.review?'Catalog AI rating':'Last listed AI rating'}: <strong>${value===null?'Unassessed':value.toFixed(1)+' / 10'}</strong></p>`:''}<div class="review-resources"><a href="${escape(listen.url)}" target="_blank" rel="noopener noreferrer">Find on YouTube ↗</a><a href="${escape(links.lyrics)}" target="_blank" rel="noopener noreferrer">Find lyrics ↗</a>${showAI&&analysis?`<button type="button" id="review-flip" aria-expanded="${expanded}" aria-controls="review-evaluation">${expanded?'Hide evaluation':'Show evaluation'}</button>`:''}</div><div id="review-evaluation" ${!expanded||!showAI?'hidden':''}>${expanded&&showAI&&analysis?`<p class="review-score-context">Public catalog AI evaluation · default text weights. Personal reviews and lenses are separate.</p>${catalogAnalysisMarkup(analysis,escape)}`:''}</div><label class="review-note-label" for="review-note">Your note <span>(optional)</span></label><textarea id="review-note" rows="2" maxlength="1000" placeholder="Why keep it, or what needs another listen?">${escape(entry?.note||'')}</textarea><div class="review-decisions" role="group" aria-label="Choose for ${escape(song.title)}"><button type="button" data-choice="keep" class="review-keep" aria-pressed="${entry?.choice==='keep'}">Keep <kbd>K</kbd></button><button type="button" data-choice="later" aria-pressed="${entry?.choice==='later'}">Decide later <kbd>L</kbd></button><button type="button" data-choice="remove" class="review-remove" aria-pressed="${entry?.choice==='remove'}">Remove <kbd>R</kbd></button></div><p class="review-draft-note">Choices save to this review. Catalog and workspace songs stay intact.</p></article>`;
    $('#review-card img')?.addEventListener('error',event=>event.target.remove());
  }
  updateProgress();
  if(focus){$('#review-card h2')?.focus({preventScroll:true});$('#review-card').scrollIntoView({block:'start',behavior:'instant'});}
}

function choose(choice) {
  if(!matches().some(s=>s.id===review.cursor))return;
  const song=deck.find(s=>s.id===review.cursor),previous=structuredClone(review.decisions[song.id]||null),index=deck.indexOf(song);
  review=setReviewDecision(review,song.id,choice,$('#review-note')?.value||'');
  history.push({id:song.id,previous});if(history.length>150)history.shift();
  const available=new Set(matches().map(s=>s.id));
  const following=[...deck.slice(index+1),...deck.slice(0,index)].find(s=>available.has(s.id));
  if(following)review.cursor=following.id;
  expanded=false;persist();render(true);say(`${song.title}: ${choiceLabels[choice]}.`);
}

function move(direction) {
  const filtered=matches(),index=filtered.findIndex(s=>s.id===review.cursor),song=filtered[index+direction];
  if(!song)return;review.cursor=song.id;expanded=false;persist();render(true);
}
function undo() {
  const entry=history.pop();if(!entry)return;
  review=setReviewDecision(review,entry.id,entry.previous?.choice||null,entry.previous?.note||'');
  review.cursor=entry.id;$('#review-filter').value='all';$('#review-search').value='';$('#review-high').checked=false;
  expanded=false;persist();render(true);say('Last choice undone.');
}
function download(name,text,type) {
  const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

$('#review-card').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.choice)choose(button.dataset.choice);
  else if(button.id==='review-flip'){expanded=!expanded;render();$('#review-flip')?.focus({preventScroll:true});}
  else if(button.dataset.view){$('#review-filter').value=button.dataset.view;$('#review-search').value='';$('#review-high').checked=false;render(true);}
});
$('#review-card').addEventListener('input',event=>{
  if(event.target.id!=='review-note')return;
  review=setReviewDecision(review,review.cursor,review.decisions[review.cursor]?.choice||null,event.target.value);persist();
});
for(const selector of ['#review-filter','#review-high'])$(selector).addEventListener('change',()=>{expanded=false;render();persist();});
$('#review-search').addEventListener('input',()=>{expanded=false;render();persist();});
$('#review-ai').addEventListener('change',()=>{showAI=$('#review-ai').checked;expanded=false;if(!showAI)$('#review-high').checked=false;try{localStorage.setItem(reviewStore+'-ai',showAI?'shown':'hidden');}catch{}render();});
$('#review-previous').onclick=()=>move(-1);$('#review-next').onclick=()=>move(1);$('#review-undo').onclick=undo;
$('#review-backup').onclick=()=>download('faithful-150-review.json',JSON.stringify(review,null,2),'application/json');
$('#review-csv').onclick=()=>download('faithful-150-decisions.csv',decisionCSV(review,deck),'text/csv;charset=utf-8');
$('#review-copy').onclick=async()=>{
  const text=decisionSummary(review);
  try{await navigator.clipboard.writeText(text);say('Decisions copied. You can paste them into this chat.');}
  catch{let field=$('#review-copy-text');if(!field){field=document.createElement('textarea');field.id='review-copy-text';field.setAttribute('aria-label','Decisions to copy');$('.review-results').append(field);}field.value=text;field.focus();field.select();say('Select and copy the decisions below.');}
};
$('#review-import').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>500000)throw Error('Choose a decision backup smaller than 500 KB.');
    const incoming=validateShortlistReview(JSON.parse(await file.text()));
    if(unreadableCopy)download('faithful-review-recovery.txt',unreadableCopy,'text/plain');
    review=mergeReviewBackup(review,incoming);history=[];expanded=false;storageBlocked=false;unreadableCopy=null;
    // Replacing an unreadable copy is explicit in Restore backup; preserve its bytes above.
    try{localStorage.setItem(reviewStore,JSON.stringify(review));}catch{storageBlocked=true;}
    $('#review-filter').value='all';$('#review-search').value='';$('#review-high').checked=false;render(true);persist();say('Backup restored in this tab. Newer choices and notes are retained.');
  }catch(error){say('Could not restore: '+error.message);}
  event.target.value='';
};
$('#review-summary').onclick=event=>{
  const button=event.target.closest('[data-revisit]');if(!button)return;
  review.cursor=button.dataset.revisit;$('#review-filter').value='all';$('#review-search').value='';$('#review-high').checked=false;expanded=false;persist();render(true);$('#review-card').scrollIntoView({block:'start'});
};
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  const key=event.key.toLowerCase(),choices={k:'keep',r:'remove',l:'later'};
  if(choices[key]){event.preventDefault();choose(choices[key]);}
  else if(key==='arrowleft'||key==='arrowright'){event.preventDefault();move(key==='arrowleft'?-1:1);}
  else if(key==='u'){event.preventDefault();undo();}
});
render();
// A decided cursor resumes at the next unfinished song in the default view.
persist();
