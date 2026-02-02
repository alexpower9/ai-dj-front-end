export interface TrackInfo {
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: number;
  sampleRate: number;
}

<<<<<<< HEAD
export interface QueuedTrackInfo {
  title: string;
  artist: string;
  isAutoQueued: boolean;
}

=======
// Match backend TransitionPlan.to_dict() keys
>>>>>>> feature/sebupdate
export interface TransitionInfo {
  song_a: string;
  song_b: string;
  exit_segment: string;
  entry_segment: string;
  score: number;
  crossfade_duration: number;
  transition_start_time: number;
  song_b_start_offset: number;

  // optional alias the backend sometimes sends
  start_time?: number;
}

export interface AudioServiceCallbacks {
  onTrackStart?: (track: TrackInfo) => void;
  onTrackEnd?: () => void;
  onQueueEmpty?: () => void;
  onError?: (message: string) => void;
  onTransitionPlanned?: (transition: TransitionInfo) => void;
  onTransitionStart?: (transition: TransitionInfo) => void;
  onTransitionComplete?: (nowPlaying: string) => void;
  onQueuedTrackUpdate?: (track: QueuedTrackInfo | null) => void;
}

// Audio queue item tagged with track ID
interface QueuedAudio {
  buffer: AudioBuffer;
  trackId: number;
}

// Pending track transition
interface PendingTransition {
  trackId: number;
  startTime: number; // AudioContext time when this track's audio starts
  trackInfo: TrackInfo;
}

