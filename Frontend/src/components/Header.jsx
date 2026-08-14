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
    <header className="card" style={{ padding: '12px 24px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand Logo Pure Banner Image (Ukuran Lebih Besar & Jelas) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="Internet Engineering Tech - Intelligent Rain Water Harvesting"
            style={{
              height: '58px',
              width: 'auto',
              maxWidth: '380px',
              objectFit: 'contain',
              display: 'block'
            }}
          />
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
            fontSize: '0.82rem',
            fontWeight: '600',
            background: 'var(--bg-card-subtle)',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Clock size={14} />
            <span className="tabular-nums">{currentTime || '17:30 WIB'}</span>
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
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(234, 88, 12, 0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={15} />
            <span>AI Insight</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Data"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              padding: '7px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>

      </div>
    </header>
  );
}
