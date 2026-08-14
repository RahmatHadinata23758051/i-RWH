import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  AlertTriangle,
  Droplets,
  CloudRain,
  Sprout
} from 'lucide-react';
import { fetchAiInsight } from '../services/api.js';

export default function AiInsightModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);

  const loadInsight = async (forceFresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // Selalu mengambil insight kondisi real-time terkini (-1h)
      const res = await fetchAiInsight({ from: '-1h', to: 'now()', forceFresh });
      if (res && res.success && res.data) {
        setInsight(res.data);
      } else {
        setError(res?.message || 'Gagal memuat insight dari AI.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi gangguan jaringan saat menghubungi AI Service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInsight(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #fff7ed, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo.png"
              alt="i-RWH Logo"
              style={{
                width: '36px',
                height: '36px',
                objectFit: 'contain'
              }}
            />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                i-RWH AI Agro-Insight
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Analisis saintifik mikroklimat greenhouse, VPD transpirasi, dan neraca penampungan air hujan
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Tombol Analisis Ulang */}
            <button
              onClick={() => loadInsight(true)}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-orange-border)',
                color: 'var(--color-orange)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
              <span>{loading ? 'Menganalisis...' : 'Analisis Ulang'}</span>
            </button>

            {/* Tombol Close */}
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                borderRadius: '50%',
                backgroundColor: '#fff7ed',
                marginBottom: '12px'
              }}>
                <RefreshCw size={32} color="var(--color-orange)" className="spin-anim" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '4px' }}>
                Menjalankan Analisis Agro-Hidrologi Real-Time...
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Mengevaluasi data telemetri 5 sensor saat ini, menghitung indeks VPD, dan merumuskan rekomendasi.
              </p>
            </div>
          )}

          {error && !loading && (
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          {insight && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Top Summary Banner */}
              <div style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: insight.status === 'optimal' ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${insight.status === 'optimal' ? '#bbf7d0' : '#fde68a'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: insight.status === 'optimal' ? '#16a34a' : '#d97706',
                      color: '#ffffff'
                    }}>
                      Status: {insight.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Diperbarui: {new Date(insight.generatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.5, margin: 0 }}>
                    {insight.executiveSummary}
                  </p>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  minWidth: '130px'
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Indeks Kesehatan
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--color-orange)' }}>
                    {insight.overallHealthScore ?? insight.overallScore ?? 85}<span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/100</span>
                  </div>
                </div>
              </div>

              {/* 3 Domain Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px'
              }}>
                
                {/* 1. Mikroklimat & VPD */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ color: '#ea580c', background: '#fff7ed', padding: '6px', borderRadius: '8px' }}>
                        <Sprout size={16} />
                      </div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0 }}>Mikroklimat & VPD</h4>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#16a34a' }}>
                      {insight.domains?.microclimate?.score || 90}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.45, marginBottom: '10px' }}>
                    {insight.domains?.microclimate?.analysis}
                  </p>
                  {insight.domains?.microclimate?.recommendations?.length > 0 && (
                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                        Rekomendasi:
                      </span>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '14px', fontSize: '0.72rem', color: '#334155' }}>
                        {insight.domains.microclimate.recommendations.map((rec, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 2. Kualitas Air & pH */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ color: '#059669', background: '#ecfdf5', padding: '6px', borderRadius: '8px' }}>
                        <Droplets size={16} />
                      </div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0 }}>Kualitas Air & pH</h4>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#059669' }}>
                      {insight.domains?.waterQuality?.score || 85}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.45, marginBottom: '10px' }}>
                    {insight.domains?.waterQuality?.analysis}
                  </p>
                  {insight.domains?.waterQuality?.recommendations?.length > 0 && (
                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                        Rekomendasi:
                      </span>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '14px', fontSize: '0.72rem', color: '#334155' }}>
                        {insight.domains.waterQuality.recommendations.map((rec, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 3. Panen Air Hujan */}
                {(() => {
                  const rainDom = insight.domains?.rainwaterHarvesting || insight.domains?.rainHarvesting || insight.domains?.rainwater || {};
                  return (
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ color: '#0284c7', background: '#f0f9ff', padding: '6px', borderRadius: '8px' }}>
                            <CloudRain size={16} />
                          </div>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0 }}>Panen Air Hujan</h4>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7' }}>
                          {rainDom.score || 90}%
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.45, marginBottom: '10px' }}>
                        {rainDom.analysis || 'Sistem pemanenan air hujan i-RWH beroperasi dengan baik dalam menangkap presipitasi untuk cadangan air irigasi.'}
                      </p>
                      {rainDom.recommendations?.length > 0 && (
                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                            Rekomendasi:
                          </span>
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: '14px', fontSize: '0.72rem', color: '#334155' }}>
                            {rainDom.recommendations.map((rec, idx) => (
                              <li key={idx} style={{ marginBottom: '2px' }}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            i-RWH Polinela Lab • Agro-Hydrology Insight
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 18px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
