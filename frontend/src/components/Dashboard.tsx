import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { wsClient } from '../api/websocket';
import { BottleCard } from './BottleCard';
import { ConsumptionChart } from './ConsumptionChart';
import { LeftoverChart } from './LeftoverChart';
import type { InventoryBottle, InventorySnapshot } from '../types';

export function Dashboard() {
  const queryClient = useQueryClient();
  const { data: bottles = [], isLoading, error } = useQuery({
    queryKey: ['bottles'],
    queryFn: api.bottles.list,
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: api.inventory.list,
  });

  // Получаем leftover на сегодня из InventorySnapshot (вынесено выше всех return)
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: todaySnapshotsRaw } = useQuery({
    queryKey: ['inventory_snapshots', todayStr, todayStr],
    queryFn: () => api.inventory_snapshots.list(todayStr, todayStr),
  });
  const todaySnapshots = Array.isArray(todaySnapshotsRaw) ? todaySnapshotsRaw : [];
  // debug
  // console.log('todaySnapshots', todaySnapshots);

  const [tab, setTab] = useState<'consumption' | 'leftover'>('leftover');
  const [selectedBottle, setSelectedBottle] = useState<string>('All');
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  const openBottleMutation = useMutation({
    mutationFn: (id: number) => api.inventory.open(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_snapshots'] });
      setOpenError(null);
    },
    onError: (e: any) => setOpenError(e?.response?.data?.detail || 'No bottles left in inventory'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">Error loading data. Please try again later.</div>
      </div>
    );
  }

  // Фильтрация снапшотов по selectedBottle
  let leftoverToday = 0;
  if (selectedBottle === 'All') {
    leftoverToday = todaySnapshots.reduce((sum, s) => sum + s.count * s.volume, 0);
  } else {
    leftoverToday = todaySnapshots
      .filter(s => s.name === selectedBottle)
      .reduce((sum, s) => sum + s.count * s.volume, 0);
  }

  // Summary calculations (только по снапшотам)
  const remainingStock = leftoverToday;

  // Фильтрация бутылок и событий по выбранной бутылке
  const filteredBottles = selectedBottle === 'All' ? bottles : bottles.filter(b => b.name === selectedBottle);
  const filteredEvents = filteredBottles.flatMap(b => b.opening_events);

  // Фильтрация inventory по selectedBottle
  const filteredInventory = selectedBottle === 'All'
    ? inventory
    : inventory.filter(b => b.name === selectedBottle);

  // Summary calculations (по filteredEvents)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = monthStart.toISOString().slice(0, 10);
  const monthEvents = filteredEvents.filter(e => e.timestamp.slice(0, 10) >= monthStr);
  const currentMonthUsage = monthEvents.reduce((sum, e) => sum + e.volume_used, 0);
  const bottlesOpened = monthEvents.length;
  const daysInMonth = Math.max(1, now.getDate());
  const dailyAverage = currentMonthUsage / daysInMonth;

  return (
    <div className="w-screen px-2 lg:px-4 py-8 flex flex-col gap-8 overflow-x-hidden">
      {/* Tabs */}
      <div className="flex gap-4">
        <button
          className={`px-4 py-2 rounded ${tab === 'leftover' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}
          onClick={() => setTab('leftover')}
        >
          Leftover
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === 'consumption' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}
          onClick={() => setTab('consumption')}
        >
          Consumption
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-4 items-center">
        <label className="text-gray-700 font-medium">Bottle:</label>
        <select
          className="border px-2 py-1 rounded bg-white text-gray-900"
          value={selectedBottle}
          onChange={e => setSelectedBottle(e.target.value)}
        >
          <option value="All">All</option>
          {Array.from(new Set([...bottles.map(b => b.name), ...inventory.map(b => b.name)])).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Chart + Inventory */}
      <div className="flex gap-8 overflow-x-hidden">
        {/* Chart: flex-grow with min-width 0 to prevent overflow */}
        <div className="flex-1 min-w-0">
          <div className="h-[66vh] w-full">
            {tab === 'leftover' ? (
              <LeftoverChart selectedName={selectedBottle} />
            ) : (
              <ConsumptionChart events={filteredEvents} />
            )}
          </div>
        </div>
        {/* Inventory: fixed width, no shrink */}
        <div className="w-80 flex-shrink-0 min-w-0 bg-white rounded-lg shadow p-4 border">
          <h2 className="text-lg font-bold mb-4">Inventory</h2>
          {openError && <div className="mb-2 text-red-600 font-medium">{openError}</div>}
          <ul className="space-y-2">
            {inventory.map(bottle => (
              <li key={bottle.id} className="flex justify-between items-center border-b pb-1">
                <span>{bottle.name} — {bottle.volume} ml</span>
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  disabled={bottle.count < 1 || openBottleMutation.isPending}
                  onClick={() => openBottleMutation.mutate(bottle.id)}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white rounded-lg shadow p-6">
        <div>
          <div className="text-sm text-gray-500">Current Month Usage</div>
          <div className="text-2xl font-bold">{(currentMonthUsage / 1000).toFixed(2)} L</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Bottles Opened</div>
          <div className="text-2xl font-bold">{bottlesOpened}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Remaining Stock</div>
          <div className="text-2xl	font-bold">{(remainingStock / 1000).toFixed(1)} L</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Daily Average</div>
          <div className="text-2xl font-bold">{dailyAverage.toFixed(0)} ml</div>
        </div>
      </div>
    </div>
  );
}
