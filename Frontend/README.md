# Frontend Dashboard: i-RWH (Intelligent Rain Water Harvesting)

Aplikasi Single Page Application (SPA) dashboard analitik cerdas untuk sistem pemantauan agroklimat greenhouse dan pemanenan air hujan terintegrasi.

---

## 1. Tumpukan Teknologi (Technology Stack)

- **Framework Inti:** React 18 (Functional Components, React Hooks)
- **Tooling & Bundler:** Vite 5 (Fast Hot Module Replacement / HMR)
- **Visualisasi Grafik:** Chart.js v4 & React-Chartjs-2 (Responsive Canvas Charts, Line, Fill, Multiple Y-Axes)
- **Ikonografi:** Lucide React
- **Komunikasi Real-Time:** Native Server-Sent Events (SSE) `EventSource` API
- **Sistem Desain:** Custom CSS Variables (Design Tokens, Responsive Grid Layout, Dark/Light High-Contrast Mode)
- **Tipografi:** Google Fonts (Plus Jakarta Sans)
- **Web Server Produksi:** Nginx Alpine (Reverse Proxy & SPA Static Serving)

---

## 2. Arsitektur Komponen

```
src/
├── assets/                  # Aset statis dan logo i-RWH
├── components/
│   ├── Header.jsx           # Navigasi utama, logo, status gateway, indikator koneksi SSE, tombol AI Insight
│   ├── KpiCards.jsx         # 4 Kartu KPI Premier (Mikroklimat GH, Nutrisi Air, pH & ORP, Curah Hujan)
│   ├── HistoricalCharts.jsx # Modul grafik analitik time-series interaktif & ekspor CSV
│   ├── TelemetryTable.jsx   # Tabel rekapitulasi data 5 sensor lab
│   └── AiInsightModal.jsx   # Modal insight agronomis saintifik bertenaga Google Gemini AI
├── services/
│   └── api.js               # Klien HTTP REST dan manajemen koneksi EventSource (SSE)
├── App.jsx                  # State orchestrator dan manajemen lifecycle aplikasi
├── index.css                # CSS Variables, Utility Classes, dan tema antarmuka
└── main.jsx                 # Entry point React DOM mounting
```

---

## 3. Detail Komponen Utama

### A. KpiCards (`KpiCards.jsx`)
Menyajikan 4 kartu metrik operasional dengan indikator threshold:
1. **Mikroklimat Greenhouse:** Suhu internal (°C), Kelembapan internal (% RH), Suhu eksternal, Delta suhu.
2. **Kualitas Air & Nutrisi:** Konduktivitas listrik (EC in µS/cm), Total Dissolved Solids (TDS in ppm), Salinitas air.
3. **Derajat Keasaman & Redoks:** pH air (skala 0-14), ORP (mV), Suhu elektroda air.
4. **Presipitasi Curah Hujan:** Intensitas curah hujan (mm) dan status presipitasi terkini.

### B. HistoricalCharts (`HistoricalCharts.jsx`)
Menyajikan visualisasi data historis dari database InfluxDB v2 dengan fitur-fitur teknis:
- **1-Minute Node Aggregation:** Menyatukan pembacaan sensor interval 5 detik menjadi 1 titik rata-rata representatif per menit guna menjaga kerapian visual dan mencegah kepadatan titik grafik (*over-dense nodes*).
- **Multi-Sensor Unified Timeline:** Menyelaraskan timestamp Sensor 1 dan Sensor 2 ke dalam linimasa kronologis tunggal.
- **Dynamic Range Timeline:** Sumbu X secara dinamis menyesuaikan rentang waktu yang dipilih:
  - **1 Jam:** 60 slot menit (interval 1 menit).
  - **6 Jam:** 72 slot (interval 5 menit).
  - **24 Jam:** 72 slot (interval 20 menit).
  - **7 Hari & 30 Hari:** Format tanggal `DD/MM` (interval multi-jam).
- **True Null Handling:** Data yang tidak terekam tetap bernilai `null` tanpa interpolasi palsu (`spanGaps: true` untuk kelancaran kurva visual).
- **Tab Filter Domain:** Pemilahan grafik berdasarkan *Semua Parameter*, *Mikroklimat Greenhouse*, *Kualitas Air & pH*, dan *Curah Hujan*.
- **Ekspor CSV:** Mengunduh berkas rekaman per sensor sesuai rentang waktu aktif.

### C. AiInsightModal (`AiInsightModal.jsx`)
Antarmuka analisis cerdas yang mengevaluasi:
- **Indeks Kesehatan Sistem (0 - 100):** Skor terbobot kualitas greenhouse dan air.
- **Status Operasional:** Label status `OPTIMAL`, `CAUTION`, atau `CRITICAL`.
- **3 Kartu Evaluasi Domain:**
  1. *Mikroklimat & VPD:* Evaluasi Vapor Pressure Deficit (kPa) untuk laju transpirasi daun.
  2. *Kualitas Air & pH:* Evaluasi ketersediaan hara makro/mikro berdasarkan pH dan EC.
  3. *Panen Air Hujan:* Evaluasi volume tangkapan presipitasi dan cadangan hari irigasi.
- **Rekomendasi Tindakan Operasional:** Langkah koreksi praktis bagi operator lab.
- **Tombol Analisis Ulang (Fresh):** Memaksa inferensi model secara real-time tanpa cache.

---

## 4. Alur Sinkronisasi Data Real-Time

1. **Inisialisasi Aplikasi (`App.jsx`):**
   - Mengambil data snapshot awal via `GET /api/v1/sensors`.
   - Mengambil data historis time-series awal via `GET /api/v1/sensors/:id/history`.
2. **Koneksi Real-Time (SSE Stream):**
   - Membuka kanal `EventSource` ke `/api/v1/sensors/realtime`.
   - Ketika event `telemetry` masuk, state `overviewData` dan titik terakhir `historyData` diperbarui secara reaktif tanpa perlu reload halaman.
3. **Mekanisme Fallback:**
   - Jika koneksi SSE terputus, sistem secara otomatis menjalankan polling cadangan setiap 30 detik.

---

## 5. Panduan Instalasi dan Menjalankan

### Mode Pengembangan (Development)
```bash
# 1. Masuk ke direktori frontend
cd Frontend

# 2. Instal dependensi
npm install

# 3. Jalankan Vite dev server (port 3000)
npm run dev
```

### Kompilasi Bundle Produksi
```bash
npm run build
```
Output berkas statis siap saji akan dibuat di folder `Frontend/dist/`.

### Menjalankan Container Produksi (Docker)
```bash
docker build -t irwh-frontend .
docker run -d -p 3000:80 --name irwh_frontend irwh-frontend
```
Nginx akan melayani SPA statis dan mengalirkan proxy permintaan `/api/` langsung ke backend.
