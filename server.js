const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('node:path');
const app = express();
app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');next();});
app.use(express.json({limit:"16kb"}));
const cache=new Map(), pending=new Map();
const limits=new Map();
app.use("/api",(req,res,next)=>{const now=Date.now(); if(limits.size>5000)limits.clear(); const k=req.ip; let v=limits.get(k);if(!v||v.until<now)v={n:0,until:now+60000};limits.set(k,v);if(++v.n>120)return res.status(429).json({error:"Too many requests"});next();});
app.get("/api/health",(req,res)=>res.json({ok:true}));
app.use(express.static(path.join(__dirname, 'public')));
const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const intervals = new Set(['1m','2m','5m','15m','30m','60m','90m','1h','1d','5d','1wk','1mo','3mo']);
const ranges = new Set(['1d','5d','1mo','3mo','6mo','1y','2y','5y','10y','ytd','max']);
function candidates(symbol) {
    if (symbol === 'SET' || symbol === 'SET50') return [`^${symbol}.BK`, symbol];
    if (symbol.startsWith('SET:')) return [symbol.slice(4).replace(/\.BK$/, '') + '.BK'];
    return /^[A-Z][A-Z0-9-]*$/.test(symbol) ? [symbol, symbol + '.BK'] : [symbol];
}
function formatChart(result, interval) {
    const quote = result?.indicators?.quote?.[0];
    if (!quote || !Array.isArray(result.timestamp)) return null;
    const candles = new Map();
    const intraday = /^(\d+m|\d+h)$/.test(interval) && !interval.endsWith('mo');
    for (const [i, timestamp] of result.timestamp.entries()) {
        const [open, high, low, close] = ['open','high','low','close'].map(k => quote[k]?.[i]);
        if (![timestamp, open, high, low, close].every(Number.isFinite)) continue;
        const time = intraday ? timestamp : new Date(timestamp * 1000).toISOString().slice(0,10);
        candles.set(time, {time, open, high, low, close, volume: quote.volume?.[i] ?? 0});
    }
    const sorted = [...candles.values()].sort((a,b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0);
    if (!sorted.length) return null;
    return {symbol: result.meta.symbol, currency: result.meta.currency, regularMarketPrice: result.meta.regularMarketPrice ?? sorted.at(-1).close, marketTime: result.meta.regularMarketTime ?? null, fetchedAt: Date.now(), candles: sorted};
}
app.get('/api/chart', async (req, res) => {
    const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim().toUpperCase() : '';
    const interval = req.query.interval || '1d', range = req.query.range || '6mo';
    if (!/^[A-Z0-9^.=:\-]{1,40}$/.test(symbol) || !intervals.has(interval) || !ranges.has(range)) return res.status(400).json({error:'Symbol, interval หรือ range ไม่ถูกต้อง'});
    const key=JSON.stringify([symbol,interval,range]); const old=cache.get(key);
    if(old && Date.now()-old.fetchedAt<45000)return res.json({...old, cached:true});
    if(pending.has(key)){const result=await pending.get(key);return res.status(result.status).json(result.body);}
    const work=(async()=>{
    let upstreamFailure = false;
    for (const candidate of candidates(symbol)) {
        for (const host of hosts) {
            try {
                const {data} = await axios.get(`https://${host}/v8/finance/chart/${encodeURIComponent(candidate)}`, {params:{interval,range}, timeout:4000, headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}});
                const result = formatChart(data?.chart?.result?.[0], interval);
                if (result) {if(cache.size>=500)cache.delete(cache.keys().next().value);cache.set(key,result);return {status:200,body:result};}
                if (!data?.chart) upstreamFailure = true;
            } catch (error) {
                if (error.response?.status !== 404) upstreamFailure = true;
            }
        }
    }
    if(old && Date.now()-old.fetchedAt<86400000)return {status:200,body:{...old,stale:true}};
    return {status:upstreamFailure ? 502 : 404,body:{error: upstreamFailure ? 'ผู้ให้บริการข้อมูลหุ้นไม่พร้อมใช้งาน กรุณาลองใหม่' : `ไม่พบข้อมูล ${symbol} กรุณาตรวจสอบ Symbol เช่น PTT.BK, AAPL, BTC-USD`}};
    })();pending.set(key,work);try{const result=await work;return res.status(result.status).json(result.body);}finally{pending.delete(key);}
});
if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log(`Server Running on port ${process.env.PORT || 3000}`));
module.exports = app;
