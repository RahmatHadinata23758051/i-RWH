import { getHistoricalData } from '../services/influx.service.js';
import { SENSORS_METADATA } from '../utils/constants.js';
import { exportQuerySchema } from '../schemas/sensor.schemas.js';
import { errorResponse } from '../utils/response.js';

export default async function exportRoutes(fastify, options) {
  fastify.get(
    '/csv',
    {
      schema: {
        description: 'Mengekspor data historis sensor ke dalam file format CSV',
        tags: ['Export'],
        summary: 'Download CSV Data Historis Sensor',
        querystring: exportQuerySchema
      }
    },
    async (request, reply) => {
      const { sensorId, from, to, interval, aggregate } = request.query;

      const metadata = SENSORS_METADATA[sensorId];
      if (!metadata) {
        return reply.status(400).send(
          errorResponse({
            statusCode: 400,
            error: 'Bad Request',
            message: `Sensor '${sensorId}' tidak valid.`
          })
        );
      }

      try {
        const history = await getHistoricalData({
          sensorId,
          from,
          to,
          interval,
          aggregate
        });

        // Susun Header CSV
        const fieldKeys = metadata.fields.map((f) => f.key);
        const csvHeader = ['Timestamp', ...fieldKeys].join(',');

        // Susun Baris Data CSV
        const csvRows = history.points.map((point) => {
          const rowValues = [
            point.time,
            ...fieldKeys.map((k) => (point[k] !== undefined ? point[k] : ''))
          ];
          return rowValues.join(',');
        });

        const csvContent = [csvHeader, ...csvRows].join('\r\n');

        const filename = `irwh_${sensorId}_${new Date().toISOString().slice(0, 10)}.csv`;

        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);

        return reply.send(csvContent);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(
          errorResponse({
            statusCode: 500,
            error: 'Export Error',
            message: error.message
          })
        );
      }
    }
  );
}
