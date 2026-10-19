import {allCatalogSongs} from './catalog.js';
import {catalogRecordings} from './catalog-recordings.js';
import {artworkURL} from './song-visuals.js';

const records=new Map(allCatalogSongs.map(song=>[song.id,song]));
export function collectionArtwork(pack) {
  const images=[],seen=new Set();
  for(const id of pack.songIds) for(const recording of catalogRecordings[id]||records.get(id)?.recordings||[]) {
    if(!recording.artwork)continue;
    try {
      const url=artworkURL(recording.artwork);
      if(seen.has(url))continue;
      seen.add(url);images.push({url,label:recording.label||records.get(id)?.title||pack.name});
      if(images.length===4)return images;
    } catch { /* Invalid or absent recording artwork keeps the illustrated cover. */ }
  }
  return images;
}
// Original architectural illustrations keep every card visual when photos are
// unavailable. They carry no claim about a particular artist, church or recording.
export function collectionIllustration(pack) {
  const warm=/christmas|grace|gospel/.test(pack.id),dark=/holiness|reformed|hymns/.test(pack.id);
  const background=warm?'#eadfc9':dark?'#34594b':'#dbe5dc';
  const stone=dark?'#9bb1a0':'#b4c6b7',light=warm?'#faf3df':'#f7f4e9';
  const scene=/christmas/.test(pack.id)
    ? `<circle cx="228" cy="40" r="3" fill="${light}"/><path d="m228 23 4 13 13 4-13 4-4 13-4-13-13-4 13-4Z" fill="${light}"/><path d="M0 160 90 112 160 145 245 86 320 140V200H0Z" fill="${stone}"/><path d="m105 132 55-39 55 39v57H105Z" fill="#567664"/><path d="m140 189 20-34 20 34" fill="${light}"/>`
    : /cross/.test(pack.id)
    ? `<circle cx="226" cy="66" r="32" fill="${light}"/><path d="M0 162Q65 125 130 157T320 142V200H0Z" fill="${stone}"/><path d="M78 68h10v27h23v10H88v67H78v-67H55V95h23Z" fill="#34594b"/><path d="M180 171v-20a34 34 0 0 1 68 0v20Z" fill="#567664"/><path d="M200 171v-18a14 14 0 0 1 28 0v18Z" fill="${background}"/>`
    : `<path d="M72 200V84a88 88 0 0 1 176 0v116Z" fill="${stone}"/><path d="M90 200V89a70 70 0 0 1 140 0v111Z" fill="${light}"/><path d="M154 21h12v179h-12Z" fill="${stone}"/><path d="M88 99h144v10H88Z" fill="${stone}"/><path d="M0 183h320v17H0Z" fill="${dark?'#294a3d':'#8aa491'}"/><path d="M37 183v-35q0-23 17-35-9 24-5 70Z" fill="#567664"/><path d="M49 164q-25-9-22-29 21 7 22 29Zm0-9q23-10 25-30-23 8-25 30Z" fill="#567664"/>`;
  return `<svg class="collection-illustration" viewBox="0 0 320 200" aria-hidden="true" focusable="false"><path fill="${background}" d="M0 0h320v200H0Z"/>${scene}</svg>`;
}
