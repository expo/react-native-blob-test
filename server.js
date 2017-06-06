const fs = require('fs');
const http = require('http');

const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({
  server: http.createServer().listen(7232),
});

wss.on('connection', (ws) => {
  ws.on('message', (d) => {
    console.log('Received', d);
  });

  ws.send(fs.readFileSync('./font.ttf'));
});
