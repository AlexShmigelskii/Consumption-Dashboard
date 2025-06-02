import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export function InventoryManager() {
  const queryClient = useQueryClient();
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: api.inventory.list,
  });

  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [volume, setVolume] = useState('');
  const [count, setCount] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [addCounts, setAddCounts] = useState<Record<string, string>>({});

  const { mutate: addBottle } = useMutation({
    mutationFn: (data: { name: string; color: string; volume: number; count: number }) =>
      api.inventory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setName('');
      setColor('');
      setVolume('');
      setCount('1');
      setError(null);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.detail || 'Erreur lors de l\'ajout de la bouteille';
      setError(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const { mutate: deleteBottle } = useMutation({
    mutationFn: (id: number) => {
      console.log('Starting delete mutation for bottle:', id);
      return api.inventory.delete(id);
    },
    onSuccess: () => {
      console.log('Delete mutation successful');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_snapshots'] });
    },
    onError: (error) => {
      console.error('Delete mutation failed:', error);
    }
  });

  const { mutate: addStock, isPending: isAdding } = useMutation({
    mutationFn: ({ id, count }: { id: number; count: number }) => api.inventory.add(id, count),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_snapshots'] });
      setAddCounts((prev) => ({ ...prev, [String(vars.id)]: '' }));
    },
    onError: () => {
      setError('Erreur lors de l\'ajout du stock');
    },
  });

  const [currentAddId, setCurrentAddId] = useState<number | null>(null);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto mt-6">
      <h2 className="text-xl font-bold mb-6">Inventaire</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      <form
        className="flex flex-wrap gap-3 mb-6 items-end"
        onSubmit={e => {
          e.preventDefault();
          if (!name || !volume || !count) return;
          addBottle({ name, color, volume: parseFloat(volume), count: parseInt(count, 10) });
        }}
      >
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Nom</label>
          <input
            className="border px-2 py-1 rounded w-48 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Nom de la bouteille"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Couleur</label>
          <input
            className="border px-2 py-1 rounded w-36 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Couleur"
            value={color}
            onChange={e => setColor(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Volume (ml)</label>
          <input
            className="border px-2 py-1 rounded w-28 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Volume"
            type="number"
            min={1}
            value={volume}
            onChange={e => setVolume(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Quantité</label>
          <input
            className="border px-2 py-1 rounded w-20 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Qté"
            type="number"
            min={1}
            value={count}
            onChange={e => setCount(e.target.value)}
            required
          />
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          type="submit"
        >
          Ajouter
        </button>
      </form>
      {isLoading ? (
        <div>Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-t">
            <thead>
              <tr className="text-gray-600">
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Couleur</th>
                <th className="py-2 pr-4">Volume</th>
                <th className="py-2 pr-4">Quantité</th>
                <th className="py-2 w-20"></th>
                <th className="py-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(bottle => (
                <tr key={bottle.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4">{bottle.name}</td>
                  <td className="py-2 pr-4">{bottle.color || '-'}</td>
                  <td className="py-2 pr-4">{bottle.volume} ml</td>
                  <td className="py-2 pr-4">{bottle.count}</td>
                  <td className="py-2">
                    <button
                      className="text-red-500 hover:underline text-sm"
                      onClick={() => deleteBottle(bottle.id)}
                    >
                      Sup
                    </button>
                  </td>
                  <td className="py-2">
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        const value = addCounts[String(bottle.id)];
                        const n = parseInt(value || '0', 10);
                        if (n > 0) {
                          setCurrentAddId(bottle.id);
                          addStock({ id: bottle.id, count: n });
                        }
                      }}
                      className="flex gap-1 items-center"
                    >
                      <input
                        type="number"
                        min={1}
                        className="w-16 border px-2 py-1 rounded text-sm bg-white"
                        placeholder="Qté"
                        value={addCounts[String(bottle.id)] || ''}
                        onChange={e => setAddCounts(prev => ({ ...prev, [String(bottle.id)]: e.target.value }))}
                        disabled={isAdding && currentAddId === bottle.id}
                      />
                      <button
                        type="submit"
                        className="bg-green-600 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                        disabled={isAdding && currentAddId === bottle.id}
                      >
                        +
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 