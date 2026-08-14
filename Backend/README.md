# Backend Service: i-RWH (Intelligent Rain Water Harvesting)

Layanan backend terpusat untuk sistem pemantauan telemetri IoT, analisis agronomis, integrasi database time-series, dan inferensi kecerdasan buatan (Google Gemini AI) pada Laboratorium Greenhouse Politeknik Negeri Lampung.

---

## 1. Arsitektur dan Alur Data

Backend i-RWH dibangun menggunakan framework Fastify (Node.js) dengan performa tinggi dan latensi rendah. Alur data dirancang untuk menangani aliran telemetri real-time sekaligus penyimpanan historis berskala besar:

```
[ Sensor Modbus RTU / ESP32 Gateway ]
                 │
                 ▼ (Protokol MQTT / JSON Payload)
   [ Mosquitto Broker: 1883 ]
                 │
                 ▼
   [ Fastify Backend Service ]
        ├──► In-Memory Telemetry Cache & Rolling Buffer
        ├──► InfluxDB v2 Client (Bucket: irwh_sensors)
        ├──► Server-Sent Events (SSE) Broadcaster
        └──► Google Gemini AI Engine (VPD & Agro-Hydrology Model)
                 │
                 ▼
   [ Frontend Dashboard / REST Consumer ]
```

---

## 2. Spesifikasi Topik dan Payload MQTT

Gateway ESP32 membaca data sensor melalui antarmuka RS485 Modbus RTU dan memublikasikannya secara berkala (default: interval 5 detik) ke broker MQTT dengan prefix `polinela/lab/`.

### A. Status Gateway (LWT - Last Will and Testament)
- **Topik:** `polinela/lab/status`
- **Tipe Pesan:** String plain text
- **Nilai:** `online` atau `offline`

### B. Sensor 1: Mikroklimat Internal Greenhouse (AGH3485 Modbus ID 1)
- **Topik:** `polinela/lab/sensor1`
- **Format Payload:**
```json
{
  "temp": 28.50,
  "hum": 74.20
}
```
- **Keterangan Field:**
  - `temp` (float): Suhu udara dalam greenhouse (derajat Celsius, range: -10 s/d 60).
  - `hum` (float): Kelembapan relatif udara dalam greenhouse (% RH, range: 0 s/d 100).

### C. Sensor 2: Mikroklimat Eksternal Greenhouse (AGH3485 Modbus ID 2)
- **Topik:** `polinela/lab/sensor2`
- **Format Payload:**
```json
{
  "temp": 32.10,
  "hum": 68.00
}
```
- **Keterangan Field:**
  - `temp` (float): Suhu udara lingkungan luar greenhouse (derajat Celsius).
  - `hum` (float): Kelembapan relatif udara luar (% RH).

### D. Sensor 3: Kualitas Air dan Nutrisi (ECTDS10-ISO Modbus ID 4)
- **Topik:** `polinela/lab/sensor3`
- **Format Payload:**
```json
{
  "tempair": 26.40,
  "ec": 1250,
  "salinity": 600,
  "tds": 800
}
```
- **Keterangan Field:**
  - `tempair` (float): Suhu air tandon (derajat Celsius).
  - `ec` (integer/float): Konduktivitas listrik larutan (mikroSiemens/cm, range: 0 s/d 20000).
  - `salinity` (integer/float): Salinitas air (mg/L, range: 0 s/d 10000).
  - `tds` (integer/float): Total padatan terlarut (ppm / mg/L, range: 0 s/d 10000).

### E. Sensor 4: pH dan Redoks Air (PHORP10 Modbus ID 5)
- **Topik:** `polinela/lab/sensor4`
- **Format Payload:**
```json
{
  "suhu": 26.50,
  "ph": 7.25,
  "orp": 230
}
```
- **Keterangan Field:**
  - `suhu` (float): Suhu elektroda larutan (derajat Celsius).
  - `ph` (float): Derajat keasaman air (pH scale 0 s/d 14, ideal agronomis: 5.8 s/d 6.8).
  - `orp` (integer/float): Potensial Oksidasi-Reduksi air (mV, range: -2000 s/d 2000).

