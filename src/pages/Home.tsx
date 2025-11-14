import { useState, useEffect } from 'react';
import PromptBox from '../components/PromptBox';
import { AudioStreamService } from '../services/audioStream';

export default function Home() {
  const [audioService] = useState(() => new AudioStreamService());
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    // connect when component mounts
    const connectWebSocket = async () => {
      try {
        await audioService.connect();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectWebSocket();
    
    // disconnect when component unmounts
    return () => {
      audioService.disconnect();
    };
  }, [audioService]);

  const handleSubmit = async (prompt: string) => {
    if (connectionStatus !== 'connected') {
      console.error('Cannot send prompt - not connected');
      return;
    }

    setLoading(true);
    try {
      audioService.sendPrompt(prompt);
    } catch (error) {
      console.error('Error sending prompt:', error);
    } finally {
      // reset loading after a short delay
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-600/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
      </div>

      <div className="max-w-3xl w-full space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <h1 className="text-7xl font-display font-black bg-gradient-music bg-clip-text text-transparent drop-shadow-2xl">
            Welcome To The Future of Music
          </h1>
          <p className="text-gray-300 text-lg font-medium">
            Tell me what you want to hear, and I'll mix it for you!
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm">
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
        
        <PromptBox 
          onSubmit={handleSubmit} 
          loading={loading}
          disabled={connectionStatus !== 'connected'}
        />
      </div>
    </div>
  );
}