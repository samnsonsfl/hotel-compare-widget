/**
 * Hotels Compare Widget – single-file Node server (modern UI)
 * ------------------------------------------------
 * Embeddable widget with refreshed, modern design.
 */

const path = require('path');
app.use('/public', express.static(path.join(__dirname, 'public')));

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const encode = encodeURIComponent;

function agodaDeepLink({ hotelName, city, checkIn, checkOut, adults = 2, rooms = 1 }) {
  const cid = process.env.AGODA_AFFILIATE_CID || 'YOUR_AGODA_CID';
  const query = [hotelName, city].filter(Boolean).join(' ');
  return `https://www.agoda.com/search?cid=${encode(cid)}&city=0&checkIn=${encode(checkIn)}&checkOut=${encode(checkOut)}&adults=${adults}&rooms=${rooms}&text=${encode(query)}`;
}

function pricelineDeepLink({ hotelName, city, checkIn, checkOut, adults = 2, rooms = 1 }) {
  const refid = process.env.PRICELINE_REFID || 'YOUR_PRICELINE_REFID';
  const query = [hotelName, city].filter(Boolean).join(' ');
  return `https://www.priceline.com/relax/at?refid=${encode(refid)}&plf=pcln&product=hotels&checkin=${encode(checkIn)}&checkout=${encode(checkOut)}&rooms=${rooms}&adults=${adults}&kw=${encode(query)}`;
}

function expediaDeepLink({ hotelName, city, checkIn, checkOut, adults = 2, rooms = 1 }) {
  const partner = process.env.EXPEDIA_PARTNER_ATTR || 'YOUR_EXPEDIA_ATTR';
  const query = [hotelName, city].filter(Boolean).join(' ');
  return `https://www.expedia.com/Hotel-Search?destination=${encode(query)}&startDate=${encode(checkIn)}&endDate=${encode(checkOut)}&adults=${adults}&rooms=${rooms}&partner=${encode(partner)}`;
}

const PROVIDER_MODE = (process.env.PROVIDER_MODE || 'demo').toLowerCase();

async function adapterAgoda(params) {
  return { provider: 'Agoda', currency: 'USD', price: PROVIDER_MODE==='demo'? 120+Math.floor(Math.random()*30):null, deeplink: agodaDeepLink(params)};
}
async function adapterPriceline(params) {
  return { provider: 'Priceline', currency: 'USD', price: PROVIDER_MODE==='demo'? 115+Math.floor(Math.random()*25):null, deeplink: pricelineDeepLink(params)};
}
async function adapterExpedia(params) {
  return { provider: 'Expedia', currency: 'USD', price: PROVIDER_MODE==='demo'? 125+Math.floor(Math.random()*35):null, deeplink: expediaDeepLink(params)};
}

const PROVIDERS = [adapterAgoda, adapterPriceline, adapterExpedia];

app.get('/api/health', (_req,res)=>res.json({ok:true}));

app.get('/api/search', async (req,res)=>{
  const { hotelName='', city='', checkIn='', checkOut='', adults='2', rooms='1', currency='USD'} = req.query;
  if(!hotelName && !city) return res.status(400).json({error:'Provide hotelName or city'});
  if(!checkIn || !checkOut) return res.status(400).json({error:'Provide checkIn and checkOut'});
  const params = { hotelName, city, checkIn, checkOut, adults:clamp(parseInt(adults)||2,1,12), rooms:clamp(parseInt(rooms)||1,1,8)};
  const results = await Promise.all(PROVIDERS.map(p=>p(params)));
  res.json({ currency, items: results });
});

