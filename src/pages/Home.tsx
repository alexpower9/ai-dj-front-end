import { useState, useEffect, useCallback, useRef } from 'react';
import PromptBox from '../components/PromptBox';
import Waveform from '../components/Waveform';
import PlaybackTimeline from '../components/PlaybackTimeline';
import QueuePanel from '../components/QueuePanel';
import TrackInfo from '../components/TrackInfo';
import TransitionInfo from '../components/TransitionInfo';
import {
  AudioStreamService,
  type TrackInfo as TrackInfoType,
  type TransitionInfo as TransitionInfoType,
} from '../services/audioStream';

export default function Home() {
  const [audioService] = useState(() => new AudioStreamService());
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  // Music mode state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackInfoType | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Ref so callbacks can see the latest currentTrack
  const currentTrackRef = useRef<TrackInfoType | null>(null);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Transition state
  const [pendingTransition, setPendingTransition] =
    useState<TransitionInfoType | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Music time / progress
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  const [transitionPoints, setTransitionPoints] = useState<number[]>([]);

  // Queue state
  const [previousTrack, setPreviousTrack] =
    useState<TrackInfoType | null>(null);
  const [upNext, setUpNext] = useState<TrackInfoType[]>([]);

  const trackKey = (t: TrackInfoType | null) =>
    t ? `${t.title ?? ''}::${t.artist ?? ''}` : '';

  // Simple timer to simulate playback progress while a track is playing
  useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    const interval = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) return duration;
        return prev + 0.5; // update every 0.5s
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, [isPlaying, duration]);

  useEffect(() => {
    // Set up audio service callbacks
    audioService.setCallbacks({
      onTrackStart: (track) => {
        console.log('Track started:', track);

        // old current becomes previous
        setPreviousTrack(currentTrackRef.current);

        // new current
        setCurrentTrack(track);
        setIsPlaying(true);
        setLoading(false);

        // reset progress
        setCurrentTime(0);

        // try to pull duration & transition points off the track if backend sends them
        const t: any = track as any;
        const trackDuration = t?.duration ?? 0;
        const transitionsRaw =
          t?.transition_points ?? t?.transitionPoints ?? [];

        setDuration(typeof trackDuration === 'number' ? trackDuration : 0);
        setTransitionPoints(
          Array.isArray(transitionsRaw)
            ? transitionsRaw.filter((n: any) => typeof n === 'number')
            : []
        );

        // Clear transition info when new track's audio actually starts
        setPendingTransition(null);
        setIsTransitioning(false);

        // Keep the queued list, but remove the track that just started (so the queue represents "up next")
        setUpNext((prev) => prev.filter((t) => trackKey(t) !== trackKey(track)));
      },
      onTrackEnd: () => {
        console.log('Track ended');
        // wait for queue_empty before fully exiting
      },
      onQueueEmpty: () => {
        console.log('Queue empty - exiting music mode');
        setIsPlaying(false);
        setCurrentTrack(null);
        setPendingTransition(null);
        setIsTransitioning(false);
        setCurrentTime(0);
        setDuration(0);
        setTransitionPoints([]);
        setUpNext([]);
      },
      onQueueUpdate: (queue: any) => {
        // Backend-authoritative “Up Next” list
        // Be resilient to different shapes coming from the service (array or object payload).
        const upcoming = Array.isArray(queue)
          ? queue
          : Array.isArray(queue?.upcoming)
          ? queue.upcoming
          : Array.isArray(queue?.upNext)
          ? queue.upNext
          : Array.isArray(queue?.queue)
          ? queue.queue
          : [];

        setUpNext(upcoming);
      },
      onError: (message) => {
        console.error('Audio error:', message);
        setLoading(false);
      },
      // Transition callbacks
      onTransitionPlanned: (transition) => {
        console.log('Transition planned:', transition);
        setPendingTransition(transition);
      },
      onTransitionStart: (transition) => {
        console.log('Transition starting:', transition);
        setPendingTransition(transition);
        setIsTransitioning(true);
      },
      onTransitionComplete: (nowPlaying) => {
        console.log(
          'Transition complete (backend streaming finished), now playing:',
          nowPlaying,
        );
        // don't clear here; onTrackStart will clean it up
      },
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

  const handleSubmit = useCallback(
    async (prompt: string) => {
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
    },
    [connectionStatus, audioService],
  );

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
            isPlaying
              ? 'scale-150 opacity-40 animate-pulse'
              : 'animate-pulse-slow animation-delay-1000'
          }`}
        />
        {isPlaying && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-cyan/10 rounded-full blur-3xl animate-pulse" />
        )}
        {isTransitioning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon-cyan/20 rounded-full blur-3xl animate-pulse" />
        )}
      </div>

      {/* Main content wrapper with responsive layout */}
      <div
        className={`max-w-6xl w-full relative z-10 flex transition-all duration-700 ease-out ${
          isPlaying
            ? 'h-[calc(100vh-2rem)] flex-col lg:flex-row items-stretch gap-6 py-8'
            : 'flex-col justify-center space-y-8'
        }`}
      >
        {/* Left column */}
        <div
          className={`flex-1 relative flex flex-col transition-all duration-700 ease-out ${
            isPlaying ? 'justify-between' : 'justify-center'
          }`}
        >
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
            <div
              className={`flex items-center justify-center gap-2 text-sm transition-opacity duration-300 ${
                isPlaying ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-gray-400">
                {connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'}
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
            {/* Transition info at the very top - shows upcoming mix */}
            <div className="w-full max-w-md mb-6">
              <TransitionInfo
                transition={pendingTransition}
                isTransitioning={isTransitioning}
              />
            </div>

            {/* Track info */}
            <div className="mb-6">
              <TrackInfo track={currentTrack} />
            </div>

            {/* Waveform */}
            <div className="w-full max-w-2xl px-4">
              <Waveform analyserNode={analyserNode} isPlaying={isPlaying} />
            </div>

            {/* Playback timeline under the waveform */}
            <div className="w-full max-w-2xl px-4 mt-6">
              <PlaybackTimeline
                currentTime={currentTime}
                duration={duration}
                transitionPoints={transitionPoints}
              />
            </div>
          </div>

          {/* Prompt box - transitions to bottom when playing */}
          <div
            className={`w-full transition-all duration-700 ease-out ${
              isPlaying ? 'mt-auto' : ''
            }`}
          >
            <PromptBox
              onSubmit={handleSubmit}
              loading={loading}
              disabled={connectionStatus !== 'connected'}
            />

            {isPlaying && (
              <p className="text-center text-gray-500 text-sm mt-3 animate-fade-in">
                {pendingTransition
                  ? 'Transition queued! Ask for another song to queue more'
                  : 'Request another song to mix it in'}
              </p>
            )}
          </div>
        </div>

        {/* Right column: full queue */}
        {isPlaying && (
          <aside className="w-full lg:w-[360px] flex-shrink-0">
            <div className="h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-4">
              <QueuePanel
                currentTrack={currentTrack}
                previousTrack={previousTrack}
                upNext={upNext}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}