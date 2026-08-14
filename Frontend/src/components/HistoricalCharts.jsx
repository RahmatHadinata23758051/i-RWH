import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Download, CloudSun, Droplets, CloudRain, LayoutGrid } from 'lucide-react';
import { getExportCsvUrl } from '../services/api.js';

// Registrasi komponen Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Membuat deretan slot waktu (X-Axis timeline) berdasarkan rentang waktu yang dipilih
 * Memastikan tombol 1 Jam, 6 Jam, 24 Jam, 7 Hari, 30 Hari mengubah skala sumbu X secara proporsional.
 */
function buildRangeTimeline(range = '-24h') {
  const now = new Date();
  now.setSeconds(0, 0);
  const nowMs = now.getTime();

  let durationMs = 24 * 60 * 60 * 1000;
  let stepMs = 15 * 60 * 1000; // default 15 menit
  let totalSteps = 48;

  if (range === '-1h') {
    durationMs = 60 * 60 * 1000;
    stepMs = 1 * 60 * 1000; // 1 menit per node
    totalSteps = 60;
  } else if (range === '-6h') {
    durationMs = 6 * 60 * 60 * 1000;
    stepMs = 5 * 60 * 1000; // 5 menit per node
    totalSteps = 72;
  } else if (range === '-24h') {
    durationMs = 24 * 60 * 60 * 1000;
    stepMs = 20 * 60 * 1000; // 20 menit per node
    totalSteps = 72;
  } else if (range === '-7d') {
    durationMs = 7 * 24 * 60 * 60 * 1000;
    stepMs = 2 * 60 * 60 * 1000; // 2 jam per node
    totalSteps = 84;
  } else if (range === '-30d') {
    durationMs = 30 * 24 * 60 * 60 * 1000;
    stepMs = 8 * 60 * 60 * 1000; // 8 jam per node
    totalSteps = 90;
  }

  const startMs = nowMs - durationMs;
  const slots = [];

  for (let i = 0; i <= totalSteps; i++) {
    const tMs = startMs + i * stepMs;
    if (tMs <= nowMs) {
      slots.push(new Date(tMs).toISOString());
    }
  }

  return { slots, stepMs };
}

/**
 * Memetakan data riil sensor ke dalam slot waktu range yang dipilih.
 * Jika tidak ada pembacaan sensor pada slot tersebut, kembalikan null (bukan data palsu).
 */
function mapSensorToTimeline(timelineSlots, stepMs, rawPoints, field) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    return timelineSlots.map(() => null);
  }

  const halfStep = Math.max(30000, stepMs / 2);

  return timelineSlots.map((slotIso) => {
    const slotMs = new Date(slotIso).getTime();
    
    // Cari titik sensor riil yang berada di dalam jendela waktu slot ini
    const matches = rawPoints.filter((p) => {
      if (!p.time) return false;
      const pMs = new Date(p.time).getTime();
      return Math.abs(pMs - slotMs) <= halfStep && p[field] !== undefined && p[field] !== null && !isNaN(p[field]);
    });

    if (matches.length === 0) return null;

    // Rata-rata nilai riil jika ada beberapa titik dalam 1 bucket
    const sum = matches.reduce((acc, curr) => acc + Number(curr[field]), 0);
    return Number((sum / matches.length).toFixed(2));
  });
}

