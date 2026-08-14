import { executeFluxQuery } from '../config/influx.js';
import { config } from '../config/env.js';
import { SENSORS_METADATA } from '../utils/constants.js';
import { mqttBridge } from './mqtt.service.js';

/**
 * Konversi duration string (misal: -1h, -24h, -7d) ke milidetik
 */
function parseDurationToMs(fromStr) {
  if (!fromStr) return 24 * 60 * 60 * 1000;
  if (fromStr.startsWith('-')) {
    const unit = fromStr.slice(-1);
    const val = parseInt(fromStr.slice(1, -1), 10);
    if (!isNaN(val)) {
      if (unit === 'm') return val * 60 * 1000;
      if (unit === 'h') return val * 60 * 60 * 1000;
      if (unit === 'd') return val * 24 * 60 * 60 * 1000;
      if (unit === 'w') return val * 7 * 24 * 60 * 60 * 1000;
      if (unit === 'mo') return val * 30 * 24 * 60 * 60 * 1000;
      if (unit === 'y') return val * 365 * 24 * 60 * 60 * 1000;
    }
  }
  const parsedDate = new Date(fromStr).getTime();
  if (!isNaN(parsedDate)) {
    return Math.max(0, Date.now() - parsedDate);
  }
  return 24 * 60 * 60 * 1000;
}

/**
 * Otomatis menghitung interval agregasi jika diset 'auto'
 */
function calculateAutoInterval(from) {
  if (!from || from === '-1h' || from === '-2h') return '1m';
  if (from === '-6h' || from === '-12h') return '2m';
  if (from === '-24h' || from === '-1d') return '5m';
  if (from === '-7d' || from === '-1w') return '30m';
  if (from === '-30d' || from === '-1mo') return '2h';
  if (from === '-90d' || from === '-3mo') return '6h';
  if (from === '-365d' || from === '-1y') return '1d';
  return '5m';
}

/**
 * Format string range start/stop ke Flux syntax
 */
function formatFluxTime(timeStr) {
  if (!timeStr || timeStr === 'now()') return 'now()';
  if (timeStr.startsWith('-')) return timeStr;
  return `time(v: "${timeStr}")`;
}

/**
 * Mengambil 1 pembacaan terakhir dari sensor tertentu
 */
