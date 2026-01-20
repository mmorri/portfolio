const WebSocket = require('ws');

let wss = null;
const clients = new Map();

function initialize(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    clients.set(clientId, { ws, userId: null, authenticated: false });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(clientId, data);
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      clients.delete(clientId);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(clientId);
    });
    
    ws.send(JSON.stringify({ 
      type: 'connected', 
      clientId,
      message: 'Connected to PII Monitor WebSocket'
    }));
  });
  
  console.log('WebSocket server initialized');
}

function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch (data.type) {
    case 'authenticate':
      client.userId = data.userId;
      client.authenticated = true;
      client.ws.send(JSON.stringify({ type: 'authenticated', userId: data.userId }));
      break;
      
    case 'subscribe':
      client.subscriptions = data.channels || [];
      break;
      
    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
  }
}

function broadcast(event, data, filter = null) {
  if (!wss) return;
  
  const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
  
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!filter || filter(client)) {
        client.ws.send(message);
      }
    }
  });
}

function broadcastToUser(userId, event, data) {
  broadcast(event, data, (client) => client.userId === userId);
}

function notifyNewFinding(finding) {
  broadcast('finding.created', {
    id: finding.id,
    piiType: finding.piiType,
    severity: finding.severity,
    status: finding.status,
    createdAt: finding.createdAt,
  });
}

function notifyFindingUpdated(finding) {
  broadcast('finding.updated', {
    id: finding.id,
    status: finding.status,
    severity: finding.severity,
    updatedAt: finding.updatedAt,
  });
}

function notifyMonitorStatus(status) {
  broadcast('monitor.status', status);
}

function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getConnectedClients() {
  return {
    total: clients.size,
    authenticated: Array.from(clients.values()).filter(c => c.authenticated).length,
  };
}

module.exports = {
  initialize,
  broadcast,
  broadcastToUser,
  notifyNewFinding,
  notifyFindingUpdated,
  notifyMonitorStatus,
  getConnectedClients,
};
