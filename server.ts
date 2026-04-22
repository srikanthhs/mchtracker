import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy route for Google Sheets to bypass CORS
  app.get('/api/sheet-data', async (req, res) => {
    const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyMYeC2JL8HW23VUkLY2aYkb7q8KM5CZJe2hGm1TSkuGu0Vpn-PabBMFkALJ2dnZ7VUDA/exec';
    
    try {
      console.log('Proxying request to Google Sheets:', SHEET_URL);
      const response = await fetch(SHEET_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Vite-Proxy-Server)'
        },
        redirect: 'follow'
      });
      
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      if (!response.ok) {
        console.error(`Google Sheets Error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: 'Google Sheets returned an error', 
          status: response.status,
          details: text.substring(0, 200)
        });
      }

      if (contentType && contentType.includes('text/html')) {
        console.error('Received HTML instead of JSON. Likely a login or error page.');
        return res.status(502).json({ 
          error: 'Received HTML instead of JSON. Please ensure the Google Apps Script is deployed as "Anyone, even anonymous".',
          snippet: text.substring(0, 300)
        });
      }

      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        res.status(502).json({ 
          error: 'Malformed JSON response from Google Sheets', 
          snippet: text.substring(0, 100) 
        });
      }
    } catch (error: any) {
      console.error('Proxy network error:', error);
      res.status(500).json({ error: 'Network error connecting to Google Sheets', details: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
