import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '../config/env.js';

async function swaggerPlugin(fastify, options) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'i-RWH Backend API Documentation',
        description: 'REST API & Real-Time Telemetry Documentation untuk Sistem Intelligent Rain Water Harvesting (i-RWH) — Politeknik Negeri Lampung',
        version: '1.0.0',
        contact: {
          name: 'Internet Engineering Tech. — Polinela',
          email: 'lab-iot@polinela.ac.id'
        }
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development Server'
        }
      ],
      components: {
        securitySchemes: {
          apiKeyAuth: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
            description: 'Kunci otorisasi API Key untuk mengakses endpoint i-RWH'
          }
        }
      },
      security: [
        {
          apiKeyAuth: []
        }
      ],
      tags: [
        { name: 'System', description: 'Endpoint pemantauan kesehatan & status server' },
        { name: 'Sensors', description: 'Endpoint data telemetri sensor (latest, history, overview)' },
        { name: 'Realtime', description: 'Server-Sent Events (SSE) live telemetry stream' },
        { name: 'Export', description: 'Ekspor data historis sensor dalam format CSV' }
      ]
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    transformSpecificationClone: true
  });
}

export default fp(swaggerPlugin, {
  name: 'swagger-plugin'
});
