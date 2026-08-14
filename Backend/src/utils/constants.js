/**
 * Definisi metadata sensor i-RWH (Intelligent Rain Water Harvesting)
 */

export const SENSORS_METADATA = {
  sensor1: {
    id: 'sensor1',
    name: 'Internal Greenhouse Monitor',
    description: 'Sensor suhu dan kelembapan udara di dalam Greenhouse (AGH3485 Modbus)',
    measurement: 'suhu_humid_1',
    topic: 'polinela/lab/sensor1',
    modbusSlaveId: 1,
    fields: [
      { key: 'temp', label: 'Suhu Udara', unit: '°C', min: -10, max: 60, type: 'float' },
      { key: 'hum', label: 'Kelembapan Udara', unit: '% RH', min: 0, max: 100, type: 'float' }
    ]
  },
  sensor2: {
    id: 'sensor2',
    name: 'External Greenhouse Monitor',
    description: 'Sensor suhu dan kelembapan udara luar ruangan/lingkungan Greenhouse',
    measurement: 'suhu_humid_2',
    topic: 'polinela/lab/sensor2',
    modbusSlaveId: 2,
    fields: [
      { key: 'temp', label: 'Suhu Udara', unit: '°C', min: -10, max: 60, type: 'float' },
      { key: 'hum', label: 'Kelembapan Udara', unit: '% RH', min: 0, max: 100, type: 'float' }
    ]
  },
  sensor3: {
    id: 'sensor3',
    name: 'Water Quality & Nutrient Sensor',
    description: 'Sensor konduktivitas listrik, salinitas, TDS, dan suhu air (ECTDS10-ISO Modbus)',
    measurement: 'konduktivitas',
    topic: 'polinela/lab/sensor3',
    modbusSlaveId: 4,
    fields: [
      { key: 'tempair', label: 'Suhu Air', unit: '°C', min: 0, max: 60, type: 'float' },
      { key: 'ec', label: 'Konduktivitas Listrik (EC)', unit: 'µS/cm', min: 0, max: 20000, type: 'float' },
      { key: 'salinity', label: 'Salinitas Air', unit: 'mg/L', min: 0, max: 10000, type: 'float' },
      { key: 'tds', label: 'Total Dissolved Solids (TDS)', unit: 'ppm', min: 0, max: 10000, type: 'float' }
    ]
  },
  sensor4: {
    id: 'sensor4',
    name: 'pH & Redox (ORP) Water Sensor',
    description: 'Sensor derajat keasaman (pH) dan potensial oksidasi-reduksi air (PHORP10 Modbus)',
    measurement: 'ph_orp',
    topic: 'polinela/lab/sensor4',
    modbusSlaveId: 5,
    fields: [
      { key: 'suhu', label: 'Suhu Air', unit: '°C', min: 0, max: 60, type: 'float' },
      { key: 'ph', label: 'Derajat Keasaman (pH)', unit: 'pH', min: 0, max: 14, type: 'float' },
      { key: 'orp', label: 'Oxidation-Reduction Potential (ORP)', unit: 'mV', min: -2000, max: 2000, type: 'float' }
    ]
  },
  sensor5: {
    id: 'sensor5',
    name: 'Rainfall Tipping Bucket Sensor',
    description: 'Sensor pengukur intensitas curah hujan tipping bucket (Modbus ID 6)',
    measurement: 'curah_hujan',
    topic: 'polinela/lab/sensor5',
    modbusSlaveId: 6,
    fields: [
      { key: 'rain', label: 'Curah Hujan', unit: 'mm', min: 0, max: 500, type: 'float' }
    ],
    notes: 'Tag unit_verified=false sampai kalibrasi corong ember diverifikasi manual.'
  }
};

export const GATEWAY_METADATA = {
  id: 'gateway',
  name: 'ESP32 IoT Modbus Gateway',
  topic: 'polinela/lab/status',
  measurement: 'device_status'
};

export const VALID_AGGREGATES = ['mean', 'max', 'min', 'sum', 'last', 'count', 'median'];

export const ALLOWED_DURATIONS = /^(-?[0-9]+(s|m|h|d|w|mo|y)|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z)$/;
