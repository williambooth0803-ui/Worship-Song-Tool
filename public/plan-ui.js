import {newPlanSong} from './plan-songs.js';
import {createSongMatcher} from './collection-browse.js';
import {songArtwork} from './song-visuals.js';
import {visibleSongs} from './song-state.js';
import {planItemTitle,selectedArrangement} from './planning.js';
import {planImportPrompt,inspectPlanImport,importedPlan} from './plan-import.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function insertionMarkup(plan,selected='__end__') {
 if(!plan?.items.length)return '';
 let number=0;
 return `<label>Add after<select name="after" aria-label="Add after"><option value="__start__">At the beginning</option>${plan.items.map((item,i)=>`<option value="${e(item.id)}" ${selected===item.id?'selected':''}>${item.type==='heading'?'Heading: ':`${++number}. `}${e(item.displayTitle||item.title||'Song')}</option>`).join('')}<option value="__end__" ${selected==='__end__'?'selected':''}>At the end</option></select></label>`;
}
export function insertPlanItems(plan,items,after='__end__') {
 const position=after==='__start__'?0:after==='__end__'?plan.items.length:plan.items.findIndex(i=>i.id===after)+1;
 if(after!=='__start__'&&after!=='__end__'&&position===0)throw new Error('That insertion point is no longer in the plan.');
 plan.items.splice(position,0,...items);
}
export function movePlanItem(plan,id,target,after=false) {
 if(id===target)return;
 const from=plan.items.findIndex(i=>i.id===id);if(from<0)return;
 const to=plan.items.findIndex(i=>i.id===target);if(to<0)return;
 const [item]=plan.items.splice(from,1);const index=plan.items.findIndex(i=>i.id===target);plan.items.splice(index+(after?1:0),0,item);
}
export function openPlanSongPicker({workspace,plan,libraryId,modal,onAdd,stillCurrent,catalog=[],onDirty=()=>{}}) {
 const chosen=new Set(),drafts=[];let selectedLibrary=libraryId||workspace.libraries[0]?.id,page=1,view='libraries';
 const match=createSongMatcher(workspace.songs),available=[...visibleSongs(workspace.songs),...catalog.filter(s=>!match(s)&&!s.blacklisted)];
 const displayPlan={...plan,items:plan.items.map(i=>({...i,title:planItemTitle(i,workspace.songs),displayTitle:planItemTitle(i,workspace.songs)}))};
 modal(`<h2>Add songs to ${e(plan.title)}</h2><div class="plan-library-picker"><div class="picker-tabs" role="tablist" aria-label="Song sources"><button type="button" role="tab" aria-selected="true" aria-controls="picker-browse-panel" data-picker-view="libraries">Libraries</button><button type="button" role="tab" aria-selected="false" aria-controls="picker-browse-panel" data-picker-view="all">All songs</button><button type="button" role="tab" aria-selected="false" aria-controls="picker-create-form" data-picker-view="new">New song</button></div><div id="picker-browse-panel" role="tabpanel"><div class="picker-controls"><label id="picker-library-label">Library<select id="picker-library" aria-label="Choose a library">${workspace.libraries.map(l=>`<option value="${e(l.id)}" ${l.id===selectedLibrary?'selected':''}>${e(l.name)}</option>`).join('')}</select></label><label>Find a song<input id="picker-search" type="search" aria-label="Find library songs" placeholder="Title or artist"></label></div><div id="picker-songs" class="picker-songs" tabindex="0" aria-label="Available songs"></div></div><form id="picker-create-form" role="tabpanel" hidden><h3>Create a song</h3><p>Selected new songs are saved to your workspace when you add them to this plan. Library placement is optional.</p><label>Song title<input name="title" maxlength="200" required></label><label>Writer / attribution<input name="author" maxlength="300"></label><label>Version / arrangement<input name="version" maxlength="300"></label><div class="form-columns"><label>Key<input name="key" maxlength="30"></label><label>Estimated minutes<input name="minutes" type="number" min="0.5" max="180" step="any" value="4" required></label></div><p id="picker-create-error" role="alert"></p><button class="button" type="submit">Select new song</button></form><p id="picker-count" role="status"></p>${insertionMarkup(displayPlan)}<p id="picker-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button type="button" class="button primary" id="picker-add" disabled>Add 0 songs to plan</button></div></div>`);
 const dialog=document.querySelector('#dialog'),list=dialog.querySelector('#picker-songs'),add=dialog.querySelector('#picker-add'),form=dialog.querySelector('#picker-create-form'),browse=dialog.querySelector('#picker-browse-panel');
 const update=()=>{add.disabled=chosen.size===0;add.textContent=`Add ${chosen.size} song${chosen.size===1?'':'s'} to plan`;dialog.querySelector('#picker-count').textContent=`${chosen.size} selected across song sources`;onDirty(chosen.size>0||[...form.elements].some(field=>field.name&&field.value!==field.defaultValue));};
 const render=()=>{
  const library=workspace.libraries.find(l=>l.id===selectedLibrary),query=dialog.querySelector('#picker-search').value.toLocaleLowerCase();
  const ids=new Set(library?.songIds||[]),pool=[...available,...drafts];
  const songs=pool.filter(s=>(view==='all'||ids.has(s.id))&&[s.title,s.author].join(' ').toLocaleLowerCase().includes(query));
  const pages=Math.ceil(songs.length/100)||1;page=Math.max(1,Math.min(page,pages));
  list.innerHTML=songs.length?songs.slice((page-1)*100,page*100).map(s=>`<label class="picker-song ${chosen.has(s.id)?'selected':''}"><input type="checkbox" value="${e(s.id)}" ${chosen.has(s.id)?'checked':''}>${songArtwork(s)?`<img class="album-art picker-art" src="${e(songArtwork(s).url)}" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer">`:''}<span><strong>${e(s.title)}</strong><small>${e(s.author)}</small><small>${e(selectedArrangement(s)?.minutes??s.review.minutes)} min${selectedArrangement(s)||s.facts?.minutes?.confidence==='confirmed'?'':' estimate'}${selectedArrangement(s)?.key||s.review.key?' · '+e(selectedArrangement(s)?.key||s.review.key):''}</small></span></label>`).join(''):`<p class="muted">No matching songs${view==='libraries'?' in this library':''}. Search All songs or create a New song here.</p>`;
  dialog.querySelector('#picker-pages')?.remove();
  if(pages>1){const nav=document.createElement('div');nav.id='picker-pages';nav.className='pagination';nav.innerHTML=`<span>${(page-1)*100+1}–${Math.min(page*100,songs.length)} of ${songs.length}</span><button class="button" type="button" id="picker-previous" ${page===1?'disabled':''}>Previous</button><span>Page ${page} of ${pages}</span><button class="button" type="button" id="picker-next" ${page===pages?'disabled':''}>Next</button>`;list.after(nav);nav.querySelector('#picker-previous').onclick=()=>{page--;render();list.scrollTop=0;};nav.querySelector('#picker-next').onclick=()=>{page++;render();list.scrollTop=0;};}
 };
 function switchView(next){view=next;page=1;form.hidden=view!=='new';browse.hidden=view==='new';dialog.querySelector('#picker-library-label').hidden=view!=='libraries';dialog.querySelector('#picker-pages')?.remove();for(const tab of dialog.querySelectorAll('[data-picker-view]')){const active=tab.dataset.pickerView===view;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}if(view==='new'){if(!form.elements.title.value)form.elements.title.value=dialog.querySelector('#picker-search').value;form.elements.title.focus();}else render();}
 for(const tab of dialog.querySelectorAll('[data-picker-view]')){tab.onclick=()=>switchView(tab.dataset.pickerView);tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...dialog.querySelectorAll('[data-picker-view]')],index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;switchView(tabs[next].dataset.pickerView);tabs[next].focus();};}
 dialog.querySelector('#picker-library').onchange=event=>{selectedLibrary=event.target.value;page=1;render();};
 dialog.querySelector('#picker-search').oninput=()=>{page=1;render();};
 list.onchange=event=>{if(event.target.type!=='checkbox')return;event.target.checked?chosen.add(event.target.value):chosen.delete(event.target.value);event.target.closest('.picker-song').classList.toggle('selected',event.target.checked);update();};
 form.oninput=update;
 form.onsubmit=event=>{event.preventDefault();event.stopPropagation();try{
  if(!stillCurrent())throw new Error('The workspace or selected plan changed. Open the picker again.');
  const song=newPlanSong(Object.fromEntries(new FormData(form))),existing=[...workspace.songs,...available,...drafts].find(s=>[s.title,s.author,s.version].map(v=>String(v||'').trim().toLocaleLowerCase()).join('\0')===[song.title,song.author,song.version].map(v=>String(v||'').trim().toLocaleLowerCase()).join('\0'));
  if(existing?.blacklisted)throw new Error('That song is in No Approval. Restore it there before selecting it.');
  if(!existing)drafts.push(song);chosen.add(existing?.id||song.id);form.reset();dialog.querySelector('#picker-search').value=existing?.title||song.title;dialog.querySelector('#picker-create-error').textContent='';switchView('all');update();
 }catch(error){dialog.querySelector('#picker-create-error').textContent=error.message;}};
 add.onclick=()=>{try{
  if(!stillCurrent())throw new Error('The workspace or selected plan changed. Open the picker again.');
  const songs=[...chosen].map(id=>[...available,...drafts].find(s=>s.id===id)).filter(Boolean);if(!songs.length)throw new Error('Choose songs to add.');
  const items=songs.map(song=>{const arrangement=selectedArrangement(song);return {id:crypto.randomUUID(),type:'song',songId:song.id,key:arrangement?.key??song.review.key,minutes:arrangement?.minutes??song.review.minutes,role:'',notes:'',...(arrangement?{arrangementId:arrangement.id,arrangementName:arrangement.name}:{})};});
  onAdd(items,dialog.querySelector('[name="after"]')?.value||'__end__',songs.filter(s=>!workspace.songs.some(w=>w.id===s.id)));
 }catch(error){dialog.querySelector('#picker-error').textContent=error.message;}};
 render();update();
}
export function openPlanImport({workspace,catalog,modal,onImport,stillCurrent}) {
 const prompt=planImportPrompt(workspace),pool=[...visibleSongs(workspace.songs),...catalog.filter(s=>!workspace.songs.some(p=>p.id===s.id||p.title===s.title&&p.author===s.author))];
 let draft=null;
 modal(`<h2>Import an existing plan</h2><p>Attach your screenshot or PDF of the service order in ChatGPT, then paste this request. ChatGPT transcribes your plan; it does not choose songs. Bring its JSON response back here.</p><details><summary>ChatGPT transcription request</summary><label>Plan transcription request<textarea id="plan-import-prompt" rows="8" readonly>${e(prompt)}</textarea></label></details><div class="form-actions"><button class="button" type="button" id="copy-plan-request">Copy request</button><a class="button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></div><label>Import JSON file<input id="plan-import-file" type="file" accept=".json,application/json"></label><label>Or paste plan JSON<textarea id="plan-import-json" rows="7" maxlength="256000"></textarea></label><p id="plan-import-error" role="alert"></p><section id="plan-import-review"></section><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button primary" id="import-plan-now" type="button">Import plan</button></div>`);
 const dialog=document.querySelector('#dialog'),input=dialog.querySelector('#plan-import-json'),review=dialog.querySelector('#plan-import-review'),error=dialog.querySelector('#plan-import-error'),button=dialog.querySelector('#import-plan-now');
 const reset=()=>{draft=null;review.innerHTML='';error.textContent='';button.textContent='Import plan';};input.oninput=reset;
 dialog.querySelector('#copy-plan-request').onclick=async()=>{try{await navigator.clipboard.writeText(prompt);}catch{const box=dialog.querySelector('#plan-import-prompt');box.closest('details').open=true;box.focus();box.select();}};
 dialog.querySelector('#plan-import-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>256000)throw new Error('Plan JSON must be smaller than 256 KB.');input.value=await file.text();reset();}catch(err){error.textContent=err.message;}};
 const preview=()=>{
  review.innerHTML=`<h3>Check uncertain items</h3><p>The source or song matching needs clarification. Nothing has been imported.</p>${draft.uncertainties.length?`<ul>${draft.uncertainties.map(v=>`<li>${e(v)}</li>`).join('')}</ul>`:''}<ol class="import-plan-rows">${draft.rows.map(row=>`<li><strong>${e(row.title)}</strong>${row.issues.length?`<ul>${row.issues.map(v=>`<li>${e(v)}</li>`).join('')}</ul>`:''}${row.type==='song'&&row.issues.length?`<label>Song version<select data-resolve-song="${row.index}"><option value="">Choose a song</option><option value="__text__">Keep as a text item</option>${pool.filter(s=>row.candidates.length?row.candidates.includes(s.id):workspace.libraries.some(l=>l.songIds.includes(s.id))).map(s=>`<option value="${e(s.id)}" ${row.songId===s.id?'selected':''}>${e(s.title)} · ${e(s.author)}</option>`).join('')}</select></label>`:''}${row.type!=='heading'?`<label>Duration in minutes<input data-resolve-minutes="${row.index}" type="number" min="0.5" max="180" step="any" value="${typeof row.minutes==='number'?row.minutes:''}" required></label>`:'<small>Heading · no duration</small>'}${row.notes?`<p>${e(row.notes)}</p>`:''}</li>`).join('')}</ol><label class="check-label"><input id="confirm-plan-interpretation" type="checkbox">I checked the uncertain text, song versions and durations against my source.</label>`;
  button.textContent='Import checked plan';review.tabIndex=-1;review.focus();review.scrollIntoView({block:'nearest'});
 };
 button.onclick=()=>{try{
  error.textContent='';if(!stillCurrent())throw new Error('The active workspace changed. Open a fresh import.');
  if(!draft){draft=inspectPlanImport(input.value,pool);if(draft.needsReview){preview();return;}}
  const resolutions={};for(const field of review.querySelectorAll('[data-resolve-song]'))(resolutions[field.dataset.resolveSong]||={}).songId=field.value;for(const field of review.querySelectorAll('[data-resolve-minutes]'))(resolutions[field.dataset.resolveMinutes]||={}).minutes=field.value;
  const plan=importedPlan(draft,pool,resolutions,review.querySelector('#confirm-plan-interpretation')?.checked===true);
  const needed=new Set(plan.items.filter(i=>i.type==='song').map(i=>i.songId));onImport(plan,pool.filter(s=>needed.has(s.id)&&!workspace.songs.some(p=>p.id===s.id)));
 }catch(err){error.textContent=err.message;}};
}