### F. Sensor 5: Stasiun Presipitasi Curah Hujan (Modbus ID 6)
- **Topik:** `polinela/lab/sensor5`
- **Format Payload:**
```json
{
  "rain": 0.50
}
```
- **Keterangan Field:**
  - `rain` (float): Intensitas curah hujan tipping bucket per interval (milimeter).

---

## 3. Kontrak API REST dan SSE (API Contract)

Semua endpoint yang memerlukan autentikasi diproteksi menggunakan header `x-api-key` atau query parameter `apiKey`.

Format respons menggunakan standard envelope JSend:
```json
{
  "success": true,
  "message": "Deskripsi status eksekusi",
  "data": {},
  "timestamp": "2026-08-14T09:40:00.000Z"
}
```

### A. Healthcheck Endpoint
- **URL:** `GET /api/v1/health`
- **Autentikasi:** Publik
- **Deskripsi:** Memeriksa kesiapan service, konektivitas database InfluxDB v2, dan MQTT broker.
- **Contoh Respons:**
```json
{
  "success": true,
  "message": "i-RWH Backend Service sehat.",
  "data": {
    "status": "healthy",
    "uptimeSeconds": 1420.5,
    "timestamp": "2026-08-14T09:40:00.000Z",
    "dependencies": {
      "influxdb": { "connected": true },
      "mqtt": { "connected": true, "broker": "mqtt://sdp.polinela.ac.id:1883" }
    }
  }
}
```

### B. Overview Snapshot Seluruh Sensor
- **URL:** `GET /api/v1/sensors`
- **Autentikasi:** `x-api-key: <API_KEY>`
- **Deskripsi:** Mengembalikan status konektivitas gateway LWT serta data pembacaan paling mutakhir dari ke-5 sensor lab.
- **Contoh Respons:**
```json
{
  "success": true,
  "message": "Overview seluruh sensor berhasil diambil.",
  "data": {
    "gateway": {
      "deviceId": "esp32_gateway",
      "status": "online",
      "lastSeen": "2026-08-14T09:40:00.000Z"
    },
    "sensors": {
      "sensor1": {
        "name": "Internal Greenhouse Monitor",
        "measurement": "suhu_humid_1",
        "timestamp": "2026-08-14T09:39:55.000Z",
        "readings": { "temp": 28.25, "hum": 74.50 }
      },
      "sensor2": { ... },
      "sensor3": { ... },
      "sensor4": { ... },
      "sensor5": { ... }
    }
  }
}
```

### C. Pembacaan Terkini Sensor Tertentu
- **URL:** `GET /api/v1/sensors/:sensorId`
- **Autentikasi:** `x-api-key: <API_KEY>`
- **Parameter Path:** `sensorId` (`sensor1`, `sensor2`, `sensor3`, `sensor4`, `sensor5`).

### D. Data Historis Time-Series
- **URL:** `GET /api/v1/sensors/:sensorId/history`
- **Autentikasi:** `x-api-key: <API_KEY>`
- **Query Parameter:**
  - `from` (string): Rentang awal (default: `-24h`, opsi: `-1h`, `-6h`, `-24h`, `-7d`, `-30d`).
  - `to` (string): Rentang akhir (default: `now()`).
  - `interval` (string): Interval agregasi Flux (default: `auto`, opsi: `1m`, `5m`, `1h`, `raw`).
  - `aggregate` (string): Fungsi agregasi (default: `mean`, opsi: `mean`, `max`, `min`).
- **Contoh Respons:**
```json
{
  "success": true,
  "message": "Data historis sensor1 berhasil diambil.",
  "data": {
    "sensorId": "sensor1",
    "measurement": "suhu_humid_1",
    "from": "-24h",
    "to": "now()",
    "interval": "5m",
    "aggregate": "mean",
    "totalPoints": 288,
    "points": [
      { "time": "2026-08-13T09:45:00.000Z", "temp": 29.10, "hum": 70.55 },
      { "time": "2026-08-13T09:50:00.000Z", "temp": 29.18, "hum": 70.30 }
    ]
  }
}
```

