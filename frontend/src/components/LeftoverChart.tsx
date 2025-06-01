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
  const dayData: { date: string; leftover: number }[] = days.map(date => {
    let snaps = byDate[date] || [];
    if (selectedName !== 'All') {
      snaps = snaps.filter(s => s.name === selectedName);
    }
    // Остаток в литрах
    const leftover = snaps.reduce((sum, s) => sum + s.count * s.volume, 0) / 1000;
    return { date, leftover };
  });

  return (
    <div className="w-full bg-white rounded-lg shadow border p-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Leftover (Stock Dynamics, L)</h2>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dayData} margin={{ top: 16, right: 32, left: 16, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 16 }} />
            <YAxis
              tick={{ fontSize: 16 }}
              domain={[0, 'auto']}
              allowDataOverflow={false}
              label={{ value: 'Liters', angle: -90, position: 'insideLeft', fontSize: 16 }}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <Tooltip formatter={(value: number) => `${Number(value).toFixed(2)} L`} />
            <Line
              type="monotone"
              dataKey="leftover"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 