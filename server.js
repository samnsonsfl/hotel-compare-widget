
// --- Minimal, safe server.js (no HTML strings inside JS) ---
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Serve static files from /public
app.use('/public', express.static(path.join(__dirname, 'public')));
app.get('/widget', (req, res) => res.sendFile(path.join(__dirname, 'public', 'widget.html')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

const axios = require('axios');

app.get('/api/search', async (req, res) => {
  try {
    const { cityId, checkIn, checkOut, adults = 2, rooms = 1 } = req.query;
    if (!cityId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'cityId, checkIn, checkOut required' });
    }

    // Grab your Agoda credentials from env
    const siteId = process.env.1948292;
    const apiKey = process.env.1948292:71343e83-15b3-4fd9-899f-8766e525ccc2;
    const affiliateCid = process.env.AGODA_AFFILIATE_CID; // for deeplinks if needed

    // Example Affiliate Lite / Long-Tail endpoint (name varies in docs)
    // Replace BASE_URL + params to match your exact spec.
    const BASE_URL = 'https://affiliateapi.agoda.com/v2/hotels'; // placeholder
    const resp = await axios.get(BASE_URL, {
      params: {
        siteId: siteId,
        apiKey: apiKey,
        cityId: cityId,
        checkIn: checkIn,
        checkOut: checkOut,
        rooms: rooms,
        adults: adults,
        currency: 'USD',
        // add more params if your plan allows (price sort, page size, etc.)
      },
      timeout: 15000
    });

    const rows = Array.isArray(resp.data?.results) ? resp.data.results : [];

    // Normalize to what the widget expects
    const hotels = rows.map(r => ({
      hotelName: r.hotelName || r.name,
      imageURL: r.imageURL || r.thumbnailUrl,
      dailyRate: r.dailyRate || r.price,
      currency: r.currency || 'USD',
      starRating: r.starRating || r.stars,
      reviewScore: r.reviewScore || r.rating,
      latitude: r.latitude,
      longitude: r.longitude,
      // use the landingURL from Agoda response if available:
      landingURL: r.landingURL || r.deeplink || r.url
    })).filter(h => h.hotelName);

    res.json({ hotels });

  } catch (e) {
    console.error('Agoda error', e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to fetch from Agoda' });
  }
});


// Serve the widget HTML file directly (no template string)
app.get('/widget', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'widget.html'));
});

// Root -> redirect to widget
app.get('/', (req,res)=> res.redirect('/widget'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
