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
      console.log('Proxying request to Google Sheets...');
      const response = await fetch(SHEET_URL);
      
      if (!response.ok) {
        throw new Error(`Google Sheets responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch data from Google Sheets', details: error.message });
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
