import {compareVersions,historySummary} from './version-history.js';
import {workspaceSignature} from './saving.js';
const e=value=>String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const summary=value=>[`${value.songs} ${value.songs===1?'song':'songs'}`,`${value.libraries} ${value.libraries===1?'library':'libraries'}`,`${value.plans} ${value.plans===1?'plan':'plans'}`,`${value.lenses} ${value.lenses===1?'lens':'lenses'}`].join(' · ');

export async function openVersionHistory({history,cloud,context,current,valid,editable,modal,dialog,prepare,normalize,checkpoint,restore,download}) {
  const token=context();
  let screen=0,cloudAvailable=false,activeScreen;
  const live=generation=>valid(token)&&dialog.open&&screen===generation&&dialog.querySelector('[data-history-screen]')===activeScreen;
  const show=html=>{screen++;modal(`<section class="version-history" data-history-screen>${html}</section>`);activeScreen=dialog.querySelector('[data-history-screen]');return screen;};
  const heading='<h2>Version history</h2>';
  const errorMessage=error=>error?.message || 'This action could not be completed.';
  const missingCloud=error=>error?.status===404 || /PGRST202|Could not find the function/.test(error?.message || '');

  async function list() {
    const generation=show(`${heading}<p role="status">Loading saved versions…</p>`);
    const [local,remote]=await Promise.allSettled([history.list(token.key),cloud&&token.signedIn?cloud.list(token.organization):Promise.resolve([])]);
    if (!live(generation)) return;
    cloudAvailable=Boolean(token.signedIn&&remote.status==='fulfilled');
    const rows=[...(local.status==='fulfilled'?local.value:[]),...(remote.status==='fulfilled'?remote.value:[])]
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const notices=[];
    if(local.status==='rejected')notices.push(errorMessage(local.reason));
    if(token.signedIn&&remote.status==='rejected')notices.push(missingCloud(remote.reason)?'Account history is not enabled yet. Versions on this device are still available.':'Account history could not be reached. Check your connection and try again.');
    const next=show(`${heading}<p>Recover songs, evaluations, libraries, plans and analysis lenses in this workspace.</p><p class="muted">Automatic checkpoints keep a copy from before your edits, at most once every five minutes. Each location keeps up to 30 versions within its storage limit. Device versions stay in this browser; account versions are available across devices.</p>${notices.map(message=>`<p class="history-notice" role="status">${e(message)}</p>`).join('')}${editable()?'<div class="history-create"><label>Version name <span class="muted">(optional)</span><input id="version-name" maxlength="100" placeholder="Before the Christmas planning update"></label><button class="button primary" id="history-save">Save version</button></div>':'<p class="history-notice">View-only access: you can preview and download shared versions.</p>'}<p id="history-error" role="alert"></p><div class="history-list">${rows.length?rows.map((row,index)=>`<article class="history-row"><div><h3>${e(row.label)}</h3><p><time datetime="${e(new Date(row.createdAt).toISOString())}">${e(date(row.createdAt))}</time> <span class="history-location">${row.source==='account'?'Account':'This device'}</span></p><p class="muted">${e(summary(row.summary))}</p></div><button class="button" data-history-preview="${index}">Preview<span class="sr-only"> ${e(row.label)} ${e(date(row.createdAt))}</span></button></article>`).join(''):'<p class="empty-state">No versions yet. Save a version now, or make an edit to start automatic history.</p>'}</div>`);
    dialog.querySelector('#history-save')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{await checkpoint(dialog.querySelector('#version-name').value.trim()||'Saved version',cloudAvailable,token);if(live(next))await list();}
      catch(error){if(live(next)){dialog.querySelector('#history-error').textContent=errorMessage(error);button.disabled=false;}}
    });
    for(const button of dialog.querySelectorAll('[data-history-preview]')) button.onclick=async()=>{
      button.disabled=true;
      try {
        const row=rows[Number(button.dataset.historyPreview)];
        const saved=row.source==='account'?await cloud.get(token.organization,row.id):await history.get(token.key,row.id);
        await prepare(token);
        if(live(next))preview(saved);
      }catch(error){if(live(next)){dialog.querySelector('#history-error').textContent=errorMessage(error);button.disabled=false;}}
    };
  }
  function preview(saved) {
    const before=current(),signature=workspaceSignature(before),restored=normalize(saved.workspace),diff=compareVersions(before,restored);
    const names={songs:'Songs',libraries:'Libraries',plans:'Plans',lenses:'Lenses',indexViews:'Saved index views',planTemplates:'Plan templates'};
    const generation=show(`<button class="text-button" id="history-back">‹ All versions</button><h2>Preview this version</h2><p><strong>${e(saved.label)}</strong><br>${e(date(saved.createdAt))} · ${saved.source==='account'?'Account':'This device'}</p><p>${e(summary(historySummary(saved.workspace)))}</p><h3>Changes if restored</h3><div class="history-comparison"><table><caption class="sr-only">Compared with the current workspace</caption><thead><tr><th>Saved content</th><th>Added</th><th>Changed</th><th>Removed</th></tr></thead><tbody>${Object.entries(names).map(([key,name])=>`<tr><th scope="row">${name}</th><td>${diff[key].added}</td><td>${diff[key].changed}</td><td>${diff[key].removed}</td></tr>`).join('')}</tbody></table></div><p class="muted">${diff.profileChanged?'The evaluation profile also changes. ':'Evaluation profile unchanged. '}${diff.activeLensChanged?'The selected lens changes. ':''}Current AI display preferences are kept.</p><p>This restores the entire workspace, including personal notes, evaluations and exclusions.${token.organization?' The shared workspace changes for every member.':''} A recovery version of the current workspace is saved first. Uploaded files are not duplicated or recovered by version history.</p><div class="history-actions"><button class="button" id="history-download">Download this version</button>${editable()?'<button class="button primary" id="history-confirm">Restore this version…</button>':''}</div><div id="history-confirmation" hidden><p><strong>Replace the current workspace with this version?</strong></p><div class="form-actions"><button class="button" id="history-cancel">Cancel</button><button class="button primary" id="history-restore">Replace workspace</button></div></div><p id="history-error" role="alert"></p>`);
    dialog.querySelector('#history-back').onclick=list;
    dialog.querySelector('#history-download').onclick=()=>download(`faithful-repertoire-version-${new Date(saved.createdAt).toISOString().slice(0,10)}.json`,JSON.stringify(saved.workspace,null,2),'application/json');
    const confirmation=dialog.querySelector('#history-confirmation'),confirm=dialog.querySelector('#history-confirm');
    if(!confirm)return;
    confirm.onclick=()=>{confirmation.hidden=false;confirm.hidden=true;dialog.querySelector('#history-restore').focus();};
    dialog.querySelector('#history-cancel').onclick=()=>{confirmation.hidden=true;confirm.hidden=false;confirm.focus();};
    dialog.querySelector('#history-restore').onclick=async event=>{
      const button=event.currentTarget;button.disabled=true;button.textContent='Restoring…';
      try{await restore(restored,signature,cloudAvailable,token);}
      catch(error){if(live(generation)){dialog.querySelector('#history-error').textContent=errorMessage(error);button.disabled=false;button.textContent='Replace workspace';}}
    };
  }
  await list();
}