### E. Server-Sent Events (SSE) Real-Time Stream
- **URL:** `GET /api/v1/sensors/realtime`
- **Query Parameter:** `apiKey=<API_KEY>`
- **Headers Respons:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- **Event Types:**
  - `event: telemetry`: Paket data sensor masuk (`sensorId`, `data`, `time`).
  - `event: status`: Perubahan status gateway LWT (`deviceId`, `status`, `time`).
  - `event: ping`: Heartbeat keep-alive setiap 15 detik.

### F. Ekspor Riwayat ke CSV
- **URL:** `GET /api/v1/export/csv`
- **Query Parameter:** `sensorId` (`sensor1`..`sensor5`), `from` (`-24h`), `apiKey`
- **Headers Respons:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="sensor1_-24h.csv"`

### G. AI Agro-Insight Engine (Google Gemini)
- **URL:** `POST /api/v1/ai-insight` atau `GET /api/v1/ai-insight`
- **Autentikasi:** `x-api-key: <API_KEY>`
- **Payload Request (Opsional):**
```json
{
  "from": "-1h",
  "to": "now()",
  "focusDomain": "all",
  "forceFresh": false
}
```
- **Struktur Respons:**
```json
{
  "success": true,
  "message": "AI Agro-Insight berhasil di-generate.",
  "data": {
    "overallHealthScore": 88,
    "status": "optimal",
    "executiveSummary": "Kondisi mikroklimat greenhouse stabil dengan VPD 1.24 kPa...",
    "domains": {
      "microclimate": {
        "score": 95,
        "status": "optimal",
        "vpdValue": "1.24 kPa",
        "analysis": "...",
        "recommendations": ["..."]
      },
      "waterQuality": {
        "score": 75,
        "status": "warning",
        "analysis": "...",
        "recommendations": ["..."]
      },
      "rainwaterHarvesting": {
        "score": 90,
        "status": "optimal",
        "analysis": "...",
        "recommendations": ["..."]
      }
    },
    "generatedAt": "2026-08-14T09:47:00.000Z",
    "engine": "Google Gemini AI"
  }
}
```

---

## 4. Konfigurasi Environment (.env)

| Variabel | Tipe | Default | Deskripsi |
| :--- | :--- | :--- | :--- |
| `PORT` | Integer | `5000` | Port listening server Fastify |
| `HOST` | String | `0.0.0.0` | Host binding interface |
| `NODE_ENV` | String | `development` | Lingkungan runtime (`development`/`production`) |
| `API_KEY` | String | - | Secret key akses otorisasi API |
| `MQTT_BROKER_URL` | String | `mqtt://sdp.polinela.ac.id:1883` | Alamat broker MQTT |
| `MQTT_USERNAME` | String | `septa` | Username autentikasi broker |
| `MQTT_PASSWORD` | String | `123321` | Password autentikasi broker |
| `MQTT_TOPIC_PREFIX` | String | `polinela/lab/` | Prefix namespace topik sensor |
| `INFLUX_URL` | String | `http://localhost:8086` | Endpoint server InfluxDB v2 |
| `INFLUX_TOKEN` | String | - | Admin access token InfluxDB |
| `INFLUX_ORG` | String | `polinela_lab` | Nama organisasi InfluxDB |
| `INFLUX_BUCKET` | String | `irwh_sensors` | Nama bucket data time-series |
| `GEMINI_API_KEY` | String | - | Google AI Studio API Key |
| `GEMINI_MODEL` | String | `gemini-3-flash-preview` | Identitas model Gemini AI |

---

## 5. Panduan Instalasi dan Menjalankan

### Mode Pengembangan (Development)
```bash
# 1. Masuk ke direktori backend
cd Backend

# 2. Salin template env
cp .env.example .env

# 3. Instal dependensi
npm install

# 4. Jalankan server dengan hot-reload
npm run dev
```

### Eksekusi Unit Test Otomatis
```bash
node test/api.test.js
```

### Injeksi Data Historis Seeder
```bash
node src/scripts/seed-influx.js
```
