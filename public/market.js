(function(root){'use strict';
const CSV=typeof module!=='undefined'?require('./csv.js'):root.StockCSV;
function input(symbol,key,currency){symbol=CSV.symbol(symbol);if(!/^[A-Za-z0-9]{8,80}$/.test(key)||key.toLowerCase()==='demo')throw Error('กรอก API Key ฟรีของคุณเอง');if(!/^[A-Z]{3}$/.test(currency))throw Error('ระบุสกุลเงิน 3 ตัว');return {symbol,key,currency};}
function parse(data,symbol,currency){if(!data||typeof data!=='object')throw Error('ข้อมูลตอบกลับไม่ถูกต้อง');if(data.Note||data.Information)throw Error('ผู้ให้บริการจำกัดโควตา หรือหุ้นนี้ต้องใช้แพ็กเกจเพิ่มเติม');if(data['Error Message'])throw Error('ไม่พบหุ้นหรือคำขอไม่ถูกต้อง');const meta=data['Meta Data'], rows=data['Time Series (Daily)'];if(!meta||String(meta['2. Symbol']).toUpperCase()!==symbol||!rows||typeof rows!=='object'||Object.keys(rows).length>100)throw Error('ไม่พบข้อมูลรายวันฟรีของหุ้นนี้');const csv='date,open,high,low,close,volume\n'+Object.entries(rows).map(([day,r])=>[day,r['1. open'],r['2. high'],r['3. low'],r['4. close'],r['5. volume']].join(',')).join('\n');return {symbol,currency,candles:CSV.parse(csv),source:'Alpha Vantage · ราคาปิดย้อนหลัง (ไม่ปรับ corporate actions)',fetchedAt:new Date().toISOString()};}
async function fetchDaily(symbol,key,currency,fetcher=fetch){const v=input(symbol,key,currency);const url=new URL('https://www.alphavantage.co/query');url.search=new URLSearchParams({function:'TIME_SERIES_DAILY',symbol:v.symbol,outputsize:'compact',apikey:v.key});let r;try{r=await fetcher(url.toString(),{cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});}catch{throw Error('เชื่อมต่อผู้ให้บริการไม่ได้ (เครือข่าย/CORS) กรุณาลองใหม่หรือใช้ CSV');}if(!r.ok)throw Error('ผู้ให้บริการตอบ HTTP '+r.status+' · ลองใหม่ภายหลัง');let data;try{data=await r.json()}catch{throw Error('ข้อมูลจากผู้ให้บริการไม่ใช่ JSON');}return parse(data,v.symbol,v.currency);}
function usSymbol(value){if(typeof value!=='string')throw Error('กรอก Symbol หุ้นสหรัฐ');const s=CSV.symbol(value);if(!/^[A-Z]{1,5}$/.test(s))throw Error('รองรับ Symbol หุ้นสหรัฐ 1–5 ตัวอักษร เช่น AAPL');return s;}
async function search(symbol,token,fetcher=fetch){symbol=usSymbol(symbol);const r=await fetcher('/api/market?symbol='+encodeURIComponent(symbol),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(25000)});const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d?.error||'HTTP '+r.status);if(!d||d.symbol!==symbol||d.currency!=='USD'||!Array.isArray(d.candles)||!d.candles.length||d.candles.length>100)throw Error('ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');const candles=CSV.parse('time,open,high,low,close,volume\n'+d.candles.map(c=>[c.time,c.open,c.high,c.low,c.close,c.volume].join(',')).join('\n'));return {...d,candles};}
async function fetchQuote(symbol,key,fetcher=fetch){
 const url=new URL('https://www.alphavantage.co/query');
 url.search=new URLSearchParams({function:'GLOBAL_QUOTE',symbol,apikey:key,entitlement:'realtime'});
 const response=await fetcher(url.toString(),{cache:'no-store',signal:AbortSignal.timeout(15000),redirect:'error'}).catch(()=>null);
 if(!response?.ok)throw Error('เชื่อมต่อแหล่งราคาเรียลไทม์ไม่ได้');
 const data=await response.json().catch(()=>null);
 if(data?.Information||data?.Note)throw Error('ตรวจสอบสิทธิ์ข้อมูลเรียลไทม์หรือโควตา Alpha Vantage');
 const quote=data?.['Global Quote'];
 const price=Number(quote?.['05. price']);
 const tradingDay=quote?.['07. latest trading day'];
 if(quote?.['01. symbol']!==symbol||!Number.isFinite(price)||price<=0||!/^\d{4}-\d{2}-\d{2}$/.test(tradingDay))throw Error('ไม่พบราคาเรียลไทม์ของหุ้นนี้');
 return {symbol,price,tradingDay,fetchedAt:new Date().toISOString()};
}
async function searchQuote(symbol,token){
 symbol=usSymbol(symbol);
 const response=await fetch('/api/market?mode=realtime&symbol='+encodeURIComponent(symbol),{
  headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(25000)
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.error||'HTTP '+response.status);
 if(data?.symbol!==symbol||!Number.isFinite(data.price)||data.price<=0||!/^\d{4}-\d{2}-\d{2}$/.test(data.tradingDay)||!Number.isFinite(Date.parse(data.fetchedAt)))throw Error('ราคาเรียลไทม์จากเซิร์ฟเวอร์ไม่ถูกต้อง');
 return data;
}
const api={input,parse,fetchDaily,fetchQuote,usSymbol,search,searchQuote};if(typeof module!=='undefined')module.exports=api;else root.StockMarket=api;})(globalThis);
