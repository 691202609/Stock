const market=require('../public/market.js');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function createHandler(env=process.env, fetcher=fetch){
 const cache=new Map(),pending=new Map(); let active=0;
 return async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  const reply=(status,error)=>res.status(status).json({error});
  if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,'Method not allowed');}
  const url=env.SUPABASE_URL||'', key=env.SUPABASE_PUBLISHABLE_KEY||'', owner=env.MARKET_OWNER_USER_ID||'', provider=env.ALPHA_VANTAGE_API_KEY||'';
  let symbol;try{symbol=market.usSymbol(req.query?.symbol);}catch(e){return reply(400,e.message);}
  let validKey=key.startsWith('sb_publishable_');try{if(!validKey&&key.split('.').length===3)validKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{}
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!validKey||!uuid.test(owner)||!(/^[A-Za-z0-9]{8,80}$/.test(provider))||provider.toLowerCase()==='demo')return reply(503,'ยังไม่ได้ตั้งค่าแหล่งข้อมูลหรือบัญชีเจ้าของเว็บไซต์');
  const auth=req.headers?.authorization||'';if(typeof auth!=='string'||!/^Bearer [A-Za-z0-9._-]{10,8192}$/.test(auth))return reply(401,'กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของเว็บไซต์');
  try{const r=await fetcher(url+'/auth/v1/user',{headers:{apikey:key,Authorization:auth},signal:AbortSignal.timeout(5000),redirect:'error'});if(!r.ok)return reply(r.status===401||r.status===403?401:503,'ตรวจสอบบัญชีไม่สำเร็จ');const u=await r.json();if(u.id!==owner)return reply(403,'เฉพาะบัญชีเจ้าของเว็บไซต์ที่ได้รับอนุญาต');}catch{return reply(503,'เชื่อมต่อระบบสมาชิกไม่ได้');}
  if(req.query?.mode==='realtime'){
   try{return res.status(200).json(await market.fetchQuote(symbol,provider,fetcher));}
   catch(e){return reply(502,e.message);}
  }
  const old=cache.get(symbol);if(old&&Date.now()-old.at<900000)return res.status(200).json({...old.data,cached:true});
  try{
   let job=pending.get(symbol);if(!job){if(active>=1)return reply(429,'กำลังดึงข้อมูลหุ้นอื่น กรุณาลองใหม่');active++;job=market.fetchDaily(symbol,provider,'USD',fetcher).then(data=>{if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(symbol,{at:Date.now(),data});return data;}).finally(()=>{active--;pending.delete(symbol);});pending.set(symbol,job);}
   return res.status(200).json(await job);
  }catch(e){return reply(502,e.message);}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
