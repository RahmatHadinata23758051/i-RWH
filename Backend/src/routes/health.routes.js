import { checkInfluxHealth } from '../config/influx.js';
import { successResponse, errorResponse } from '../utils/response.js';

export default async function healthRoutes(fastify, options) {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Healthcheck status sistem backend dan konektivitas InfluxDB v2',
        tags: ['System'],
        summary: 'Pemeriksaan Kesehatan Server & Database',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  uptimeSeconds: { type: 'number' },
                  influxdb: {
                    type: 'object',
                    properties: {
                      connected: { type: 'boolean' },
                      error: { type: 'string' }
                    }
                  }
                }
              },
              meta: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const influxStatus = await checkInfluxHealth();
      const isHealthy = influxStatus.connected;

      const healthData = {
        status: isHealthy ? 'healthy' : 'degraded',
        uptimeSeconds: Math.floor(process.uptime()),
        influxdb: influxStatus
      };

      if (!isHealthy) {
        return reply.status(200).send(
          successResponse({
            statusCode: 200,
            message: 'Server berjalan, namun koneksi InfluxDB v2 bermasalah',
            data: healthData
          })
        );
      }

      return reply.send(
        successResponse({
          statusCode: 200,
          message: 'Sistem i-RWH Backend & InfluxDB beroperasi normal',
          data: healthData
        })
      );
    }
  );
}
