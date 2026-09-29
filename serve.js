const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let PORT = 3008;
const PUBLIC_DIR = __dirname;
const MAX_PROXY_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50MB limit

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  }
  
  if (reqUrl.startsWith('/api/gemini')) {
    // CORS headers for preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    let body = '';
    req.on('data', chunk => { 
      body += chunk.toString();
      if (body.length > MAX_PROXY_PAYLOAD_SIZE) {
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { model, endpoint, data } = payload;
        
        // Use environment variable for secure API key. 
        // fallback to dummy for development if not set, but in production MUST be set.
        const API_KEY = process.env.GEMINI_API_KEY;
        
        if (!API_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Server API key not configured. Please set GEMINI_API_KEY environment variable.' }));
        }

        // Strict endpoint validation to prevent SSRF
        if (!endpoint || !endpoint.startsWith('v1beta/models/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid API endpoint format.' }));
        }

        const targetUrl = `https://generativelanguage.googleapis.com/${endpoint}?alt=sse&key=${API_KEY}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const apiReq = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        res.writeHead(apiReq.status, {
          'Content-Type': apiReq.headers.get('content-type') || 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        if (apiReq.body) {
           const reader = apiReq.body.getReader();
           while (true) {
             const { done, value } = await reader.read();
             if (done) break;
             res.write(value);
           }
           res.end();
        } else {
           res.end();
        }
      } catch (err) {
        console.error('Proxy Error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Proxy request failed' }));
      }
    });
    return;
  }

  let safePath = '';
  try {
    safePath = path.normalize(decodeURIComponent(reqUrl)).replace(/^(\.\.[\/\\])+/, '');
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  // Prevent accessing hidden files/directories (like .git, .env)
  if (safePath.split(path.sep).some(segment => segment.startsWith('.'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  const filePath = path.join(PUBLIC_DIR, safePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    PORT++;
    console.log(`Port busy, trying port ${PORT}...`);
    server.listen(PORT);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`=======================================================`);
  console.log(`🚀 ফয়জার কনভার্টার অফলাইন সার্ভার চালু হয়েছে!`);
  console.log(`🌐 URL: ${url}`);
  console.log(`📂 ডিরেক্টরি: ${PUBLIC_DIR}`);
  console.log(`=======================================================`);
  console.log(`ব্রাউজারে স্বয়ংক্রিয়ভাবে খোলা হচ্ছে...`);
  
  const startCmd = process.platform === 'win32' ? `start "" "${url}"` :
                   process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(startCmd);
});
