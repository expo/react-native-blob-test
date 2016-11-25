'use strict';

const WebSocketServer = require('ws').Server;
const http = require('http');
const port = 7273;

const server = http.createServer((req, res) => {
  req.on('data', data => {
    console.log('request received', data);
    res.end('success');
  });
});

server.listen(port);

const wss = new WebSocketServer({ server: server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    console.log('websocket received', data.toString());
  });
});
