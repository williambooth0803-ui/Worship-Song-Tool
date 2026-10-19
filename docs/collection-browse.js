import {normalize, searchSongs} from './core.js';
const collator = new Intl.Collator('en', {numeric:true, sensitivity:'base'});
export function createSongMatcher(songs) {
  const ids=new Map(), names=new Map();
  for(const song of songs) {
    if(!ids.has(song.id))ids.set(song.id,song);
    const name=normalize(song.title)+'\u0000'+normalize(song.author);
    if(!names.has(name))names.set(name,song);
  }
  return song=>ids.get(song.id)||names.get(normalize(song.title)+'\u0000'+normalize(song.author));
}
export function completedPlanCounts(plans) {
  const counts=new Map();
  for(const plan of plans)if(plan.status==='completed')for(const item of plan.items)
    if(item.type==='song')counts.set(item.songId,(counts.get(item.songId)||0)+1);
  return counts;
}
export function recordingRelease(song) {
  const dates=(song.recordings||[]).map(r=>r.releaseDate).filter(value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
  return dates.sort()[0]||null;
}
export function sortCollectionSongs(songs, sort='alphabetical', counts=new Map()) {
  const alphabetical=(a,b)=>collator.compare(a.title,b.title)||collator.compare(a.author,b.author)||collator.compare(a.id,b.id);
  return [...songs].sort((a,b)=>{
    if(sort==='popularity')return (counts.get(b.id)||0)-(counts.get(a.id)||0)||alphabetical(a,b);
    if(sort==='oldest'||sort==='newest') {
      const ad=recordingRelease(a),bd=recordingRelease(b);
      if(!ad||!bd)return ad?-1:bd?1:alphabetical(a,b);
      const date=ad.localeCompare(bd)*(sort==='newest'?-1:1);
      return date||alphabetical(a,b);
    }
    return alphabetical(a,b);
  });
}
export function findCollections(packs,records,query,group='') {
  const terms=normalize(query).split(' ').filter(Boolean);
  return packs.filter(pack=> (!group||pack.group===group) &&
    (!terms.length||terms.every(term=>normalize([pack.name,pack.subtitle,pack.group,pack.description].join(' ')).includes(term))||searchSongs(records(pack),query).length>0));
}
export function sortCollections(packs, records, query='', sort='relevance') {
  const title=normalize(query);
  const match=pack=>!title?0:normalize(pack.name)===title?4:
    normalize([pack.name,pack.subtitle].join(' ')).includes(title)?3:
    records(pack).some(song=>normalize(song.title)===title)?2:0;
  return [...packs].sort((a,b)=>
    (sort==='relevance' ? match(b)-match(a)||(a.browseOrder??999)-(b.browseOrder??999) : 0)
    ||collator.compare(a.name,b.name)||collator.compare(a.id,b.id));
}
