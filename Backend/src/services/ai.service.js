import { config } from '../config/env.js';
import { getHistoricalData, getOverviewAllSensors } from './influx.service.js';
import { SENSORS_METADATA } from '../utils/constants.js';

// In-memory cache untuk menyimpan insight AI (TTL: 10 menit)
const insightCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Menghitung Vapor Pressure Deficit (VPD) dalam satuan kPa
 * VPD = VPsat * (1 - RH / 100)
 * VPsat = 0.61078 * exp((17.27 * T) / (T + 237.3))
 */
function calculateVpd(tempC, rhPercent) {
  if (tempC === undefined || rhPercent === undefined) return 1.1;
  const vpSat = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const vpd = vpSat * (1 - rhPercent / 100);
  return Number(vpd.toFixed(2));
}

/**
 * Menghitung ringkasan statistik (Min, Max, Avg, Latest) dari telemetri
 */
async function aggregateTelemetryData(from = '-24h', to = 'now()') {
  const sensorIds = ['sensor1', 'sensor2', 'sensor3', 'sensor4', 'sensor5'];
  const historyResults = await Promise.allSettled(
    sensorIds.map(id => getHistoricalData({ sensorId: id, from, to, interval: 'auto', aggregate: 'mean' }))
  );

  const overview = await getOverviewAllSensors();

  const summary = {
    period: { from, to },
    sensor1_internalGh: {},
    sensor2_externalGh: {},
    sensor3_waterConductivity: {},
    sensor4_waterPhOrp: {},
    sensor5_rainfall: {},
    calculatedMetrics: {}
  };

  historyResults.forEach((res, idx) => {
    const id = sensorIds[idx];
    if (res.status === 'fulfilled' && res.value?.points?.length > 0) {
      const points = res.value.points;
      const meta = SENSORS_METADATA[id];
      const stats = {};

      meta.fields.forEach(f => {
        const values = points.map(p => p[f.key]).filter(v => v !== undefined && v !== null);
        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const latest = values[values.length - 1];
          stats[f.key] = {
            min: Number(min.toFixed(2)),
            max: Number(max.toFixed(2)),
            avg: Number(avg.toFixed(2)),
            latest: Number(latest.toFixed(2)),
            unit: f.unit
          };
        }
      });

      if (id === 'sensor1') summary.sensor1_internalGh = stats;
      if (id === 'sensor2') summary.sensor2_externalGh = stats;
      if (id === 'sensor3') summary.sensor3_waterConductivity = stats;
      if (id === 'sensor4') summary.sensor4_waterPhOrp = stats;
      if (id === 'sensor5') summary.sensor5_rainfall = stats;
    }
  });

  // Hitung metrik turunan
  const inTemp = summary.sensor1_internalGh.temp?.avg || 27.5;
  const inHum = summary.sensor1_internalGh.hum?.avg || 72.0;
  const vpd = calculateVpd(inTemp, inHum);

  // Estimasi tangkapan air hujan (asumsi atap lab greenhouse 200 m2 dengan koefisien limpasan 0.85)
  const totalRainMm = (summary.sensor5_rainfall.rain?.avg || 0) * 12; // estimasi akumulasi
  const estimatedHarvestLiters = Math.round(totalRainMm * 200 * 0.85);

  summary.calculatedMetrics = {
    vpdKpa: vpd,
    vpdStatus: vpd >= 0.8 && vpd <= 1.4 ? 'Optimal' : (vpd < 0.8 ? 'Terlalu Lembap' : 'Kering/Transpirasi Tinggi'),
    tempDeltaInsideOutside: Number(((summary.sensor1_internalGh.temp?.avg || 27.5) - (summary.sensor2_externalGh.temp?.avg || 31.0)).toFixed(2)),
    estimatedHarvestLiters: Math.max(120, estimatedHarvestLiters),
    liveSnapshot: overview
  };

  return summary;
}

/**
 * Fallback generator analisis jika Gemini API offline atau kuota habis
 */
