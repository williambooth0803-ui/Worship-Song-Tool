export function newPlanSong(values,newId=()=>crypto.randomUUID()) {
  const title=String(values.title||'').trim(),author=String(values.author||'').trim(),version=String(values.version||'').trim();
  if(!title||title.length>200||author.length>300||version.length>300)throw new Error('Enter a song title and keep attribution/version within 300 characters.');
  const minutes=Number(values.minutes||4);if(!Number.isFinite(minutes)||minutes<0.5||minutes>180)throw new Error('Use an estimated duration between 0.5 and 180 minutes.');
  return {id:newId(),title,author:author||'Unknown attribution',version:version||'Version not specified',firstLine:'',themes:[],
    approval:{status:'unreviewed',notes:'',updatedAt:null},
    review:{scores:{accuracy:null,substance:null,language:null,time:null},summary:'',claims:[],concerns:[],uses:[],scriptures:[],sources:[],language:'',time:'',concern:'none',musical:'',key:String(values.key||'').trim(),minutes,notes:'',status:'unreviewed'}};
}
