/**
 * Hotels Compare Widget – single-file Node server
 * ------------------------------------------------
 * What you get:
 * - GET /widget : embeddable UI (iframe-friendly) to search a hotel name/city and compare partners
 * - GET /api/search : backend endpoint that aggregates multiple providers
 * - Provider adapters: Agoda, Priceline, Expedia (mockable) with deep-link builders
 * - Safe-by-default: no keys required to boot; returns demo prices until you add partner APIs or deeplinks
 *
 * How to run locally:
 *   1) `npm init -y && npm i express` (Node 18+ recommended)
 *   2) `node server.js`
 *   3) Open http://localhost:3000/widget
 *
 * Deploy anywhere (Vercel/Render/Fly/EC2). Then embed in Google Sites via:
 *   <iframe src="https://YOUR_HOST/widget" width="100%" height="760" style="border:0"></iframe>
 *
 * ENV you can set later (examples):
 *   PORT=3000
 *   AGODA_AFFILIATE_CID=YOUR_CID
 *   PRICELINE_REFID=YOUR_REFID
 *   EXPEDIA_PARTNER_ATTR=YOUR_ATTR  // placeholder; depends on your program
 *   PROVIDER_MODE=demo              // 'demo' (default) or 'live'
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Utilities ----------
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const asCurrency = (n, code = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n);
const encode = encodeURIComponent;

// ---------- Provider Deep Links (no API calls required) ----------
// These links point users to your partner’s site with prefilled search; replace tracking params with your own.
function agodaDeepLink({ hotelName, city, checkIn, checkOut, adults = 2, rooms = 1 }) {
  const cid = process.env.AGODA_AFFILIATE_CID || 'YOUR_AGODA_CID';
  const query = [hotelName, city].filter(Boolean).join(' ');
  // Agoda search deeplink (general). Specific hotel IDs require API/lookup.
  return `https://www.agoda.com/search?cid=${encode(cid)}&city=0&checkIn=${encode(checkIn)}&checkOut=${encode(checkOut)}&adults=${encode(String(adults))}&rooms=${encode(String(rooms))}&text=${encode(query)}`;
}

function pricelineDeepLink({ hotelName, city, checkIn, checkOut, adults = 2, rooms = 1 }) {
  const refid = process.env.PRICELINE_REFID || 'YOUR_PRICELINE_REFID';
  const query = [hotelName, city].filter(Boolean).join(' ');
  return `https://www.priceline.com/relax/at?refid=${encode(refid)}&plf=pcln&product=hotels&checkin=${encode(checkIn)}&checkout=${encode(checkOut)}&rooms=${encode(String(rooms))}&adults=${encode(String(adults))}&kw=${encode(query)}`;
}

function expediaDeepLink({ hotelName, city, checkIn, checkOut, adults = 2, rooms = 1 }) {
  const partner = process.env.EXPEDIA_PARTNER_ATTR || 'YOUR_EXPEDIA_ATTR'; // placeholder; replace with your program’s param
  const query = [hotelName, city].filter(Boolean).join(' ');
  return `https://www.expedia.com/Hotel-Search?${
    `destination=${encode(query)}&startDate=${encode(checkIn)}&endDate=${encode(checkOut)}&adults=${encode(String(adults))}&rooms=${encode(String(rooms))}&partner=${encode(partner)}`
  }`;
}

// ---------- Provider Adapters ----------
// Two modes: 'demo' (fake prices) and 'live' (where you’ll plug real API calls later).
const PROVIDER_MODE = (process.env.PROVIDER_MODE || 'demo').toLowerCase();

async function adapterAgoda(params) {
  const deeplink = agodaDeepLink(params);
  if (PROVIDER_MODE !== 'live') {
    return { provider: 'Agoda', currency: 'USD', price: 131 + Math.floor(Math.random() * 40), deeplink };
  }
  // TODO: call Agoda Affiliate/Partner API here once approved, then return real price.
  return { provider: 'Agoda', currency: 'USD', price: null, deeplink };
}

async function adapterPriceline(params) {
  const deeplink = pricelineDeepLink(params);
  if (PROVIDER_MODE !== 'live') {
    return { provider: 'Priceline', currency: 'USD', price: 128 + Math.floor(Math.random() * 35), deeplink };
  }
  // TODO: integrate PPS APIs to fetch rate quotes.
  return { provider: 'Priceline', currency: 'USD', price: null, deeplink };
}

async function adapterExpedia(params) {
  const deeplink = expediaDeepLink(params);
  if (PROVIDER_MODE !== 'live') {
    return { provider: 'Expedia', currency: 'USD', price: 134 + Math.floor(Math.random() * 45), deeplink };
  }
  // TODO: integrate Expedia Group Rapid/Partner APIs.
  return { provider: 'Expedia', currency: 'USD', price: null, deeplink };
}

const PROVIDERS = [adapterAgoda, adapterPriceline, adapterExpedia];

// ---------- API ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/search', async (req, res) => {
  try {
    const {
      hotelName = '',
      city = '',
      checkIn = '',
      checkOut = '',
      adults: _adults = '2',
      rooms: _rooms = '1',
      currency = 'USD'
    } = req.query;

    if (!hotelName && !city) return res.status(400).json({ error: 'Provide at least hotelName or city' });
    if (!checkIn || !checkOut) return res.status(400).json({ error: 'Provide checkIn and checkOut (YYYY-MM-DD)' });

    const adults = clamp(parseInt(_adults, 10) || 2, 1, 12);
    const rooms = clamp(parseInt(_rooms, 10) || 1, 1, 8);

    const params = { hotelName, city, checkIn, checkOut, adults, rooms };

    const results = await Promise.allSettled(PROVIDERS.map(p => p(params)));
    const rows = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

    res.json({ currency, items: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------- Embeddable Widget UI ----------
app.get(['/','/widget'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotel Price Compare (Affiliate)</title>
  <style>
    :root { --bg:#0b1020; --card:#121936; --muted:#9fb0ff; --accent:#5b7cff; --text:#e9edff; --ok:#18b26b; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"; background: var(--bg); color: var(--text); }
    .wrap { max-width: 980px; margin: 24px auto; padding: 16px; }
    .card { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.28); }
    .head { padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; justify-content: space-between; align-items:center; }
    .head h1 { font-size: 18px; margin:0; letter-spacing: .3px; color: var(--muted); font-weight:600; }
    form { display:grid; grid-template-columns: 1.2fr 1fr 1fr 1fr .8fr .8fr auto; gap:10px; padding: 16px; }
    input, button { height: 40px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: var(--text); padding: 0 12px; }
    input::placeholder { color: #cbd5ff; opacity: .7; }
    button { background: var(--accent); border: none; font-weight: 600; cursor: pointer; }
    button:hover { filter: brightness(1.05); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.08); text-align: left; }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #c7d2ff; }
    .provider { display:flex; align-items:center; gap:10px; }
    .badge { font-size: 11px; padding:4px 8px; background:#1a234a; border:1px solid rgba(255,255,255,0.12); border-radius:999px; color:#cbd5ff; }
    .price { font-weight: 700; }
    .cta { display:inline-flex; align-items:center; justify-content:center; padding:10px 12px; border-radius:10px; background: #26357a; border:1px solid rgba(255,255,255,0.14); color:#e9edff; text-decoration:none; font-weight:600; }
    .cta:hover { background:#2e3f8d; }
    .hint { font-size:12px; opacity:.85; color:#cbd5ff; }
    .rowok { color: var(--ok); font-size: 12px; font-weight: 700; }
    footer { font-size:12px; color:#cbd5ff; opacity:.75; padding: 10px 16px 16px; }
    @media (max-width: 880px){ form { grid-template-columns: 1fr 1fr 1fr; grid-auto-rows: auto; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="head">
        <h1>Hotel Price Compare (Affiliate)</h1>
        <span class="badge">Embed-ready</span>
      </div>
      <form id="f">
        <input name="hotelName" placeholder="Hotel name (e.g., Fairmont Waterfront)" />
        <input name="city" placeholder="City (e.g., Vancouver, BC)" />
        <input name="checkIn" type="date" />
        <input name="checkOut" type="date" />
        <input name="adults" type="number" min="1" max="12" value="2" />
        <input name="rooms" type="number" min="1" max="8" value="1" />
        <button type="submit">Search</button>
      </form>
      <div id="results">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Price*</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr><td colspan="3" class="hint">Enter a hotel and dates, then hit Search. We\'ll open deep links with your affiliate tags.</td></tr>
          </tbody>
        </table>
      </div>
      <footer>
        * Demo prices shown until you connect live partner APIs. Final prices always on partner site.
      </footer>
    </div>
  </div>
<script>
const $ = sel => document.querySelector(sel);
const tbody = document.querySelector('#tbody');
const f = document.querySelector('#f');

function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

function rowHtml(item, currency){
  var price = (item.price != null)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(item.price)
    : 'Check live';
  var demo = (item.price != null) ? '<span class="rowok">• in demo</span>' : '';
  return '<tr>'
       + '<td class="provider"><span class="badge">' + esc(item.provider) + '</span></td>'
       + '<td class="price">' + price + ' ' + demo + '</td>'
       + '<td><a class="cta" href="' + esc(item.deeplink) + '" target="_blank" rel="noopener">Book on ' + esc(item.provider) + '</a></td>'
       + '</tr>';
}

f.addEventListener('submit', async function(e){
  e.preventDefault();
  var fd = new FormData(f);
  var params = new URLSearchParams();
  for (const pair of fd.entries()) {
    var k = pair[0], v = pair[1];
    if (v) params.set(k, v);
  }

  tbody.innerHTML = '<tr><td colspan="3" class="hint">Searching…</td></tr>';

  try {
    const res = await fetch('/api/search?' + params.toString());
    if(!res.ok) throw new Error('Search failed');
    const data = await res.json();
    if(!data.items || !data.items.length){
      tbody.innerHTML = '<tr><td colspan="3" class="hint">No offers returned. Try adjusting your query.</td></tr>';
      return;
    }
    tbody.innerHTML = data.items.map(function(x){ return rowHtml(x, data.currency || 'USD'); }).join('');
  } catch(err){
    tbody.innerHTML = '<tr><td colspan="3" class="hint">Error: ' + esc(err.message) + '</td></tr>';
  }
});
</script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Hotels Compare Widget running on http://localhost:${PORT}`));
