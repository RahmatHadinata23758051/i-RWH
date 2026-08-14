import React, { useState, useEffect } from 'react';
import { Sprout, Clock, Radio, Key, RefreshCw, Sparkles } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../services/api.js';

export default function Header({
  gatewayStatus = 'online',
  sseConnected = true,
  lastUpdated = null,
  onRefresh = () => {},
  onOpenAiInsight = () => {}
}) {
  const [currentTime, setCurrentTime] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setCurrentTime(`${timeStr} WIB`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveKey = () => {
    setStoredApiKey(apiKeyInput);
    setShowKeyModal(false);
    window.location.reload();
  };

  const isOnline = gatewayStatus === 'online' || gatewayStatus === '1' || gatewayStatus === 1;

  return (
    <header className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/logo.png"
            alt="i-RWH Logo"
            style={{
              width: '38px',
              height: '38px',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>i-RWH</span>
              <span style={{ color: 'var(--text-light)', fontWeight: '400' }}>•</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>Polinela Lab</span>
            </h1>
          </div>
        </div>

        {/* Status Indicators & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Gateway Status Badge */}
          <div className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
            <span className={`status-dot ${isOnline ? 'pulse' : ''}`} />
            <span>{isOnline ? 'GATEWAY ONLINE' : 'GATEWAY OFFLINE'}</span>
          </div>

          {/* SSE Live Status Badge */}
          <div className={`status-pill ${sseConnected ? 'online' : 'offline'}`} style={{
            background: sseConnected ? '#f0fdf4' : '#fffbeb',
            color: sseConnected ? '#15803d' : '#b45309',
            borderColor: sseConnected ? '#bbf7d0' : '#fde68a'
          }}>
            <span className={`status-dot ${sseConnected ? 'pulse' : ''}`} />
            <span>{sseConnected ? 'LIVE SSE: ON' : 'SSE: RECONNECTING'}</span>
          </div>

          {/* Clock */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: '600',
            background: 'var(--bg-card-subtle)',
            padding: '5px 12px',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Clock size={14} />
            <span className="tabular-nums">{currentTime || '14:30 WIB'}</span>
          </div>

          {/* AI Agro-Insight Button */}
          <button
            onClick={onOpenAiInsight}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-orange-light)',
              border: '1px solid var(--color-orange-border)',
              color: 'var(--color-orange)',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(234, 88, 12, 0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={14} />
            <span>AI Insight</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Data"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <RefreshCw size={15} />
          </button>

          {/* Settings API Key Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            title="Pengaturan API Key"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <Key size={15} />
          </button>
        </div>

      </div>

      {/* Modal API Key */}
      {showKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card" style={{ width: '400px', padding: '24px', boxShadow: 'var(--shadow-elevated)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px' }}>Pengaturan API Key</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Masukkan API Key backend untuk otorisasi akses telemetri.
            </p>
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="polinela_irwh_secret_key_2026"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
                marginBottom: '16px',
                fontFamily: 'var(--font-main)'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn-range"
                onClick={() => setShowKeyModal(false)}
              >
                Batal
              </button>
              <button
                className="btn-range active"
                onClick={handleSaveKey}
              >
                Simpan & Reload
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
