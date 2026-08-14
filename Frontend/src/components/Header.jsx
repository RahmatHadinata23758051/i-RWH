import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, Sparkles } from 'lucide-react';

export default function Header({
  gatewayStatus = 'online',
  sseConnected = true,
  lastUpdated = null,
  onRefresh = () => {},
  onOpenAiInsight = () => {}
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
      });
      setCurrentTime(`${timeStr} WIB`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isOnline = gatewayStatus === 'online' || gatewayStatus === '1' || gatewayStatus === 1;

  return (
    <header className="card" style={{ padding: '6px 24px', marginBottom: '20px', minHeight: '120px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        minHeight: '110px'
      }}>
        
        {/* Brand Logo Pure Banner Image (Sangat Besar Menempati Seluruh Area Kiri) */}
        <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 500px', maxWidth: '650px' }}>
          <img
            src="/logo.png"
            alt="Internet Engineering Tech - Intelligent Rain Water Harvesting"
            style={{
              height: '110px',
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        {/* Status Indicators & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          
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
            fontSize: '0.85rem',
            fontWeight: '600',
            background: 'var(--bg-card-subtle)',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Clock size={15} />
            <span className="tabular-nums">{currentTime || '17:35 WIB'}</span>
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
              padding: '9px 20px',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(234, 88, 12, 0.15)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} />
            <span>AI Insight</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Data"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              padding: '9px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <RefreshCw size={17} />
          </button>
        </div>

      </div>
    </header>
  );
}
