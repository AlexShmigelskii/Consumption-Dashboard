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
      const message = e?.response?.data?.detail || 'Error adding bottle';
      setError(message);
      // Scroll error into view
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
      setError('Error adding stock');
    },
  });

  const [currentAddId, setCurrentAddId] = useState<number | null>(null);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Inventory</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      <form
        className="flex flex-wrap gap-2 mb-4 items-end"
        onSubmit={e => {
          e.preventDefault();
          if (!name || !volume || !count) return;
          addBottle({ name, color, volume: parseFloat(volume), count: parseInt(count, 10) });
        }}
      >
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Name</label>
          <input
            className="border px-2 py-1 rounded w-36 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Bottle name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Color</label>
          <input
            className="border px-2 py-1 rounded w-28 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Color"
            value={color}
            onChange={e => setColor(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Volume (ml)</label>
          <input
            className="border px-2 py-1 rounded w-24 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Volume"
            type="number"
            min={1}
            value={volume}
            onChange={e => setVolume(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Count</label>
          <input
            className="border px-2 py-1 rounded w-16 bg-white text-gray-900 placeholder-gray-400"
            placeholder="Count"
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
          Add
        </button>
      </form>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full text-left border-t">
          <thead>
            <tr className="text-gray-600">
              <th className="py-1">Name</th>
              <th className="py-1">Color</th>
              <th className="py-1">Volume</th>
              <th className="py-1">Count</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(bottle => (
              <tr key={bottle.id} className="border-b hover:bg-gray-50">
                <td className="py-1">{bottle.name}</td>
                <td className="py-1">{bottle.color || '-'}</td>
                <td className="py-1">{bottle.volume} ml</td>
                <td className="py-1">{bottle.count}</td>
                <td>
                  <button
                    className="text-red-500 hover:underline text-sm"
                    onClick={() => deleteBottle(bottle.id)}
                  >
                    Delete
                  </button>
                </td>
                <td>
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
                      className="w-14 border px-1 py-0.5 rounded text-sm"
                      placeholder="Add"
                      value={addCounts[String(bottle.id)] || ''}
                      onChange={e => setAddCounts(prev => ({ ...prev, [String(bottle.id)]: e.target.value }))}
                      disabled={isAdding && currentAddId === bottle.id}
                    />
                    <button
                      type="submit"
                      className="bg-green-600 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                      disabled={isAdding && currentAddId === bottle.id}
                    >
                      Add
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 