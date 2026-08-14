# Product Requirement Document (PRD)
# Sistem Backend i-RWH (Intelligent Rain Water Harvesting)

---

| **Atribut** | **Keterangan** |
|---|---|
| **Nama Proyek** | i-RWH (Intelligent Rain Water Harvesting) Backend Platform |
| **Versi Dokumen** | 1.0 (Production Ready Spec) |
| **Tanggal Pembaruan** | 14 Agustus 2026 |
| **Status** | Approved / Baseline |
| **Target Ekosistem** | Node.js (JavaScript ES Modules) + Fastify + InfluxDB v2 + Mosquitto + Node-RED |
| **Institusi** | Internet Engineering Tech. — Politeknik Negeri Lampung (Polinela) |

---

## 1. Executive Summary & Latar Belakang

Sistem **Intelligent Rain Water Harvesting (i-RWH)** adalah platform terintegrasi untuk pemanenan, pengolahan, dan pemantauan kualitas air hujan berbasis IoT di lingkungan *Greenhouse* dan Laboratorium Politeknik Negeri Lampung.

Sistem lapangan menggunakan mikrokontroler **ESP32** sebagai *Modbus RTU Master* (RS-485, 9600 baud, 8N1) yang bertugas mengakuisisi data dari serangkaian sensor industri (suhu & kelembapan internal/eksternal greenhouse, konduktivitas/TDS/salinitas air, pH/ORP air, serta curah hujan tipping bucket). Data ini dipublikasikan secara periodik dalam format JSON terisolasi per topik melalui broker **Mosquitto MQTT**.

Untuk menjamin keandalan, keterpisahan beban kerja (*separation of concerns*), dan kemudahan integrasi dengan dashboard visualisasi modern, sistem membutuhkan **Backend API yang tangguh (*gagah*), berkinerja tinggi, dan berstandar industri**. Backend ini bertindak sebagai gerbang data utama yang menyajikan query historis teragregasi cepat dari **InfluxDB v2** serta *real-time live stream* data ke frontend dashboard.

---

## 2. Tujuan & Sasaran Sistem (Goals & Objectives)

### 2.1 Tujuan Utama
1. **Pemisahan Beban Kerja (Decoupling):** Memisahkan jalur *Write-Heavy Data Ingestion* (Node-RED ➔ InfluxDB) dengan *Read-Heavy / Analytical Query* (Fastify API ➔ Dashboard).
2. **Kinerja Tinggi & Rendah Latensi:** Menyajikan API historis dengan komputasi agregasi time-series berbasis Flux (*downsampling on-the-fly*) dan latensi respon sub-100ms.
3. **Penyajian Data Real-Time:** Mendukung *Server-Sent Events (SSE)* atau WebSocket untuk streaming data telemetri langsung ke dashboard tanpa beban *polling* berulang.
4. **Validasi & Integritas Data:** Mencegah data sampah (*dirty data*), menangani anomali unsigned-overflow Modbus (misal angka ~65535 saat sensor bernilai negatif), serta mencatat status konektivitas *gateway* via MQTT LWT (*Last Will and Testament*).
5. **Dokumentasi Otomatis:** Menyediakan antarmuka OpenAPI / Swagger UI interaktif yang auto-generated langsung dari schema backend.

### 2.2 Non-Goals (Batasan Ruang Lingkup)
- Backend API **tidak** mengambil alih tugas pembacaan fisik Modbus RS-485 dari ESP32.
- Backend API **tidak** menggunakan arsitektur autentikasi kompleks multi-role OAuth/JWT pada fase awal (cukup proteksi *API Key Header* via environment variable).

---

## 3. Arsitektur Sistem & Topologi Data

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LAPANGAN (IoT Hardware)                         │
│  [ESP32 Gateway] ──(RS-485 Modbus RTU)──▶ [5 Sensor Industri i-RWH]   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ MQTT Publish (JSON per Topic)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE LAYER                        │
│                     [Mosquitto MQTT Broker :1883]                      │
│                                  │ Subscribe
│                                  ▼
│                   [Node-RED Data Consumer :1880]                       │
│    • Topic-aware Parsing & Validation                                  │
│    • Anomaly Range Filter & LWT Status Handler                         │
│    • InfluxDB Writer Node with Retry Buffer                            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Write (Time-Series Protocol)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TIME-SERIES STORAGE                             │
│                  [InfluxDB v2.x Server :8086]                          │
│               • Organization: polinela_lab                             │
│               • Bucket: irwh_sensors                                   │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Flux Query API (High-Speed Downsampling)
                                   │
