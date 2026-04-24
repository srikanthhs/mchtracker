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
    
    // Safety check for query param
    let SHEET_URL = defaultUrl;
    if (typeof req.query.url === 'string' && req.query.url.trim() !== '') {
      SHEET_URL = req.query.url.trim();
    }
    
    console.log(`[PROXY] Requesting URL: "${SHEET_URL}" (Length: ${SHEET_URL.length})`);
    
    try {
      // Validate URL format roughly
      if (!SHEET_URL.startsWith('https://script.google.com')) {
        return res.status(400).json({ error: 'Invalid URL', details: 'Only Google Script URLs are allowed.' });
      }
      const response = await fetch(SHEET_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (HRP-Tracker-Proxy)'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000)
      } as any);
      
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      console.log(`[PROXY] Google Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Handle Google's 404 specifically
        if (response.status === 404) {
          return res.status(404).json({
            error: 'Google Script URL Not Found (404)',
            details: 'The URL you provided does not exist on Google. Check for typos or if the script was deleted.',
            url: SHEET_URL
          });
        }

        return res.status(response.status).json({ 
          error: `Google Error ${response.status}`, 
          details: text.substring(0, 300) || response.statusText,
          url: SHEET_URL
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
