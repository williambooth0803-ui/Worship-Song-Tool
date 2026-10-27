import {validateWorkspace} from './backup.js';
import {workspaceSignature} from './saving.js';
import {lensList} from './lenses.js';

export const HISTORY_LIMIT = 30;
export const HISTORY_INTERVAL = 5 * 60 * 1000;
const BYTE_LIMIT = 40 * 1024 * 1024;
const copy = value => structuredClone(value);

export function historySummary(workspace) {
  return {songs:workspace.songs.length, libraries:workspace.libraries.length,
    plans:workspace.plans.length, lenses:workspace.lenses?.length || 1};
}

// Compare every saved field, including notes, reviews, exclusions and lens data.
// Titles are deliberately omitted: a preview must not reveal excluded songs or AI text.
export function compareVersions(current, previous) {
  const result = {};
  for (const key of ['songs','libraries','plans','lenses','indexViews','planTemplates']) {
    const before = new Map((key==='lenses'?lensList(current):(current[key] || [])).map(row => [row.id,row]));
    const after = new Map((key==='lenses'?lensList(previous):(previous[key] || [])).map(row => [row.id,row]));
    result[key] = {
      added:[...after.keys()].filter(id => !before.has(id)).length,
      removed:[...before.keys()].filter(id => !after.has(id)).length,
      changed:[...after].filter(([id,row]) => before.has(id) && workspaceSignature(row) !== workspaceSignature(before.get(id))).length,
    };
  }
  result.profileChanged = workspaceSignature(current.profile) !== workspaceSignature(previous.profile);
  result.activeLensChanged = (current.activeLensId || 'main') !== (previous.activeLensId || 'main');
  return result;
}

export function retainedVersions(rows) {
  let bytes = 0;
  return [...rows].sort((a,b) => b.createdAt-a.createdAt || b.id.localeCompare(a.id)).filter((row,index) => {
    bytes += row.bytes;
    return index < HISTORY_LIMIT && (index === 0 || bytes <= BYTE_LIMIT);
  });
}

// A separate IndexedDB avoids multiplying the workspace's localStorage quota.
// Each account and organization/user pair has its own opaque storage key.
export class VersionHistory {
  constructor({indexedDB=globalThis.indexedDB, now=Date.now}={}) {
    this.indexedDB=indexedDB; this.now=now; this.pending=Promise.resolve(); this.lastAttempt=new Map();
  }
  async open() {
    if (!this.indexedDB) throw new Error('Version history storage is unavailable. Download a backup before restoring.');
    if (!this.database) this.database=new Promise((resolve,reject) => {
      const request=this.indexedDB.open('faithful-repertoire-history',1);
      request.onupgradeneeded=() => request.result.createObjectStore('versions',{keyPath:'id'}).createIndex('workspace','key');
      request.onsuccess=() => resolve(request.result);
      request.onerror=() => {this.database=null;reject(new Error('Version history storage could not be opened.'));};
      request.onblocked=() => {this.database=null;reject(new Error('Close other Faithful Repertoire tabs and try again.'));};
    });
    return this.database;
  }
  async read(key) {
    const db=await this.open();
    return new Promise((resolve,reject) => {
      const tx=db.transaction('versions','readonly');
      const request=tx.objectStore('versions').index('workspace').getAll(key);
      tx.oncomplete=() => resolve(request.result);
      tx.onabort=tx.onerror=() => reject(new Error('Version history could not be read.'));
    });
  }
  async list(key) {
    await this.pending;
    return (await this.read(key)).sort((a,b)=>b.createdAt-a.createdAt).map(({workspace,...metadata})=>({...metadata,source:'device'}));
  }
  async get(key,id) {
    await this.pending;
    const row=(await this.read(key)).find(row=>row.id===id);
    if (!row) throw new Error('This version is no longer available. Refresh the history list.');
    return {...row, workspace:validateWorkspace(row.workspace)};
  }
  capture(key,workspace,{label='Automatic checkpoint',force=false}={}) {
    const createdAt=this.now();
    if(!force && this.lastAttempt.has(key) && createdAt-this.lastAttempt.get(key)<HISTORY_INTERVAL)return Promise.resolve(null);
    this.lastAttempt.set(key,createdAt);
    // Copy synchronously: edits and workspace switches may happen before IDB opens.
    const snapshot=copy(workspace);
    const task=this.pending.catch(()=>{}).then(async() => {
      const valid=validateWorkspace(snapshot),json=JSON.stringify(valid);
      const row={id:crypto.randomUUID(),key,createdAt,label:String(label).slice(0,100),
        summary:historySummary(valid),bytes:new Blob([json]).size,workspace:valid};
      const db=await this.open();
      return new Promise((resolve,reject) => {
        const tx=db.transaction('versions','readwrite'),store=tx.objectStore('versions');
        const request=store.index('workspace').getAll(key);
        let captured=null;
        request.onsuccess=()=>{
          const rows=request.result,latest=rows.sort((a,b)=>b.createdAt-a.createdAt)[0];
          if(!force && latest && (createdAt-latest.createdAt<HISTORY_INTERVAL || workspaceSignature(latest.workspace)===workspaceSignature(valid))) {
            this.lastAttempt.set(key,latest.createdAt);return;
          }
          const keep=new Set(retainedVersions([...rows,row]).map(row=>row.id));
          store.put(row);captured=row.id;
          for(const old of rows)if(!keep.has(old.id))store.delete(old.id);
        };
        tx.oncomplete=()=>resolve(captured);
        tx.onabort=tx.onerror=()=>reject(new Error('Version history is full or unavailable. Download a backup before restoring.'));
      });
    });
    this.pending=task.catch(()=>{if(this.lastAttempt.get(key)===createdAt)this.lastAttempt.delete(key);});
    return task;
  }
}

export class CloudHistory {
  constructor(accounts) {this.accounts=accounts;}
  async rpc(name,body) {
    const owner=this.accounts.userId();
    const result=await this.accounts.request('/rest/v1/rpc/history_'+name,{method:'POST',body,authenticated:true});
    if (owner !== this.accounts.user?.id) throw new Error('The signed-in account changed.');
    return result;
  }
  async list(organization) {
    const rows=await this.rpc('list',{target_org:organization});
    if(!Array.isArray(rows))throw new Error('Account history returned an invalid list.');
    return rows;
  }
  async get(organization,id) {
    const row=await this.rpc('get',{target_org:organization,version_id:id});
    return {...row,workspace:validateWorkspace(row.workspace)};
  }
  capture(organization,label) {return this.rpc('checkpoint',{target_org:organization,version_label:label});}
  apply(organization,workspace,updatedAt,revision) {
    return this.rpc('apply',{target_org:organization,new_workspace:{...workspace,evaluationClient:4},
      expected_updated_at:updatedAt,expected_revision:revision});
  }
}
