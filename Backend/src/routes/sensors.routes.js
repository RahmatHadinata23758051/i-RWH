import {
  getLatestReading,
  getHistoricalData,
  getOverviewAllSensors,
  getGatewayStatus
} from '../services/influx.service.js';
import { SENSORS_METADATA } from '../utils/constants.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sensorParamSchema, historyQuerySchema } from '../schemas/sensor.schemas.js';

export default async function sensorsRoutes(fastify, options) {
  // 1. Metadata Seluruh Sensor
  fastify.get(
    '/',
    {
      schema: {
        description: 'Mendapatkan daftar metadata seluruh sensor yang terdaftar di sistem i-RWH',
        tags: ['Sensors'],
        summary: 'Daftar Metadata Sensor'
      }
    },
    async (request, reply) => {
      const sensorsList = Object.values(SENSORS_METADATA);
      return reply.send(
        successResponse({
          statusCode: 200,
          message: 'Metadata seluruh sensor berhasil diambil',
          data: sensorsList
        })
      );
    }
  );

  // 2. Status Konektivitas Gateway ESP32 (LWT)
  fastify.get(
    '/status',
    {
      schema: {
        description: 'Mendapatkan status konektivitas ESP32 Modbus Master Gateway (online/offline)',
        tags: ['Sensors'],
        summary: 'Status Heartbeat Gateway ESP32'
      }
    },
    async (request, reply) => {
      const status = await getGatewayStatus();
      return reply.send(
        successResponse({
          statusCode: 200,
          message: 'Status gateway berhasil diambil',
          data: status
        })
      );
    }
  );

  // 3. Overview Seluruh Sensor (KPI Dashboard Utama)
  fastify.get(
    '/overview',
    {
      schema: {
        description: 'Mengambil snapshot data terakhir seluruh sensor sekaligus untuk widget KPI dashboard',
        tags: ['Sensors'],
        summary: 'Overview & Snapshot Seluruh Sensor'
      }
    },
    async (request, reply) => {
      const startTime = performance.now();
      const overview = await getOverviewAllSensors();
      const queryTimeMs = Number((performance.now() - startTime).toFixed(2));

      return reply.send(
        successResponse({
          statusCode: 200,
          message: 'Overview data sensor berhasil diambil',
          data: overview,
          meta: { queryTimeMs }
        })
      );
    }
  );

  // 4. Pembacaan Terakhir Satu Sensor (:sensorId/latest)
  fastify.get(
    '/:sensorId/latest',
    {
      schema: {
        description: 'Mengambil data pembacaan telemetri paling mutakhir dari satu sensor',
        tags: ['Sensors'],
        summary: 'Data Terkini Sensor Tertentu',
        params: sensorParamSchema
      }
    },
    async (request, reply) => {
      const { sensorId } = request.params;
      const startTime = performance.now();

      try {
        const latest = await getLatestReading(sensorId);
        const queryTimeMs = Number((performance.now() - startTime).toFixed(2));

        return reply.send(
          successResponse({
            statusCode: 200,
            message: `Data terkini untuk '${sensorId}' berhasil diambil`,
            data: latest,
            meta: { queryTimeMs }
          })
        );
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(
          errorResponse({
            statusCode: 500,
            error: 'Database Query Error',
            message: error.message
          })
        );
      }
    }
  );

  // 5. Data Historis Time-Series Teragregasi (:sensorId/history)
  fastify.get(
    '/:sensorId/history',
    {
      schema: {
        description: 'Mengambil data time-series historis dengan rentang waktu dinamis dan agregasi/downsampling Flux',
        tags: ['Sensors'],
        summary: 'Data Historis Time-Series Sensor',
        params: sensorParamSchema,
        querystring: historyQuerySchema
      }
    },
    async (request, reply) => {
      const { sensorId } = request.params;
      const { from, to, interval, aggregate } = request.query;
      const startTime = performance.now();

      try {
        const history = await getHistoricalData({
          sensorId,
          from,
          to,
          interval,
          aggregate
        });

        const queryTimeMs = Number((performance.now() - startTime).toFixed(2));

        return reply.send(
          successResponse({
            statusCode: 200,
            message: `Data historis '${sensorId}' berhasil diambil (${history.totalPoints} titik data)`,
            data: history,
            meta: {
              queryTimeMs,
              from: history.from,
              to: history.to,
              interval: history.interval,
              aggregate: history.aggregate
            }
          })
        );
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(
          errorResponse({
            statusCode: 500,
            error: 'InfluxDB Query Error',
            message: error.message
          })
        );
      }
    }
  );
}
