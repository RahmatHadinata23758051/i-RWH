# i-RWH: Intelligent Rain Water Harvesting and Smart Greenhouse System

Sistem Pemantauan dan Pemanenan Air Hujan Cerdas Berbasis IoT dan AI untuk Laboratorium Greenhouse Politeknik Negeri Lampung (Polinela).

Dokumentasi ini mencakup arsitektur monorepo, spesifikasi antarmuka data, integrasi database time-series InfluxDB v2, engine inferensi kecerdasan buatan Google Gemini AI, serta panduan deployment terpadu menggunakan Docker Compose.

---

## 1. Ringkasan Eksekutif Sistem

Sistem i-RWH dirancang untuk mengintegrasikan akuisisi data multi-sensor Modbus RTU pada greenhouse pertanian presisi dengan pemanenan air hujan (Rain Water Harvesting). Data lingkungan, kualitas nutrisi air, derajat keasaman (pH), potensial redoks (ORP), dan curah hujan diproses secara real-time untuk menghasilkan analitik historis dan rekomendasi keputusan agronomis berbasis kecerdasan buatan.

---

## 2. Struktur Direktori Monorepo

```
.
├── Backend/                 # Layanan Fastify REST API, SSE Stream, MQTT Ingestion & InfluxDB Service
│   ├── Dockerfile           # Konfigurasi container produksi Node.js 20 Alpine
│   ├── .env.example         # Template konfigurasi variabel lingkungan backend
│   ├── package.json         # Dependensi backend
│   ├── server.js            # Entry point runtime server Fastify
│   ├── src/
│   │   ├── app.js           # Konfigurasi aplikasi Fastify, plugin CORS, rate limiter, dan router
│   │   ├── config/          # Manajemen env dan koneksi client InfluxDB v2
│   │   ├── routes/          # REST & SSE Endpoint Handlers (Sensors, Realtime, Export, AI)
│   │   ├── services/        # Business logic (MQTT Bridge, InfluxDB Query, SSE Broadcaster, AI Engine)
│   │   ├── utils/           # Metadata sensor Modbus dan helper standard envelope response
│   │   └── scripts/         # Script injeksi data historis seeder ke InfluxDB
│   ├── test/                # Unit test otomatis endpoint backend
│   └── README.md            # Dokumentasi detail teknis dan kontrak API backend
│
├── Frontend/                # Aplikasi Single Page Application (SPA) React 18 + Vite + Chart.js
│   ├── Dockerfile           # Multi-stage Docker build (Node build -> Nginx Alpine server)
│   ├── nginx.conf           # Konfigurasi Nginx reverse proxy dan SPA routing
│   ├── package.json         # Dependensi frontend
│   ├── vite.config.js       # Konfigurasi bundler Vite dan dev server
│   ├── src/
│   │   ├── components/      # Komponen antarmuka (Header, KpiCards, HistoricalCharts, TelemetryTable, AiInsightModal)
│   │   ├── services/        # Klien HTTP Axios/Fetch dan EventSource handler
│   │   ├── App.jsx          # State orchestrator dan manajemen lifecycle data
│   │   └── index.css        # CSS Design System dan Design Tokens
│   └── README.md            # Dokumentasi detail arsitektur komponen frontend
│
├── docker-compose.yml       # Orkestrasi multi-container produksi (Frontend, Backend, InfluxDB, Mosquitto)
├── .gitignore               # Aturan pengecualian berkas git monorepo
└── README.md                # Dokumentasi master sistem i-RWH
```

---

## 3. Diagram Arsitektur dan Alur Data End-to-End

```
+-----------------------------------------------------------------------------------+
|                            LAPISAN AKUISISI SENSOR                                |
|  [AGH3485 ID 1]   [AGH3485 ID 2]   [ECTDS10 ID 4]   [PHORP10 ID 5]   [Rain ID 6] |
|   Suhu & Hum GH    Suhu & Hum Luar    EC, TDS, Sal       pH & ORP      Curah Hujan|
+-----------------------------------------------------------------------------------+
                                         │ (RS-485 Modbus RTU)
                                         ▼
                             [ ESP32 IoT Gateway ]
                                         │ (MQTT Publish / JSON)
                                         ▼
                           [ Mosquitto Broker : 1883 ]
                             Topik: polinela/lab/#
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                             LAPISAN BACKEND SERVICE                               |
|                                                                                   |
|   1. MQTT Telemetry Bridge:                                                       |
|      - Konsumsi topik sensor1 .. sensor5 & status LWT gateway                     |
|      - Update in-memory live cache & rolling history buffer                       |
|                                                                                   |
|   2. InfluxDB v2 Persistence:                                                     |
|      - Penulisan titik data otomatis ke bucket 'irwh_sensors'                     |
|      - Flux Query dengan agregasi window dinamis (1m, 5m, 1h)                      |
|                                                                                   |
|   3. Fastify REST & SSE Core Engine:                                              |
|      - Server-Sent Events (SSE) stream broadcast ke frontend                      |
|      - Endpoint otentikasi API Key untuk REST & Data Export CSV                   |
|                                                                                   |
|   4. AI Agro-Hydrology Engine:                                                    |
|      - Kalkulasi metrik agronomis (VPD kPa, Delta Suhu, Estimasi Panen Air)       |
|      - Inferensi model Google Gemini AI (Strict Structured JSON Response)         |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ (HTTP REST / SSE Stream)
+-----------------------------------------------------------------------------------+
|                            LAPISAN FRONTEND DASHBOARD                             |
|                                                                                   |
|   - Real-Time Header & Connectivity Status Indicator                              |
|   - 4 Premier KPI Status Cards (Mikroklimat, Nutrisi Air, pH/ORP, Curah Hujan)   |
|   - Historical Time-Series Charts (1 Node Per Menit, Dynamic Range Timeline)      |
|   - Tabular Telemetry Inspector dengan Status Threshold                           |
|   - AI Agro-Insight Modal (Skor Kesehatan, Analisis Saintifik & Rekomendasi)      |
+-----------------------------------------------------------------------------------+
```

