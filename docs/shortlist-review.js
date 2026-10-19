import {shortlistId,shortlistIds,shortlistEntries} from './shortlist-data.js';

export const reviewSchema = 'faithful-shortlist-review-v1';
export const reviewStore = 'faithful-shortlist-review-150-v1';
export const choiceLabels = {keep:'Keep',remove:'Remove',later:'Decide later'};
const ids = new Set(shortlistIds);
export const emptyReview = () => ({schema:reviewSchema,shortlist:shortlistId,cursor:shortlistEntries.find(s=>s.initialChoice==='later').id,
  decisions:Object.fromEntries(shortlistEntries.map(song=>[song.id,{choice:song.initialChoice,note:song.initialChoice==='later'?'Retained for review: original catalog AI rating above 8.5.':song.initialChoice==='keep'?'Owner chose to keep this familiar church song.':'Owner approved retirement from the preloaded catalog.',updatedAt:'2026-10-19T00:00:00Z'}]))});

export function validateShortlistReview(input) {
  if (!input || input.schema!==reviewSchema || input.shortlist!==shortlistId ||
    !input.decisions || typeof input.decisions!=='object' || Array.isArray(input.decisions) ||
    !ids.has(input.cursor)) throw new Error('Choose a decision backup for this 150-song shortlist.');
  const result=emptyReview();result.cursor=input.cursor;
  for(const [id,entry] of Object.entries(input.decisions)) {
    if(!ids.has(id) || !entry || ![null,...Object.keys(choiceLabels)].includes(entry.choice) ||
      typeof entry.note!=='string' || entry.note.length>1000 ||
      typeof entry.updatedAt!=='string' || !Number.isFinite(Date.parse(entry.updatedAt)))
      throw new Error('The decision backup contains an invalid song, choice, note or date.');
    result.decisions[id]={choice:entry.choice,note:entry.note,updatedAt:entry.updatedAt};
  }
  return result;
}

export function reviewCounts(review) {
  const counts={keep:0,remove:0,later:0,unreviewed:0};
  for(const id of shortlistIds)counts[review.decisions[id]?.choice || 'unreviewed']++;
  return {...counts,decided:counts.keep+counts.remove,total:shortlistIds.length};
}

export function setReviewDecision(review,id,choice,note='',now) {
  if(!ids.has(id) || ![null,...Object.keys(choiceLabels)].includes(choice) || typeof note!=='string' || note.length>1000)
    throw new Error('Choose a valid song and decision.');
  const next=structuredClone(review);
  const stamp=now??new Date(Math.max(Date.now(),Date.parse(review.decisions[id]?.updatedAt||'1970-01-01')+1)).toISOString();
  next.decisions[id]={choice,note,updatedAt:stamp};
  return validateShortlistReview(next);
}

export function mergeReviewBackup(current,incoming) {
  const checked=validateShortlistReview(incoming),next=structuredClone(current);
  for(const [id,entry]of Object.entries(checked.decisions)) {
    const existing=next.decisions[id];
    if(!existing || Date.parse(entry.updatedAt)>Date.parse(existing.updatedAt))next.decisions[id]=entry;
  }
  next.cursor=checked.cursor;
  return validateShortlistReview(next);
}

export function decisionCSV(review,songs) {
  const cell=value=>'"'+String(value??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
  return [['Number','Song ID','Title','Artist / association','Decision','Notes'],...songs.map((song,i)=>
    [i+1,song.id,song.title,song.author,choiceLabels[review.decisions[song.id]?.choice]||'Unreviewed',review.decisions[song.id]?.note||''])]
    .map(row=>row.map(cell).join(',')).join('\r\n');
}

export function decisionSummary(review) {
  const counts=reviewCounts(review);
  const group=choice=>shortlistIds.flatMap((id,i)=>review.decisions[id]?.choice===choice?[i+1]:[]).join(', ')||'None';
  return `150-song catalog review\nKeep (${counts.keep}): ${group('keep')}\nRemove (${counts.remove}): ${group('remove')}\nDecide later (${counts.later}): ${group('later')}\nUnreviewed: ${counts.unreviewed}\n\nNumbers refer to the editorial-150-2026-10-19 shortlist. These are catalog-trimming decisions; preserve saved workspace copies.`;
}
