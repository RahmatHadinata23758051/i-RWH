import { VALID_AGGREGATES } from '../utils/constants.js';

export const sensorParamSchema = {
  type: 'object',
  required: ['sensorId'],
  properties: {
    sensorId: {
      type: 'string',
      enum: ['sensor1', 'sensor2', 'sensor3', 'sensor4', 'sensor5'],
      description: 'Identifier sensor (sensor1 .. sensor5)'
    }
  }
};

export const historyQuerySchema = {
  type: 'object',
  properties: {
    from: {
      type: 'string',
      default: '-24h',
      description: 'Waktu mulai dalam format durasi Influx (misal: -1h, -24h, -7d, -30d) atau ISO 8601'
    },
    to: {
      type: 'string',
      default: 'now()',
      description: 'Waktu selesai dalam format durasi atau ISO 8601 (default: now())'
    },
    interval: {
      type: 'string',
      default: 'auto',
      description: 'Window interval agregasi data (misal: 1m, 5m, 15m, 1h, 1d, atau auto)'
    },
    aggregate: {
      type: 'string',
      enum: VALID_AGGREGATES,
      default: 'mean',
      description: 'Fungsi agregasi Flux (mean, max, min, sum, last, median)'
    }
  }
};

export const exportQuerySchema = {
  type: 'object',
  required: ['sensorId'],
  properties: {
    sensorId: {
      type: 'string',
      enum: ['all', 'sensor1', 'sensor2', 'sensor3', 'sensor4', 'sensor5'],
      description: 'Identifier sensor yang akan diekspor (sensor1..sensor5 atau all)'
    },
    from: {
      type: 'string',
      default: '-7d',
      description: 'Waktu awal rentang ekspor (default: -7d)'
    },
    to: {
      type: 'string',
      default: 'now()',
      description: 'Waktu akhir rentang ekspor'
    },
    interval: {
      type: 'string',
      default: 'auto',
      description: 'Window interval agregasi (misal: 5m, 1h, 1d)'
    },
    aggregate: {
      type: 'string',
      enum: VALID_AGGREGATES,
      default: 'mean',
      description: 'Fungsi agregasi data'
    }
  }
};
