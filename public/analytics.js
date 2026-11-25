(function(root){
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const sd=a=>Math.sqrt(mean(a.map(v=>(v-mean(a))**2)));
function ema(a,n){let v=null;return a.map((x,i)=>{if(i<n-1)return null;v=v===null?mean(a.slice(0,n)):v+(x-v)*2/(n+1);return v;});}
function analyze(c){const p=c.map(x=>x.close),last=p.at(-1);const returns=p.slice(1).map((x,i)=>p[i]>0?x/p[i]-1:0).slice(-20);let peak=0,dd=0;for(const x of p.slice(-20)){peak=Math.max(peak,x);if(peak>0)dd=Math.max(dd,1-x/peak);}
const tr=c.slice(1).map((x,i)=>Math.max(x.high-x.low,Math.abs(x.high-c[i].close),Math.abs(x.low-c[i].close)));let atr=tr.length>=14?mean(tr.slice(0,14)):null;for(const x of tr.slice(14))atr=(atr*13+x)/14;
let gain=null,loss=null;const changes=p.slice(1).map((x,i)=>x-p[i]);if(changes.length>=14){gain=mean(changes.slice(0,14).map(x=>Math.max(x,0)));loss=mean(changes.slice(0,14).map(x=>Math.max(-x,0)));for(const x of changes.slice(14)){gain=(gain*13+Math.max(x,0))/14;loss=(loss*13+Math.max(-x,0))/14;}}
const rsi=gain===null?null:loss===0?(gain===0?50:100):100-100/(1+gain/loss);const e12=ema(p,12),e26=ema(p,26),mac=e26.map((x,i)=>x===null?null:e12[i]-x).filter(x=>x!==null),signal=ema(mac,9).at(-1)??null;const b=p.slice(-20),mid=b.length===20?mean(b):null;return {atr,volatility:returns.length>=2?sd(returns)*100:null,drawdown:dd*100,rsi,macd:mac.at(-1)??null,signal,ema20:ema(p,20),ema50:ema(p,50),ema200:ema(p,200),bands:mid===null?null:[mid-2*sd(b),mid,mid+2*sd(b)],last};}
const api={analyze,ema};if(typeof module!=='undefined')module.exports=api;else root.StockAnalytics=api;
})(globalThis);
