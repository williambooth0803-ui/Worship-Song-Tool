import {songArtwork} from './song-visuals.js';
import {visibleSongs} from './song-state.js';
import {selectedArrangement} from './planning.js';
import {planImportPrompt,inspectPlanImport,importedPlan} from './plan-import.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function insertionMarkup(plan,selected='__end__') {
 if(!plan?.items.length)return '';
 return `<label>Add after<select name="after" aria-label="Add after"><option value="__start__">At the beginning</option>${plan.items.map((item,i)=>`<option value="${e(item.id)}" ${selected===item.id?'selected':''}>${i+1}. ${e(item.title||item.displayTitle||'Song')}</option>`).join('')}<option value="__end__" ${selected==='__end__'?'selected':''}>At the end</option></select></label>`;
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
export function openPlanSongPicker({workspace,plan,libraryId,modal,onAdd,stillCurrent}) {
 const chosen=new Set();let selectedLibrary=libraryId||workspace.libraries[0]?.id;
 const displayPlan={...plan,items:plan.items.map(i=>({...i,displayTitle:workspace.songs.find(s=>s.id===i.songId)?.title||i.title}))};
 modal(`<h2>Add songs to ${e(plan.title)}</h2><div class="plan-library-picker"><div class="picker-controls"><label>Library<select id="picker-library" aria-label="Choose a library">${workspace.libraries.map(l=>`<option value="${e(l.id)}" ${l.id===selectedLibrary?'selected':''}>${e(l.name)}</option>`).join('')}</select></label><label>Find a song<input id="picker-search" type="search" aria-label="Find library songs" placeholder="Title or artist"></label></div><div id="picker-songs" class="picker-songs" tabindex="0" aria-label="Library songs"></div><p id="picker-count" role="status"></p>${insertionMarkup(displayPlan)}<p id="picker-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button type="button" class="button primary" id="picker-add" disabled>Add 0 songs to plan</button></div></div>`);
 const dialog=document.querySelector('#dialog'),list=dialog.querySelector('#picker-songs'),add=dialog.querySelector('#picker-add');
 const available=visibleSongs(workspace.songs),allowed=new Set(workspace.libraries.flatMap(l=>l.songIds));
 const update=()=>{add.disabled=chosen.size===0;add.textContent=`Add ${chosen.size} song${chosen.size===1?'':'s'} to plan`;dialog.querySelector('#picker-count').textContent=`${chosen.size} selected across your libraries`;};
 const render=()=>{
  const library=workspace.libraries.find(l=>l.id===selectedLibrary),query=dialog.querySelector('#picker-search').value.toLocaleLowerCase();
  const songs=available.filter(s=>library?.songIds.includes(s.id)&&[s.title,s.author].join(' ').toLocaleLowerCase().includes(query));
  list.innerHTML=songs.length?songs.map(s=>`<label class="picker-song ${chosen.has(s.id)?'selected':''}"><input type="checkbox" value="${e(s.id)}" ${chosen.has(s.id)?'checked':''}>${songArtwork(s)?`<img class="album-art picker-art" src="${e(songArtwork(s).url)}" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer">`:''}<span><strong>${e(s.title)}</strong><small>${e(s.author)}</small><small>${e(selectedArrangement(s)?.minutes??s.review.minutes)} min${selectedArrangement(s)||s.facts?.minutes?.confidence==='confirmed'?'':' estimate'}${selectedArrangement(s)?.key||s.review.key?' · '+e(selectedArrangement(s)?.key||s.review.key):''}</small></span></label>`).join(''):'<p class="muted">No matching songs in this library. Add songs to your libraries to choose them here.</p>';
 };
 dialog.querySelector('#picker-library').onchange=event=>{selectedLibrary=event.target.value;render();};
 dialog.querySelector('#picker-search').oninput=render;
 list.onchange=event=>{if(event.target.type!=='checkbox')return;event.target.checked?chosen.add(event.target.value):chosen.delete(event.target.value);event.target.closest('.picker-song').classList.toggle('selected',event.target.checked);update();};
 add.onclick=()=>{try{
  if(!stillCurrent())throw new Error('The workspace or selected plan changed. Open the picker again.');
  const songs=[...chosen].map(id=>available.find(s=>s.id===id)).filter(s=>s&&allowed.has(s.id));if(!songs.length)throw new Error('Choose songs from your libraries.');
  const items=songs.map(song=>{const arrangement=selectedArrangement(song);return {id:crypto.randomUUID(),type:'song',songId:song.id,key:arrangement?.key??song.review.key,minutes:arrangement?.minutes??song.review.minutes,role:'',notes:'',...(arrangement?{arrangementId:arrangement.id,arrangementName:arrangement.name}:{})};});
  onAdd(items,dialog.querySelector('[name="after"]')?.value||'__end__');
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
