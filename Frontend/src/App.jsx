import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import KpiCards from './components/KpiCards.jsx';
import HistoricalCharts from './components/HistoricalCharts.jsx';
import TelemetryTable from './components/TelemetryTable.jsx';
import AiInsightModal from './components/AiInsightModal.jsx';
import { fetchOverview, fetchHistory, createEventSource } from './services/api.js';

export default function App() {
  const [range, setRange] = useState('-24h');
  const [gatewayStatus, setGatewayStatus] = useState('online');
  const [sseConnected, setSseConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // State overview telemetri sensor
  const [overviewData, setOverviewData] = useState({
    internalGreenhouse: { temp: 28.5, hum: 74.0, updatedAt: new Date().toISOString() },
    externalGreenhouse: { temp: 32.1, hum: 68.0, updatedAt: new Date().toISOString() },
    waterConductivity: { tempair: 26.4, ec: 1250, salinity: 600, tds: 800, updatedAt: new Date().toISOString() },
    waterPhOrp: { suhu: 26.5, ph: 7.25, orp: 230, updatedAt: new Date().toISOString() },
    rainfall: { rain: 0.5, unit_verified: false, updatedAt: new Date().toISOString() }
  });

  // State time-series data
  const [historyData, setHistoryData] = useState({
    sensor1: { points: [] },
    sensor2: { points: [] },
    sensor3: { points: [] },
    sensor4: { points: [] },
    sensor5: { points: [] }
  });

  // Load Data Overview
  const loadOverview = useCallback(async () => {
    try {
      const res = await fetchOverview();
      if (res && res.success && res.data) {
        if (res.data.gateway?.status) {
          setGatewayStatus(res.data.gateway.status);
        }
        if (res.data.sensors) {
          const s = res.data.sensors;
          setOverviewData({
            internalGreenhouse: s.sensor1?.readings || overviewData.internalGreenhouse,
            externalGreenhouse: s.sensor2?.readings || overviewData.externalGreenhouse,
            waterConductivity: s.sensor3?.readings || overviewData.waterConductivity,
            waterPhOrp: s.sensor4?.readings || overviewData.waterPhOrp,
            rainfall: s.sensor5?.readings || overviewData.rainfall
          });
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('Menggunakan data telemetri cache/default saat backend booting:', err.message);
    }
  }, []);

  // Load Data Historis Time-Series
  const loadHistory = useCallback(async (selectedRange) => {
    const sensors = ['sensor1', 'sensor2', 'sensor3', 'sensor4', 'sensor5'];
    try {
      const results = await Promise.allSettled(
        sensors.map(id => fetchHistory(id, selectedRange, 'auto', 'mean'))
      );

      const newHistory = { ...historyData };
      results.forEach((r, idx) => {
        const id = sensors[idx];
        if (r.status === 'fulfilled' && r.value?.data?.points) {
          newHistory[id] = r.value.data;
        }
      });
      setHistoryData(newHistory);
    } catch (err) {
      console.error('Gagal mengambil data historis:', err);
    }
  }, []);

  // Initial Load & Polling Interval (setiap 30 detik sebagai fallback)
  useEffect(() => {
    loadOverview();
    loadHistory(range);

    const timer = setInterval(() => {
      loadOverview();
    }, 30000);

    return () => clearInterval(timer);
  }, [loadOverview, loadHistory, range]);

  // Connect SSE Live Stream
  useEffect(() => {
    let sse;
    try {
      sse = createEventSource({
        onTelemetry: (payload) => {
          setSseConnected(true);
          setLastUpdated(new Date());

          if (!payload?.sensorId || !payload?.data) return;

          // Update overview state
          setOverviewData(prev => {
            const updated = { ...prev };
            if (payload.sensorId === 'sensor1') updated.internalGreenhouse = { ...prev.internalGreenhouse, ...payload.data, updatedAt: payload.time };
            if (payload.sensorId === 'sensor2') updated.externalGreenhouse = { ...prev.externalGreenhouse, ...payload.data, updatedAt: payload.time };
            if (payload.sensorId === 'sensor3') updated.waterConductivity = { ...prev.waterConductivity, ...payload.data, updatedAt: payload.time };
            if (payload.sensorId === 'sensor4') updated.waterPhOrp = { ...prev.waterPhOrp, ...payload.data, updatedAt: payload.time };
            if (payload.sensorId === 'sensor5') updated.rainfall = { ...prev.rainfall, ...payload.data, updatedAt: payload.time };
            return updated;
          });

          // Update live stream time-series points dengan data telemetri murni
          setHistoryData(prev => {
            const sid = payload.sensorId;
            const currentPoints = prev[sid]?.points || [];
            const newPoint = { time: payload.time, ...payload.data };

            let updatedPoints;
            if (currentPoints.length === 0) {
              updatedPoints = [newPoint];
            } else if (range === '-1h') {
              // Di mode 1 Jam (Live), geser jendela sliding window secara dinamis (maksimal 30 titik)
              updatedPoints = [...currentPoints.slice(-29), newPoint];
            } else {
              // Di mode historis, tambahkan titik live jika belum ada timestamp yang sama
              const lastPoint = currentPoints[currentPoints.length - 1];
              if (lastPoint && lastPoint.time === payload.time) {
                updatedPoints = [...currentPoints.slice(0, -1), newPoint];
              } else {
                updatedPoints = [...currentPoints, newPoint];
              }
            }

            return {
              ...prev,
              [sid]: {
                ...prev[sid],
                points: updatedPoints
              }
            };
          });
        },
        onStatus: (statusPayload) => {
          setSseConnected(true);
          if (statusPayload?.status) {
            setGatewayStatus(statusPayload.status);
          }
        },
        onPing: () => {
          setSseConnected(true);
        },
        onError: () => {
          setSseConnected(false);
        }
      });
    } catch (e) {
      setSseConnected(false);
    }

    return () => {
      if (sse) sse.close();
    };
  }, []);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    loadHistory(newRange);
  };

  return (
    <div className="app-container">
      {/* 1. Header Bar */}
      <Header
        gatewayStatus={gatewayStatus}
        sseConnected={sseConnected}
        lastUpdated={lastUpdated}
        onRefresh={() => {
          loadOverview();
          loadHistory(range);
        }}
        onOpenAiInsight={() => setIsAiModalOpen(true)}
      />

      {/* 2. Top KPI Stats Cards */}
      <KpiCards data={overviewData} />

      {/* 3. Historical Analytics & Time-Series Charts (2x2 Grid) */}
      <HistoricalCharts
        range={range}
        onRangeChange={handleRangeChange}
        historyData={historyData}
      />

      {/* 4. Telemetry Log & Sensors Table */}
      <TelemetryTable data={overviewData} />

      {/* 5. AI Agro-Insight Modal Dialog */}
      <AiInsightModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentRange={range}
      />
    </div>
  );
}

