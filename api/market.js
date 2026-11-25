const market=require('../public/market.js');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL=6*3600000, MAX_STALE=7*86400000;
function createHandler(env=process.env, fetcher=fetch, now=Date.now){
 const cache=new Map(),pending=new Map();
 return async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  const reply=(status,error)=>res.status(status).json({error});
  if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,'Method not allowed');}
  const url=env.SUPABASE_URL||'', key=env.SUPABASE_PUBLISHABLE_KEY||'', owner=env.MARKET_OWNER_USER_ID||'', provider=env.ALPHA_VANTAGE_API_KEY||'';
  let symbol;try{symbol=market.usSymbol(req.query?.symbol);}catch(e){return reply(400,e.message);}
  let validKey=key.startsWith('sb_publishable_');try{if(!validKey&&key.split('.').length===3)validKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{}
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!validKey||!uuid.test(owner)||!(/^[A-Za-z0-9]{8,80}$/.test(provider))||provider.toLowerCase()==='demo')return reply(503,'ยังไม่ได้ตั้งค่าแหล่งข้อมูลหรือบัญชีเจ้าของเว็บไซต์');
  const auth=req.headers?.authorization||'';if(typeof auth!=='string'||!/^Bearer [A-Za-z0-9._-]{10,8192}$/.test(auth))return reply(401,'กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของเว็บไซต์');
  const headers={apikey:key,Authorization:auth,'Content-Type':'application/json'};
  try{const r=await fetcher(url+'/auth/v1/user',{headers,signal:AbortSignal.timeout(5000),redirect:'error'});if(!r.ok)return reply(r.status===401||r.status===403?401:503,'ตรวจสอบบัญชีไม่สำเร็จ');const u=await r.json();if(u.id!==owner)return reply(403,'เฉพาะบัญชีเจ้าของเว็บไซต์ที่ได้รับอนุญาต');}catch{return reply(503,'เชื่อมต่อระบบสมาชิกไม่ได้');}
  const old=cache.get(symbol);if(old&&now()-old.at<TTL)return res.status(200).json({...old.data,cached:true});
  const stale=()=>old&&now()-old.at<MAX_STALE?res.status(200).json({...old.data,cached:true,stale:true,warning:'ใช้ข้อมูลที่บันทึกไว้ ไม่ใช่ข้อมูลอัปเดตใหม่'}):null;
  try{
   let job=pending.get(symbol);
   if(!job){job=(async()=>{
    // Reserve centrally before any provider call. Fail closed if migration missing.
    let r;try{r=await fetcher(url+'/rest/v1/rpc/reserve_market_request',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(5000),redirect:'error'});}catch{throw Object.assign(Error('เชื่อมต่อระบบควบคุมโควตาไม่ได้'),{status:503});}
    if(!r.ok)throw Object.assign(Error('ระบบควบคุมโควตาไม่พร้อม กรุณารัน supabase/schema.sql รุ่น 6.4'),{status:503});
    const allowed=await r.json();if(allowed!==true)throw Object.assign(Error('ถึงขีดจำกัด 25 คำขอใน 24 ชั่วโมง หรือกำลังพักระหว่างคำขอ กรุณาลองภายหลัง'),{status:429});
    const data=await market.fetchDaily(symbol,provider,'USD',fetcher);
    if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(symbol,{at:now(),data});return data;
   })().finally(()=>pending.delete(symbol));pending.set(symbol,job);}
   return res.status(200).json(await job);
  }catch(e){const fallback=stale();if(fallback)return fallback;return reply(e.status||502,e.message);}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
