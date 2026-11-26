"use strict";
const $ = (id) => document.getElementById(id),
  text = (id, v) => ($(id).textContent = v),
  fmt = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("en-US", { maximumFractionDigits: 4 })
      : "—",
  date = (t) => new Date(t * 1000).toISOString().slice(0, 10),
  DATA = "stock_lift_real_data_v1",
  FAV = "stock_lift_real_favs_v1";
let datasets = {},
  favorites = [],
  selected = "",
  visible = 120,
  plotted = [],
  hit = [];
function read(k, f) {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? f;
  } catch {
    return f;
  }
}
function validSymbol(s) {
  const v = StockCSV.symbol(s);
  if (v === "DEMO") throw Error("ไม่รองรับข้อมูลตัวอย่าง");
  return v;
}
function cleanFav(v) {
  return Array.isArray(v)
    ? [
        ...new Set(
          v
            .filter((x) => typeof x === "string")
            .flatMap((x) => {
              try {
                return [validSymbol(x)];
              } catch {
                return [];
              }
            }),
        ),
      ].slice(0, 200)
    : [];
}
const old = read("stock_v6_csv", {}),
  saved = read(DATA, old);
if (saved && typeof saved === "object")
  for (const [s, d] of Object.entries(saved)) {
    try {
      if (
        d.demo ||
        (d.source && d.source !== StockMarket.SOURCE) ||
        validSymbol(s) !== s ||
        !/^([A-Z]{3})$/.test(d.currency) ||
        !Array.isArray(d.candles) ||
        !d.candles.length ||
        d.candles.length > 10000
      )
        continue;
      const candles = StockCSV.parse(
        "time,open,high,low,close,volume\n" +
          d.candles
            .map((c) =>
              [c.time, c.open, c.high, c.low, c.close, c.volume].join(","),
            )
            .join("\n"),
      );
      datasets[s] = {
        symbol: s,
        currency: d.currency,
        candles,
        source: d.source,
        fetchedAt: d.fetchedAt,
        latest:
          d.source === StockMarket.SOURCE &&
          Number.isFinite(d.latest?.price) &&
          Number.isFinite(d.latest?.marketTime)
            ? d.latest
            : null,
        stale: d.stale === true,
      };
    } catch {}
  }
favorites = cleanFav(read(FAV, read("tradevision_favs", [])));
selected = Object.keys(datasets)[0] || "";
function button(label, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.onclick = fn;
  return b;
}
function select(s) {
  if (!Object.hasOwn(datasets, s)) return;
  selected = s;
  visible = 120;
  text("backResult", "");
  refresh();
}
function saveFav(next) {
  localStorage.setItem(FAV, JSON.stringify(next));
  favorites = next;
  refresh();
}
function saveData(next) {
  localStorage.setItem(DATA, JSON.stringify(next));
  datasets = next;
}
function remove(s) {
  if (!confirm("ลบข้อมูล " + s + " ออกจากเครื่อง?")) return;
  try {
    const next = { ...datasets };
    delete next[s];
    saveData(next);
    if (selected === s) selected = Object.keys(next)[0] || "";
    refresh();
  } catch (e) {
    text("importStatus", e.message);
  }
}
function refresh() {
  const lib = $("library"),
    watch = $("watchlist"),
    sel = $("selectSymbol");
  lib.replaceChildren();
  watch.replaceChildren();
  sel.replaceChildren();
  if (!Object.keys(datasets).length) lib.textContent = "";
  for (const [s, d] of Object.entries(datasets)) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sel.append(opt);
    const div = document.createElement("div");
    div.className = "chip";
    div.append(
      button(s + " · " + d.candles.length + " แถว", () => select(s)),
      button("ลบ", () => remove(s)),
    );
    lib.append(div);
  }
  sel.value = selected;
  for (const s of favorites) {
    const div = document.createElement("div");
    div.className = "watch";
    const b = button(s, () => select(s));
    b.disabled = !Object.hasOwn(datasets, s);
    div.append(
      b,
      button("×", () => {
        try {
          saveFav(favorites.filter((x) => x !== s));
        } catch (e) {
          text("importStatus", e.message);
        }
      }),
    );
    watch.append(div);
  }
  if (!favorites.length) watch.textContent = "ยังไม่มีรายการโปรด";
  $("favorite").disabled = !selected;
  $("export").disabled = !selected;
  $("runBacktest").disabled = !selected;
  $("favorite").textContent = favorites.includes(selected)
    ? "★ บันทึกแล้ว"
    : "☆ บันทึก";
  render();
  scan();
}
$("importFocus").onclick = () => {
  $("importPanel").scrollIntoView({ behavior: "smooth" });
  $("symbol").focus();
};
$("importForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const s = validSymbol($("symbol").value),
      currency = $("currency").value.trim().toUpperCase(),
      file = $("file").files[0];
    if (!/^[A-Z]{3}$/.test(currency)) throw Error("สกุลเงินต้องมี 3 ตัว");
    if (!file || file.size > 2000000) throw Error("เลือก CSV ขนาดไม่เกิน 2 MB");
    const candles = StockCSV.parse(await file.text());
    if (!Object.hasOwn(datasets, s) && Object.keys(datasets).length >= 12)
      throw Error("เก็บได้สูงสุด 12 หุ้น");
    if (
      Object.hasOwn(datasets, s) &&
      !confirm("แทนที่ข้อมูลเดิมของ " + s + "?")
    )
      return;
    saveData({ ...datasets, [s]: { symbol: s, currency, candles } });
    select(s);
    text(
      "importStatus",
      "นำเข้า " +
        s +
        " สำเร็จ " +
        candles.length +
        " แถว · ล่าสุด " +
        date(candles.at(-1).time),
    );
  } catch (e) {
    text("importStatus", "นำเข้าไม่ได้: " + e.message);
  }
};
$("selectSymbol").onchange = (e) => select(e.target.value);
for (const id of ["interval", "chartType", "ema"])
  $(id).onchange = () => render();
