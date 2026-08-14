import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Security
  apiKey: process.env.API_KEY || 'polinela_irwh_secret_key_2026',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIME_WINDOW || '1 minute',

  // MQTT Broker
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://sdp.polinela.ac.id:1883',
    username: process.env.MQTT_USERNAME || 'septa',
    password: process.env.MQTT_PASSWORD || '123321',
    topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'polinela/lab/'
  },

  // InfluxDB v2
  influx: {
    url: process.env.INFLUX_URL || 'http://localhost:8086',
    token: process.env.INFLUX_TOKEN || 'your-super-secret-admin-token',
    org: process.env.INFLUX_ORG || 'polinela_lab',
    bucket: process.env.INFLUX_BUCKET || 'irwh_sensors',
    timeoutMs: parseInt(process.env.INFLUX_TIMEOUT_MS || '10000', 10)
  },

  // Google Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  }
};
