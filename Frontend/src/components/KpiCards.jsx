import React from 'react';
import { Warehouse, Droplet, FlaskConical, CloudRain } from 'lucide-react';

export default function KpiCards({ data = {} }) {
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

  const cards = [
    {
      id: 'greenhouse',
      title: 'Greenhouse',
      value: `${tempGh} / ${humGh}`,
      icon: <Warehouse size={28} strokeWidth={1.8} color="#ea580c" />
    },
    {
      id: 'water_quality',
      title: 'Water Quality',
      value: `EC: ${ecVal}`,
      icon: <Droplet size={28} strokeWidth={1.8} color="#ea580c" />
    },
    {
      id: 'ph_orp',
      title: 'pH & ORP',
      value: `pH: ${phVal}`,
      icon: <FlaskConical size={28} strokeWidth={1.8} color="#ea580c" />
    },
    {
      id: 'rain_intensity',
      title: 'Rain Intensity',
      value: `${rainVal} mm ${rainStatus}`,
      icon: <CloudRain size={28} strokeWidth={1.8} color="#ea580c" />
    }
  ];

  return (
    <section style={{ marginBottom: '24px' }}>
      <div className="section-title">
        <span>TOP KPI STATS CARDS</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px'
      }}>
        {cards.map((card) => (
          <div
            key={card.id}
            className="card"
            style={{
              padding: '18px 20px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            {/* Icon Box */}
            <div style={{
              background: 'var(--color-orange-light)',
              border: '1px solid var(--color-orange-border)',
              borderRadius: '8px',
              padding: '12px',
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
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                marginBottom: '2px'
              }}>
                {card.title}
              </div>
              <div className="tabular-nums" style={{
                fontSize: '1.45rem',
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
        ))}
      </div>
    </section>
  );
}