---

## 4. Rincian Metrik Sensor dan Formula Saintifik

| ID Sensor | Parameter Fisik | Satuan | Rentang Operasional | Threshold Optimal |
| :--- | :--- | :--- | :--- | :--- |
| **sensor1** | Suhu Internal GH | °C | -10 s/d 60 | 24.0 – 30.0 °C |
| | Kelembapan Internal | % RH | 0 s/d 100 | 65.0 – 80.0 % |
| **sensor2** | Suhu Luar Lingkungan | °C | -10 s/d 60 | Baseline Komparasi |
| | Kelembapan Luar | % RH | 0 s/d 100 | Baseline Komparasi |
| **sensor3** | Konduktivitas Listrik (EC) | µS/cm | 0 s/d 20000 | 1000 – 1500 µS/cm |
| | Total Dissolved Solids | ppm | 0 s/d 10000 | 640 – 960 ppm |
| | Salinitas Air | mg/L | 0 s/d 10000 | < 1000 mg/L |
| | Suhu Air Tandon | °C | 0 s/d 60 | 22.0 – 28.0 °C |
| **sensor4** | Derajat Keasaman (pH) | pH | 0 s/d 14 | 5.8 – 6.8 pH |
| | Potensial Redoks (ORP) | mV | -2000 s/d 2000 | > 200 mV (Steril) |
| **sensor5** | Intensitas Curah Hujan | mm | 0 s/d 200 | Presipitasi Hujan |

### Formula Vapor Pressure Deficit (VPD)
Formula agronomis yang digunakan dalam modul backend:
$$VPsat = 0.61078 \times \exp\left(\frac{17.27 \times T}{T + 237.3}\right)$$
$$VPact = VPsat \times \left(\frac{RH}{100}\right)$$
$$VPD = VPsat - VPact \quad (\text{satuan: kPa})$$

- **VPD < 0.8 kPa:** Udara terlalu jenuh/lembap, risiko pertumbuhan jamur patogen tinggi.
- **VPD 0.8 – 1.4 kPa:** Zona optimal pembukaan stomata untuk fotosintesis dan serapan hara.
- **VPD > 1.4 kPa:** Udara terlalu kering, memicu stres transpirasi dan penutupan stomata.

---

## 5. Panduan Deployment Produksi (Docker Compose)

### Prasyarat Server
- Sistem Operasi: Linux (Ubuntu 22.04 LTS / Debian 12 direkomendasikan)
- Docker Engine >= 24.x
- Docker Compose v2

### Langkah 1: Kloning Repository
```bash
git clone https://github.com/RahmatHadinata23758051/i-RWH.git
cd i-RWH
```

### Langkah 2: Konfigurasi Environment Backend
Salin template konfigurasi dan sesuaikan variabel rahasia:
```bash
cp Backend/.env.example Backend/.env
```
Pastikan `GEMINI_API_KEY`, `API_KEY`, dan kredensial MQTT telah terisi dengan benar di dalam file `Backend/.env`.

### Langkah 3: Eksekusi Multi-Container Build
Jalankan seluruh ekosistem layanan di latar belakang (*detached mode*):
```bash
docker compose up -d --build
```

### Langkah 4: Verifikasi Status Kontainer
```bash
docker compose ps
```
Semua kontainer (`irwh_frontend`, `irwh_backend`, `irwh_influxdb`, dan `irwh_mosquitto`) harus berstatus `running` / `healthy`.

---

## 6. Alokasi Port dan Layanan

| Layanan | Nama Kontainer | Port Host | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Frontend Dashboard** | `irwh_frontend` | `3000` (atau `80`) | Antarmuka web pengguna Nginx SPA |
| **Backend Fastify API** | `irwh_backend` | `5000` | REST API, SSE Stream, dan AI Engine |
| **InfluxDB v2 Database** | `irwh_influxdb` | `8086` | Time-series database & Flux query engine |
| **Mosquitto MQTT Broker** | `irwh_mosquitto` | `1883`, `9001` | Broker komunikasi data sensor Modbus |

---

## 7. Pemeliharaan dan Perintah Operasional

### Menjalankan Unit Test Backend
```bash
cd Backend
node test/api.test.js
```

### Menyuntikkan Data Seeder Historis (24 Jam)
```bash
cd Backend
node src/scripts/seed-influx.js
```

### Memeriksa Log Layanan Tertentu
```bash
docker compose logs -f backend
docker compose logs -f influxdb
```

### Menghentikan Seluruh Layanan
```bash
docker compose down
```

---

Dokumentasi lebih mendalam terkait masing-masing modul dapat diakses pada:
- [Dokumentasi Lengkap Backend](file:///Backend/README.md)
- [Dokumentasi Lengkap Frontend](file:///Frontend/README.md)