┌──────────────────────────────────┴─────────────────────────────────────┐
│                   BACKEND APPLICATION LAYER (Core API)                 │
│               [Fastify.js API Server (Node.js ES Modules)]             │
│                                                                        │
│   ├── [Security Layer]        : API Key Validator, CORS, Helmet        │
│   ├── [Docs & Validation]     : OpenAPI 3.0 / Swagger UI (:5000/docs)  │
│   ├── [Query Engine]          : InfluxDB v2 Flux Query Builder         │
│   ├── [Real-time Engine]      : SSE (Server-Sent Events) Streamer      │
│   └── [Export Service]        : High-throughput CSV Stream Exporter   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST API (JSON) + SSE Stream
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│              [Dashboard Web / HMI Lab / Mobile Frontend]               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Spesifikasi Hardware & Peta Sensor

### 4.1 Sensor Eksisting (Fase 1)
| ID Topik | Modbus Slave ID | Tipe Sensor / Model | Parameter Fisik | Rentang Operasional Normal | Satuan |
|---|---|---|---|---|---|
| `sensor1` | ID 1 | **AGH3485** (Internal Greenhouse) | Suhu Udara (`temp`)<br>Kelembapan Udara (`hum`) | -10.0 s/d 60.0<br>0.0 s/d 100.0 | °C<br>% RH |
| `sensor2` | ID 2 | **External-GH Sensor** (Luar Ruang) | Suhu Udara (`temp`)<br>Kelembapan Udara (`hum`) | -10.0 s/d 60.0<br>0.0 s/d 100.0 | °C<br>% RH |
| `sensor3` | ID 4 | **ECTDS10-ISO** (Kualitas Air) | Suhu Air (`tempair`)<br>Konduktivitas (`ec`)<br>Salinitas (`salinity`)<br>TDS (`tds`) | 0.0 s/d 60.0<br>0 s/d 20000<br>0 s/d 10000<br>0 s/d 10000 | °C<br>µS/cm<br>mg/L<br>ppm |
| `sensor4` | ID 5 | **PHORP10** (Keasaman & Redoks) | Suhu Air (`suhu`)<br>Derajat Keasaman (`ph`)<br>Oksidasi-Reduksi (`orp`) | 0.0 s/d 60.0<br>0.00 s/d 14.00<br>-2000 s/d 2000 | °C<br>pH<br>mV |
| `sensor5` | ID 6 | **Tipping Bucket** (Presipitasi) | Curah Hujan (`rain`) | 0.0 s/d 500.0 *(unit_verified=false)* | mm / pulsa |
| `status` | — | **ESP32 Gateway LWT** | Status Konektivitas (`value`) | `"online"` / `"offline"` | String |

### 4.2 Sensor Rencana Ekspansi (Fase 4 - Forward-Compatibility)
Struktur skema database dan API dirancang siap menerima parameter berikut tanpa migrasi skema destruktif:
1. **Water Level Sensor** (`water_level`): 0.0 – 100.0% / meter.
2. **Dissolved Oxygen Sensor** (`dissolved_oxygen`): 0.0 – 20.0 mg/L.
3. **Volume Tangki Penampungan** (`tank_volume`): Dihitung dari geometri tangki × level air (Liter / $m^3$).

---

## 5. MQTT Ingestion Pipeline & Validasi Data (Node-RED)

### 5.1 Skema Topik MQTT
- **Prefix Basis:** `polinela/lab/`
- **Daftar Topik:**
  - `polinela/lab/sensor1` ➔ Payload: `{"temp": 28.5, "hum": 75.2}`
  - `polinela/lab/sensor2` ➔ Payload: `{"temp": 32.1, "hum": 68.0}`
  - `polinela/lab/sensor3` ➔ Payload: `{"tempair": 26.4, "ec": 1250, "salinity": 620, "tds": 800}`
  - `polinela/lab/sensor4` ➔ Payload: `{"suhu": 26.5, "ph": 7.25, "orp": 240}`
  - `polinela/lab/sensor5` ➔ Payload: `{"rain": 0.5}`
  - `polinela/lab/status`  ➔ Payload: `online` atau `offline` (Plain text string via MQTT LWT)

