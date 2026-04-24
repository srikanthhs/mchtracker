import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Request logger
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API_REQUEST] ${req.method} ${req.url}`);
    }
    next();
  });

  // Force JSON for API
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      version: '1.0.8', 
      node_env: process.env.NODE_ENV || 'development',
      time: new Date().toISOString() 
    });
  });

  // Proxy route for Google Sheets to bypass CORS
  // Simplified path for reliability
  app.get('/api/sheet-data', async (req, res) => {
    console.log(`[API_HIT] /api/sheet-data reached. Query:`, req.query);
    const defaultUrl = 'https://script.google.com/macros/s/AKfycbyMYeC2JL8HW23VUkLY2aYkb7q8KM5CZJe2hGm1TSkuGu0Vpn-PabBMFkALJ2dnZ7VUDA/exec';
    
    // Safety check for query param
    let SHEET_URL = defaultUrl;
    if (typeof req.query.url === 'string' && req.query.url.trim() !== '') {
      SHEET_URL = req.query.url.trim();
    }
    
    console.log(`[PROXY_START] URL: "${SHEET_URL}"`);
    
    try {
      // Validate URL format
      if (!SHEET_URL.startsWith('https://script.google.com')) {
        return res.status(400).json({ 
          error: 'Invalid Google Script URL', 
          details: 'The URL must start with https://script.google.com' 
        });
      }

      const response = await fetch(SHEET_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HRP-Tracker-Proxy/1.0'
        },
        redirect: 'follow', // Crucial: Google redirects to usercontent
        signal: AbortSignal.timeout(25000)
      } as any);
      
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      console.log(`[PROXY_RESULT] Status: ${response.status} ${response.statusText}, Type: ${contentType}`);

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({
            error: 'Google Script 404 Not Found',
            details: 'The deployment URL is incorrect. Ensure you are using the "Web App" URL from the "Deploy" menu.',
            url: SHEET_URL
          });
        }
        return res.status(response.status).json({ 
          error: `Google Server Error (${response.status})`, 
          details: text.substring(0, 500) || response.statusText,
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
          error: 'Unexpected Web Page Received',
          details: lowerText.includes('sign in') 
            ? 'PERMISSIONS ERROR: Google is requesting a login. Check your Deployment settings (Who has access: Anyone).'
            : 'The script deployment returned HTML (a web page) instead of JSON data. Check if you pasted the Deployment URL or the Editor URL.',
          snippet: text.substring(0, 200)
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
      
      let message = 'Proxy Connection Failed';
      let details = error.message;

      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        message = 'Google Connection Timeout';
        details = 'The request to Google Apps Script took too long (over 25s). Check if your script is processing too much data.';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
        message = 'DNS Search Failed';
        details = 'Could not resolve script.google.com. This might be a temporary network issue in the container.';
      }

      res.status(500).json({ 
        error: message, 
        details: details 
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
