import { useState, useEffect, useCallback } from 'react';
import PromptBox from '../components/PromptBox';
import Waveform from '../components/Waveform.tsx';
import TrackInfo from '../components/TrackInfo.tsx';
import { AudioStreamService, type TrackInfo as TrackInfoType } from '../services/audioStream';

export default function Home() {
  const [audioService] = useState(() => new AudioStreamService());
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Music mode state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackInfoType | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    // Set up audio service callbacks
    audioService.setCallbacks({
      onTrackStart: (track) => {
        console.log('Track started:', track);
        setCurrentTrack(track);
        setIsPlaying(true);
        setLoading(false);
      },
      onTrackEnd: () => {
        console.log('Track ended');
        // Don't immediately exit music mode - wait for queue_empty
      },
      onQueueEmpty: () => {
        console.log('Queue empty - exiting music mode');
        setIsPlaying(false);
        setCurrentTrack(null);
      },
      onError: (message) => {
        console.error('Audio error:', message);
        setLoading(false);
      }
    });

    // Connect when component mounts
    const connectWebSocket = async () => {
      try {
        await audioService.connect();
        setConnectionStatus('connected');
        
        // Get analyser node after connection
        const analyser = audioService.getAnalyserNode();
        setAnalyserNode(analyser);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectWebSocket();
    
    // Disconnect when component unmounts
    return () => {
      audioService.disconnect();
    };
  }, [audioService]);

  const handleSubmit = useCallback(async (prompt: string) => {
    if (connectionStatus !== 'connected') {
      console.error('Cannot send prompt - not connected');
      return;
    }

    setLoading(true);
    try {
      audioService.sendPrompt(prompt);
    } catch (error) {
      console.error('Error sending prompt:', error);
      setLoading(false);
    }
  }, [connectionStatus, audioService]);

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl transition-all duration-1000 ${
            isPlaying ? 'scale-150 opacity-40 animate-pulse' : 'animate-pulse-slow'
          }`}
        />
        <div 
          className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-600/20 rounded-full blur-3xl transition-all duration-1000 ${
            isPlaying ? 'scale-150 opacity-40 animate-pulse' : 'animate-pulse-slow animation-delay-1000'
          }`}
        />
        {isPlaying && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-cyan/10 rounded-full blur-3xl animate-pulse" />
        )}
      </div>

      {/* Main content wrapper with flex layout */}
      <div className={`max-w-3xl w-full relative z-10 flex flex-col transition-all duration-700 ease-out ${
        isPlaying ? 'h-[calc(100vh-2rem)] justify-between py-8' : 'justify-center space-y-8'
      }`}>
        
        {/* Welcome text - fades out when playing */}
        <div 
          className={`text-center space-y-4 transition-all duration-500 ${
            isPlaying 
              ? 'opacity-0 scale-95 absolute pointer-events-none' 
              : 'opacity-100 scale-100'
          }`}
        >
          <h1 className="text-7xl font-display font-black bg-gradient-music bg-clip-text text-transparent drop-shadow-2xl">
            Welcome To The Future of Music
          </h1>
          <p className="text-gray-300 text-lg font-medium">
            Tell me what you want to hear, and I'll mix it for you!
          </p>
          
          {/* Connection status - only show when not playing */}
          <div className={`flex items-center justify-center gap-2 text-sm transition-opacity duration-300 ${
            isPlaying ? 'opacity-0' : 'opacity-100'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-gray-400">
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </span>
          </div>
        </div>

        {/* Music mode content - fades in when playing */}
        <div 
          className={`flex-1 flex flex-col items-center justify-center transition-all duration-500 ${
            isPlaying 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-95 absolute pointer-events-none'
          }`}
        >
          {/* Track info at top */}
          <div className="mb-8">
            <TrackInfo track={currentTrack} />
          </div>
          
          {/* Waveform in the middle */}
          <div className="w-full max-w-2xl px-4">
            <Waveform analyserNode={analyserNode} isPlaying={isPlaying} />
          </div>
        </div>
        
        {/* Prompt box - transitions to bottom when playing */}
        <div 
          className={`w-full transition-all duration-700 ease-out ${
            isPlaying 
              ? 'mt-auto' 
              : ''
          }`}
        >
          <PromptBox 
            onSubmit={handleSubmit} 
            loading={loading}
            disabled={connectionStatus !== 'connected'}
          />
          
          {/* Hint text when playing */}
          {isPlaying && (
            <p className="text-center text-gray-500 text-sm mt-3 animate-fade-in">
              Request another song or add to the queue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
