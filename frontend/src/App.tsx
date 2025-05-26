import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './components/Dashboard';
import { InventoryManager } from './components/InventoryManager';
import { useState } from 'react';
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchInterval: 1000 * 60, // 1 minute
    },
  },
});

function App() {
  const [page, setPage] = useState<'dashboard' | 'inventory'>('dashboard');
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Consumption Dashboard
            </h1>
            <nav className="flex gap-4">
              <button
                className={`px-3 py-1 rounded ${page === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
                onClick={() => setPage('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`px-3 py-1 rounded ${page === 'inventory' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
                onClick={() => setPage('inventory')}
              >
                Inventory
              </button>
            </nav>
          </div>
        </header>

        <main>
          {page === 'dashboard' ? <Dashboard /> : <InventoryManager />}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