### 5.2 Aturan Validasi Range & Anomali (Sanitization)
1. **Penanganan Unsigned Overflow Modbus:**
   - Pada sensor suhu dan ORP yang memiliki rentang nilai negatif, jika pembacaan register Modbus salah dikonversi sebagai unsigned 16-bit, nilai negatif akan terlempar sebagai integer mendekati `65535`.
   - Node-RED memfilter nilai suhu $> 100^\circ\text{C}$ atau ORP $> 3000\text{ mV}$ sebagai data korup (`anomaly=true`).
2. **Tagging Metadata:**
   - Seluruh data curah hujan (`sensor5`) otomatis diberi tag InfluxDB `unit_verified="false"` sampai kalibrasi corong ember selesai diverifikasi tim laboratorium.

---

## 6. Desain Database & Skema InfluxDB v2

- **Bucket:** `irwh_sensors`
- **Organization:** `polinela_lab`
- **Precision Waktu:** Milliseconds (`ms`) atau Nanoseconds (`ns`)

### 6.1 Tabel Relasi Skema Time-Series
| Measurement | Fields (Tipe Data) | Tags (Indexed) | Deskripsi |
|---|---|---|---|
| `suhu_humid_1` | `temp` (float), `hum` (float) | `location=internal_gh`, `device_id=sensor1` | Udara dalam greenhouse |
| `suhu_humid_2` | `temp` (float), `hum` (float) | `location=external_gh`, `device_id=sensor2` | Udara luar greenhouse |
| `konduktivitas` | `tempair` (float), `ec` (float), `salinity` (float), `tds` (float) | `device_id=sensor3`, `probe=water` | Kualitas nutrisi & garam air |
| `ph_orp` | `suhu` (float), `ph` (float), `orp` (float) | `device_id=sensor4`, `probe=water` | Derajat asam basa & redoks |
| `curah_hujan` | `rain` (float) | `device_id=sensor5`, `unit_verified=false` | Akumulasi presipitasi |
| `device_status` | `status_code` (int: 1=online, 0=offline), `state` (string) | `device=esp32_gateway` | Ketersediaan perangkat |

### 6.2 Kebijakan Retensi & Downsampling (Retention Policy)
- **Raw Telemetry Bucket (`irwh_sensors`):** Retensi 90 hari (resolusi data per 5–30 detik).
- **Aggregated Downsampled Bucket (`irwh_sensors_downsampled`):** Retensi permanen / 2 tahun (agregasi rata-rata per 1 jam & 1 hari via InfluxDB Tasks).

---

## 7. Desain Spesifikasi Backend REST API (Fastify)

### 7.1 Tech Stack Backend
- **Runtime:** Node.js (v20+ LTS)
- **Modul Standar:** Pure JavaScript ES Modules (`"type": "module"` di `package.json`)
- **Web Framework:** Fastify v4.x / v5.x
- **InfluxDB Client:** `@influxdata/influxdb-client` (Native Flux Query runner)
- **Dokumentasi API:** `@fastify/swagger` + `@fastify/swagger-ui` (OpenAPI 3.0 Standard)
- **Validasi Schema:** Fastify Native JSON Schema (didukung validasi tipe data cepat & serialisasi otomatis)
- **Security & Utilitas:** `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `dotenv`

### 7.2 Standar Format Respons API

Semua endpoint menyajikan format payload JSON seragam (*Envelope Pattern*):

#### Format Sukses (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Data telemetry berhasil diambil.",
  "data": { ... },
  "meta": {
    "timestamp": "2026-08-14T11:45:00.000Z",
    "queryTimeMs": 14.2
  }
}
```

