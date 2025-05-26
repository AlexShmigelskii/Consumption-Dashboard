import { useState } from 'react';
import type { Bottle } from '../types';
import { api } from '../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

interface Props {
  bottle: Bottle;
}

export function BottleCard({ bottle }: Props) {
  const [isLogging, setIsLogging] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: logOpening } = useMutation({
    mutationFn: (volumeUsed: number) => 
      api.events.create(bottle.id, { volume_used: volumeUsed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      setIsLogging(false);
    },
  });

  const percentageFull = (bottle.current_volume / bottle.initial_volume) * 100;
  const isLow = percentageFull < 20;

  return (
    <div className="relative p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="mb-2">
        <h3 className="text-lg font-medium text-gray-900">{bottle.name}</h3>
        <p className="text-sm text-gray-500">
          {bottle.current_volume.toFixed(1)} / {bottle.initial_volume.toFixed(1)} ml
        </p>
      </div>

      <div className="h-2 bg-gray-200 rounded-full mb-4">
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            isLow ? 'bg-red-500' : 'bg-blue-500'
          )}
          style={{ width: `${Math.max(0, Math.min(100, percentageFull))}%` }}
        />
      </div>

      {isLogging ? (
        <div className="flex gap-2">
          <button
            onClick={() => logOpening(50)}
            className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
          >
            50ml
          </button>
          <button
            onClick={() => logOpening(100)}
            className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
          >
            100ml
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsLogging(true)}
          className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Log Opening
        </button>
      )}
    </div>
  );
} 