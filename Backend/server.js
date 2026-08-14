import { buildApp } from './src/app.js';
import { config } from './src/config/env.js';
import { mqttBridge } from './src/services/mqtt.service.js';

async function startServer() {
  const app = await buildApp();

  // Inisialisasi koneksi MQTT Subscriber untuk live SSE streaming
  mqttBridge.init();

  try {
    await app.listen({
      port: config.port,
      host: config.host
    });

    console.log(`\n========================================================`);
    console.log(`🚀 i-RWH Backend Server running at: http://${config.host}:${config.port}`);
    console.log(`📚 OpenAPI / Swagger UI: http://localhost:${config.port}/docs`);
    console.log(`🩺 Healthcheck: http://localhost:${config.port}/api/v1/health`);
    console.log(`🔑 Default API Key: ${config.apiKey}`);
    console.log(`========================================================\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown handling
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\n[Server] Menerima sinyal ${signal}, mematikan server secara aman...`);
      try {
        await app.close();
        console.log('[Server] Fastify server ditutup.');
        process.exit(0);
      } catch (err) {
        console.error('[Server] Gagal mematikan server:', err);
        process.exit(1);
      }
    });
  }
}

startServer();
