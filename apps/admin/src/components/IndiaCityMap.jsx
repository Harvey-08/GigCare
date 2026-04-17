import React from 'react';

const CITY_SVG_POSITIONS = {
  BLR: { x: 195, y: 310, label: 'BLR' },
  MUM: { x: 145, y: 250, label: 'MUM' },
  DEL: { x: 190, y: 130, label: 'DEL' },
  CHN: { x: 220, y: 305, label: 'CHN' },
  HYD: { x: 200, y: 265, label: 'HYD' },
  PUN: { x: 158, y: 255, label: 'PUN' },
  KOL: { x: 285, y: 210, label: 'KOL' },
  AMD: { x: 148, y: 190, label: 'AMD' },
  JAI: { x: 178, y: 155, label: 'JAI' },
  KOC: { x: 178, y: 340, label: 'KOC' },
};

function getColor(lossRatio = 0) {
  if (lossRatio < 0.5) return '#1A7F4B';
  if (lossRatio < 0.65) return '#E8960C';
  return '#B91C1C';
}

function IndiaCityMap({ cityMetrics, selectedCityId, onCityClick }) {
  return (
    <svg viewBox="0 0 400 450" style={{ width: '100%', maxWidth: 420 }}>
      <defs>
        <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>
      </defs>

      <path
        d="M150,40 L200,35 L250,50 L310,80 L330,120 L320,170 L300,210 L290,240 L270,290 L240,330 L220,370 L200,390 L185,380 L170,360 L155,340 L140,310 L125,270 L110,230 L100,190 L105,150 L120,110 L130,70 Z"
        fill="#E8F4F7"
        stroke="#0D4F5E"
        strokeWidth="1.5"
        filter="url(#mapShadow)"
      />

      {Object.entries(CITY_SVG_POSITIONS).map(([cityId, position]) => {
        const metrics = cityMetrics.find((item) => item.city_id === cityId) || {};
        const color = getColor(metrics.loss_ratio || 0);
        const active = selectedCityId === cityId;
        const size = Math.max(7, Math.sqrt((metrics.active_policies || 80) / 80) * 8);

        return (
          <g key={cityId} style={{ cursor: 'pointer' }} onClick={() => onCityClick(cityId)}>
            <circle cx={position.x} cy={position.y} r={active ? size + 4 : size} fill={color} opacity={0.88} />
            <circle
              cx={position.x}
              cy={position.y}
              r={active ? size + 4 : size}
              fill="none"
              stroke={active ? '#0D4F5E' : 'white'}
              strokeWidth={active ? 3 : 1.5}
            />
            <text x={position.x + size + 4} y={position.y + 4} fontSize={9} fill="#1C2833" fontWeight="700">
              {position.label}
            </text>
          </g>
        );
      })}

      <g>
        <circle cx="22" cy="420" r="5" fill="#1A7F4B" />
        <text x="30" y="424" fontSize="9" fill="#64748B">Loss ratio &lt; 50%</text>
        <circle cx="136" cy="420" r="5" fill="#E8960C" />
        <text x="144" y="424" fontSize="9" fill="#64748B">50-65%</text>
        <circle cx="205" cy="420" r="5" fill="#B91C1C" />
        <text x="213" y="424" fontSize="9" fill="#64748B">&gt; 65%</text>
      </g>
    </svg>
  );
}

export default IndiaCityMap;