#### Format Error (`4xx` / `5xx`):
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Parameter 'interval' tidak valid. Gunakan format waktu seperti '5m', '1h', '1d'.",
  "meta": {
    "timestamp": "2026-08-14T11:45:00.000Z"
  }
}
```

---

## 8. Kontrak Lengkap Endpoint REST & Real-Time API

Prefix standar: `/api/v1`

### 8.1 Ringkasan Endpoint
| No | Metode | Path | Deskripsi | Autentikasi |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/health` | Healthcheck server & konektivitas InfluxDB | Publik |
| 2 | `GET` | `/docs` | OpenAPI / Swagger UI Dokumentasi Interaktif | Publik |
| 3 | `GET` | `/api/v1/sensors` | Metadata seluruh sensor yang terdaftar & statusnya | API Key |
| 4 | `GET` | `/api/v1/sensors/status` | Status heartbeat online/offline ESP32 Gateway | API Key |
| 5 | `GET` | `/api/v1/sensors/:sensorId/latest` | Nilai data telemetri pembacaan paling mutakhir | API Key |
| 6 | `GET` | `/api/v1/sensors/:sensorId/history` | Data historis time-series teragregasi & downsampled | API Key |
| 7 | `GET` | `/api/v1/sensors/overview` | Snapshot seluruh sensor sekaligus untuk dashboard utama | API Key |
| 8 | `GET` | `/api/v1/sensors/realtime` | **Server-Sent Events (SSE)** live stream telemetry | API Key |
| 9 | `GET` | `/api/v1/export/csv` | Streaming export data historis format file CSV | API Key |

---

### 8.2 Detail Spesifikasi Per Endpoint

#### 1. `GET /api/v1/health`
- **Fungsi:** Memeriksa kesiapan aplikasi (*readiness & liveness probe*) dan koneksi ke InfluxDB.
- **Header:** Tidak perlu API Key.
- **Respons (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "status": "healthy",
    "uptimeSeconds": 86400,
    "influxdb": "connected",
    "timestamp": "2026-08-14T11:45:00.000Z"
  }
}
```

---

#### 2. `GET /api/v1/sensors`
- **Fungsi:** Memberikan daftar sensor, measurement name di InfluxDB, daftar field, dan unit satuannya untuk render dinamis di frontend.
- **Header:** `x-api-key: <TOKEN>`
- **Respons (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "sensorId": "sensor1",
      "name": "Internal Greenhouse Monitor",
      "measurement": "suhu_humid_1",
      "fields": [
        {"key": "temp", "label": "Suhu Udara", "unit": "°C", "min": -10, "max": 60},
        {"key": "hum", "label": "Kelembapan Udara", "unit": "% RH", "min": 0, "max": 100}
      ]
    },
    {
      "sensorId": "sensor3",
      "name": "Water Quality Sensor",
      "measurement": "konduktivitas",
      "fields": [
        {"key": "tempair", "label": "Suhu Air", "unit": "°C"},
        {"key": "ec", "label": "Konduktivitas Listrik", "unit": "µS/cm"},
        {"key": "salinity", "label": "Salinitas Air", "unit": "mg/L"},
        {"key": "tds", "label": "Total Dissolved Solids", "unit": "ppm"}
      ]
    }
  ]
}
```

---

#### 3. `GET /api/v1/sensors/:sensorId/latest`
- **Fungsi:** Mengambil 1 pembacaan terakhir dari sensor tertentu.
- **Params:** `sensorId` (contoh: `sensor1`, `sensor2`, `sensor3`, `sensor4`, `sensor5`).
- **Header:** `x-api-key: <TOKEN>`
- **Respons (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "sensorId": "sensor1",
    "measurement": "suhu_humid_1",
    "timestamp": "2026-08-14T11:44:52.120Z",
    "readings": {
      "temp": 28.45,
      "hum": 74.20
    }
  }
}
```

---

#### 4. `GET /api/v1/sensors/:sensorId/history`
- **Fungsi:** Mengambil data historis untuk grafik time-series dengan dukungan rentang waktu dan agregasi (*downsampling*).
- **Query Parameters:**
  - `from` *(opsional, default: `-24h`)*: Waktu awal (ISO 8601 string atau duration Influx seperti `-1h`, `-7d`, `-30d`).
  - `to` *(opsional, default: `now()`)*: Waktu akhir.
  - `interval` *(opsional, default: `auto`)*: Window agregasi data (misal: `1m`, `5m`, `1h`, `1d`).
  - `aggregate` *(opsional, default: `mean`)*: Fungsi kalkulasi (`mean`, `max`, `min`, `sum`, `last`).
- **Contoh Request:** `GET /api/v1/sensors/sensor3/history?from=-7d&interval=1h&aggregate=mean`
- **Respons (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "sensorId": "sensor3",
    "measurement": "konduktivitas",
    "aggregate": "mean",
    "interval": "1h",
    "points": [
      {
        "time": "2026-08-07T12:00:00.000Z",
        "tempair": 25.4,
        "ec": 1180.5,
        "salinity": 590.2,
        "tds": 760.0
      },
      {
        "time": "2026-08-07T13:00:00.000Z",
        "tempair": 25.8,
        "ec": 1210.0,
        "salinity": 605.1,
        "tds": 782.4
      }
    ]
  },
  "meta": {
    "totalPoints": 168,
    "queryTimeMs": 42.8
  }
}
```

