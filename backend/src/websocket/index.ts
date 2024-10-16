import {WebSocket, WebSocketServer} from 'ws';
import http from 'http';
import app from '../index';
import { ORDERBOOK } from '../utils/store';


const server = http.createServer(app);
const wss = new WebSocketServer({ server });


const clients:Set<WebSocket> = new Set();

export function broadcastOrderBookUpdate() {
    const data = JSON.stringify({ type: 'orderbook_update', orderBook: ORDERBOOK });
    clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(data);
        }
    });
}

wss.on('connection', (ws: WebSocket
) => {
    console.log("New client connected");
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'orderbook_init', orderBook: ORDERBOOK }));
    ws.on('close', () => {
        clients.delete(ws);
    });
    ws.on('error', (error) => {
        console.log(`WebSocket error: ${error}`);
        clients.delete(ws);
    });
});