import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';

import { config } from './config/env.js';
import swaggerPlugin from './plugins/swagger.js';
import authPlugin from './plugins/auth.js';

import healthRoutes from './routes/health.routes.js';
import sensorsRoutes from './routes/sensors.routes.js';
import realtimeRoutes from './routes/realtime.routes.js';
import exportRoutes from './routes/export.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { errorResponse } from './utils/response.js';

export async function buildApp(opts = {}) {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
              }
            }
          : undefined
    },
    ...opts
  });

  // 1. Plugins Utilitas & Keamanan
  await fastify.register(sensible);

  await fastify.register(cors, {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization']
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false // Agar Swagger UI dapat di-render tanpa blokir CSP
  });

  await fastify.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitTimeWindow
  });

  // 2. Swagger Documentation & Auth Plugins
  await fastify.register(swaggerPlugin);
  await fastify.register(authPlugin);

  // 3. Registrasi Routes API
  await fastify.register(healthRoutes, { prefix: '/api/v1' });
  await fastify.register(sensorsRoutes, { prefix: '/api/v1/sensors' });
  await fastify.register(realtimeRoutes, { prefix: '/api/v1/sensors' });
  await fastify.register(exportRoutes, { prefix: '/api/v1/export' });
  await fastify.register(aiRoutes, { prefix: '/api/v1' });

  // 4. Custom Not Found Handler (404)
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      errorResponse({
        statusCode: 404,
        error: 'Not Found',
        message: `Endpoint '${request.method} ${request.url}' tidak ditemukan.`
      })
    );
  });

  // 5. Global Error Handler (500/4xx)
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Terjadi kesalahan internal server';

    reply.status(statusCode).send(
      errorResponse({
        statusCode,
        error: error.name || 'Internal Server Error',
        message,
        details: config.nodeEnv === 'development' ? error.validation || error.stack : undefined
      })
    );
  });

  return fastify;
}
