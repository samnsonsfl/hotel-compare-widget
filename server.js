
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

// TEMP: stub /api/search so the widget shows sample hotels (replace with real Agoda call later)
app.get('/api/search', async (req, res) => {
  res.json({
    hotels: [
      {
        hotelName: "Test Hotel Vancouver",
        imageURL: "https://picsum.photos/seed/vanc/400/300",
        dailyRate: 129,
        currency: "USD",
        starRating: 4,
        reviewScore: 8.6,
        landingURL: "https://www.agoda.com/"
      },
      {
        hotelName: "Waterfront Inn",
        imageURL: "https://picsum.photos/seed/water/400/300",
        dailyRate: 149,
        currency: "USD",
        starRating: 5,
        reviewScore: 9.2,
        landingURL: "https://www.agoda.com/"
      }
    ]
  });
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
