import React from 'react';
import { Warehouse, Droplet, FlaskConical, CloudRain } from 'lucide-react';

export default function TelemetryTable({ data = {} }) {
  const {
    internalGreenhouse = {},
    externalGreenhouse = {},
    waterConductivity = {},
    waterPhOrp = {},
    rainfall = {}
  } = data;

  const nowWib = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const todayStr = '2026-08-14 ' + nowWib;

  const rows = [
    {
      id: 'gh_temp_in',
      time: internalGreenhouse.updatedAt ? new Date(internalGreenhouse.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'Greenhouse - Mikroklimat',
      icon: <Warehouse size={16} color="#ea580c" />,
      parameter: 'Suhu Dalam',
      value: internalGreenhouse.temp !== undefined ? internalGreenhouse.temp : 28.5,
      unit: '°C',
      status: 'ONLINE',
      slaveId: 'FC01 / Slave 1'
    },
    {
      id: 'gh_hum_in',
      time: internalGreenhouse.updatedAt ? new Date(internalGreenhouse.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'Greenhouse - Mikroklimat',
      icon: <Warehouse size={16} color="#ea580c" />,
      parameter: 'RH Dalam',
      value: internalGreenhouse.hum !== undefined ? internalGreenhouse.hum : 74.0,
      unit: '%',
      status: 'ONLINE',
      slaveId: 'FC01 / Slave 1'
    },
    {
      id: 'gh_temp_ext',
      time: externalGreenhouse.updatedAt ? new Date(externalGreenhouse.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'External - Mikroklimat',
      icon: <Warehouse size={16} color="#16a34a" />,
      parameter: 'Suhu Luar',
      value: externalGreenhouse.temp !== undefined ? externalGreenhouse.temp : 32.1,
      unit: '°C',
      status: 'ONLINE',
      slaveId: 'FC01 / Slave 2'
    },
    {
      id: 'water_ec',
      time: waterConductivity.updatedAt ? new Date(waterConductivity.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'Water Quality',
      icon: <Droplet size={16} color="#ea580c" />,
      parameter: 'EC',
      value: waterConductivity.ec !== undefined ? waterConductivity.ec : 1250,
      unit: 'µS/cm',
      status: 'ONLINE',
      slaveId: 'FC03 / Slave 4'
    },
    {
      id: 'water_tds',
      time: waterConductivity.updatedAt ? new Date(waterConductivity.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'Water Quality',
      icon: <Droplet size={16} color="#ea580c" />,
      parameter: 'TDS',
      value: waterConductivity.tds !== undefined ? waterConductivity.tds : 800,
      unit: 'mg/L',
      status: 'ONLINE',
      slaveId: 'FC03 / Slave 4'
    },
    {
      id: 'water_salinity',
      time: waterConductivity.updatedAt ? new Date(waterConductivity.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'Water Quality',
      icon: <Droplet size={16} color="#0284c7" />,
      parameter: 'Salinitas',
      value: waterConductivity.salinity !== undefined ? waterConductivity.salinity : 600,
      unit: 'mg/L',
      status: 'ONLINE',
      slaveId: 'FC03 / Slave 4'
    },
    {
      id: 'chem_ph',
      time: waterPhOrp.updatedAt ? new Date(waterPhOrp.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'pH & ORP',
      icon: <FlaskConical size={16} color="#ea580c" />,
      parameter: 'pH',
      value: waterPhOrp.ph !== undefined ? waterPhOrp.ph : 7.25,
      unit: '-',
      status: 'ONLINE',
      slaveId: 'FC03 / Slave 5'
    },
    {
      id: 'chem_orp',
      time: waterPhOrp.updatedAt ? new Date(waterPhOrp.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'pH & ORP',
      icon: <FlaskConical size={16} color="#16a34a" />,
      parameter: 'ORP',
      value: waterPhOrp.orp !== undefined ? waterPhOrp.orp : 230,
      unit: 'mV',
      status: 'ONLINE',
      slaveId: 'FC03 / Slave 5'
    },
    {
      id: 'chem_tempair',
      time: waterPhOrp.updatedAt ? new Date(waterPhOrp.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'pH & ORP',
      icon: <FlaskConical size={16} color="#0284c7" />,
      parameter: 'Suhu Air',
      value: waterPhOrp.suhu !== undefined ? waterPhOrp.suhu : 26.5,
      unit: '°C',
      status: 'ONLINE',
      slaveId: 'FC03 / Slave 5'
    },
    {
      id: 'rain_rate',
      time: rainfall.updatedAt ? new Date(rainfall.updatedAt).toLocaleTimeString('id-ID') : todayStr,
      sensor: 'Rain Intensity',
      icon: <CloudRain size={16} color="#0284c7" />,
      parameter: 'Intensitas Curah Hujan',
      value: rainfall.rain !== undefined ? rainfall.rain : 0.5,
      unit: 'mm/menit',
      status: 'ONLINE',
      slaveId: 'FC03 / Slave 6'
    }
  ];

  return (
    <section>
      <div className="section-title">
        <span>TABEL LOG TELEMETRI TERBARU & STATUS SENSOR LENGKAP</span>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="telemetry-table">
          <thead>
            <tr>
              <th>Waktu (WIB)</th>
              <th>Sensor</th>
              <th>Parameter</th>
              <th>Nilai</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Sumber / Slave ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }} className="tabular-nums">
                  {row.time}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    {row.icon}
                    <span>{row.sensor}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                  {row.parameter}
                </td>
                <td className="tabular-nums" style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                  {row.value}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {row.unit}
                </td>
                <td>
                  <span className="status-pill online" style={{ padding: '2px 8px', fontSize: '0.68rem' }}>
                    <span className="status-dot pulse" />
                    <span>{row.status}</span>
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                  {row.slaveId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
