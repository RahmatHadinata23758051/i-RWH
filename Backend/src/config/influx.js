import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { config } from './env.js';

let influxDBInstance = null;
let queryApiInstance = null;
let writeApiInstance = null;

export function getInfluxClient() {
  if (!influxDBInstance) {
    influxDBInstance = new InfluxDB({
      url: config.influx.url,
      token: config.influx.token,
      timeout: config.influx.timeoutMs
    });
  }
  return influxDBInstance;
}

export function getQueryApi() {
  if (!queryApiInstance) {
    const client = getInfluxClient();
    queryApiInstance = client.getQueryApi(config.influx.org);
  }
  return queryApiInstance;
}

export function getWriteApi() {
  if (!writeApiInstance) {
    const client = getInfluxClient();
    writeApiInstance = client.getWriteApi(config.influx.org, config.influx.bucket, 'ms');
  }
  return writeApiInstance;
}

/**
 * Menulis 1 titik telemetri ke InfluxDB v2
 */
export function writeSensorData(measurement, fields, timestamp = new Date()) {
  try {
    const writeApi = getWriteApi();
    const point = new Point(measurement).timestamp(new Date(timestamp));
    Object.entries(fields).forEach(([key, val]) => {
      if (typeof val === 'number' && !isNaN(val)) {
        point.floatField(key, val);
      } else if (typeof val === 'string') {
        point.stringField(key, val);
      } else if (typeof val === 'boolean') {
        point.booleanField(key, val);
      }
    });
    writeApi.writePoint(point);
    writeApi.flush();
  } catch (err) {
    // InfluxDB belum running atau sedang offline
  }
}

/**
 * Eksekusi query Flux dan mengembalikan array of plain objects
 * @param {string} fluxQuery
 * @returns {Promise<Array<Object>>}
 */
export async function executeFluxQuery(fluxQuery) {
  const queryApi = getQueryApi();
  const results = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMetadata) {
        const o = tableMetadata.toObject(row);
        results.push(o);
      },
      error(error) {
        reject(error);
      },
      complete() {
        resolve(results);
      }
    });
  });
}

/**
 * Healthcheck koneksi InfluxDB v2
 * @returns {Promise<{ connected: boolean, error?: string }>}
 */
export async function checkInfluxHealth() {
  try {
    const testQuery = `
      from(bucket: "${config.influx.bucket}")
        |> range(start: -1m)
        |> limit(n: 1)
    `;
    await executeFluxQuery(testQuery);
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error.message || 'Gagal terhubung ke InfluxDB v2'
    };
  }
}
