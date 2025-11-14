export class AudioStreamService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve();
        return;
      }

      console.log('connecting to WebSocket...');
      this.ws = new WebSocket('ws://localhost:8000/api/ws/audio');

      this.ws.onopen = () => {
        console.log('✅ webSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        console.log('Received from server:', event.data);
        // this is where we actually handle the audio being sent
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.isConnected = false;
        
        // attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), 2000);
        }
      };

      // if it takes to long, just timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  sendPrompt(prompt: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'prompt', data: prompt }));
      console.log('📤 Sent prompt:', prompt);
    } else {
      console.error('❌ Cannot send - WebSocket is not connected');
      throw new Error('WebSocket is not connected');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}