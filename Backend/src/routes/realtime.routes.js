import { sseService } from '../services/sse.service.js';

export default async function realtimeRoutes(fastify, options) {
  fastify.get(
    '/realtime',
    {
      schema: {
        description: 'Membuka koneksi persistent Server-Sent Events (SSE) untuk streaming live telemetry',
        tags: ['Realtime'],
        summary: 'SSE Real-Time Telemetry Stream',
        querystring: {
          type: 'object',
          properties: {
            apiKey: {
              type: 'string',
              description: 'API Key (opsional jika dikirim via query param untuk EventSource browser)'
            }
          }
        }
      }
    },
    async (request, reply) => {
      // Set Header standar SSE
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no');
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');

      reply.raw.flushHeaders();

      // Daftarkan client ke broadcaster
      sseService.addClient(reply);

      request.log.info(
        `[SSE] Client baru terhubung. Total client aktif: ${sseService.getClientCount()}`
      );

      // Jangan panggil reply.send() karena ini persistent stream
    }
  );
}
