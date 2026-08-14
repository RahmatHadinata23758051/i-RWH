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

      try {
        if (sensorId === 'all') {
          // Ekspor Terpadu Seluruh 5 Sensor Laboratorium
          const [h1, h2, h3, h4, h5] = await Promise.all([
            getHistoricalData({ sensorId: 'sensor1', from, to, interval, aggregate }),
            getHistoricalData({ sensorId: 'sensor2', from, to, interval, aggregate }),
            getHistoricalData({ sensorId: 'sensor3', from, to, interval, aggregate }),
            getHistoricalData({ sensorId: 'sensor4', from, to, interval, aggregate }),
            getHistoricalData({ sensorId: 'sensor5', from, to, interval, aggregate })
          ]);

          // Kumpulkan semua timestamp unik
          const timeMap = new Map();
          const collect = (pts) => {
            if (Array.isArray(pts)) {
              for (const p of pts) {
                if (p.time) timeMap.set(p.time, true);
              }
            }
          };
          collect(h1.points);
          collect(h2.points);
          collect(h3.points);
          collect(h4.points);
          collect(h5.points);

          const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

          const mapByTime = (pts) => {
            const m = new Map();
            if (Array.isArray(pts)) {
              for (const p of pts) {
                if (p.time) m.set(p.time, p);
              }
            }
            return m;
          };

          const m1 = mapByTime(h1.points);
          const m2 = mapByTime(h2.points);
          const m3 = mapByTime(h3.points);
          const m4 = mapByTime(h4.points);
          const m5 = mapByTime(h5.points);

          const csvHeader = [
            'Timestamp_UTC',
            'GH_Internal_Temp_C',
            'GH_Internal_Hum_RH',
            'GH_External_Temp_C',
            'GH_External_Hum_RH',
            'Water_EC_uS_cm',
            'Water_TDS_ppm',
            'Water_Salinity_mgL',
            'Water_Temp_C',
            'Water_pH',
            'Water_ORP_mV',
            'Rainfall_Intensity_mm'
          ].join(',');

          const csvRows = sortedTimes.map((time) => {
            const p1 = m1.get(time) || {};
            const p2 = m2.get(time) || {};
            const p3 = m3.get(time) || {};
            const p4 = m4.get(time) || {};
            const p5 = m5.get(time) || {};

            return [
              time,
              p1.temp !== undefined ? p1.temp : '',
              p1.hum !== undefined ? p1.hum : '',
              p2.temp !== undefined ? p2.temp : '',
              p2.hum !== undefined ? p2.hum : '',
              p3.ec !== undefined ? p3.ec : '',
              p3.tds !== undefined ? p3.tds : '',
              p3.salinity !== undefined ? p3.salinity : '',
              p3.tempair !== undefined ? p3.tempair : '',
              p4.ph !== undefined ? p4.ph : '',
              p4.orp !== undefined ? p4.orp : '',
              p5.rain !== undefined ? p5.rain : ''
            ].join(',');
          });

          const csvContent = [csvHeader, ...csvRows].join('\r\n');
          const filename = `irwh_all_sensors_${from}_${new Date().toISOString().slice(0, 10)}.csv`;

          reply.header('Content-Type', 'text/csv; charset=utf-8');
          reply.header('Content-Disposition', `attachment; filename="${filename}"`);
          return reply.send(csvContent);
        }

        // Ekspor Sensor Spesifik
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

        const history = await getHistoricalData({
          sensorId,
          from,
          to,
          interval,
          aggregate
        });

        // Susun Header CSV
        const fieldKeys = metadata.fields.map((f) => f.key);
        const csvHeader = ['Timestamp_UTC', ...fieldKeys].join(',');

        // Susun Baris Data CSV
        const csvRows = history.points.map((point) => {
          const rowValues = [
            point.time,
            ...fieldKeys.map((k) => (point[k] !== undefined ? point[k] : ''))
          ];
          return rowValues.join(',');
        });

        const csvContent = [csvHeader, ...csvRows].join('\r\n');
        const filename = `irwh_${sensorId}_${from}_${new Date().toISOString().slice(0, 10)}.csv`;

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
