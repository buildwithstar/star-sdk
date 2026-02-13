// A simple HTTP server for Playwright tests
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('[E2E Server] Starting...');
console.log(`[E2E Server] Running from: ${__dirname}`);

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './e2e/index.html';
  } else if (filePath === './star-sdk/audio.js') {
    filePath = './dist/index.mjs';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';
  // Correct the base path to be the package root, not the e2e directory.
  const packageRoot = path.join(__dirname, '..');
  console.log(`[E2E Server] Package root calculated as: ${packageRoot}`);
  const fullPath = path.join(packageRoot, filePath);
  console.log(`[E2E Server] Request for ${req.url}, serving ${fullPath}`);

  fs.readFile(fullPath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('404: File Not Found', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(3001, () => {
  console.log('Server running for Playwright tests on port 3001');
});
