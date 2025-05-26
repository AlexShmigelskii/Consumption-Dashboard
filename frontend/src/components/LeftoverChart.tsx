import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { Bottle, InventoryBottle } from '../types';

interface Props {
  bottles: Bottle[];
  inventory: InventoryBottle[];
}

// Генерируем массив дат за последний месяц
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

export function LeftoverChart({ bottles, inventory }: Props) {
  const days = getLast30Days();

  // Для каждой бутылки определяем дату открытия (по первому событию)
  const bottleOpenDate: Record<number, string> = {};
  bottles.forEach(b => {
    if (b.opening_events.length > 0) {
      const openEvent = b.opening_events.find(e => Math.abs(e.volume_used - b.initial_volume) < 1e-3);
      if (openEvent) bottleOpenDate[b.id] = openEvent.timestamp.slice(0, 10);
      else bottleOpenDate[b.id] = b.created_at.slice(0, 10);
    } else {
      bottleOpenDate[b.id] = b.created_at.slice(0, 10);
    }
  });

  // Для каждой позиции inventory считаем сколько раз была открыта за 30 дней
  function getInventoryKey(b: InventoryBottle) {
    return `${b.name}|${b.volume}`;
  }
  function getBottleKey(b: Bottle) {
    return `${b.name}|${b.initial_volume}`;
  }
  // 1. Считаем сколько открытий каждой позиции было за 30 дней
  const openedCountByKey: Record<string, number> = {};
  bottles.forEach(b => {
    const openDate = bottleOpenDate[b.id];
    if (openDate && openDate >= days[0]) {
      const key = getBottleKey(b);
      openedCountByKey[key] = (openedCountByKey[key] || 0) + 1;
    }
  });
  // 2. Для каждого дня считаем сколько открытий было до этого дня
  const openedToDateByKey: Record<string, number[]> = {};
  inventory.forEach(b => {
    const key = getInventoryKey(b);
    let arr: number[] = [];
    let acc = 0;
    days.forEach(date => {
      // Считаем сколько открытий этой позиции было до и включая этот день
      let openedToday = bottles.filter(ob => {
        const openDate = bottleOpenDate[ob.id];
        return (
          getBottleKey(ob) === key && openDate && openDate <= date && openDate >= days[0]
        );
      }).length;
      acc = openedToday;
      arr.push(acc);
    });
    openedToDateByKey[key] = arr;
  });

  // Для каждой бутылки собираем события расхода по дням
  const bottleEventsByDay: Record<number, Record<string, number>> = {};
  bottles.forEach(b => {
    bottleEventsByDay[b.id] = {};
    b.opening_events.forEach(e => {
      const date = e.timestamp.slice(0, 10);
      bottleEventsByDay[b.id][date] = (bottleEventsByDay[b.id][date] || 0) + e.volume_used;
    });
  });

  // Для каждого дня считаем остаток: inventory + открытые бутылки (остаток в них)
  const dayData: { date: string; leftover: number }[] = [];
  days.forEach((date, idx) => {
    // 1. Инвентарь: реконструируем начальный count
    let invLeft = 0;
    inventory.forEach(b => {
      const key = getInventoryKey(b);
      const openedTotal = openedCountByKey[key] || 0;
      const openedToDate = openedToDateByKey[key][idx] || 0;
      const initialCount = b.count + openedTotal;
      const left = Math.max(0, initialCount - openedToDate);
      invLeft += left * b.volume;
    });
    // 2. Открытые бутылки: остаток в каждой, если она была открыта к этому дню
    let openLeft = 0;
    bottles.forEach(b => {
      const openDate = bottleOpenDate[b.id];
      if (openDate && openDate <= date) {
        // Считаем расход по этой бутылке до этой даты
        let spent = 0;
        b.opening_events.forEach(e => {
          const eDate = e.timestamp.slice(0, 10);
          if (eDate <= date) spent += e.volume_used;
        });
        openLeft += Math.max(0, b.initial_volume - spent);
      }
    });
    dayData.push({ date, leftover: invLeft + openLeft });
  });

  return (
    <div className="w-full bg-white rounded-lg shadow border p-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Leftover (Stock Dynamics)</h2>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dayData} margin={{ top: 16, right: 32, left: 16, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 16 }} />
            <YAxis
              tick={{ fontSize: 16 }}
              domain={[0, 'auto']}
              allowDataOverflow={false}
            />
            <Tooltip />
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