$("favorite").onclick = () => {
  try {
    if (selected)
      saveFav(
        favorites.includes(selected)
          ? favorites.filter((s) => s !== selected)
          : [...favorites, selected].slice(0, 200),
      );
  } catch (e) {
    text("importStatus", e.message);
  }
};
$("zoomIn").onclick = () => {
  visible = Math.max(15, Math.floor(visible / 1.5));
  draw();
};
$("zoomOut").onclick = () => {
  visible = Math.min(10000, Math.ceil(visible * 1.5));
  draw();
};
function metric(n, v) {
  const d = document.createElement("div");
  d.className = "metric";
  const l = document.createElement("small"),
    b = document.createElement("strong");
  l.textContent = n;
  b.textContent = v;
  d.append(l, b);
  $("metrics").append(d);
}
function render() {
  const d = datasets[selected];
  $("metrics").replaceChildren();
  text("hover", "");
  $("emptyChart").hidden = !!d;
  plotted = d ? StockCSV.aggregate(d.candles, $("interval").value) : [];
  if (!d) {
    text("activeSymbol", "ยังไม่ได้เลือกหุ้น");
    text("price", "—");
    text("asof", "ค้นหาหุ้นหรือนำเข้า CSV เพื่อเริ่มใช้งาน");
    text("summary", "ยังไม่มีข้อมูลเพียงพอ");
    text("backResult", "");
    draw();
    return;
  }
  const c = plotted,
    a = StockAnalytics.analyze(c),
    last = d.candles.at(-1),
    recent = c.slice(-20),
    ema = a.ema50.at(-1),
    previous = d.candles.at(-2);
  text("activeSymbol", d.symbol + " / " + d.currency);
  text("price", fmt(d.latest?.price ?? last.close) + " " + d.currency);
  text(
    "asof",
    (d.latest
      ? "ราคาล่าสุด ณ " +
        new Date(d.latest.marketTime * 1000).toLocaleString("th-TH")
      : "ข้อมูลแท่งล่าสุดวันที่ " + date(last.time)) +
      " · " +
      (d.source || "CSV จากผู้ใช้") +
      (d.stale ? " · ข้อมูลสำรองเก่า" : "") +
      (!d.latest && previous
        ? " · " + fmt((last.close / previous.close - 1) * 100) + "% จากวันก่อน"
        : ""),
  );
  for (const [n, v] of [
    ["RSI 14", fmt(a.rsi)],
    ["MACD / Signal", fmt(a.macd) + " / " + fmt(a.signal)],
    ["ATR 14", fmt(a.atr)],
    [
      "Volatility ต่อแท่ง",
      a.volatility == null ? "—" : fmt(a.volatility) + "%",
    ],
    [
      "แนวรับ 20 แท่ง",
      recent.length === 20 ? fmt(Math.min(...recent.map((x) => x.low))) : "—",
    ],
    [
      "แนวต้าน 20 แท่ง",
      recent.length === 20 ? fmt(Math.max(...recent.map((x) => x.high))) : "—",
    ],
    ["Drawdown 20 แท่ง", recent.length === 20 ? fmt(a.drawdown) + "%" : "—"],
    ["Volume แท่งล่าสุด", fmt(c.at(-1).volume)],
    ["EMA 20 / 50", fmt(a.ema20.at(-1)) + " / " + fmt(ema)],
    ["EMA 200", fmt(a.ema200.at(-1))],
    ["Bollinger Bands", a.bands ? a.bands.map(fmt).join(" / ") : "—"],
    ["จำนวนแท่ง", String(c.length)],
  ])
    metric(n, v);
  text(
    "summary",
    (ema == null
      ? "ข้อมูลยังไม่พอสำหรับ EMA50"
      : last.close > ema
        ? "ราคาปิดสูงกว่า EMA50"
        : "ราคาปิดไม่สูงกว่า EMA50") +
      " · " +
      (a.rsi == null
        ? "ข้อมูล RSI ไม่พอ"
        : a.rsi > 70
          ? "RSI สูงกว่า 70"
          : a.rsi < 30
            ? "RSI ต่ำกว่า 30"
            : "RSI อยู่ระหว่าง 30–70") +
      " · คำนวณตามช่วงกราฟที่เลือก",
  );
  draw();
}
function draw() {
  const canvas = $("chart"),
    r = canvas.getBoundingClientRect(),
    w = Math.max(1, r.width),
    h = Math.max(1, r.height),
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  hit = [];
  if (!plotted.length) return;
  const all = plotted,
    c = all.slice(-visible),
    left = 12,
    right = 76,
    top = 20,
    bottom = 40,
    pw = Math.max(1, w - left - right),
    ph = h - top - bottom;
  const a = StockAnalytics.analyze(all),
    overlays = $("ema").checked
      ? [
          ["ema20", "#f5bf60"],
          ["ema50", "#6cafff"],
          ["ema200", "#c09aff"],
        ]
      : [],
    values = c.flatMap((x) => [x.high, x.low]);
  for (const [k] of overlays)
    values.push(...a[k].slice(-c.length).filter(Number.isFinite));
  let lo = Math.min(...values),
    hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) * 0.02 || 1) * 0.07;
  lo -= pad;
  hi += pad;
  const y = (v) => top + ((hi - v) / (hi - lo)) * ph,
    step = pw / c.length,
    x = (i) => left + (i + 0.5) * step;
  ctx.font = "11px system-ui";
  ctx.textBaseline = "middle";
  for (let j = 0; j <= 5; j++) {
    const v = hi - ((hi - lo) * j) / 5,
      Y = y(v);
    ctx.strokeStyle = "#263449";
    ctx.beginPath();
    ctx.moveTo(left, Y);
    ctx.lineTo(w - right, Y);
    ctx.stroke();
    ctx.fillStyle = "#a1b0c2";
    ctx.fillText(fmt(v), w - right + 5, Y);
  }
  const line = (points, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    points.forEach((v, i) => {
      if (!Number.isFinite(v)) {
        started = false;
        return;
      }
      if (started) ctx.lineTo(x(i), y(v));
      else {
        ctx.moveTo(x(i), y(v));
        started = true;
      }
    });
    ctx.stroke();
  };
  if ($("chartType").value === "line")
    line(
      c.map((z) => z.close),
      "#3dd7a2",
    );
  else
    c.forEach((z, i) => {
      const X = x(i),
        color = z.close >= z.open ? "#3dd7a2" : "#ff7888";
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(X, y(z.high));
      ctx.lineTo(X, y(z.low));
      ctx.stroke();
      ctx.fillStyle = color;
      const bw = Math.max(1, Math.min(12, step * 0.65));
      ctx.fillRect(
        X - bw / 2,
        Math.min(y(z.open), y(z.close)),
        bw,
        Math.max(1, Math.abs(y(z.open) - y(z.close))),
      );
    });
  for (const [k, col] of overlays) line(a[k].slice(-c.length), col);
  ctx.fillStyle = "#a1b0c2";
  const ticks = Math.max(1, Math.min(5, Math.floor(pw / 90)));
  for (let i = 0; i < ticks; i++) {
    const j = Math.round((i * (c.length - 1)) / Math.max(1, ticks - 1));
    ctx.fillText(
      date(c[j].time),
      Math.min(w - right - 62, Math.max(left, x(j) - 30)),
      h - 16,
    );
  }
  hit = c.map((z, i) => ({ x: x(i), z }));
}
$("chart").addEventListener("pointermove", (e) => {
  if (!hit.length) return;
  const x = e.clientX - $("chart").getBoundingClientRect().left;
  const { z } = hit.reduce((a, b) =>
    Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b,
  );
  text(
    "hover",
    date(z.time) +
      " · O " +
      fmt(z.open) +
      " · H " +
      fmt(z.high) +
      " · L " +
      fmt(z.low) +
      " · C " +
      fmt(z.close) +
      " · V " +
      fmt(z.volume),
  );
});
new ResizeObserver(draw).observe($("chart"));
function scan() {
  const rows = $("rows");
  rows.replaceChildren();
  const min = Number($("minRSI").value),
    max = Number($("maxRSI").value);
  for (const [s, d] of Object.entries(datasets)) {
    const c = d.candles,
      a = StockAnalytics.analyze(c),
      last = c.at(-1),
      prev = c.at(-2),
      change = prev ? (last.close / prev.close - 1) * 100 : null;
    if (a.rsi != null && (a.rsi < min || a.rsi > max)) continue;
    if (a.rsi == null && (min !== 0 || max !== 100)) continue;
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.append(button(s, () => select(s)));
    tr.append(td);
    for (const [i, v] of [
      fmt(d.latest?.price ?? last.close) + " " + d.currency,
      date(last.time),
      change == null ? "—" : fmt(change) + "%",
      fmt(a.rsi),
    ].entries()) {
      const cell = document.createElement("td");
      cell.textContent = v;
      if (i === 2 && change != null)
        cell.className = change >= 0 ? "up" : "down";
      tr.append(cell);
    }
    rows.append(tr);
  }
  if (!rows.children.length) {
    const tr = document.createElement("tr"),
      td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "ไม่มีข้อมูลตรงเงื่อนไข";
    tr.append(td);
    rows.append(tr);
  }
}
$("minRSI").oninput = scan;
$("maxRSI").oninput = scan;
$("export").onclick = () => {
  const d = datasets[selected];
  if (!d) return;
  const content = [
    "date,open,high,low,close,volume",
    ...d.candles.map((c) =>
      [date(c.time), c.open, c.high, c.low, c.close, c.volume].join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv" })),
    a = document.createElement("a");
  a.href = url;
  a.download = d.symbol + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("runBacktest").onclick = () => {
  try {
    const d = datasets[selected];
    if (!d) throw Error("เลือกหุ้นก่อน");
    const r = StockPro.backtest(d.candles, Number($("fee").value) / 100);
    text(
      "backResult",
      d.symbol +
        " · " +
        r.trades +
        " ธุรกรรม · ผลตอบแทน " +
        fmt(r.returnPct) +
        "% · Buy & Hold " +
        fmt(r.holdPct) +
        "% · Drawdown " +
        fmt(r.drawdown) +
        "% · ผลในอดีตไม่รับประกันอนาคต",
    );
  } catch (e) {
    text("backResult", e.message);
  }
};
refresh();

$("marketForm").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("marketFetch");
  if (b.disabled) return;
  b.disabled = true;
  text("marketStatus", "กำลังค้นหาข้อมูลจาก Yahoo Finance…");
  try {
    const symbol = StockMarket.symbol($("marketSymbol").value);
    if (!Object.hasOwn(datasets, symbol) && Object.keys(datasets).length >= 12)
      throw Error("เก็บได้สูงสุด 12 หุ้น กรุณาลบรายการที่ไม่ใช้");
    const d = await StockMarket.search(symbol);
    if (
      Object.hasOwn(datasets, symbol) &&
      !datasets[symbol].source &&
      !confirm("แทนที่ CSV เดิมของ " + symbol + " ด้วยข้อมูลจากตลาด?")
    ) {
      text("marketStatus", "ยกเลิก");
      return;
    }
    saveData({ ...datasets, [d.symbol]: d });
    select(d.symbol);
    text(
      "marketStatus",
      "ค้นหา " +
        d.symbol +
        " สำเร็จ · ล่าสุด " +
        date(d.candles.at(-1).time) +
        (d.stale
          ? " · ข้อมูลสำรองเก่า (ไม่ได้อัปเดต)"
          : d.cached
            ? " · จากแคช"
            : "") +
        " · " +
        StockMarket.SOURCE,
    );
  } catch (e) {
    let s;
    try {
      s = StockMarket.symbol($("marketSymbol").value);
    } catch {}
    if (s && Object.hasOwn(datasets, s)) {
      select(s);
      text(
        "marketStatus",
        e.message +
          " · แสดงข้อมูลเดิมวันที่ " +
          date(datasets[s].candles.at(-1).time) +
          " (ไม่ได้อัปเดต)",
      );
    } else text("marketStatus", e.message + " · ข้อมูลเดิมไม่ถูกแทนที่");
  } finally {
    b.disabled = false;
  }
};