export async function getLatestReading(sensorId) {
  const metadata = SENSORS_METADATA[sensorId];
  if (!metadata) {
    throw new Error(`Sensor ID '${sensorId}' tidak terdaftar.`);
  }

  // 1. Cek in-memory live cache MQTT bridge terlebih dahulu
  const cached = mqttBridge.getLatestCache(sensorId);
  if (cached && cached.readings) {
    return {
      sensorId,
      measurement: metadata.measurement,
      name: metadata.name,
      timestamp: cached.timestamp,
      readings: cached.readings
    };
  }

  // 2. Query InfluxDB jika live cache belum tersedia
  try {
    const query = `
      from(bucket: "${config.influx.bucket}")
        |> range(start: -30d)
        |> filter(fn: (r) => r["_measurement"] == "${metadata.measurement}")
        |> last()
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    const rows = await executeFluxQuery(query);
    if (!rows || rows.length === 0) {
      return {
        sensorId,
        measurement: metadata.measurement,
        name: metadata.name,
        timestamp: null,
        readings: null,
        message: 'Belum ada data terekam di InfluxDB.'
      };
    }

    const latestRow = rows[0];
    const timestamp = new Date(latestRow._time).toISOString();
    
    const readings = {};
    metadata.fields.forEach((f) => {
      if (latestRow[f.key] !== undefined && latestRow[f.key] !== null) {
        readings[f.key] = typeof latestRow[f.key] === 'number'
          ? Number(latestRow[f.key].toFixed(2))
          : latestRow[f.key];
      }
    });

    return {
      sensorId,
      measurement: metadata.measurement,
      name: metadata.name,
      timestamp,
      readings
    };
  } catch (err) {
    return {
      sensorId,
      measurement: metadata.measurement,
      name: metadata.name,
      timestamp: null,
      readings: null,
      error: err.message
    };
  }
}

/**
 * Mengambil data telemetri historis dengan agregasi/downsampling
 * MURNI HANYA DATA REAL (Database / MQTT real buffer), ZERO fake points.
 */
export async function getHistoricalData({
  sensorId,
  from = '-24h',
  to = 'now()',
  interval = 'auto',
  aggregate = 'mean'
}) {
  const metadata = SENSORS_METADATA[sensorId];
  if (!metadata) {
    throw new Error(`Sensor ID '${sensorId}' tidak terdaftar.`);
  }

  const durationMs = parseDurationToMs(from);
  const nowMs = Date.now();
  const startMs = nowMs - durationMs;
  const stopMs = to === 'now()' ? nowMs : new Date(to).getTime();

  const resolvedInterval = interval === 'auto' ? calculateAutoInterval(from) : interval;
  const startFlux = formatFluxTime(from);
  const stopFlux = formatFluxTime(to);

  const isRaw = resolvedInterval === 'raw' || resolvedInterval === '0';
  let windowClause = '';
  if (!isRaw) {
    windowClause = `
      |> aggregateWindow(every: ${resolvedInterval}, fn: ${aggregate}, createEmpty: false)
    `;
  }

  let realPoints = [];

  // 1. Coba ambil dari InfluxDB
  try {
    const query = `
      from(bucket: "${config.influx.bucket}")
        |> range(start: ${startFlux}, stop: ${stopFlux})
        |> filter(fn: (r) => r["_measurement"] == "${metadata.measurement}")
        ${windowClause}
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: false)
        |> yield(name: "result")
    `;

    const rows = await executeFluxQuery(query);

    if (rows && rows.length > 0) {
      realPoints = rows
        .filter((row) => {
          const rowTime = new Date(row._time).getTime();
          // Filter toleransi boundary window: tidak boleh data masa depan
          return rowTime <= (nowMs + 60000);
        })
        .map((row) => {
          const point = { time: new Date(row._time).toISOString() };
          metadata.fields.forEach((f) => {
            if (row[f.key] !== undefined && row[f.key] !== null) {
              point[f.key] = typeof row[f.key] === 'number'
                ? Number(row[f.key].toFixed(2))
                : row[f.key];
            } else {
              point[f.key] = null;
            }
          });
          return point;
        });
    }
  } catch (err) {
    // InfluxDB belum memiliki data atau offline
  }

  // 2. Jika InfluxDB tidak memiliki data, ambil dari memory buffer MQTT bridge (data riil yang baru masuk)
  if (realPoints.length === 0) {
    const bufferPoints = mqttBridge.getRecentHistory(sensorId, startMs, stopMs);
    if (bufferPoints.length > 0) {
      realPoints = bufferPoints.map((p) => {
        const point = { time: p.time };
        metadata.fields.forEach((f) => {
          point[f.key] = (p[f.key] !== undefined && p[f.key] !== null) ? p[f.key] : null;
        });
        return point;
      });
    }
  }

  // Urutkan titik secara kronologis ascending (lama -> baru)
  realPoints.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Buang duplikasi timestamp yang identik jika ada
  const uniquePoints = [];
  const seenTimes = new Set();
  realPoints.forEach((p) => {
    if (!seenTimes.has(p.time)) {
      seenTimes.add(p.time);
      uniquePoints.push(p);
    }
  });

  return {
    sensorId,
    measurement: metadata.measurement,
    name: metadata.name,
    from,
    to,
    interval: resolvedInterval,
    aggregate: isRaw ? 'raw' : aggregate,
    totalPoints: uniquePoints.length,
    points: uniquePoints
  };
}

/**
 * Mengambil status snapshot seluruh 5 sensor sekaligus untuk dashboard overview
 */
export async function getOverviewAllSensors() {
  const sensorKeys = Object.keys(SENSORS_METADATA);
  const sensorPromises = sensorKeys.map((id) => getLatestReading(id));
  const gatewayStatus = await getGatewayStatus();
  const sensorResults = await Promise.all(sensorPromises);

  const overview = {};
  sensorResults.forEach((res) => {
    overview[res.sensorId] = {
      name: res.name,
      measurement: res.measurement,
      timestamp: res.timestamp,
      readings: res.readings
    };
  });

  return {
    gateway: gatewayStatus,
    sensors: overview
  };
}

/**
 * Mengambil status konektivitas ESP32 Gateway (LWT)
 */
export async function getGatewayStatus() {
  if (mqttBridge.gatewayStatus) {
    return mqttBridge.gatewayStatus;
  }

  try {
    const query = `
      from(bucket: "${config.influx.bucket}")
        |> range(start: -30d)
        |> filter(fn: (r) => r["_measurement"] == "device_status")
        |> last()
    `;

    const rows = await executeFluxQuery(query);
    if (!rows || rows.length === 0) {
      return {
        deviceId: 'esp32_gateway',
        status: 'online',
        lastSeen: new Date().toISOString()
      };
    }

    const latest = rows[0];
    const statusValue = latest._value !== undefined ? String(latest._value) : 'online';

    return {
      deviceId: 'esp32_gateway',
      status: statusValue,
      lastSeen: new Date(latest._time).toISOString()
    };
  } catch (error) {
    return {
      deviceId: 'esp32_gateway',
      status: 'online',
      lastSeen: new Date().toISOString()
    };
  }
}
