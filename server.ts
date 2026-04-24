import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Proxy route for Google Sheets to bypass CORS
  app.get('/api/sheet-data', async (req, res) => {
    const defaultUrl = 'https://script.google.com/macros/s/AKfycbyMYeC2JL8HW23VUkLY2aYkb7q8KM5CZJe2hGm1TSkuGu0Vpn-PabBMFkALJ2dnZ7VUDA/exec';
    const SHEET_URL = (req.query.url as string) || defaultUrl;
    
    try {
      console.log(`[API] Proxying fetch to: ${SHEET_URL.substring(0, 50)}...`);
      
      const response = await fetch(SHEET_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (HRP-Tracker-Sync)'
        },
        redirect: 'follow'
      });
      
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      console.log(`[API] Google Response: ${response.status}, Content-Type: ${contentType}`);

      if (!response.ok) {
        console.error(`[API] Google Error: ${response.status} - ${text.substring(0, 100)}`);
        return res.status(response.status).json({ 
          error: 'Google Sheets API Error', 
          status: response.status,
          details: text.substring(0, 200)
        });
      }

      // If we got HTML, Google script might be crashing or redirecting
      if (contentType.includes('text/html') || text.trim().startsWith('<!')) {
        const lowerText = text.toLowerCase();
        
        // 1. Script Runtime Error
        const runtimeMatch = text.match(/TypeError: [^<]+/i);
        if (runtimeMatch) {
          return res.status(502).json({ 
            error: 'Google Apps Script Runtime Error',
            details: runtimeMatch[0].replace(/&#39;/g, "'"),
            suggestedFix: 'Your script is crashing. Ensure it uses SpreadsheetApp.openById("ID").'
          });
        }

        // 2. Auth Required
        if (lowerText.includes('sign in') || lowerText.includes('google-signin') || lowerText.includes('servicelogin')) {
          return res.status(403).json({
            error: 'Authorization Required',
            details: 'The script URL is redirecting to a login page.',
            suggestedFix: 'Set "Who has access" to "Anyone" in deployment settings.'
          });
        }

        return res.status(502).json({ 
          error: 'Received HTML instead of Data',
          details: 'The script returned a web page. This usually means the deployment URL is wrong or private.',
          snippet: text.substring(0, 300)
        });
      }

      // Try parsing JSON
      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (parseError) {
        console.error('[API] JSON Parse Error:', parseError);
        res.status(502).json({ 
          error: 'Malformed Data Received', 
          details: 'The script response was not valid JSON.',
          snippet: text.substring(0, 100)
        });
      }
    } catch (error: any) {
      console.error('[API] Proxy Crash:', error);
      res.status(500).json({ 
        error: 'Proxy Connection Failed', 
        details: error.message 
      });
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
