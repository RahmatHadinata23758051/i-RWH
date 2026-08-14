import React, { useState } from 'react';
import { Warehouse, Droplet, FlaskConical, CloudRain, HelpCircle, ArrowLeftRight } from 'lucide-react';

export default function KpiCards({ data = {} }) {
  const [flippedCards, setFlippedCards] = useState({});

  const {
    internalGreenhouse = {},
    waterConductivity = {},
    waterPhOrp = {},
    rainfall = {}
  } = data;

  const tempGh = internalGreenhouse.temp !== undefined ? `${internalGreenhouse.temp}°C` : '27.5°C';
  const humGh = internalGreenhouse.hum !== undefined ? `${internalGreenhouse.hum}%` : '72.0%';

  const ecVal = waterConductivity.ec !== undefined ? `${waterConductivity.ec} µS` : '1200 µS';

  const phVal = waterPhOrp.ph !== undefined ? waterPhOrp.ph : '7.15';

  const rainVal = rainfall.rain !== undefined ? rainfall.rain : 0.0;
  const rainStatus = rainVal > 0 ? '(Hujan)' : '(Cerah)';

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const cards = [
    {
      id: 'greenhouse',
      title: 'Greenhouse',
      value: `${tempGh} / ${humGh}`,
      icon: <Warehouse size={26} strokeWidth={1.8} color="#ea580c" />,
      glossaryTitle: 'Glosarium Mikroklimat',
      glossaryText: 'Mengukur suhu udara (°C) dan kelembapan (% RH) internal via sensor AGH3485. Rentang ideal hortikultura: 24–30°C dan 65–80% RH untuk mencegah stres transpirasi.'
    },
    {
      id: 'water_quality',
      title: 'Water Quality',
      value: `EC: ${ecVal}`,
      icon: <Droplet size={26} strokeWidth={1.8} color="#ea580c" />,
      glossaryTitle: 'Glosarium Nutrisi & EC',
      glossaryText: 'Mengukur Konduktivitas Listrik (EC in µS/cm) dan TDS via sensor ECTDS10. EC menunjukkan kepadatan nutrisi pupuk terlarut (rentang ideal: 1000–1500 µS/cm).'
    },
    {
      id: 'ph_orp',
      title: 'pH & ORP',
      value: `pH: ${phVal}`,
      icon: <FlaskConical size={26} strokeWidth={1.8} color="#ea580c" />,
      glossaryTitle: 'Glosarium pH & Redoks',
      glossaryText: 'Mengukur derajat keasaman (pH ideal: 5.8–6.8 untuk serapan hara) dan ORP (Oxidation-Reduction Potential in mV). ORP >200 mV menandakan air steril higienis.'
    },
    {
      id: 'rain_intensity',
      title: 'Rain Intensity',
      value: `${rainVal} mm ${rainStatus}`,
      icon: <CloudRain size={26} strokeWidth={1.8} color="#ea580c" />,
      glossaryTitle: 'Glosarium Curah Hujan',
      glossaryText: 'Mengukur presipitasi curah hujan (mm) stasiun tipping bucket. Mengestimasi penambahan debit air yang ditangkap talang atap untuk cadangan tandon irigasi.'
    }
  ];

  return (
    <section style={{ marginBottom: '24px' }}>
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>TOP KPI STATS CARDS</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          Klik kartu untuk melihat glosarium & penjelasan parameter
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px'
      }}>
        {cards.map((card) => {
          const isFlipped = !!flippedCards[card.id];

          return (
            <div
              key={card.id}
              onClick={() => toggleFlip(card.id)}
              style={{
                perspective: '1000px',
                cursor: 'pointer',
                minHeight: '106px',
                userSelect: 'none'
              }}
              title="Klik untuk membalik kartu (Glosarium)"
            >
              {/* Inner 3D Container */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'none'
              }}>
                
                {/* 1. FRONT SIDE: Live Metric Card */}
                <div
                  className="card"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    overflow: 'hidden'
                  }}
                >
                  {/* Icon Box */}
                  <div style={{
                    background: 'var(--color-orange-light)',
                    border: '1px solid var(--color-orange-border)',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {card.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      fontWeight: '600',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>{card.title}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', color: 'var(--color-orange)' }}>
                        <HelpCircle size={12} />
                        <span>Info</span>
                      </span>
                    </div>
                    <div className="tabular-nums" style={{
                      fontSize: '1.4rem',
                      fontWeight: '800',
                      color: 'var(--text-main)',
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {card.value}
                    </div>
                  </div>

                  {/* Bottom Orange Accent Bar */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '20px',
                    width: '60px',
                    height: '3px',
                    backgroundColor: 'var(--color-orange)',
                    borderRadius: '2px 2px 0 0'
                  }} />
                </div>

                {/* 2. BACK SIDE: Glossary & Explanation */}
                <div
                  className="card"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: '#fff7ed',
                    border: '1px solid var(--color-orange-border)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    overflow: 'hidden'
                  }}
                >
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <h4 style={{
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: '#c2410c',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em'
                      }}>
                        {card.glossaryTitle}
                      </h4>
                      <ArrowLeftRight size={12} color="#c2410c" />
                    </div>
                    <p style={{
                      fontSize: '0.71rem',
                      color: '#431407',
                      lineHeight: 1.35,
                      margin: 0,
                      fontWeight: '500'
                    }}>
                      {card.glossaryText}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    fontSize: '0.65rem',
                    color: '#9a3412',
                    fontWeight: '700'
                  }}>
                    <span>Klik untuk kembali</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