export default function HistoricalCharts({
  range = '-24h',
  onRangeChange = () => {},
  historyData = {}
}) {
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'climate', 'water', 'rain'
  const [exportSensor, setExportSensor] = useState('sensor1');

  const categories = [
    { id: 'all', label: 'Semua Parameter', icon: <LayoutGrid size={14} /> },
    { id: 'climate', label: 'Mikroklimat Greenhouse', icon: <CloudSun size={14} /> },
    { id: 'water', label: 'Kualitas Air & pH', icon: <Droplets size={14} /> },
    { id: 'rain', label: 'Curah Hujan', icon: <CloudRain size={14} /> }
  ];

  const rangeButtons = [
    { label: '1 Jam', value: '-1h' },
    { label: '6 Jam', value: '-6h' },
    { label: '24 Jam', value: '-24h' },
    { label: '7 Hari', value: '-7d' },
    { label: '30 Hari', value: '-30d' }
  ];

  // Helper formatting waktu label sumbu X ke zona waktu Asia/Jakarta (WIB)
  const formatTimeLabel = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    if (range === '-7d' || range === '-30d') {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}`;
    }

    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    });
  };

  // 1. Ekstrak data titik murni dari masing-masing sensor
  const rawS1 = Array.isArray(historyData.sensor1?.points) ? historyData.sensor1.points : [];
  const rawS2 = Array.isArray(historyData.sensor2?.points) ? historyData.sensor2.points : [];
  const rawS3 = Array.isArray(historyData.sensor3?.points) ? historyData.sensor3.points : [];
  const rawS4 = Array.isArray(historyData.sensor4?.points) ? historyData.sensor4.points : [];
  const rawS5 = Array.isArray(historyData.sensor5?.points) ? historyData.sensor5.points : [];

  // 2. Bangun rentang timeline sumbu X sesuai tombol range yang sedang aktif
  const { slots: timelineSlots, stepMs } = buildRangeTimeline(range);
  const timeLabels = timelineSlots.map((t) => formatTimeLabel(t));

  // -------------------------------------------------------------
  // CHART 1: Komparasi Suhu Udara (°C) — Suhu Internal vs External
  // -------------------------------------------------------------
  const tempCompareData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Suhu Internal GH (°C)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS1, 'temp'),
        borderColor: '#ea580c',
        backgroundColor: '#ea580c',
        borderWidth: 2.2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true
      },
      {
        label: 'Suhu Luar Ruang (°C)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS2, 'temp'),
        borderColor: '#16a34a',
        backgroundColor: '#16a34a',
        borderWidth: 2.2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true
      }
    ]
  };

  // -------------------------------------------------------------
  // CHART 2: Komparasi Kelembapan Udara (% RH) — Internal vs External
  // -------------------------------------------------------------
  const humCompareData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Kelembapan Internal (% RH)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS1, 'hum'),
        borderColor: '#0284c7',
        backgroundColor: '#0284c7',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true
      },
      {
        label: 'Kelembapan Luar (% RH)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS2, 'hum'),
        borderColor: '#9333ea',
        backgroundColor: '#9333ea',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true
      }
    ]
  };

  // -------------------------------------------------------------
  // CHART 3: Nutrisi & Mineral Air — EC (µS/cm) & TDS (ppm)
  // -------------------------------------------------------------
  const ecTdsData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'EC (µS/cm)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS3, 'ec'),
        borderColor: '#059669',
        backgroundColor: '#059669',
        borderWidth: 2.2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true,
        yAxisID: 'y'
      },
      {
        label: 'TDS (ppm / mg/L)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS3, 'tds'),
        borderColor: '#0284c7',
        backgroundColor: '#0284c7',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true,
        yAxisID: 'y'
      }
    ]
  };

  // -------------------------------------------------------------
  // CHART 4: Derajat Keasaman Air (pH)
  // -------------------------------------------------------------
  const phData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Derajat Keasaman (pH)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS4, 'ph'),
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.1)',
        fill: true,
        borderWidth: 2.2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3.5 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true
      }
    ]
  };

  // -------------------------------------------------------------
  // CHART 5: Potensial Redoks (ORP) & Suhu Air
  // -------------------------------------------------------------
  const orpWaterTempData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'ORP / Redoks (mV)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS4, 'orp'),
        borderColor: '#7c3aed',
        backgroundColor: '#7c3aed',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: range === '-1h' ? 3 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true,
        yAxisID: 'y'
      },
      {
        label: 'Suhu Air (°C)',
        data: mapSensorToTimeline(timelineSlots, stepMs, rawS3, 'tempair'),
        borderColor: '#0284c7',
        backgroundColor: '#0284c7',
        borderWidth: 1.8,
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: range === '-1h' ? 2.5 : 1,
        pointHoverRadius: 5,
        spanGaps: true,
        yAxisID: 'y1'
      }
    ]
  };

  // -------------------------------------------------------------
  // CHART 6: Intensitas & Akumulasi Curah Hujan (Line Chart)
  // -------------------------------------------------------------
  const rainMapped = mapSensorToTimeline(timelineSlots, stepMs, rawS5, 'rain');
  const rainData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Intensitas Hujan (mm)',
        data: rainMapped,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.15)',
        fill: true,
        borderWidth: 2.2,
        tension: 0.35,
        pointRadius: range === '-1h' ? 3.5 : (range === '-6h' ? 2 : 1.5),
        pointHoverRadius: 6,
        spanGaps: true,
        yAxisID: 'y'
      },
      {
        label: 'Akumulasi (mm)',
        data: rainMapped.map((val, i) => {
          const validSoFar = rainMapped.slice(0, i + 1).filter(v => v !== null && !isNaN(v));
          if (validSoFar.length === 0) return null;
          const sum = validSoFar.reduce((acc, curr) => acc + curr, 0);
          return Number(sum.toFixed(2));
        }),
        borderColor: '#38bdf8',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: range === '-1h' ? 2.5 : 1,
        pointHoverRadius: 5,
        spanGaps: true,
        yAxisID: 'y1'
      }
    ]
  };

  // Helper pembuat opsi grafik murni
  const createChartOptions = (unitY = '', unitY1 = '', yMin = undefined, yMax = undefined) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
          color: '#64748b'
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Plus Jakarta Sans', size: 11, weight: '700' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 10 },
        padding: 8,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 9 },
          color: '#94a3b8',
          maxTicksLimit: 8,
          maxRotation: 0,
          autoSkip: true
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        min: yMin,
        max: yMax,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#94a3b8' },
        title: unitY ? { display: true, text: unitY, font: { size: 9 } } : undefined
      },
      y1: unitY1 ? {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#94a3b8' },
        title: { display: true, text: unitY1, font: { size: 9 } }
      } : { display: false }
    }
  });

  const handleDownloadCsv = () => {
    const url = getExportCsvUrl(exportSensor, range);
    window.open(url, '_blank');
  };

  return (
    <section style={{ marginBottom: '24px' }}>
      
      {/* 1. Header Bar: Section Title + Range Filter + CSV */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div className="section-title" style={{ margin: 0 }}>
          <span>HISTORICAL ANALYTICS & TIME-SERIES CHARTS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Range Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {rangeButtons.map((btn) => (
              <button
                key={btn.value}
                className={`btn-range ${range === btn.value ? 'active' : ''}`}
                onClick={() => onRangeChange(btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button className="btn-export" onClick={handleDownloadCsv}>
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: activeCategory === cat.id ? '700' : '500',
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: activeCategory === cat.id ? '1px solid var(--color-orange-border)' : '1px solid var(--border-subtle)',
              backgroundColor: activeCategory === cat.id ? 'var(--color-orange-light)' : '#ffffff',
              color: activeCategory === cat.id ? 'var(--color-orange)' : 'var(--text-muted)'
            }}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Grid of Time-Series Charts Berdasarkan Kategori yang Dipilih */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '16px'
      }}>
        
        {/* DOMAIN: MIKROKLIMAT */}
        {(activeCategory === 'all' || activeCategory === 'climate') && (
          <>
            {/* Chart A: Komparasi Suhu Internal vs External */}
            <div className="card" style={{ padding: '16px 20px', height: '260px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '6px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800' }}>Komparasi Suhu Udara</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Suhu Internal Greenhouse (AGH3485) vs Suhu Luar</p>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Line data={tempCompareData} options={createChartOptions('°C')} />
              </div>
            </div>

            {/* Chart B: Komparasi Kelembapan Udara */}
            <div className="card" style={{ padding: '16px 20px', height: '260px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '6px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800' }}>Komparasi Kelembapan Udara</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kelembapan Relatif (% RH) Internal vs Eksternal</p>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Line data={humCompareData} options={createChartOptions('% RH')} />
              </div>
            </div>
          </>
        )}

        {/* DOMAIN: KUALITAS AIR & pH */}
        {(activeCategory === 'all' || activeCategory === 'water') && (
          <>
            {/* Chart C: EC & TDS */}
            <div className="card" style={{ padding: '16px 20px', height: '260px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '6px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800' }}>Mineral & Konduktivitas Air</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Konduktivitas Listrik (EC) & Total Dissolved Solids (TDS)</p>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Line data={ecTdsData} options={createChartOptions('µS/cm & ppm')} />
              </div>
            </div>

            {/* Chart D: pH Air */}
            <div className="card" style={{ padding: '16px 20px', height: '260px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '6px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800' }}>Derajat Keasaman Air (pH)</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sensor PHORP10 (Rentang Aman Netral: 6.5 - 8.0 pH)</p>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Line data={phData} options={createChartOptions('pH', '', 0, 14)} />
              </div>
            </div>

            {/* Chart E: ORP & Suhu Air */}
            <div className="card" style={{ padding: '16px 20px', height: '260px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '6px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800' }}>Potensial Redoks (ORP) & Suhu Air</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kebersihan Air (ORP in mV) dan Temperatur Air Tangki (°C)</p>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Line data={orpWaterTempData} options={createChartOptions('mV', '°C')} />
              </div>
            </div>
          </>
        )}

        {/* DOMAIN: CURAH HUJAN */}
        {(activeCategory === 'all' || activeCategory === 'rain') && (
          <div className="card" style={{ padding: '16px 20px', height: '260px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '6px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800' }}>Presipitasi Curah Hujan</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Intensitas & Akumulasi Hujan Tipping Bucket (Modbus ID 6)</p>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <Line data={rainData} options={createChartOptions('Intensitas (mm)', 'Akumulasi (mm)')} />
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
