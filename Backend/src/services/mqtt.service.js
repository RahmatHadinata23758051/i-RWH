import mqtt from 'mqtt';
import { config } from '../config/env.js';
import { sseService } from './sse.service.js';
import { writeSensorData } from '../config/influx.js';
import { SENSORS_METADATA } from '../utils/constants.js';

class MqttTelemetryBridge {
  constructor() {
    this.client = null;
    this.latestCache = {
      sensor1: null,
      sensor2: null,
      sensor3: null,
      sensor4: null,
      sensor5: null
    };
    // Buffer memori untuk menyimpan paket telemetri riil yang diterima via MQTT
    this.recentHistory = {
      sensor1: [],
      sensor2: [],
      sensor3: [],
      sensor4: [],
      sensor5: []
    };
    this.gatewayStatus = {
      deviceId: 'esp32_gateway',
      status: 'online',
      lastSeen: new Date().toISOString()
    };
  }

  init() {
    console.log(`[MQTT Bridge] Menghubungkan ke Broker: ${config.mqtt.brokerUrl}`);

    this.client = mqtt.connect(config.mqtt.brokerUrl, {
      username: config.mqtt.username,
      password: config.mqtt.password,
      clientId: `irwh_backend_${Math.random().toString(16).slice(2, 8)}`,
      reconnectPeriod: 3000
    });

    this.client.on('connect', () => {
      console.log(`✅ [MQTT Bridge] Terhubung ke Broker! Subscribing ke ${config.mqtt.topicPrefix}#`);
      this.client.subscribe(`${config.mqtt.topicPrefix}#`, (err) => {
        if (err) {
          console.error('[MQTT Bridge] Gagal subscribe:', err);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      this.handleIncomingMessage(topic, message.toString());
    });

    this.client.on('error', (err) => {
      console.error('[MQTT Bridge Error]:', err.message);
    });
  }

  handleIncomingMessage(topic, rawPayload) {
    const prefix = config.mqtt.topicPrefix;
    const subTopic = topic.replace(prefix, '');
    const now = new Date().toISOString(); // UTC ISO 8601 string dengan 'Z'

    // 1. Handle status LWT gateway
    if (subTopic === 'status') {
      const status = rawPayload.trim();
      this.gatewayStatus = {
        deviceId: 'esp32_gateway',
        status,
        lastSeen: now
      };

      // Broadcast SSE status
      sseService.broadcast('status', {
        deviceId: 'esp32_gateway',
        status,
        time: now
      });
      return;
    }

    // 2. Handle sensor1 .. sensor5
    if (subTopic.startsWith('sensor')) {
      const sensorId = subTopic;
      try {
        const parsed = JSON.parse(rawPayload);

        // Update in-memory latest cache
        this.latestCache[sensorId] = {
          readings: parsed,
          timestamp: now
        };

        // Simpan titik riil ke rolling history buffer (maksimal 500 titik riil)
        if (this.recentHistory[sensorId]) {
          const point = { time: now, ...parsed };
          this.recentHistory[sensorId].push(point);
          if (this.recentHistory[sensorId].length > 500) {
            this.recentHistory[sensorId].shift();
          }
        }

        // Tulis langsung ke InfluxDB v2 jika service aktif
        const meta = SENSORS_METADATA[sensorId];
        if (meta) {
          writeSensorData(meta.measurement, parsed, now);
        }

        // Broadcast SSE live telemetry ke seluruh frontend client yang tersambung
        sseService.broadcast('telemetry', {
          sensorId,
          data: parsed,
          time: now
        });
      } catch (err) {
        console.error(`[MQTT Bridge] Gagal parse JSON dari ${topic}:`, rawPayload);
      }
    }
  }

  getLatestCache(sensorId) {
    return this.latestCache[sensorId] || null;
  }

  getAllCache() {
    return {
      gateway: this.gatewayStatus,
      sensors: this.latestCache
    };
  }

  /**
   * Mengambil riwayat data riil dari memory buffer berdasarkan rentang waktu
   */
  getRecentHistory(sensorId, startMs, stopMs) {
    const history = this.recentHistory[sensorId] || [];
    const nowMs = Date.now();
    return history.filter((p) => {
      const pTime = new Date(p.time).getTime();
      return pTime >= startMs && pTime <= stopMs && pTime <= nowMs;
    });
  }
}

export const mqttBridge = new MqttTelemetryBridge();
