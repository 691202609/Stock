const test=require('node:test'),a=require('node:assert/strict'),{createHandler}=require('../api/market.js'),m=require('../public/market.js');
const fixture={chart:{result:[{meta:{symbol:'AAPL',currency:'USD',regularMarketPrice:11.5,regularMarketTime:1704297600},timestamp:[1704297600,1704211200],indicators:{quote:[{open:[10,9],high:[12,11],low:[9,8],close:[11,10],volume:[100,50]}]}}]}};
async function call(h,opts={}){const out={};await h({method:'GET',query:{symbol:'AAPL'},headers:{},...opts},{setHeader(k,v){out[k]=v},status(n){out.status=n;return this},json(v){out.body=v;return this}});return out;}
test('anonymous search fetches and caches Yahoo data without config',async()=>{
 let calls=0;
 const handler=createHandler(async url=>{
  calls++;
  a.equal(new URL(url).hostname,'query1.finance.yahoo.com');
  return {ok:true,json:async()=>fixture};
 });
 const result=await call(handler);
 a.equal(result.status,200);
 a.equal(result.body.candles.at(-1).close,11);
 a.equal((await call(handler)).body.cached,true);
 a.equal(calls,1);
});
test('provider failure returns no fake prices',async()=>{
 const result=await call(createHandler(async()=>({ok:false,status:404})));
 a.equal(result.status,502);
 a.match(result.body.error,/404/);
 a.equal(result.body.candles,undefined);
});
test('search validates and uses only same-origin API',async()=>{const d=m.parse(fixture,'AAPL');const r=await m.search('aapl',async(u,o)=>{a.equal(u,'/api/market?symbol=AAPL');a.equal(o.headers?.Authorization,undefined);return {ok:true,json:async()=>d}});a.equal(r.candles.at(-1).close,11)});

test('expired cache returns clearly marked stale real data when upstream fails',async()=>{let time=0,n=0;const h=createHandler(async()=>++n===1?{ok:true,json:async()=>fixture}:{ok:false,status:404},()=>time);a.equal((await call(h)).status,200);time=60001;const r=await call(h);a.equal(r.status,200);a.equal(r.body.stale,true);a.equal(r.body.candles.at(-1).close,11);time=8*86400000;a.equal((await call(h)).status,502)});
test('concurrent same symbol shares a single upstream call',async()=>{
 let calls=0;
 const handler=createHandler(async()=>{
  calls++;
  await new Promise(resolve=>setTimeout(resolve,15));
  return {ok:true,json:async()=>fixture};
 });
 const results=await Promise.all([call(handler),call(handler),call(handler)]);
 a.ok(results.every(result=>result.status===200));
 a.equal(calls,1);
});
test('one market submit button, no realtime premium controls',()=>{const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');const form=html.match(/<form id="marketForm"[\s\S]*?<\/form>/)[0];a.equal((form.match(/<button/g)||[]).length,1);a.match(form,/ค้นหาหุ้น/)});

test('upstream HTTP 429 returns rate limit without automatic retry',async()=>{let n=0;const h=createHandler(async()=>{n++;return {ok:false,status:429}});a.equal((await call(h)).status,429);a.equal(n,1)});
