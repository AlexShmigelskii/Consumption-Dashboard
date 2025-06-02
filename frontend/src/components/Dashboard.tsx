import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { wsClient } from '../api/websocket';
import { ConsumptionChart } from './ConsumptionChart';
import { LeftoverChart } from './LeftoverChart';
import './Dashboard.css';

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
    onError: (e: any) => setOpenError(e?.response?.data?.detail || 'Plus de bouteilles en stock'),
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
        <div className="text-red-600">Erreur de chargement des données. Veuillez réessayer plus tard.</div>
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

  // Summary calculations (по filteredEvents)
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);
  const ninetyDaysStr = ninetyDaysAgo.toISOString().slice(0, 10);
  
  // Используем события за последние 90 дней для расчета среднего
  const ninetyDaysEvents = filteredEvents.filter(e => e.timestamp.slice(0, 10) >= ninetyDaysStr);
  const ninetyDaysUsage = ninetyDaysEvents.reduce((sum, e) => sum + e.volume_used, 0);
  const dailyAverage = ninetyDaysUsage / 90; // мл в день

  // Для отображения текущего месяца (не влияет на прогноз)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = monthStart.toISOString().slice(0, 10);
  const monthEvents = filteredEvents.filter(e => e.timestamp.slice(0, 10) >= monthStr);
  const currentMonthUsage = monthEvents.reduce((sum, e) => sum + e.volume_used, 0);
  const bottlesOpened = monthEvents.length;

  // Функция для округления до ближайших 0.5 месяцев
  const roundToHalfMonth = (months: number) => Math.round(months * 2) / 2;

  // Расчет прогноза в месяцах (30 дней в месяце)
  const monthsLeft = dailyAverage > 0 
    ? roundToHalfMonth(remainingStock / dailyAverage / 30)
    : Infinity;

  return (
    <div className="dashboard">
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${tab === 'leftover' ? 'active' : 'inactive'}`}
          onClick={() => setTab('leftover')}
        >
          Stock Restant
        </button>
        <button
          className={`dashboard-tab ${tab === 'consumption' ? 'active' : 'inactive'}`}
          onClick={() => setTab('consumption')}
        >
          Consommation
        </button>
      </div>

      <div className="dashboard-filter">
        <label>Bouteille:</label>
        <select
          value={selectedBottle}
          onChange={e => setSelectedBottle(e.target.value)}
        >
          <option value="All">Toutes</option>
          {Array.from(new Set([...bottles.map(b => b.name), ...inventory.map(b => b.name)])).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-chart">
          {tab === 'leftover' ? (
            <LeftoverChart selectedName={selectedBottle} />
          ) : (
            <ConsumptionChart events={filteredEvents} />
          )}
        </div>
        
        <div className="dashboard-inventory">
          <h2>Inventaire</h2>
          {openError && <div className="dashboard-inventory-error">{openError}</div>}
          <div className="dashboard-inventory-list">
            {inventory.map(bottle => (
              <div key={bottle.id} className="dashboard-inventory-item">
                <span>{bottle.name} — {bottle.volume} ml</span>
                <button
                  className="dashboard-inventory-button"
                  disabled={bottle.count < 1 || openBottleMutation.isPending}
                  onClick={() => openBottleMutation.mutate(bottle.id)}
                >
                  Ouvrir
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Consommation du Mois</div>
          <div className="dashboard-stat-value">{(currentMonthUsage / 1000).toFixed(2)} L</div>
        </div>
        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Bouteilles Ouvertes</div>
          <div className="dashboard-stat-value">{bottlesOpened}</div>
        </div>
        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Stock Restant</div>
          <div className="dashboard-stat-value">{(remainingStock / 1000).toFixed(1)} L</div>
          {dailyAverage > 0 && (
            <div className={`dashboard-stat-subtext ${monthsLeft < 1 ? 'dashboard-stat-warning' : ''}`}>
              Suffisant pour ~{
                monthsLeft < 1
                  ? 'moins d\'un mois'
                  : `${monthsLeft.toFixed(1)} mois`
              }
            </div>
          )}
        </div>
        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Moyenne Quotidienne</div>
          <div className="dashboard-stat-value">{Math.round(dailyAverage)} ml</div>
          <div className="dashboard-stat-subtext">(90 derniers jours)</div>
        </div>
      </div>
    </div>
  );
}
