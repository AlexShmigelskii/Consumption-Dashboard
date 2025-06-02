import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { InventorySnapshot } from '../types';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

interface Props {
  selectedName: string;
}

function getLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', { 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
}

export function LeftoverChart({ selectedName }: Props) {
  const days = getLast30Days();
  const start_date = days[0];
  const end_date = days[days.length - 1];
  const { data: snapshots = [] } = useQuery({
    queryKey: ['inventory_snapshots', start_date, end_date],
    queryFn: () => api.inventory_snapshots.list(start_date, end_date),
  });

  // Группируем снапшоты по дате
  const byDate: Record<string, InventorySnapshot[]> = {};
  (snapshots as InventorySnapshot[]).forEach((snap: InventorySnapshot) => {
    const date = snap.date.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(snap);
  });

  // Для каждого дня считаем общий leftover, с фильтрацией по selectedName
  const dayData: { date: string; leftover: number; displayDate: string }[] = days.map(date => {
    let snaps = byDate[date] || [];
    if (selectedName !== 'All') {
      snaps = snaps.filter(s => s.name === selectedName);
    }
    // Остаток в литрах
    const leftover = snaps.reduce((sum, s) => sum + s.count * s.volume, 0) / 1000;
    return { 
      date,
      displayDate: formatDate(date),
      leftover 
    };
  });

  return (
    <div style={{ width: '100%', height: '100%', padding: '1.5rem' }}>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Stock Restant (Dynamique du Stock, L)
        {selectedName !== 'All' && <span className="text-gray-500 ml-2">- {selectedName}</span>}
      </h2>
      <div style={{ width: '100%', height: 'calc(100% - 5rem)' }}>
        <ResponsiveContainer>
          <LineChart data={dayData} margin={{ top: 5, right: 30, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 13, fill: '#6b7280' }}
              interval="preserveStartEnd"
              tickMargin={10}
            />
            <YAxis
              tick={{ fontSize: 13, fill: '#6b7280' }}
              tickFormatter={(v) => v.toFixed(1)}
              domain={[0, 'auto']}
              label={{ 
                value: 'Litres', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  fontSize: 13,
                  fill: '#6b7280',
                  textAnchor: 'middle',
                  dy: 50
                }
              }}
            />
            <Tooltip 
              formatter={(value: number) => [`${Number(value).toFixed(2)} L`, 'Stock Restant']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                padding: '0.5rem'
              }}
            />
            <Line
              type="monotone"
              dataKey="leftover"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 