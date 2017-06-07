const fs = require('fs');
const http = require('http');

const WebSocketServer = require('ws').Server;

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  if (req.method === 'POST' && req.url.startsWith('/upload')) {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const data = Buffer.concat(chunks);

      res.writeHead(200, {'Content-Type': 'text/plain'});

      if (req.url.split('=').pop() === String(data.length)) {
        res.end('DONE');
      } else {
        res.end('');
      }
    });
  } else {
    res.writeHead(405, {'Content-Type': 'text/plain'});
    res.end('');
  }
}).listen(7232);

const wss = new WebSocketServer({
  server,
});

wss.on('connection', (ws) => {
  ws.on('message', (d) => {
    if (d instanceof Buffer) {
      ws.send('DONE');
    } else {
      ws.send('');
    }
  });

  ws.send(fs.readFileSync('./font.ttf'));
});
