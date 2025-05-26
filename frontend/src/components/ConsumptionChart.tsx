import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { OpeningEvent } from '../types';

interface Props {
  events: OpeningEvent[];
}

export function ConsumptionChart({ events }: Props) {
  // Группируем события по дням и суммируем volume_used
  const dayMap = new Map<string, number>();
  events.forEach(event => {
    const date = new Date(event.timestamp).toISOString().slice(0, 10);
    dayMap.set(date, (dayMap.get(date) || 0) + event.volume_used);
  });
  // Только дни, где consumption > 0
  const data = Array.from(dayMap.entries())
    .filter(([, v]) => v > 0)
    .map(([date, volume]) => ({ date, volume: volume / 1000 })); // литры

  return (
    <div className="w-full h-[300px] bg-white p-4 rounded-lg shadow border">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Consumption (L/day)</h2>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="volume" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 