---

#### 5. `GET /api/v1/sensors/overview`
- **Fungsi:** Mengambil seluruh nilai data sensor terakhir dalam satu panggilan request untuk widget KPI dashboard utama.
- **Header:** `x-api-key: <TOKEN>`
- **Respons (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "gatewayStatus": "online",
    "lastSeen": "2026-08-14T11:45:00.000Z",
    "sensors": {
      "internalGreenhouse": {"temp": 28.5, "hum": 75.2, "updatedAt": "2026-08-14T11:44:58Z"},
      "externalGreenhouse": {"temp": 32.1, "hum": 68.0, "updatedAt": "2026-08-14T11:44:55Z"},
      "waterConductivity": {"tempair": 26.4, "ec": 1250, "salinity": 620, "tds": 800, "updatedAt": "2026-08-14T11:44:50Z"},
      "waterPhOrp": {"suhu": 26.5, "ph": 7.25, "orp": 240, "updatedAt": "2026-08-14T11:44:48Z"},
      "rainfall": {"rain": 0.5, "unit_verified": false, "updatedAt": "2026-08-14T11:44:45Z"}
    }
  }
}
```

---

#### 6. `GET /api/v1/sensors/realtime` (Server-Sent Events)
- **Fungsi:** Mengalirkan data sensor secara real-time via koneksi persistent HTTP SSE. Begitu Node-RED/ESP32 mengirim data baru, client langsung menerima event tanpa beban *polling*.
- **Header:** `Accept: text/event-stream`, `x-api-key: <TOKEN>`
- **Event Output Stream:**
```text
event: ping
data: {"time": "2026-08-14T11:45:00.000Z"}

event: telemetry
data: {"sensorId": "sensor1", "data": {"temp": 28.6, "hum": 74.9}, "time": "2026-08-14T11:45:05.100Z"}

event: status
data: {"gateway": "esp32_gateway", "status": "online", "time": "2026-08-14T11:45:05.150Z"}
```

---

#### 7. `GET /api/v1/export/csv`
- **Fungsi:** Mengunduh data telemetri historis dalam format CSV untuk analisis data riset lab / Excel / Python.
- **Query Parameters:** `sensorId`, `from`, `to`, `interval`
- **Header:** `x-api-key: <TOKEN>`
- **Respons Header:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="irwh_sensor3_2026-08-14.csv"`

---

## 9. Non-Functional Requirements (NFR)

| Kategori | Spesifikasi & Tolok Ukur |
|---|---|
| **Performa & Throughput** | Latensi rata-rata endpoint `< 50ms` untuk single latest query dan `< 150ms` untuk query historis 7 hari (ter-downsampled). Throughput minimal 500 req/sec pada mesin lab standar. |
| **Keamanan (Security)** | Validasi `x-api-key` pada seluruh endpoint privat; proteksi HTTP Header menggunakan **Helmet**; pembatasan laju request via **Rate Limiting** (default: 120 req/menit per IP). |
| **Reliability & Resilience** | Error handling terpusat (*Global Error Handler*), proteksi dari process unhandled exception, dan *graceful shutdown* penutupan koneksi InfluxDB saat server direstart. |
| **Observability & Logging** | Logging terstruktur JSON (*Pino Logger*) bawaan Fastify dengan log-level (`debug`, `info`, `warn`, `error`). |
| **Maintainability & Clean Code** | Pola arsitektur modular (*Controller - Service - Route Plugin Pattern*) murni JavaScript ES Modules tanpa sintaks usang. |

