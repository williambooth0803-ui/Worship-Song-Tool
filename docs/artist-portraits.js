// Fixed public artist identities; user searches and private account data are never sent.
const pages={
  'Chris Tomlin':['Chris Tomlin'],'Keith & Kristyn Getty':['Keith Getty','Kristyn Getty'],
  'CityAlight':['CityAlight'],'Sovereign Grace Music':['Sovereign Grace Music'],
  'Matt Redman':['Matt Redman'],'Stuart Townend':['Stuart Townend'],
  'Shane & Shane':['Shane & Shane'],'Phil Wickham':['Phil Wickham'],
  'Brandon Lake':['Brandon Lake'],'Cody Carnes':['Cody Carnes'],
  'Elevation Worship':['Elevation Worship'],'Maverick City Music':['Maverick City Music'],
  'Bethel Music':['Bethel Music'],'Hillsong Worship / Hillsong UNITED':['Hillsong Worship','Hillsong United'],
  'Passion':['Passion (worship band)'],'Housefires':['Housefires (band)'],
  'UPPERROOM':['Upperroom (band)'],'SEU Worship':['SEU Worship'],
  'We The Kingdom':['We the Kingdom'],'Charity Gayle':['Charity Gayle'],
  'Pat Barrett':['Pat Barrett (musician)'],'Ben Cantelon':['Ben Cantelon'],
  'Brooke Ligertwood':['Brooke Fraser'],'Kari Jobe':['Kari Jobe'],
  'Paul Baloche':['Paul Baloche'],'Michael W. Smith':['Michael W. Smith'],
  'Twila Paris':['Twila Paris'],'Keith Green':['Keith Green'],
  'Steven Curtis Chapman':['Steven Curtis Chapman'],'Fernando Ortega':['Fernando Ortega'],
  'Sandra McCracken':['Sandra McCracken'],'Matt Boswell & Matt Papa':['Matt Boswell','Matt Papa'],
  'Tommy Walker':['Tommy Walker (worship leader)'],'Darlene Zschech':['Darlene Zschech'],
  'David Crowder Band / Crowder':['David Crowder Band','David Crowder'],
  'MercyMe':['MercyMe'],'Casting Crowns':['Casting Crowns'],'Citizens':['Citizens (band)'],
  'Travis Cottrell':['Travis Cottrell'],'Charles Billingsley':['Charles Billingsley (singer)'],
  'Elevation RHYTHM':['Elevation Rhythm'],'Red Rocks Worship':['Red Rocks Worship'],
};
const memo=new Map();
const safeURL=(value,host)=>{const url=new URL(value);if(url.protocol!=='https:'||url.hostname!==host||url.username||url.password||url.port)throw new Error('Invalid portrait source.');return url.href;};
const plain=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,2000);
export function portraitPages(name){return pages[name]||[];}
export function portraitMetadata(info,subject,file) {
  const meta=info?.extmetadata,license=plain(meta?.LicenseShortName?.value);
  if(!info?.thumburl||!/(CC BY|Creative Commons|Public domain|CC0)/i.test(license))return null;
  // A subject's image property can contain a logo or record sleeve. Do not call those portraits.
  if(/\.(svg|gif)$/i.test(file)||/\b(logo|album|cover|sleeve|wordmark)\b/i.test(file.replace(/[_-]/g,' ')))return null;
  const url=safeURL(info.thumburl,'upload.wikimedia.org');
  if(!new URL(url).pathname.startsWith('/wikipedia/commons/'))return null;
  const source=safeURL(info.descriptionurl,'commons.wikimedia.org');
  return {url,source,subject:plain(subject),credit:plain(meta?.Artist?.value)||'See source for author',license};
}
export async function loadArtistPortraits(name,{fetcher=globalThis.fetch.bind(globalThis)}={}) {
  if(memo.has(name))return memo.get(name);
  const promise=(async()=>{
    const titles=portraitPages(name);if(!titles.length)return [];
    const url=new URL('https://www.wikidata.org/w/api.php');
    for(const [key,value]of Object.entries({action:'wbgetentities',sites:'enwiki',titles:titles.join('|'),props:'claims|labels|sitelinks',sitefilter:'enwiki',languages:'en',format:'json',origin:'*'}))url.searchParams.set(key,value);
    const response=await fetcher(url.href,{signal:AbortSignal.timeout(10000),credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error('Artist image source unavailable.');
    const data=await response.json(),portraits=[];
    for(const entity of Object.values(data.entities||{})) {
      const subject=entity.sitelinks?.enwiki?.title;
      if(!titles.includes(subject)||entity.missing!==undefined)continue;
      const file=entity.claims?.P18?.find(claim=>claim.rank!=='deprecated'&&claim.mainsnak?.snaktype==='value')?.mainsnak?.datavalue?.value;
      if(typeof file!=='string'||file.length>500)continue;
      const source=new URL('https://commons.wikimedia.org/w/api.php');
      for(const [key,value]of Object.entries({action:'query',titles:'File:'+file,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'240',format:'json',origin:'*'}))source.searchParams.set(key,value);
      const imageResponse=await fetcher(source.href,{signal:AbortSignal.timeout(10000),credentials:'omit',referrerPolicy:'no-referrer'});
      if(!imageResponse.ok)continue;
      const images=await imageResponse.json();
      for(const page of Object.values(images.query?.pages||{})){const image=portraitMetadata(page.imageinfo?.[0],subject,file);if(image){portraits.push(image);break;}}
    }
    return portraits;
  })().catch(()=>[]);
  memo.set(name,promise);return promise;
}