app.get(['/','/widget'], (_req,res)=>{
  res.setHeader('Content-Type','text/html');
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotel Price Compare (Affiliate)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root{
      --bg: #0b0f1a;
      --bg2: #161c2f;
      --card: rgba(255,255,255,0.06);
      --line: rgba(255,255,255,0.12);
      --text: #e9edff;
      --muted: #b9c3ff;
      --primary: #6aa1ff;
      --primary-2: #7b5bff;
      --ok:#36d399;
      --warn:#ffd166;
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color:var(--text);
      background: radial-gradient(1200px 600px at 10% -10%, #1d2440 0%, rgba(29,36,64,0) 60%),
                  radial-gradient(1000px 500px at 100% 10%, #1b2b55 0%, rgba(27,43,85,0) 60%),
                  linear-gradient(180deg, #0b0f1a 0%, #0b0f1a 100%);
    }
    .wrap{ max-width: 1100px; margin: 28px auto; padding: 16px; }

    /* Card */
    .card{ border:1px solid var(--line); border-radius: 18px; overflow:hidden;
      backdrop-filter: blur(10px); background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
      box-shadow: 0 20px 50px rgba(0,0,0,.35);
      animation: floatIn .5s ease; }
    @keyframes floatIn { from{ opacity:0; transform: translateY(12px); } to{ opacity:1; transform:none; } }

    .head{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding: 18px 22px; border-bottom:1px solid var(--line); }
    .brand{ display:flex; align-items:center; gap:12px; }
    .logo{ width:36px; height:36px; border-radius:10px; background: linear-gradient(135deg, var(--primary), var(--primary-2)); display:grid; place-items:center; font-weight:800; }
    .title{ margin:0; font-size:18px; font-weight:700; letter-spacing:.2px; color:var(--muted); }
    .badge{ font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid var(--line); background: rgba(255,255,255,.05); color:#d8deff; }

    /* Form */
    form{ display:grid; grid-template-columns: 1.2fr 1fr 1fr 1fr .75fr .75fr auto; gap:12px; padding:18px; }
    input, button{ height:44px; border-radius:12px; border:1px solid var(--line); background: rgba(255,255,255,.06); color:var(--text); padding:0 12px; font-size:14px; transition: all .2s ease; }
    input::placeholder{ color:#cbd3ff; opacity:.7 }
    input:focus{ outline:none; border-color:#9db5ff; box-shadow: 0 0 0 3px rgba(106,161,255,.25); background: rgba(255,255,255,.09) }
    button{ background: linear-gradient(135deg, var(--primary), var(--primary-2)); border:none; font-weight:700; letter-spacing:.2px; cursor:pointer }
    button:hover{ filter: brightness(1.07) }

    /* Table */
    .results{ padding: 0 18px 18px; }
    table{ width:100%; border-collapse: separate; border-spacing:0; overflow:hidden; border-radius: 14px; border:1px solid var(--line); background: rgba(255,255,255,.03) }
    thead th{ text-transform:uppercase; letter-spacing:.12em; font-size:11px; color:#c9d3ff; padding:14px 16px; background: rgba(255,255,255,.06); position: sticky; top:0; backdrop-filter: blur(8px); }
    tbody td{ padding:16px; border-top:1px solid rgba(255,255,255,.07); }
    tbody tr{ transition: background .18s ease, transform .18s ease }
    tbody tr:hover{ background: rgba(255,255,255,.05); transform: translateY(-1px) }

    .provider{ display:flex; align-items:center; gap:12px; }
    .provIcon{ width:28px; height:28px; border-radius:8px; background: #1c2348; display:grid; place-items:center; font-size:12px; font-weight:800 }
    .price{ font-weight:800; font-size:16px }
    .rowok{ color: var(--ok); font-size:12px; font-weight:800; margin-left:8px }

    .cta{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; border:1px solid var(--line); background: rgba(255,255,255,.05); text-decoration:none; color:var(--text); font-weight:700; }
    .cta:hover{ background: rgba(255,255,255,.08) }

    .hint{ font-size:13px; color:#cbd5ff; opacity:.85; padding: 14px; }
    footer{ font-size:12px; color:#cbd5ff; opacity:.75; padding: 12px 18px 18px; }

    @media (max-width: 980px){ form{ grid-template-columns: 1fr 1fr 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header"><h1>Compare Hotel Prices</h1><span class="badge">Affiliate Demo</span></div>
      <form id="f">
        <input name="hotelName" placeholder="Hotel name" />
        <input name="city" placeholder="City" />
        <input name="checkIn" type="date" />
        <input name="checkOut" type="date" />
        <input name="adults" type="number" value="2" min="1" max="12" />
        <input name="rooms" type="number" value="1" min="1" max="8" />
        <button type="submit">Search</button>
      </form>
      <div id="results">
        <table><thead><tr><th>Provider</th><th>Price*</th><th></th></tr></thead><tbody id="tbody"><tr><td colspan="3" class="hint">Enter details and click Search.</td></tr></tbody></table>
      </div>
    </div>
  </div>
<script>
const f=document.getElementById('f');
const tbody=document.getElementById('tbody');
function row(item,currency){
  let price=item.price? new Intl.NumberFormat('en-US',{style:'currency',currency}).format(item.price):'Check site';
  return `<tr><td><span class="badge">${item.provider}</span></td><td class="price">${price}</td><td><a class="cta" href="${item.deeplink}" target="_blank">Book</a></td></tr>`;
}
f.addEventListener('submit',async e=>{
  e.preventDefault();
  tbody.innerHTML='<tr><td colspan="3" class="hint">Searching…</td></tr>';
  const fd=new FormData(f);const params=new URLSearchParams(fd);
  const res=await fetch('/api/search?'+params.toString());
  const data=await res.json();
  if(!data.items.length){tbody.innerHTML='<tr><td colspan="3" class="hint">No results.</td></tr>';return;}
  tbody.innerHTML=data.items.map(x=>row(x,data.currency)).join('');
});
</script>
</body></n></html>`);
});

app.listen(PORT,()=>console.log(`Hotels Compare Widget running on port ${PORT}`));
