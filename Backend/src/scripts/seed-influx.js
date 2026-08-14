import { getWriteApi } from '../config/influx.js';
import { Point } from '@influxdata/influxdb-client';
import { SENSORS_METADATA } from '../utils/constants.js';

/**
 * Script Seeder InfluxDB untuk i-RWH Smart Greenhouse
 * Mengisi riwayat telemetri realistis 24 jam ke belakang ke bucket 'irwh_sensors'
 * Menggunakan measurement name yang tepat sesuai SENSORS_METADATA
 */
async function seedInflux() {
  console.log('🌱 Memulai injeksi data historis 24 jam ke InfluxDB...');

  const writeApi = getWriteApi();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startMs = now - oneDayMs;
  const intervalMs = 60 * 1000; // 1 titik per menit (1.440 titik per sensor)

  let count = 0;

  for (let t = startMs; t <= now; t += intervalMs) {
    const date = new Date(t);
    const hour = date.getHours() + date.getMinutes() / 60; // 0.0 - 24.0

    // 1. Sensor 1: Suhu & Kelembapan Internal GH (suhu_humid_1)
    const temp1 = Number((27.5 + 5.0 * Math.sin(((hour - 6) / 12) * Math.PI) + (Math.random() - 0.5) * 0.3).toFixed(2));
    const hum1 = Number((76.0 - 16.0 * Math.sin(((hour - 6) / 12) * Math.PI) + (Math.random() - 0.5) * 0.8).toFixed(2));
    const p1 = new Point(SENSORS_METADATA.sensor1.measurement)
      .timestamp(date)
      .floatField('temp', temp1)
      .floatField('hum', hum1);
    writeApi.writePoint(p1);

    // 2. Sensor 2: Suhu & Kelembapan Eksternal (suhu_humid_2)
    const temp2 = Number((26.5 + 6.8 * Math.sin(((hour - 6) / 12) * Math.PI) + (Math.random() - 0.5) * 0.5).toFixed(2));
    const hum2 = Number((79.0 - 22.0 * Math.sin(((hour - 6) / 12) * Math.PI) + (Math.random() - 0.5) * 1.2).toFixed(2));
    const p2 = new Point(SENSORS_METADATA.sensor2.measurement)
      .timestamp(date)
      .floatField('temp', temp2)
      .floatField('hum', hum2);
    writeApi.writePoint(p2);

    // 3. Sensor 3: Kualitas Nutrisi Air (konduktivitas: EC, Salinity, TDS, TempAir)
    const ec = Number((1200 + Math.sin(hour) * 35 + (Math.random() - 0.5) * 10).toFixed(2));
    const tds = Number((ec * 0.64 + (Math.random() - 0.5) * 4).toFixed(2));
    const salinity = Number((ec * 0.48 + (Math.random() - 0.5) * 4).toFixed(2));
    const tempair = Number((26.2 + 1.6 * Math.sin(((hour - 8) / 12) * Math.PI) + (Math.random() - 0.5) * 0.2).toFixed(2));
    const p3 = new Point(SENSORS_METADATA.sensor3.measurement)
      .timestamp(date)
      .floatField('ec', ec)
      .floatField('tds', tds)
      .floatField('salinity', salinity)
      .floatField('tempair', tempair);
    writeApi.writePoint(p3);

    // 4. Sensor 4: pH & ORP (ph_orp: pH, ORP, Suhu)
    const ph = Number((7.25 + Math.sin(hour / 3) * 0.12 + (Math.random() - 0.5) * 0.04).toFixed(2));
    const orp = Number((235 + Math.cos(hour / 4) * 12 + (Math.random() - 0.5) * 4).toFixed(2));
    const suhu = Number((tempair + (Math.random() - 0.5) * 0.1).toFixed(2));
    const p4 = new Point(SENSORS_METADATA.sensor4.measurement)
      .timestamp(date)
      .floatField('ph', ph)
      .floatField('orp', orp)
      .floatField('suhu', suhu);
    writeApi.writePoint(p4);

    // 5. Sensor 5: Curah Hujan (curah_hujan: Rain)
    const isRaining = (hour >= 13 && hour <= 14.5) || (hour >= 17 && hour <= 18);
    const rain = isRaining ? Number((1.2 + Math.random() * 2.8).toFixed(2)) : 0.0;
    const p5 = new Point(SENSORS_METADATA.sensor5.measurement)
      .timestamp(date)
      .floatField('rain', rain);
    writeApi.writePoint(p5);

    count += 5;
  }

  console.log(`⏳ Menyimpan ${count} data point ke InfluxDB...`);
  await writeApi.close();
  console.log('✅ Berhasil! InfluxDB telah terisi 24 jam riwayat telemetri yang valid.');
}

seedInflux().catch((err) => {
  console.error('❌ Gagal seed InfluxDB:', err);
  process.exit(1);
});
