import {workspaceSignature} from './saving.js';
export function saveIndicator(status,workspace,{signedIn=true,formDirty=false,localFailed=false,viewOnly=false}={}) {
  if(localFailed)return {state:'unsaved',icon:'×',label:'Unsaved changes',detail:'Browser saving failed. Export a backup before leaving.'};
  if(formDirty)return {state:'unsaved',icon:'×',label:'Unsaved changes',detail:'An open form has unapplied changes. Save, apply or cancel it.'};
  if(viewOnly)return {state:'readonly',icon:'✓',label:'View only'};
  if(!signedIn)return {state:'saved',icon:'✓',label:'Saved on this device'};
  if(['error','conflict','review'].includes(status.phase))return {state:'unsaved',icon:'×',label:'Unsaved changes'};
  if(status.phase==='saving')return {state:'saving',icon:'↻',label:'Saving…'};
  if(status.phase==='checking')return {state:'saving',icon:'↻',label:'Checking save…'};
  return status.signature===workspaceSignature(workspace)?{state:'saved',icon:'✓',label:'Saved'}:{state:'unsaved',icon:'×',label:'Unsaved changes'};
}
