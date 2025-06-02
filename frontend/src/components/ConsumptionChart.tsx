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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', { 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
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
    .map(([date, volume]) => ({ 
      date,
      displayDate: formatDate(date),
      volume: volume / 1000 
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ width: '100%', height: '100%', padding: '1.5rem' }}>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Consommation (L/jour)</h2>
      <div style={{ width: '100%', height: 'calc(100% - 5rem)' }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 13, fill: '#6b7280' }}
              interval="preserveStartEnd"
              tickMargin={10}
            />
            <YAxis
              tick={{ fontSize: 13, fill: '#6b7280' }}
              tickFormatter={(v: number) => v.toFixed(1)}
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
              formatter={(value: number) => [`${Number(value).toFixed(2)} L`, 'Consommation']}
              labelFormatter={(label: string) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                padding: '0.5rem'
              }}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 