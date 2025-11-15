export class AudioStreamService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  // Web Audio API components
  private audioContext: AudioContext | null = null;
  private sampleRate: number = 44100;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextStartTime: number = 0;

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
        
        // Initialize audio context
        this.initAudioContext();
        
        resolve();
      };

      this.ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          // Handle JSON messages
          const message = JSON.parse(event.data);
          this.handleJsonMessage(message);
        } else if (event.data instanceof Blob) {
          // Handle binary audio data
          await this.handleAudioData(event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.isConnected = false;
        this.stopPlayback();
        
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

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      console.log('🎵 Audio context initialized');
    }
  }

  private handleJsonMessage(message: any) {
    console.log('📨 Received JSON:', message);
    
    switch (message.type) {
      case 'track_start':
        console.log('🎵 Track starting:', message.track.title);
        this.sampleRate = message.track.sample_rate || 44100;
        this.startPlayback();
        break;
      
      case 'track_end':
        console.log('✅ Track finished');
        break;
      
      case 'queue_empty':
        console.log('📭 Queue is empty');
        break;
      
      case 'queued':
        console.log('➕ Song queued:', message.message);
        break;
      
      case 'error':
        console.error('❌ Server error:', message.message);
        break;
      
      default:
        console.log('Received:', message);
    }
  }

  private async handleAudioData(blob: Blob) {
    try {
      if (!this.audioContext) {
        console.error('Audio context not initialized');
        return;
      }

      // Convert blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // Convert int16 PCM data to AudioBuffer
      const audioBuffer = this.int16ToAudioBuffer(arrayBuffer);
      
      // Add to queue and play
      this.audioQueue.push(audioBuffer);
      this.scheduleNextBuffer();
      
    } catch (error) {
      console.error('Error processing audio data:', error);
    }
  }

  private int16ToAudioBuffer(arrayBuffer: ArrayBuffer): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Create DataView to read int16 data
    const dataView = new DataView(arrayBuffer);
    const numSamples = arrayBuffer.byteLength / 4; // 2 bytes per sample * 2 channels
    
    // Create audio buffer (stereo)
    const audioBuffer = this.audioContext.createBuffer(2, numSamples, this.sampleRate);
    
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    
    // Convert int16 to float32 (-1 to 1)
    for (let i = 0; i < numSamples; i++) {
      const offset = i * 4; // 4 bytes per stereo sample
      leftChannel[i] = dataView.getInt16(offset, true) / 32768.0;
      rightChannel[i] = dataView.getInt16(offset + 2, true) / 32768.0;
    }
    
    return audioBuffer;
  }

  private startPlayback() {
    if (!this.isPlaying && this.audioContext) {
      this.isPlaying = true;
      this.nextStartTime = this.audioContext.currentTime;
      console.log('▶️ Playback started');
    }
  }

  private scheduleNextBuffer() {
    if (!this.audioContext || !this.isPlaying || this.audioQueue.length === 0) {
      return;
    }

    const audioBuffer = this.audioQueue.shift()!;
    
    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    // Schedule playback
    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    source.start(startTime);
    
    // Update next start time
    this.nextStartTime = startTime + audioBuffer.duration;
    
    // Clean up when finished
    source.onended = () => {
      if (this.audioQueue.length > 0) {
        this.scheduleNextBuffer();
      }
    };
    
    this.currentSource = source;
  }

  private stopPlayback() {
    this.isPlaying = false;
    this.audioQueue = [];
    
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might already be stopped
      }
      this.currentSource = null;
    }
    
    console.log('⏹️ Playback stopped');
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
    this.stopPlayback();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}