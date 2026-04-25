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
  // Broadening matching and adding robust debugging
  app.all(['/api/sheet-data', '/api/sheet-data/'], async (req, res) => {
    console.log(`[PROXY_INVOKED] Method: ${req.method}, Path: ${req.path}`);
    console.log(`[PROXY_QUERY]`, req.query);

    const defaultUrl = 'https://script.google.com/macros/s/AKfycbyMYeC2JL8HW23VUkLY2aYkb7q8KM5CZJe2hGm1TSkuGu0Vpn-PabBMFkALJ2dnZ7VUDA/exec';
    
    let SHEET_URL = defaultUrl;
    if (typeof req.query.url === 'string' && req.query.url.trim() !== '') {
      SHEET_URL = req.query.url.trim();
    }
    
    // Ensure we don't proxy to ourselves or invalid domains
    if (!SHEET_URL.startsWith('https://script.google.com')) {
      console.warn(`[PROXY_REJECTED] Invalid URL: ${SHEET_URL}`);
      return res.status(400).json({ 
        error: 'Invalid Target URL', 
        details: 'The proxy only supports https://script.google.com URLs.' 
      });
    }

    try {
      console.log(`[PROXY_FETCH] Upstream target: ${SHEET_URL}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for large sheets

      const response = await fetch(SHEET_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (HRP-Tracker-Server/1.1)'
        },
        redirect: 'follow',
        signal: controller.signal
      } as any);

      clearTimeout(timeoutId);

      const status = response.status;
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      console.log(`[PROXY_UPSTREAM_RESPONSE] Status: ${status}, Type: ${contentType}, Size: ${text.length} bytes`);

      if (!response.ok) {
        return res.status(status).json({
          error: `Google Script Error ${status}`,
          details: status === 404 
            ? 'The provided Apps Script URL returned 404. Ensure your script is deployed as a Web App.' 
            : text.substring(0, 500) || 'Upstream server returned an error.',
          targetUrl: SHEET_URL
        });
      }

      // Check if we got JSON
      if (contentType.includes('application/json') || (text.trim().startsWith('[') || text.trim().startsWith('{'))) {
        try {
          const json = JSON.parse(text);
          return res.json(json);
        } catch (e) {
          console.error(`[PROXY_JSON_PARSE_FAIL] Content-Type said JSON but parse failed.`);
        }
      }

      // If it's HTML, check for common Google error pages
      if (contentType.includes('text/html') || text.trim().startsWith('<!')) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('sign in') || lowerText.includes('servicelogin')) {
           return res.status(403).json({
             error: 'Google Auth Required',
             details: 'The script deployment is not public. Set "Who has access" to "Anyone" in Google Apps Script.',
           });
        }

        if (lowerText.includes('script error') || lowerText.includes('typeerror')) {
          return res.status(502).json({
            error: 'Apps Script Runtime Error',
            details: 'The script crashed while executing. Check your script logs in Google Cloud Console.',
            snippet: text.substring(0, 500)
          });
        }

        return res.status(502).json({
          error: 'Expected JSON, Received HTML',
          details: 'The target URL returned a web page instead of data. Ensure you are using the Web App Deployment URL, not the editor URL.',
          snippet: text.substring(0, 200)
        });
      }

      res.json({ data: text, warning: 'Raw response returned as data' });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        return res.status(504).json({
          error: 'Upstream Timeout',
          details: 'The Google Script took too long to respond (limit: 45s). Consider optimizing your script or reducing data size.'
        });
      }
      console.error(`[PROXY_CRASH]`, err);
      res.status(500).json({
        error: 'Proxy Internal Failure',
        details: err.message,
        type: err.name
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
