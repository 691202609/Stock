const market=require('../public/market.js');
const TTL=60000, MAX_STALE=7*86400000;
function createHandler(fetcher=fetch, now=Date.now){
 const cache=new Map(),pending=new Map();
 let remaining=30, resetsAt=now()+60000;
 return async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  const reply=(status,error)=>res.status(status).json({error});
  if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,'Method not allowed');}
  let symbol;try{symbol=market.symbol(req.query?.symbol);}catch(e){return reply(400,e.message);}
  const old=cache.get(symbol);if(old&&now()-old.at<TTL)return res.status(200).json({...old.data,cached:true});
  const stale=()=>old&&now()-old.at<MAX_STALE?res.status(200).json({...old.data,cached:true,stale:true,warning:'ใช้ข้อมูลที่บันทึกไว้ ไม่ใช่ข้อมูลอัปเดตใหม่'}):null;
  try{
   let job=pending.get(symbol);
   if(!job){
    const time=now();
    if(time>=resetsAt){remaining=30;resetsAt=time+60000;}
    if(remaining===0||pending.size>=4)throw Object.assign(Error('มีคำขอค้นหาจำนวนมาก กรุณาลองอีกครั้ง'),{status:429});
    remaining--;
    job=(async()=>{
    const data=await market.fetchDaily(symbol,fetcher);
    if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(symbol,{at:now(),data});return data;
   })().finally(()=>pending.delete(symbol));pending.set(symbol,job);}
   return res.status(200).json(await job);
  }catch(e){const fallback=stale();if(fallback)return fallback;return reply(e.status||502,e.message);}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
