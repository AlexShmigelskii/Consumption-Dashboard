export interface Bottle {
  id: number;
  name: string;
  initial_volume: number;
  current_volume: number;
  created_at: string;
  opening_events: OpeningEvent[];
}

export interface OpeningEvent {
  id: number;
  bottle_id: number;
  timestamp: string;
  volume_used: number;
}

export interface WebSocketMessage {
  event_type: string;
  data: {
    id?: number;
    bottle_id?: number;
    name?: string;
    current_volume?: number;
    volume_used?: number;
  };
}

export interface InventoryBottle {
  id: number;
  name: string;
  color?: string;
  volume: number;
  count: number;
  created_at: string;
} 