---

## 10. Struktur Direktori Proyek Backend (Usulan)

```
Backend/
├── package.json
├── .env.example
├── .gitignore
├── server.js                     # Entry point inisialisasi Fastify Server
├── src/
│   ├── app.js                    # Konfigurasi Plugin, Middleware, Swagger, CORS
│   ├── config/
│   │   ├── env.js                # Parser & validasi environment variable
│   │   └── influx.js             # Singleton InfluxDB v2 Client & Flux Query Runner
│   ├── plugins/
│   │   ├── auth.js               # Fastify Plugin validasi x-api-key
│   │   └── swagger.js            # Fastify Plugin OpenAPI / Swagger UI
│   ├── routes/
│   │   ├── health.routes.js      # /api/v1/health
│   │   ├── sensors.routes.js     # /api/v1/sensors & sub-routes
│   │   ├── realtime.routes.js    # /api/v1/sensors/realtime (SSE Stream)
│   │   └── export.routes.js      # /api/v1/export/csv
│   ├── services/
│   │   ├── influx.service.js     # Business logic query Flux (latest, history, aggregate)
│   │   └── sse.service.js        # Event broker / broadcaster untuk SSE
│   ├── schemas/
│   │   └── sensor.schemas.js     # Fastify JSON Schema untuk validasi request & response
│   └── utils/
│       ├── constants.js          # Pemetaan ID sensor, measurement, satuan
│       └── response.js           # Standard envelope formatter
└── docker-compose.yml            # Deployment stack (Mosquitto, Node-RED, InfluxDB, API)
```

---

## 11. Konfigurasi Environment (`.env.example`)

```ini
# Server Configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# Security
API_KEY=polinela_irwh_secret_key_2026
CORS_ORIGIN=*
RATE_LIMIT_MAX=120
RATE_LIMIT_TIME_WINDOW=1 minute

# InfluxDB v2 Configuration
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-super-secret-admin-token
INFLUX_ORG=polinela_lab
INFLUX_BUCKET=irwh_sensors

# MQTT Broker (Opsional jika Backend bertindak sebagai SSE bridge)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC_PREFIX=polinela/lab/
```

---

## 12. Matriks Manajemen Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Koneksi InfluxDB terputus / restart** | API gagal melayani query data | Implementasi *connection retry pool* pada client InfluxDB & healthcheck probe transparan. |
| **Payload data InfluxDB terlalu masif (misal query 30 hari tanpa agregasi)** | Browser lag & memori backend jebol | Backend membatasi `maxPoints` dan mewajibkan agregasi (*auto-interval computation*) untuk rentang waktu $> 24\text{ jam}$. |
| **Unsigned Overflow Modbus dari Hardware** | Grafik nilai sensor loncat ekstrem (~65535) | Sanitasi data di layer Node-RED dan *filter condition* pada query Flux di backend. |
| **Koneksi SSE client menumpuk (*leak*)** | Konsumsi memori server bertambah | Listener cleanup otomatis saat event request `close` / `disconnect` terdeteksi di Fastify. |

---

## 13. Roadmap & Fase Eksekusi

```
┌────────────────────────────────────────────────────────────────────────┐
│ [FASE 1]: Pondasi & Core Service                                       │
│ • Setup Fastify project (ES Modules), InfluxDB Client & Env Config    │
│ • Implementasi Auth Plugin (API Key), CORS, & Pino Logger             │
│ • Setup Auto-generated Swagger UI /docs                                │
├────────────────────────────────────────────────────────────────────────┤
│ [FASE 2]: Endpoint Query Historis & Realtime                           │
│ • Service Query Flux InfluxDB v2 (Latest, History, Aggregate)          │
│ • Implementasi Routes: /latest, /history, /overview, /status           │
│ • Implementasi Real-time Server-Sent Events (/realtime)                │
├────────────────────────────────────────────────────────────────────────┤
│ [FASE 3]: Utilitas Ekspor & Hardening                                  │
│ • Endpoint Streaming Export CSV (/export/csv)                          │
│ • Rate Limiting, Input Validation Schema, & Error Handling Hardening   │
│ • Testing Endpoint & Benchmarking performa                             │
└────────────────────────────────────────────────────────────────────────┘
```