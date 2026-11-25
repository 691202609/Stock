# Stock Lift — chart fix
Run `npm ci` then `npm start` and open http://localhost:3000 (not Live Server).
Thai symbols: PTT.BK or SET:PTT; unqualified symbols try the original first, then .BK. US: AAPL, NVDA; crypto: BTC-USD.
The API uses Yahoo Finance with two hosts. No simulated prices are displayed on failure. Data may be delayed. For Vercel deploy as an Express app with server.js at project root.
