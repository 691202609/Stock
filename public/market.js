(function(root){'use strict';
const CSV=typeof module!=='undefined'?require('./csv.js'):root.StockCSV;
const SOURCE='Yahoo Finance (อาจล่าช้า)';
const HEADER='time,open,high,low,close,volume\n';

function symbol(value){
 if(typeof value!=='string')throw Error('กรอก Symbol เช่น IREN หรือ PTT.BK');
 return CSV.symbol(value);
}

function parse(data,ticker){
 const result=data?.chart?.result?.[0];
 const meta=result?.meta;
 const quote=result?.indicators?.quote?.[0];
 if(meta?.symbol?.toUpperCase()!==ticker||!Array.isArray(result?.timestamp)||!quote||!/[A-Za-z]{3,5}/.test(String(meta.currency||'')))throw Error('ไม่พบข้อมูลหุ้นจาก Yahoo Finance');
 const dates=new Map();
 for(const [i,time] of result.timestamp.entries()){
  const values=['open','high','low','close'].map(key=>quote[key]?.[i]);
  if(!Number.isFinite(time)||!values.every(Number.isFinite))continue;
  const day=new Date(time*1000).toISOString().slice(0,10);
  dates.set(day,[day,...values,quote.volume?.[i]??0].join(','));
 }
 const candles=CSV.parse(HEADER+[...dates.values()].join('\n'));
 const price=meta.regularMarketPrice, marketTime=meta.regularMarketTime;
 const latest=Number.isFinite(price)&&price>0&&Number.isFinite(marketTime)&&marketTime>0?{price,marketTime}:null;
 return {symbol:ticker,currency:String(meta.currency).toUpperCase(),candles,latest,source:SOURCE,fetchedAt:new Date().toISOString()};
}

async function fetchDaily(ticker,fetcher=fetch){
 ticker=symbol(ticker);
 const hosts=['query1.finance.yahoo.com','query2.finance.yahoo.com'];
 let lastError='เชื่อมต่อ Yahoo Finance ไม่ได้';
 for(const host of hosts){
  const url=new URL('https://'+host+'/v8/finance/chart/'+encodeURIComponent(ticker));
  url.search=new URLSearchParams({interval:'1d',range:'1y'});
  const response=await fetcher(url.toString(),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'}}).catch(()=>null);
  if(!response){lastError='เชื่อมต่อ Yahoo Finance ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต';continue;}
  if(!response.ok){lastError='Yahoo Finance ตอบ HTTP '+response.status;continue;}
  try{return parse(await response.json(),ticker);}catch(error){lastError=error.message;}
 }
 throw Object.assign(Error(lastError),{status: lastError.includes('429') ? 429 : 502});
}

async function search(ticker,fetcher=fetch){
 ticker=symbol(ticker);
 const response=await fetcher('/api/market?symbol='+encodeURIComponent(ticker),{cache:'no-store',signal:AbortSignal.timeout(30000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.error||'HTTP '+response.status);
 if(data?.symbol!==ticker||data.source!==SOURCE||!/[A-Z]{3,5}/.test(String(data.currency||''))||!Array.isArray(data.candles)||data.candles.length>366)throw Error('ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
 const candles=CSV.parse(HEADER+data.candles.map(c=>[c.time,c.open,c.high,c.low,c.close,c.volume].join(',')).join('\n'));
 return {...data,candles};
}

const api={SOURCE,symbol,parse,fetchDaily,search};
if(typeof module!=='undefined')module.exports=api;else root.StockMarket=api;
})(globalThis);
