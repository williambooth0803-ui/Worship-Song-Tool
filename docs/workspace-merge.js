import {workspaceSignature} from "./saving.js";
const same=(a,b)=>workspaceSignature(a)===workspaceSignature(b);
const copy=x=>x===undefined?undefined:structuredClone(x);
export class MergeConflictError extends Error {constructor(path){super('Two people changed '+path+'. Your browser copy is preserved; review the shared copy before saving.');this.name='WorkspaceConflictError';this.path=path;}}
export function mergeWorkspaces(base,local,remote) {
 if([base,local,remote].some(w=>w?.evaluationHistory!==undefined)) {
  [base,local,remote]=[base,local,remote].map(w=>({...w,evaluationHistory:w.evaluationHistory||[]}));
 }
 function merge(b,l,r,path) {
  if(same(l,r))return copy(l);if(same(l,b))return copy(r);if(same(r,b))return copy(l);
  if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)) {
   if(path.endsWith('.songIds')){const all=new Set([...b,...l,...r]);return [...all].filter(id=>l.includes(id)===b.includes(id)?r.includes(id):l.includes(id));}
   if([...b,...l,...r].every(x=>x&&typeof x==='object'&&typeof x.id==='string')) {
    const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
    const merged=new Map([...new Set([...bm.keys(),...lm.keys(),...rm.keys()])].map(id=>[id,merge(bm.get(id),lm.get(id),rm.get(id),path+'.'+id)]));
    const shared=b.map(x=>x.id).filter(id=>lm.has(id)&&rm.has(id));
    const order=xs=>xs.map(x=>x.id).filter(id=>shared.includes(id));
    const lo=order(l),ro=order(r),bo=shared;
    if(!same(lo,bo)&&!same(ro,bo)&&!same(lo,ro))throw new MergeConflictError(path+' order');
    const primary=same(lo,bo)?r:l,secondary=same(lo,bo)?l:r;
    const ids=primary.map(x=>x.id);
    for(let i=0;i<secondary.length;i++)if(!ids.includes(secondary[i].id)) {
     const previous=secondary.slice(0,i).reverse().find(x=>ids.includes(x.id));
     const following=secondary.slice(i+1).find(x=>ids.includes(x.id));
     const position=previous?ids.indexOf(previous.id)+1:following?ids.indexOf(following.id):ids.length;
     ids.splice(position,0,secondary[i].id);
    }
    return ids.map(id=>merged.get(id)).filter(x=>x!==undefined);
   }
   throw new MergeConflictError(path);
  }
  if(b&&l&&r&&typeof b==='object'&&typeof l==='object'&&typeof r==='object'&&!Array.isArray(b)) {
   const out={};for(const key of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const result=merge(b[key],l[key],r[key],path+'.'+key);if(result!==undefined)out[key]=result;}return out;
  }
  throw new MergeConflictError(path);
 }
 return merge(base,local,remote,'workspace');
}
