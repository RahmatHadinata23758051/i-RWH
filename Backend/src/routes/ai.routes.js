import { getAiInsight } from '../services/ai.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export default async function aiRoutes(fastify, options) {
  /**
   * POST /api/v1/ai-insight
   * Generate AI Agro-Insight berdasarkan rentang waktu telemetri
   */
  fastify.post('/ai-insight', {
    schema: {
      tags: ['AI Insight'],
      summary: 'Generate AI Agro-Hydrology Insight dari data telemetri',
      body: {
        type: 'object',
        properties: {
          from: { type: 'string', default: '-24h', description: 'Rentang waktu awal (misal: -1h, -6h, -24h, -7d, -30d)' },
          to: { type: 'string', default: 'now()', description: 'Rentang waktu akhir' },
          focusDomain: { type: 'string', enum: ['all', 'microclimate', 'water_quality', 'rainfall'], default: 'all' },
          forceFresh: { type: 'boolean', default: false, description: 'Paksa generate baru tanpa cache' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { from = '-24h', to = 'now()', focusDomain = 'all', forceFresh = false } = request.body || {};
      const result = await getAiInsight({ from, to, focusDomain, forceFresh });
      return reply.code(200).send(
        successResponse({
          statusCode: 200,
          data: result.data,
          message: result.cached ? 'AI Insight diambil dari cache.' : 'AI Insight berhasil digenerate.',
          meta: { cached: result.cached }
        })
      );
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send(
        errorResponse({
          statusCode: 500,
          message: error.message || 'Gagal menghasilkan AI Insight.'
        })
      );
    }
  });

  /**
   * GET /api/v1/ai-insight
   * Quick access endpoint via query parameter
   */
  fastify.get('/ai-insight', {
    schema: {
      tags: ['AI Insight'],
      summary: 'Quick fetch AI Agro-Insight',
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string', default: '-24h' },
          to: { type: 'string', default: 'now()' },
          forceFresh: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { from = '-24h', to = 'now()', forceFresh = false } = request.query || {};
      const result = await getAiInsight({ from, to, forceFresh: Boolean(forceFresh) });
      return reply.code(200).send(
        successResponse({
          statusCode: 200,
          data: result.data,
          message: result.cached ? 'AI Insight diambil dari cache.' : 'AI Insight berhasil digenerate.',
          meta: { cached: result.cached }
        })
      );
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send(
        errorResponse({
          statusCode: 500,
          message: error.message || 'Gagal menghasilkan AI Insight.'
        })
      );
    }
  });
}