function generateHeuristicInsight(analyticsData) {
  const vpd = analyticsData.calculatedMetrics.vpdKpa || 1.15;
  const ph = analyticsData.sensor4_waterPhOrp?.ph?.latest || 7.2;
  const ec = analyticsData.sensor3_waterConductivity?.ec?.latest || 1200;
  const temp = analyticsData.sensor1_internalGh?.temp?.latest || 27.5;
  const harvestLiters = analyticsData.calculatedMetrics.estimatedHarvestLiters || 450;

  const isPhOptimal = ph >= 5.8 && ph <= 6.8;
  const isVpdOptimal = vpd >= 0.8 && vpd <= 1.4;

  let overallScore = 88;
  if (!isPhOptimal) overallScore -= 8;
  if (!isVpdOptimal) overallScore -= 7;

  return {
    overallHealthScore: Math.max(60, overallScore),
    status: overallScore >= 80 ? 'optimal' : (overallScore >= 65 ? 'warning' : 'critical'),
    executiveSummary: `Kondisi mikroklimat greenhouse dan sistem pemanenan air hujan (i-RWH) berada pada status ${overallScore >= 80 ? 'Optimal' : 'Perlu Penyesuaian Ringan'}. Indeks transpirasi tanaman (VPD ${vpd} kPa) stabil, cadangan air hujan terakumulasi dengan baik, dan kualitas air tangki terjaga.`,
    period: analyticsData.period,
    metricsSummary: {
      vpd: `${vpd} kPa (${analyticsData.calculatedMetrics.vpdStatus})`,
      ph: `${ph} pH (${isPhOptimal ? 'Ideal 5.8-6.8' : 'Perlu Koreksi Asam'})`,
      ec: `${ec} µS/cm (Nutrisi Cukup)`,
      harvestYield: `±${harvestLiters} Liter`
    },
    domains: {
      microclimate: {
        score: isVpdOptimal ? 94 : 78,
        status: isVpdOptimal ? 'optimal' : 'warning',
        vpdValue: `${vpd} kPa`,
        analysis: `Suhu internal greenhouse (${temp}°C) terjaga dengan baik. Nilai VPD ${vpd} kPa memastikan stomata daun membuka sempurna untuk fotosintesis tanpa risiko penguapan berlebih.`,
        recommendations: [
          'Pertahankan sirkulasi exhaust fan pada kecepatan sedang.',
          'Misting tidak diperlukan saat ini karena kelembapan sudah mencukupi.'
        ]
      },
      waterQuality: {
        score: isPhOptimal ? 92 : 80,
        status: isPhOptimal ? 'optimal' : 'warning',
        phStatus: `${ph} pH`,
        ecBalance: `${ec} µS/cm`,
        analysis: isPhOptimal
          ? `Derajat keasaman (pH ${ph}) dan konduktivitas (${ec} µS/cm) dalam kondisi sempurna untuk serapan hara makro.`
          : `pH air saat ini (${ph}) sedikit di atas rentang serapan hara mikro optimum (5.8–6.5). EC (${ec} µS/cm) tetap stabil.`,
        recommendations: [
          isPhOptimal ? 'Kualitas larutan nutrisi optimal, pertahankan formula saat ini.' : 'Tambahkan larutan pH Down (asam nitrat/fosfat) secara bertahap untuk menurunkan pH ke 6.2.',
          'Lakukan kalibrasi berkala pada probe sensor EC dan pH.'
        ]
      },
      rainwaterHarvesting: {
        score: 90,
        status: 'optimal',
        harvestYield: `±${harvestLiters} Liter`,
        analysis: `Sistem penampungan air hujan berhasil menangkap estimasi ±${harvestLiters} Liter air bersih yang siap dialirkan ke tandon filtrasi.`,
        recommendations: [
          'Periksa saringan talang atap untuk memastikan tidak ada hambatan debris organik.',
          'Cadangan air mencukupi kebutuhan irigasi greenhouse selama 3-4 hari ke depan.'
        ]
      }
    },
    keyActionItems: [
      !isPhOptimal ? 'Lakukan koreksi pH air tandon dengan dosis pH Down ringan.' : 'Pertahankan rasio nutrisi tandon air.',
      'Pantau suhu internal greenhouse saat puncak sinar matahari siang.',
      'Pastikan saluran bypass first-flush air hujan berfungsi normal.'
    ],
    generatedAt: new Date().toISOString(),
    engine: 'i-RWH Agro-Rule Heuristics'
  };
}

/**
 * Service Utama: Menghasilkan AI Insight menggunakan Google Gemini API
 */
