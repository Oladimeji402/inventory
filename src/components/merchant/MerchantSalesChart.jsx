import React, { useState } from 'react';
import { TrendingUp, ArrowUpRight, Calendar } from 'lucide-react';

const chartDataSets = {
  today: {
    total: 148500,
    growth: '+28.4%',
    periodLabel: 'vs yesterday',
    points: [
      { time: '8 AM', value: 12000, orders: 2 },
      { time: '10 AM', value: 28500, orders: 4 },
      { time: '12 PM', value: 64000, orders: 9 },
      { time: '2 PM', value: 98000, orders: 15 },
      { time: '4 PM', value: 124500, orders: 19 },
      { time: '6 PM', value: 148500, orders: 23 },
    ]
  },
  week: {
    total: 942000,
    growth: '+18.2%',
    periodLabel: 'vs last week',
    points: [
      { time: 'Mon', value: 110000, orders: 16 },
      { time: 'Tue', value: 135000, orders: 21 },
      { time: 'Wed', value: 128000, orders: 19 },
      { time: 'Thu', value: 162000, orders: 26 },
      { time: 'Fri', value: 184000, orders: 31 },
      { time: 'Sat', value: 223000, orders: 38 },
      { time: 'Sun', value: 148500, orders: 23 },
    ]
  },
  month: {
    total: 3850000,
    growth: '+34.6%',
    periodLabel: 'vs last month',
    points: [
      { time: 'Week 1', value: 780000, orders: 112 },
      { time: 'Week 2', value: 920000, orders: 134 },
      { time: 'Week 3', value: 1140000, orders: 168 },
      { time: 'Week 4', value: 1010000, orders: 145 },
    ]
  }
};

export default function MerchantSalesChart() {
  const [timeframe, setTimeframe] = useState('today');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const formatNaira = (num) => '₦' + Math.round(num || 0).toLocaleString();
  const currentSet = chartDataSets[timeframe];
  const maxVal = Math.max(...currentSet.points.map(p => p.value));

  return (
    <div className="merchant-card" style={{ padding: '24px', marginBottom: '28px' }}>
      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sales Revenue Trend
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#27BBAD', background: 'rgba(39, 187, 173, 0.1)', padding: '2px 8px', borderRadius: '100px' }}>
              <ArrowUpRight size={13} />
              {currentSet.growth}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {formatNaira(hoveredPoint ? hoveredPoint.value : currentSet.total)}
            </span>
            <span style={{ fontSize: '13px', color: '#737373', fontWeight: 500 }}>
              {hoveredPoint ? `accumulated by ${hoveredPoint.time} (${hoveredPoint.orders} orders)` : currentSet.periodLabel}
            </span>
          </div>
        </div>

        {/* Timeframe Switcher */}
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' }
          ].map(t => (
            <button
              key={t.key}
              style={{
                border: 'none',
                background: timeframe === t.key ? '#ffffff' : 'transparent',
                color: timeframe === t.key ? '#0a0a0a' : '#737373',
                fontSize: '12.5px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: timeframe === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
              onClick={() => { setTimeframe(t.key); setHoveredPoint(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart Curve */}
      <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '10px' }}>
        <svg 
          viewBox="0 0 700 160" 
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="tealSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#27BBAD" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#27BBAD" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line 
              key={i} 
              x1="0" 
              y1={160 - ratio * 130} 
              x2="700" 
              y2={160 - ratio * 130} 
              stroke="#f0f0f0" 
              strokeDasharray="4 4" 
              strokeWidth="1" 
            />
          ))}

          {/* Area Fill */}
          <path
            d={`M 0 160 ${currentSet.points.map((p, i) => {
              const x = (i / (currentSet.points.length - 1)) * 700;
              const y = 150 - (p.value / maxVal) * 120;
              return `L ${x} ${y}`;
            }).join(' ')} L 700 160 Z`}
            fill="url(#tealSalesGradient)"
          />

          {/* Line Stroke */}
          <path
            d={`M ${currentSet.points.map((p, i) => {
              const x = (i / (currentSet.points.length - 1)) * 700;
              const y = 150 - (p.value / maxVal) * 120;
              return `${i === 0 ? '' : 'L'} ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="#27BBAD"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Points */}
          {currentSet.points.map((p, i) => {
            const x = (i / (currentSet.points.length - 1)) * 700;
            const y = 150 - (p.value / maxVal) * 120;
            const isHovered = hoveredPoint?.time === p.time;
            return (
              <g 
                key={i} 
                onMouseEnter={() => setHoveredPoint(p)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 4.5}
                  fill="#ffffff"
                  stroke="#27BBAD"
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  style={{ transition: 'all 0.15s ease' }}
                />
              </g>
            );
          })}
        </svg>

        {/* X Axis Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 4px' }}>
          {currentSet.points.map((p, i) => (
            <span 
              key={i} 
              style={{ 
                fontSize: '11.5px', 
                color: hoveredPoint?.time === p.time ? '#27BBAD' : '#737373', 
                fontWeight: hoveredPoint?.time === p.time ? 700 : 500,
                fontFamily: 'monospace' 
              }}
            >
              {p.time}
            </span>
          ))}
        </div>
      </div>

      {/* Channel Breakdown Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Web Storefront Orders</div>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            {formatNaira(currentSet.total * 0.68)}
          </div>
          <div style={{ fontSize: '11px', color: '#27BBAD', fontWeight: 600 }}>68% of volume</div>
        </div>

        <div>
          <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Counter POS Sales</div>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            {formatNaira(currentSet.total * 0.24)}
          </div>
          <div style={{ fontSize: '11px', color: '#737373', fontWeight: 500 }}>24% of volume</div>
        </div>

        <div>
          <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Average Order Value (AOV)</div>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            ₦6,450
          </div>
          <div style={{ fontSize: '11px', color: '#27BBAD', fontWeight: 600 }}>+₦800 vs last week</div>
        </div>
      </div>
    </div>
  );
}
