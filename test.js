const { handleRequest } = require('./load_balancer/algorithms/waterfallByLocation');

const SERVERS = [
  { url: 'http://localhost:3001', region: 'in', alive: true },
  { url: 'http://localhost:3002', region: 'us', alive: true },
  { url: 'http://localhost:3003', region: 'eu', alive: true },
];

const clients = [
  { id: 'client-A', location: 'in' },
  { id: 'client-B', location: 'us' },
  { id: 'client-C', location: 'eu' },
  { id: 'client-D', location: 'cn' },
  { id: 'client-E', location: 'au' },
];

async function simulateClients() {
  for (const client of clients) {
    const req = {
      method: 'GET',
      originalUrl: '/',
      body: {},
      headers: {
        'x-client-location': client.location,
        'x-client-id': `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }
    };

    try {
      const res = await handleRequest(req, SERVERS);
      console.log(`✅ [${client.id} | ${client.location}] -> Response from ${res.data}`);
    } catch (err) {
      console.log(`❌ [${client.id} | ${client.location}] -> ${err.message}`);
    }
  }
}

simulateClients();
