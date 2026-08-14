import fp from 'fastify-plugin';
import { config } from '../config/env.js';
import { errorResponse } from '../utils/response.js';

async function authPlugin(fastify, options) {
  fastify.decorate('verifyApiKey', async function (request, reply) {
    // Lewati rute publik seperti healthcheck, swagger docs, dan preflight OPTIONS
    const url = request.url;
    if (
      request.method === 'OPTIONS' ||
      url.startsWith('/api/v1/health') ||
      url.startsWith('/docs') ||
      url.startsWith('/favicon.ico')
    ) {
      return;
    }

    // Ambil API Key dari header x-api-key atau query param apiKey (berguna untuk SSE di browser)
    const apiKey = request.headers['x-api-key'] || request.query.apiKey;

    if (!apiKey) {
      reply.status(401).send(
        errorResponse({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Header "x-api-key" atau query parameter "apiKey" wajib disertakan.'
        })
      );
      return;
    }

    if (apiKey !== config.apiKey) {
      reply.status(403).send(
        errorResponse({
          statusCode: 403,
          error: 'Forbidden',
          message: 'API Key yang diberikan tidak valid.'
        })
      );
      return;
    }
  });

  // Pasang hook preHandler global
  fastify.addHook('preHandler', async (request, reply) => {
    await fastify.verifyApiKey(request, reply);
  });
}

export default fp(authPlugin, {
  name: 'auth-plugin'
});
