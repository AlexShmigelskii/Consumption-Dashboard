import type { WebSocketMessage } from '../types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];

  constructor(private url: string = 'ws://localhost:8000/ws') {}

  connect() {
    if (this.ws) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage;
      this.messageHandlers.forEach(handler => handler(message));
    };

    this.ws.onclose = () => {
      this.ws = null;
      // Попытка переподключения через 5 секунд
      setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
}

export const wsClient = new WebSocketClient(); 