import React, { useMemo, useState } from 'react';
import { countedOrder, formatNaira, isThisMonth, isToday } from '../../lib/formatMoney';

function startOfWeek(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - diff);
  return next;
}

function bucketOrders(orders, timeframe) {
  const live = orders.filter(countedOrder);
  if (timeframe === 'today') {
    const hours = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
    const points = hours.map((time, index) => {
      const startHour = 8 + index * 2;
      const matching = live.filter((order) => {
        if (!isToday(order.createdAt)) return false;
        const hour = new Date(order.createdAt).getHours();
        const next = startHour + 2;
        return hour >= startHour && hour < next;
      });
      return {
        time,
        value: matching.reduce((sum, order) => sum + order.total, 0),
        orders: matching.length
      };
    });
    const total = points.reduce((sum, point) => sum + point.value, 0);
    return { total, points, periodLabel: 'today', orderCount: points.reduce((sum, point) => sum + point.orders, 0) };
  }

  if (timeframe === 'week') {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekStart = startOfWeek();
    const points = labels.map((time, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      const matching = live.filter((order) => {
        const created = new Date(order.createdAt);
        return created.getFullYear() === day.getFullYear()
          && created.getMonth() === day.getMonth()
          && created.getDate() === day.getDate();
      });
      return {
        time,
        value: matching.reduce((sum, order) => sum + order.total, 0),
        orders: matching.length
      };
    });
    const total = points.reduce((sum, point) => sum + point.value, 0);
    return { total, points, periodLabel: 'this week', orderCount: points.reduce((sum, point) => sum + point.orders, 0) };
  }

  const now = new Date();
  const points = [1, 2, 3, 4].map((week) => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1 + (week - 1) * 7);
    const end = new Date(now.getFullYear(), now.getMonth(), 1 + week * 7);
    const matching = live.filter((order) => {
      const created = new Date(order.createdAt);
      return created >= start && created < end;
    });
    return {
      time: `Week ${week}`,
      value: matching.reduce((sum, order) => sum + order.total, 0),
      orders: matching.length
    };
  });
  const monthOrders = live.filter((order) => isThisMonth(order.createdAt));
  return {
    total: monthOrders.reduce((sum, order) => sum + order.total, 0),
    points,
    periodLabel: 'this month',
    orderCount: monthOrders.length
  };
}

export default function MerchantSalesChart({ orders = [] }) {
  const [timeframe, setTimeframe] = useState('today');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const currentSet = useMemo(() => bucketOrders(orders, timeframe), [orders, timeframe]);
  const maxVal = Math.max(1, ...currentSet.points.map((point) => point.value));
  const aov = currentSet.orderCount ? currentSet.total / currentSet.orderCount : 0;

  return (
    <div className="merchant-card" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sales Revenue Trend
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {formatNaira(hoveredPoint ? hoveredPoint.value : currentSet.total)}
            </span>
            <span style={{ fontSize: '13px', color: '#737373', fontWeight: 500 }}>
              {hoveredPoint
                ? `${hoveredPoint.orders} order${hoveredPoint.orders === 1 ? '' : 's'} at ${hoveredPoint.time}`
                : currentSet.periodLabel}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' }
          ].map((item) => (
            <button
              key={item.key}
              style={{
                border: 'none',
                background: timeframe === item.key ? '#ffffff' : 'transparent',
                color: timeframe === item.key ? '#0a0a0a' : '#737373',
                fontSize: '12.5px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: timeframe === item.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                fontFamily: 'inherit'
              }}
              onClick={() => { setTimeframe(item.key); setHoveredPoint(null); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '10px' }}>
        <svg
          viewBox="0 0 700 160"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="tealSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2B7CFF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2B7CFF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

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

          <path
            d={`M 0 160 ${currentSet.points.map((point, i) => {
              const x = (i / Math.max(1, currentSet.points.length - 1)) * 700;
              const y = 150 - (point.value / maxVal) * 120;
              return `L ${x} ${y}`;
            }).join(' ')} L 700 160 Z`}
            fill="url(#tealSalesGradient)"
          />

          <path
            d={`M ${currentSet.points.map((point, i) => {
              const x = (i / Math.max(1, currentSet.points.length - 1)) * 700;
              const y = 150 - (point.value / maxVal) * 120;
              return `${i === 0 ? '' : 'L'} ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="#2B7CFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {currentSet.points.map((point, i) => {
            const x = (i / Math.max(1, currentSet.points.length - 1)) * 700;
            const y = 150 - (point.value / maxVal) * 120;
            const isHovered = hoveredPoint?.time === point.time;
            return (
              <g key={point.time} onMouseEnter={() => setHoveredPoint(point)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 4.5}
                  fill="#ffffff"
                  stroke="#2B7CFF"
                  strokeWidth={isHovered ? 3.5 : 2.5}
                />
              </g>
            );
          })}
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 4px' }}>
          {currentSet.points.map((point) => (
            <span
              key={point.time}
              style={{
                fontSize: '11.5px',
                color: hoveredPoint?.time === point.time ? '#2B7CFF' : '#737373',
                fontWeight: hoveredPoint?.time === point.time ? 700 : 500,
                fontFamily: 'monospace'
              }}
            >
              {point.time}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Storefront orders</div>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            {formatNaira(currentSet.total)}
          </div>
          <div style={{ fontSize: '11px', color: '#737373', fontWeight: 500 }}>100% until POS is live</div>
        </div>
        <div>
          <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Counter POS sales</div>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            {formatNaira(0)}
          </div>
          <div style={{ fontSize: '11px', color: '#737373', fontWeight: 500 }}>Not connected yet</div>
        </div>
        <div>
          <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Average order value</div>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            {formatNaira(aov)}
          </div>
          <div style={{ fontSize: '11px', color: '#737373', fontWeight: 500 }}>
            {currentSet.orderCount} order{currentSet.orderCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </div>
  );
}
