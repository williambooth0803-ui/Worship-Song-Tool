import {decodeEvaluation} from './evaluation-history.js';
import {evaluationDialog,renderEvaluationReport} from './evaluation-report-ui.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openEvaluationHistory({workspace,scopeId,modal,dialog,download,stillCurrent,onRemove}) {
  const rows=(workspace.evaluationHistory||[]).map(entry=>({entry,...decodeEvaluation(entry)}))
    .filter(row=>!scopeId||row.snapshot.scopes.some(s=>s.id===scopeId)).sort((a,b)=>b.entry.createdAt.localeCompare(a.entry.createdAt));
  function check(){if(!stillCurrent())throw new Error('This workspace or AI mode changed. Reopen Evaluation History.');}
  function showList(){
    evaluationDialog({modal,dialog,title:'Evaluation History',html:`<p>Saved reports retain the original lens, criteria, selected content and repetition pattern. Current plan edits do not rewrite them.</p><div class="evaluation-history-list">${rows.length?rows.map(({entry,report,snapshot})=>`<article class="evaluation-history-row"><div><h3>${e(snapshot.scopes.find(s=>s.id===scopeId)?.name||snapshot.scopes.slice(0,3).map(s=>s.name).join(' · '))}</h3><p>${e(new Date(entry.createdAt).toLocaleString())} · ${e(snapshot.lens?.name||'Main lens')} · ${snapshot.criteria.length} criteria</p><p>${e(report.summary)}</p></div><div class="evaluation-history-actions"><button type="button" class="button" data-open-evaluation="${e(entry.id)}">Open report</button>${onRemove?`<button type="button" class="text-button" data-remove-evaluation="${e(entry.id)}">Delete saved report</button>`:''}</div></article>`).join(''):'<p>No saved evaluations for this plan or library yet. Preview an evaluation to save its report here.</p>'}</div><p id="history-evaluation-error" role="alert"></p>`});
    for(const button of dialog.querySelectorAll('[data-open-evaluation]'))button.onclick=()=>{try{
      check();const row=rows.find(r=>r.entry.id===button.dataset.openEvaluation);
      evaluationDialog({modal,dialog,title:'Saved evaluation',html:'<button type="button" class="text-button" id="back-evaluation-history">← Evaluation History</button><section id="scope-preview" aria-label="Saved evaluation report"></section>'});
      renderEvaluationReport({container:dialog.querySelector('#scope-preview'),report:row.report,snapshot:row.snapshot,repeats:row.repeats,readOnly:true,download,assertCurrent:check,preferredScope:scopeId});
      dialog.querySelector('#back-evaluation-history').onclick=showList;
    }catch(error){dialog.querySelector('#history-evaluation-error').textContent=error.message;}};
    for(const button of dialog.querySelectorAll('[data-remove-evaluation]'))button.onclick=()=>{try{
      check();if(!confirm('Delete this saved evaluation? Your plan, songs and other reports will stay in place.'))return;
      onRemove(button.dataset.removeEvaluation);rows.splice(rows.findIndex(r=>r.entry.id===button.dataset.removeEvaluation),1);showList();
    }catch(error){dialog.querySelector('#history-evaluation-error').textContent=error.message;}};
  }
  showList();
}
