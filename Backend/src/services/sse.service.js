import EventEmitter from 'events';

class SseBroadcaster extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.pingInterval = null;
    this.initHeartbeat();
  }

  initHeartbeat() {
    // Kirim event ping tiap 15 detik agar koneksi HTTP persistent tidak diputus oleh proxy/browser
    this.pingInterval = setInterval(() => {
      this.broadcast('ping', {
        time: new Date().toISOString(),
        activeClients: this.clients.size
      });
    }, 15000);
  }

  addClient(reply) {
    const client = {
      id: Symbol(),
      reply
    };

    this.clients.add(client);

    // Kirim event 'connected' saat pertama kali tersambung
    this.sendToClient(client, 'connected', {
      message: 'Terhubung ke i-RWH Realtime Telemetry Stream (SSE)',
      timestamp: new Date().toISOString()
    });

    // Cleanup saat koneksi ditutup oleh client
    reply.raw.on('close', () => {
      this.clients.delete(client);
    });

    return client;
  }

  sendToClient(client, eventName, data) {
    try {
      const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
      client.reply.raw.write(payload);
    } catch (err) {
      this.clients.delete(client);
    }
  }

  broadcast(eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.reply.raw.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const sseService = new SseBroadcaster();
