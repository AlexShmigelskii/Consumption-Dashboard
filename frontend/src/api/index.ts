import axios from 'axios';
import type { Bottle, OpeningEvent, InventoryBottle } from '../types';

const API_URL = 'http://localhost:8000';

export const api = {
  bottles: {
    list: async () => {
      const response = await axios.get<Bottle[]>(`${API_URL}/bottles/`);
      return response.data;
    },
    
    create: async (data: Pick<Bottle, 'name' | 'initial_volume' | 'current_volume'>) => {
      const response = await axios.post<Bottle>(`${API_URL}/bottles/`, data);
      return response.data;
    },
    
    update: async (id: number, data: Partial<Pick<Bottle, 'name' | 'current_volume'>>) => {
      const response = await axios.patch<Bottle>(`${API_URL}/bottles/${id}`, data);
      return response.data;
    },
    
    delete: async (id: number) => {
      await axios.delete(`${API_URL}/bottles/${id}`);
    },
  },
  
  events: {
    create: async (bottleId: number, data: Pick<OpeningEvent, 'volume_used'>) => {
      const response = await axios.post<OpeningEvent>(
        `${API_URL}/bottles/${bottleId}/events`,
        data
      );
      return response.data;
    },
  },

  inventory: {
    list: async () => {
      const response = await axios.get<InventoryBottle[]>(`${API_URL}/inventory/`);
      return response.data;
    },
    create: async (data: Pick<InventoryBottle, 'name' | 'color' | 'volume' | 'count'>) => {
      const response = await axios.post<InventoryBottle>(`${API_URL}/inventory/`, data);
      return response.data;
    },
    delete: async (id: number) => {
      console.log('Deleting inventory bottle with id:', id);
      try {
        await axios.delete(`${API_URL}/inventory/${id}`);
        console.log('Successfully deleted inventory bottle');
      } catch (error) {
        console.error('Error deleting inventory bottle:', error);
        throw error;
      }
    },
    open: async (id: number) => {
      await axios.post(`${API_URL}/inventory/${id}/open`);
    },
  },

  inventory_snapshots: {
    list: async (start_date: string, end_date: string) => {
      const response = await axios.get(`${API_URL}/inventory_snapshots/`, {
        params: { start_date, end_date }
      });
      return response.data;
    },
  },
}; 