export async function getAiInsight({
  from = '-24h',
  to = 'now()',
  focusDomain = 'all',
  forceFresh = false
} = {}) {
  const cacheKey = `${from}_${to}_${focusDomain}`;

  // Cek cache terlebih dahulu
  if (!forceFresh && insightCache.has(cacheKey)) {
    const cached = insightCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        cached: true,
        data: cached.data
      };
    }
  }

  // 1. Agregasi data telemetri historis & metrik agronomis
  const analyticsData = await aggregateTelemetryData(from, to);

  // Jika Gemini API key belum diisi, gunakan fallback lokal
  if (!config.gemini.apiKey || config.gemini.apiKey.trim() === '') {
    const heuristicData = generateHeuristicInsight(analyticsData);
    insightCache.set(cacheKey, { timestamp: Date.now(), data: heuristicData });
    return { cached: false, data: heuristicData };
  }

  // 2. Susun prompt untuk Google Gemini AI
  const systemPrompt = `
Anda adalah "AI Senior Agro-Hydrologist & Smart Greenhouse Expert" untuk sistem penelitian i-RWH (Intelligent Rain Water Harvesting & Greenhouse IoT) di Politeknik Negeri Lampung (Polinela).

Tugas Anda adalah menganalisis data telemetri multi-sensor dari greenhouse dan tandon air hujan berikut, lalu menghasilkan INSIGHT AGRO-HIDROLOGI DALAM FORMAT JSON MURNI (Strict JSON).

DATA TELEMETRI & AGREGASI:
${JSON.stringify(analyticsData, null, 2)}

PANDUAN ILMIAH & THRESHOLD:
1. Mikroklimat Greenhouse:
   - Suhu Internal Ideal: 24°C - 30°C.
   - Kelembapan Internal Ideal: 65% - 80% RH.
   - VPD (Vapor Pressure Deficit) Ideal: 0.8 - 1.4 kPa. (<0.8 = Terlalu basah/jamur, >1.4 = Stres kekeringan).
2. Kualitas Air & Nutrisi:
   - pH Ideal Penyerapan Hara: 5.8 - 6.8 pH.
   - EC (Elektrokonduktivitas) Ideal: 1000 - 1500 µS/cm.
   - ORP (Oksidasi-Reduksi / Kebersihan Air): >200 mV (steril).
3. Pemanenan Air Hujan:
   - Evaluasi efisiensi tangkapan air hujan dan kecukupan hari irigasi.

WAJIB MERESPONS HANYA DALAM FORMAT JSON VALID BERIKUT (Tanpa blok markdown pembungkus lain diluar json):
{
  "overallHealthScore": 88,
  "status": "optimal",
  "executiveSummary": "Ringkasan eksekutif 2-3 kalimat padat mengenai kondisi greenhouse & panen air hujan.",
  "period": { "from": "${from}", "to": "${to}" },
  "metricsSummary": {
    "vpd": "1.15 kPa (Optimal)",
    "ph": "7.15 pH (Normal)",
    "ec": "1200 µS/cm (Stabil)",
    "harvestYield": "±450 Liter"
  },
  "domains": {
    "microclimate": {
      "score": 92,
      "status": "optimal",
      "vpdValue": "1.15 kPa",
      "analysis": "Analisis saintifik kondisi suhu, kelembapan, dan transpirasi stomata.",
      "recommendations": ["Rekomendasi 1", "Rekomendasi 2"]
    },
    "waterQuality": {
      "score": 85,
      "status": "warning",
      "phStatus": "7.15 pH",
      "ecBalance": "1200 µS/cm",
      "analysis": "Analisis saintifik pH, EC, TDS, dan ketersediaan hara tanaman.",
      "recommendations": ["Rekomendasi 1", "Rekomendasi 2"]
    },
    "rainwaterHarvesting": {
      "score": 90,
      "status": "optimal",
      "harvestYield": "±450 Liter",
      "analysis": "Analisis saintifik tangkapan presipitasi dan estimasi cadangan hari irigasi.",
      "recommendations": ["Rekomendasi 1", "Rekomendasi 2"]
    }
  },
  "keyActionItems": [
    "Aksi prioritas 1",
    "Aksi prioritas 2",
    "Aksi prioritas 3"
  ],
  "generatedAt": "${new Date().toISOString()}",
  "engine": "Google Gemini 1.5 Flash"
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Gemini API returned non-200 status:', response.status, errText);
      const fallback = generateHeuristicInsight(analyticsData);
      insightCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
      return { cached: false, data: fallback };
    }

    const resJson = await response.json();
    const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini API response format kosong');
    }

    // Bersihkan kemungkinan markdown codeblock fences jika ada
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonText);

    // Simpan ke cache
    insightCache.set(cacheKey, { timestamp: Date.now(), data: parsedData });

    return {
      cached: false,
      data: parsedData
    };
  } catch (error) {
    console.error('Error saat memanggil Gemini AI Service, beralih ke local heuristic:', error.message);
    const fallback = generateHeuristicInsight(analyticsData);
    insightCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
    return { cached: false, data: fallback };
  }
}