export class AudioStreamService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  // Web Audio API components
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sampleRate: number = 44100;
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextStartTime: number = 0;
  
  // Audio queue with track ID tags
  private audioQueue: QueuedAudio[] = [];
  
  // Track ID system - increments with each track_start
  private currentStreamingTrackId: number = 0;
  private currentPlayingTrackId: number = 0;
  
  // Track info management
  private currentTrack: TrackInfo | null = null;
  private trackInfoMap: Map<number, TrackInfo> = new Map(); // trackId -> TrackInfo
  
  // Queued track info (for autoplay indicator)
  private queuedTrack: QueuedTrackInfo | null = null;
  
  // Transition info
  private pendingTransitionInfo: TransitionInfo | null = null;
  private isTransitioning: boolean = false;
  
  // Pending transitions - scheduled to trigger at specific audio times
  private pendingTransitions: PendingTransition[] = [];
  private transitionCheckInterval: number | null = null;
  
  // Callbacks
  private callbacks: AudioServiceCallbacks = {};
  
  // Synchronization flags
  private queueEmptyReceived: boolean = false;
  private allTracksStreamingComplete: boolean = false;
  private playbackCheckInterval: number | null = null;

  setCallbacks(callbacks: AudioServiceCallbacks) {
    this.callbacks = callbacks;
  }

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
        console.log(' webSocket connected successfully');
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
        console.error(' WebSocket error:', error);
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
      
      // Create analyser node for visualization
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.analyserNode.connect(this.audioContext.destination);
      
      console.log('🎵 Audio context and analyser initialized');
    }
  }

  private updateQueuedTrack(track: QueuedTrackInfo | null) {
    this.queuedTrack = track;
    if (this.callbacks.onQueuedTrackUpdate) {
      this.callbacks.onQueuedTrackUpdate(track);
    }
  }

  private handleJsonMessage(message: any) {
    console.log('📨 Received JSON:', message);
    console.log('📨 Message type:', message.type); 
    switch (message.type) {
      case 'track_start':
        console.log('🎵 Track info received:', message.track.title);
        this.sampleRate = message.track.sample_rate || 44100;
        
        // Increment track ID for this new track
        this.currentStreamingTrackId++;
        const trackId = this.currentStreamingTrackId;
        
        // Create track info object
        const newTrackInfo: TrackInfo = {
          title: message.track.title || 'Unknown',
          artist: message.track.artist || 'Unknown Artist',
          bpm: message.track.bpm,
          key: message.track.key,
          duration: message.track.duration,
          sampleRate: this.sampleRate
        };
        
        // Store track info
        this.trackInfoMap.set(trackId, newTrackInfo);
        
        // If we're not currently playing anything, this is the first track
        if (!this.isPlaying || !this.currentTrack) {
          console.log('🎵 Setting as current track (first/only track), trackId:', trackId);
          this.currentTrack = newTrackInfo;
          this.currentPlayingTrackId = trackId;
          this.queueEmptyReceived = false;
          this.allTracksStreamingComplete = false;
          
          this.startPlayback();
          this.startTransitionMonitor();
          
          // Trigger callback
          if (this.callbacks.onTrackStart) {
            this.callbacks.onTrackStart(this.currentTrack);
          }
        } else {
          console.log('🎵 Track info stored for later, trackId:', trackId, 'title:', newTrackInfo.title);
        }
        break;
      
      case 'track_end':
        console.log('✅ Backend finished streaming track');
        break;
      
      case 'queue_empty':
        console.log('📭 Backend queue is empty - all tracks streamed');
        this.queueEmptyReceived = true;
        this.allTracksStreamingComplete = true;
        // Clear pending transition info and queued track when queue is done
        this.pendingTransitionInfo = null;
        this.updateQueuedTrack(null);
        // Start monitoring for final playback completion
        this.startPlaybackMonitor();
        break;
      
      case 'queued':
        console.log('➕ Song queued:', message.message);
        // Update queued track info from user request
        if (message.queue?.queue?.[0]) {
          const queuedInfo = message.queue.queue[0];
          this.updateQueuedTrack({
            title: queuedInfo.title || 'Unknown',
            artist: queuedInfo.artist || 'Unknown Artist',
            isAutoQueued: queuedInfo.is_auto_queued || false
          });
        }
        break;
      
      // Auto-queued track notification
      case 'auto_queued':
        console.log('✨ Auto-queued:', message.track?.title);
        if (message.track) {
          this.updateQueuedTrack({
            title: message.track.title || 'Unknown',
            artist: message.track.artist || 'Unknown Artist',
            isAutoQueued: true
          });
        }
        break;
      
      // Transition messages
      case 'transition_planned':
        console.log('🎛️ Transition planned:', message.transition);
        this.pendingTransitionInfo = this.parseTransitionInfo(message.transition);
        
        // Update queued track from transition info if we have next_track data
        if (message.next_track) {
          this.updateQueuedTrack({
            title: message.next_track.title || message.transition?.song_b || 'Unknown',
            artist: message.next_track.artist || 'Unknown Artist',
            isAutoQueued: message.next_track.is_auto_queued || false
          });
        }
        
        if (this.callbacks.onTransitionPlanned && this.pendingTransitionInfo) {
          this.callbacks.onTransitionPlanned(this.pendingTransitionInfo);
        }
        break;
      
      case 'transition_start':
        console.log('🎛️ Transition starting:', message.transition);
        this.isTransitioning = true;
        const transitionInfo = this.parseTransitionInfo(message.transition);
        if (this.callbacks.onTransitionStart && transitionInfo) {
          this.callbacks.onTransitionStart(transitionInfo);
        }
        break;
      
      case 'transition_complete':
        console.log('🎛️ Transition complete, now playing:', message.now_playing?.title);
        this.isTransitioning = false;
        this.pendingTransitionInfo = null;
        // Only clear queued track if it matches the track that just started playing
        // The backend may send a new auto_queued message right after this
        if (this.queuedTrack && 
            message.now_playing?.title &&
            this.queuedTrack.title.toLowerCase() === message.now_playing.title.toLowerCase()) {
          this.updateQueuedTrack(null);
        }
        if (this.callbacks.onTransitionComplete) {
          this.callbacks.onTransitionComplete(message.now_playing?.title || 'Unknown');
        }
        break;
      
      case 'error':
        console.error('❌ Server error:', message.message);
        if (this.callbacks.onError) {
          this.callbacks.onError(message.message);
        }
        break;
      
      default:
        console.log('Received:', message);
    }
  }

  private parseTransitionInfo(data: any): TransitionInfo | null {
    if (!data) return null;
    
    return {
      song_a: data.song_a || data.songA || 'Current',
      song_b: data.song_b || data.songB || 'Next',
      exit_segment: data.exit_segment || data.exitSegment || 'unknown',
      entry_segment: data.entry_segment || data.entrySegment || 'unknown',
      score: data.score ?? 0,
      crossfade_duration: data.crossfade_duration ?? data.crossfadeDuration ?? 8,
      transition_start_time:
        data.transition_start_time ??
        data.transitionStartTime ??
        data.start_time ??
        0,
      song_b_start_offset:
        data.song_b_start_offset ??
        data.songBStartOffset ??
        0,
      start_time: data.start_time,
    };
  }

  private startTransitionMonitor() {
    // Clear any existing monitor
    if (this.transitionCheckInterval !== null) {
      clearInterval(this.transitionCheckInterval);
    }
    
    // Check every 50ms if any pending transitions should trigger
    this.transitionCheckInterval = window.setInterval(() => {
      this.checkPendingTransitions();
    }, 50);
  }

  private checkPendingTransitions() {
    if (!this.audioContext || this.pendingTransitions.length === 0) return;
    
    const currentTime = this.audioContext.currentTime;
    
    // Check if any pending transitions should trigger
    while (this.pendingTransitions.length > 0) {
      const nextTransition = this.pendingTransitions[0];
      
      // If it's time (or past time) for this transition
      if (currentTime >= nextTransition.startTime - 0.02) { // Small buffer for timing
        this.pendingTransitions.shift();
        this.executeTrackTransition(nextTransition);
      } else {
        // Not time yet for the next transition
        break;
      }
    }
  }

  private executeTrackTransition(transition: PendingTransition) {
    console.log('🎵 Executing track transition to trackId:', transition.trackId, 'title:', transition.trackInfo.title);
    
    this.currentTrack = transition.trackInfo;
    this.currentPlayingTrackId = transition.trackId;
    
    // Clear transition info after transition completes
    this.pendingTransitionInfo = null;
    
    // Only clear queued track if it matches the track that just started
    // This preserves auto-queued tracks for the NEXT transition
    if (this.queuedTrack && 
        this.queuedTrack.title.toLowerCase() === transition.trackInfo.title.toLowerCase()) {
      this.updateQueuedTrack(null);
    }
    
    // Trigger track start callback
    if (this.callbacks.onTrackStart) {
      this.callbacks.onTrackStart(this.currentTrack);
    }
  }

  private startPlaybackMonitor() {
    // Clear any existing monitor
    if (this.playbackCheckInterval !== null) {
      clearInterval(this.playbackCheckInterval);
    }
    
    // Check every 100ms if all playback has finished
    this.playbackCheckInterval = window.setInterval(() => {
      this.checkFinalPlaybackCompletion();
    }, 100);
  }

  private checkFinalPlaybackCompletion() {
    if (!this.audioContext) return;
    
    const currentTime = this.audioContext.currentTime;
    const isStillPlaying = currentTime < this.nextStartTime - 0.05;
    
    // Check if ALL playback is truly finished
    if (this.allTracksStreamingComplete && this.audioQueue.length === 0 && !isStillPlaying && this.pendingTransitions.length === 0) {
      console.log('🎵 All playback finished - exiting music mode');
      
      // Clear monitors
      if (this.playbackCheckInterval !== null) {
        clearInterval(this.playbackCheckInterval);
        this.playbackCheckInterval = null;
      }
      if (this.transitionCheckInterval !== null) {
        clearInterval(this.transitionCheckInterval);
        this.transitionCheckInterval = null;
      }
      
      this.currentTrack = null;
      this.isPlaying = false;
      this.pendingTransitionInfo = null;
      this.updateQueuedTrack(null);
      
      if (this.callbacks.onTrackEnd) {
        this.callbacks.onTrackEnd();
      }
      
      if (this.callbacks.onQueueEmpty) {
        this.callbacks.onQueueEmpty();
      }
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
      
      // Create queue item tagged with current streaming track ID
      const queueItem: QueuedAudio = {
        buffer: audioBuffer,
        trackId: this.currentStreamingTrackId
      };
      
      // Add to queue
      this.audioQueue.push(queueItem);
      this.scheduleNextBuffer();
      
    } catch (error) {
      console.error('Error processing audio data:', error);
    }
  }

  private int16ToAudioBuffer(arrayBuffer: ArrayBuffer): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const dataView = new DataView(arrayBuffer);
    const numSamples = arrayBuffer.byteLength / 4;
    
    const audioBuffer = this.audioContext.createBuffer(2, numSamples, this.sampleRate);
    
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    
    for (let i = 0; i < numSamples; i++) {
      const offset = i * 4;
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

    // Get next audio item
    const audioItem = this.audioQueue.shift()!;
    const audioBuffer = audioItem.buffer;
    const bufferTrackId = audioItem.trackId;
    
    // Calculate when this buffer will start playing
    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    
    // Check if this buffer belongs to a different track than currently playing
    if (bufferTrackId !== this.currentPlayingTrackId) {
      // Schedule a transition to happen when this buffer starts playing
      const trackInfo = this.trackInfoMap.get(bufferTrackId);
      if (trackInfo) {
        // Check if we already have a pending transition for this track
        const existingTransition = this.pendingTransitions.find(t => t.trackId === bufferTrackId);
        if (!existingTransition) {
          console.log('🎵 Scheduling track transition to trackId:', bufferTrackId, 'at time:', startTime.toFixed(2));
          this.pendingTransitions.push({
            trackId: bufferTrackId,
            startTime: startTime,
            trackInfo: trackInfo
          });
        }
      }
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    if (this.analyserNode) {
      source.connect(this.analyserNode);
    } else {
      source.connect(this.audioContext.destination);
    }
    
    source.start(startTime);
    
    this.nextStartTime = startTime + audioBuffer.duration;
    
    // Set up onended callback
    source.onended = () => {
      // Continue scheduling more buffers
      if (this.audioQueue.length > 0) {
        this.scheduleNextBuffer();
      }
    };
    
    this.currentSource = source;
  }

  private stopPlayback() {
    this.isPlaying = false;
    this.audioQueue = [];
    this.currentTrack = null;
    this.trackInfoMap.clear();
    this.pendingTransitions = [];
    this.pendingTransitionInfo = null;
    this.queuedTrack = null;
    this.isTransitioning = false;
    this.queueEmptyReceived = false;
    this.allTracksStreamingComplete = false;
    this.currentStreamingTrackId = 0;
    this.currentPlayingTrackId = 0;
    
    if (this.playbackCheckInterval !== null) {
      clearInterval(this.playbackCheckInterval);
      this.playbackCheckInterval = null;
    }
    if (this.transitionCheckInterval !== null) {
      clearInterval(this.transitionCheckInterval);
      this.transitionCheckInterval = null;
    }
    
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might already be stopped
      }
      this.currentSource = null;
    }
    
    console.log('⏹ Playback stopped');
  }

  sendPrompt(prompt: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'prompt', data: prompt }));
      console.log(' Sent prompt:', prompt);
    } else {
      console.error(' Cannot send - WebSocket is not connected');
      throw new Error('WebSocket is not connected');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getCurrentTrack(): TrackInfo | null {
    return this.currentTrack;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  getPendingTransition(): TransitionInfo | null {
    return this.pendingTransitionInfo;
  }
  
  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }
  
  getQueuedTrack(): QueuedTrackInfo | null {
    return this.queuedTrack;
  }
  
  getQueueLength(): number {
    return this.pendingTransitions.length;
  }

  disconnect() {
    this.stopPlayback();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyserNode = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}