import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PromptBox from "../components/PromptBox";
import Waveform from "../components/Waveform";
import PlaybackTimeline from "../components/PlaybackTimeline";
import QueuePanel from "../components/QueuePanel";
import TrackInfo from "../components/TrackInfo";
import TransitionInfo from "../components/TransitionInfo";
import {
    AudioStreamService,
    type TrackInfo as TrackInfoType,
    type TransitionInfo as TransitionInfoType,
} from "../services/audioStream";
import {
    Upload,
    MicVocal,
    Mic,
    MicOff,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    Play,
    Pause,
    SkipForward,
    Volume2,
    VolumeX,
} from "lucide-react";
import SongUpload from "../components/SongUpload.tsx";
import { useAuth } from "../context/AuthContext";

type LibrarySong = {
    id?: string;
    title?: string;
    artist?: string;
    bpm?: number;
    key?: string;
    scale?: string;
};

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, token, user } = useAuth();
    const [audioService] = useState(() => new AudioStreamService());
    const [loading, setLoading] = useState(false);
    const setlistId = (location.state as { setlistId?: string } | null)
        ?.setlistId;

    // Library state (songs available on the backend)
    const [librarySongs, setLibrarySongs] = useState<LibrarySong[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [libraryError, setLibraryError] = useState<string | null>(null);

    const refreshLibrary = useCallback(async () => {
        setLibraryLoading(true);
        setLibraryError(null);
        try {
            const url = token
                ? `/api/library?token=${encodeURIComponent(token)}`
                : "/api/library";
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Library fetch failed: ${res.status}`);
            }

            const data: any = await res.json();
            const songs = Array.isArray(data)
                ? data
                : Array.isArray(data?.songs)
                  ? data.songs
                  : Array.isArray(data?.library)
                    ? data.library
                    : [];
            setLibrarySongs(songs);
        } catch (e: any) {
            console.error("Failed to load library:", e);
            setLibraryError(e?.message ?? "Failed to load library");
        } finally {
            setLibraryLoading(false);
        }
    }, [token]);

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  //Upload Song State
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Library sidebar collapse state
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);

  // Music mode state
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputMode, setInputMode] = useState<"prompt" | "controls">("prompt");
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(1);

  // Voice input (browser speech-to-text)
  const SpeechRecognitionCtor: any =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognitionCtor;
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [voicePreview, setVoicePreview] = useState("");
  const listeningRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  // Wake-word voice control
  const WAKE_WORD = "hey tempo";
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState<"wake" | "capture">("wake");
  const voiceEnabledRef = useRef(true);
  const voiceModeRef = useRef<"wake" | "capture">("wake");

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  const wakeBufferRef = useRef("");
  const captureFinalRef = useRef("");
  const captureInterimRef = useRef("");
  const recognitionRunningRef = useRef(false);
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
  const [isQuickTransitionPending, setIsQuickTransitionPending] =
    useState(false);

  // Music time / progress
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  const [transitionPoints, setTransitionPoints] = useState<number[]>([]);

  // Queue state
  const [previousTrack, setPreviousTrack] = useState<TrackInfoType | null>(
    null,
  );
  const [upNext, setUpNext] = useState<TrackInfoType[]>([]);

  // Backend log state
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<"queue" | "logs">("queue");
  const logEndRef = useRef<HTMLDivElement>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: "error" | "info" | "success" }[]
  >([]);
  const toastIdRef = useRef(0);

  // EQ / Bass UI (frontend concept only)
  const [bassLevel, setBassLevel] = useState(50); // 0..100
  const [isEditingBass, setIsEditingBass] = useState(false);
  const [bassInput, setBassInput] = useState(String(bassLevel));

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  // Push bass UI value into WebAudio (client-side) whenever it changes
  useEffect(() => {
    try {
      (audioService as any).setBass?.(bassLevel);
    } catch (e) {
      console.warn("setBass failed:", e);
    }
  }, [bassLevel, audioService]);


  const addToast = useCallback(
    (message: string, type: "error" | "info" | "success" = "info") => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  const trackKey = (t: TrackInfoType | null) =>
    t ? `${t.title ?? ""}::${t.artist ?? ""}` : "";

  // Simple timer to simulate playback progress while a track is playing
  useEffect(() => {
    if (!isPlaying || isPaused || duration <= 0) return;

    const interval = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) return duration;
        return prev + 0.5; // update every 0.5s
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, [isPlaying, isPaused, duration]);

  useEffect(() => {
    // Load library once on mount
    refreshLibrary();

    // Set up audio service callbacks
    audioService.setCallbacks({
      onTrackStart: (track) => {
        console.log("Track started:", track);

        // old current becomes previous
        setPreviousTrack(currentTrackRef.current);

        // new current
        setCurrentTrack(track);
        setIsPlaying(true);
        setLoading(false);
        setIsPaused(false);

        // reset progress (use start_offset for post-transition tracks)
        setCurrentTime(track.startOffset || 0);

        // try to pull duration & transition points off the track if backend sends them
        const t: any = track as any;
        const trackDuration = t?.duration ?? 0;
        const transitionsRaw =
          t?.transition_points ?? t?.transitionPoints ?? [];

        setDuration(typeof trackDuration === "number" ? trackDuration : 0);
        setTransitionPoints(
          Array.isArray(transitionsRaw)
            ? transitionsRaw.filter((n: any) => typeof n === "number")
            : [],
        );

        // Clear transition info when new track's audio actually starts
        setPendingTransition(null);
        setIsTransitioning(false);

        // Keep the queued list, but remove the track that just started (so the queue represents "up next")
        setUpNext((prev) =>
          prev.filter((t) => trackKey(t) !== trackKey(track)),
        );
      },
      onTrackEnd: () => {
        console.log("Track ended");
        // wait for queue_empty before fully exiting
      },
      onQueueEmpty: () => {
        console.log("Queue empty - exiting music mode");
        setIsPlaying(false);
        setCurrentTrack(null);
        setIsPaused(false);
        setPendingTransition(null);
        setIsTransitioning(false);
        setCurrentTime(0);
        setDuration(0);
        setTransitionPoints([]);
        setUpNext([]);
      },
      onQueueUpdate: (queue: any) => {
        // The audioStream service now extracts the queue array for us
        const upcoming = Array.isArray(queue) ? queue : [];
        setUpNext(upcoming);
        // A queue update confirms the backend processed our prompt, so clear loading state
        setLoading(false);
      },
      onError: (message) => {
        console.error("Audio error:", message);
        addToast(message, "error");
        setLoading(false);
      },
      onInfo: (_type, _message) => {
        // Backend responded but no song was queued/played — clear the loading spinner
        setLoading(false);
      },
      // Transition callbacks
      onTransitionPlanned: (transition) => {
        console.log("Transition planned:", transition);
        setPendingTransition(transition);

        if ((transition as any).is_quick) {
          setIsQuickTransitionPending(true);

          setTimeout(() => setIsQuickTransitionPending(false), 500);
        }
      },
      onTransitionStart: (transition) => {
        console.log("Transition starting:", transition);
        setPendingTransition(transition);
        setIsTransitioning(true);
      },
      onTransitionComplete: (nowPlaying) => {
        console.log(
          "Transition complete (backend streaming finished), now playing:",
          nowPlaying,
        );
        // don't clear here; onTrackStart will clean it up
      },
      onBackendLog: (lines) => {
        setBackendLogs((prev) => {
          const updated = [...prev, ...lines];
          return updated.length > 200 ? updated.slice(-200) : updated;
        });
        // Auto-scroll to bottom
        requestAnimationFrame(() => {
          logEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      },
    });

    // Connect when component mounts
    const connectWebSocket = async () => {
      try {
        await audioService.connect(token);
        setConnectionStatus("connected");

        const analyser = audioService.getAnalyserNode();
        setAnalyserNode(analyser);

        if (setlistId) {
          audioService.sendMessage({
            type: "load_setlist",
            setlist_id: setlistId,
          });
          window.history.replaceState({}, document.title);
        }
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
        setConnectionStatus("disconnected");
      }
    };

    connectWebSocket();

    // Disconnect when component unmounts
    return () => {
      audioService.disconnect();
    };
  }, [addToast, audioService, refreshLibrary, setlistId, token]);

    const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    const handleSubmit = useCallback(
        async (prompt: string) => {
            if (connectionStatus !== "connected") {
                console.error("Cannot send prompt - not connected");
                return;
            }

            //setLoading(true);

            // Safety timeout: clear loading after 30s if no response clears it first
            if (loadingTimeoutRef.current)
                clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = setTimeout(() => {
                console.warn(
                    "Loading timeout reached — clearing loading state",
                );
                setLoading(false);
            }, 30_000);

            try {
                audioService.sendPrompt(prompt);
            } catch (error) {
                console.error("Error sending prompt:", error);
                setLoading(false);
                if (loadingTimeoutRef.current)
                    clearTimeout(loadingTimeoutRef.current);
            }
        },
        [connectionStatus, audioService],
    );

    // Set up speech recognition once (stable instance)
    // Wake mode: always listens for "hey tempo"
    // Capture mode: after wake word, captures a prompt and auto-sends after brief silence
    useEffect(() => {
        const SpeechRecognition: undefined | (new () => any) =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;

        const clearSilenceTimer = () => {
            if (silenceTimerRef.current) {
                window.clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        };

        const stripWakeWord = (text: string) => {
            // Remove wake word from any transcript before sending/previewing
            const cleaned = (text || "")
                .replace(/\bhey\s+tempo\b/gi, " ")
                .replace(/\s+/g, " ")
                .trim();
            return cleaned;
        };

        const resetToWakeMode = () => {
            setVoiceMode("wake");
            voiceModeRef.current = "wake";
            setIsListening(false);
            setVoicePreview("");
            wakeBufferRef.current = "";
            captureFinalRef.current = "";
            captureInterimRef.current = "";
            finalTranscriptRef.current = "";
            clearSilenceTimer();
        };

        rec.onstart = () => {
            recognitionRunningRef.current = true;
        };

        rec.onresult = (event: any) => {
            const mode = voiceModeRef.current;
            // Process only new results to avoid re-building the entire transcript every time.
            let interimChunk = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const txt = (event.results[i]?.[0]?.transcript ?? "").trim();
                if (!txt) continue;

                if (event.results[i].isFinal) {
                    if (mode === "capture") {
                        const cleaned = stripWakeWord(txt);
                        if (cleaned) {
                            captureFinalRef.current =
                                (captureFinalRef.current + " " + cleaned).trim();
                        }
                    } else {
                        wakeBufferRef.current =
                            (wakeBufferRef.current + " " + txt).trim();
                    }
                } else {
                    // Keep interim for live preview, but never include the wake word
                    const interimCleaned =
                        mode === "capture" ? stripWakeWord(txt) : txt;
                    interimChunk = (interimChunk + " " + interimCleaned).trim();
                }
            }

            // --- WAKE MODE ---
            if (mode === "wake") {
                const combined =
                    (wakeBufferRef.current + " " + interimChunk)
                        .trim()
                        .toLowerCase();

                if (combined.includes(WAKE_WORD)) {
                    // Switch to capture mode and start buffering the prompt
                    voiceModeRef.current = "capture";
                    setVoiceMode("capture");
                    setIsListening(true);

                    // If the wake phrase and prompt were spoken together, keep only the prompt part
                    const afterWake = stripWakeWord(
                        (wakeBufferRef.current + " " + interimChunk).trim(),
                    );

                    // Clear buffers so the prompt doesn't include the wake phrase
                    wakeBufferRef.current = "";
                    captureFinalRef.current = afterWake;
                    captureInterimRef.current = "";
                    finalTranscriptRef.current = afterWake;
                    setVoicePreview(afterWake);
                    clearSilenceTimer();
                }
                return;
            }

            // --- CAPTURE MODE ---
            captureInterimRef.current = interimChunk;
            const liveText = stripWakeWord(
                (captureFinalRef.current + " " + captureInterimRef.current).trim(),
            );

            finalTranscriptRef.current = liveText;
            setVoicePreview(liveText);

            // Auto-send after the user stops speaking for ~900ms
            clearSilenceTimer();
            silenceTimerRef.current = window.setTimeout(() => {
                const toSend = stripWakeWord(finalTranscriptRef.current).trim();
                if (!toSend) {
                    // User only said the wake word (or nothing meaningful)
                    resetToWakeMode();
                    return;
                }

                // Send prompt (wake word never included)
                handleSubmit(toSend);

                // Reset back to wake mode
                resetToWakeMode();
            }, 900);
        };

        rec.onerror = (e: any) => {
            console.error("[voice] recognition error", e);

            // If user still wants voice enabled, restart after transient errors
            recognitionRunningRef.current = false;

            if (
                voiceEnabledRef.current &&
                (e?.error === "no-speech" ||
                    e?.error === "aborted" ||
                    e?.error === "network")
            ) {
                try {
                    rec.stop();
                } catch {
                    // ignore
                }
                setTimeout(() => {
                    if (voiceEnabledRef.current) {
                        try {
                            rec.start();
                        } catch {
                            // ignore
                        }
                    }
                }, 300);
                return;
            }

            listeningRef.current = false;
            setIsListening(false);
            clearSilenceTimer();
        };

        rec.onend = () => {
            recognitionRunningRef.current = false;

            // Keep the recognizer running if voice is enabled
            if (voiceEnabledRef.current && connectionStatus === "connected") {
                try {
                    if (!recognitionRunningRef.current) {
                        rec.start();
                    }
                } catch {
                    // ignore
                }
            }
        };

        recognitionRef.current = rec;

        // Auto-start listening once we're connected (wake mode)
        if (voiceEnabledRef.current && connectionStatus === "connected") {
            listeningRef.current = true;
            resetToWakeMode();
            try {
                rec.start();
            } catch {
                // ignore
            }
        }

        return () => {
            listeningRef.current = false;
            clearSilenceTimer();
            try {
                rec.onresult = null;
                rec.onerror = null;
                rec.onend = null;
                rec.onstart = null;
                rec.stop?.();
            } catch {
                // ignore
            }
            recognitionRef.current = null;
            recognitionRunningRef.current = false;
        };
        // IMPORTANT: we intentionally depend on connectionStatus + voiceEnabled so auto-start/auto-restart behaves correctly
    }, [handleSubmit, connectionStatus, voiceEnabled]);

    const startVoice = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec) return;

        try {
            setVoiceEnabled(true);
            voiceEnabledRef.current = true;

            // Always start in wake mode (listening for the wake word)
            voiceModeRef.current = "wake";
            setVoiceMode("wake");
            setIsListening(false);

            // Clear buffers
            wakeBufferRef.current = "";
            captureFinalRef.current = "";
            captureInterimRef.current = "";
            finalTranscriptRef.current = "";
            setVoicePreview("");

            if (!recognitionRunningRef.current) {
                rec.start?.();
            }
        } catch (e) {
            console.error("[voice] start failed", e);
            setIsListening(false);
        }
    }, []);

    const stopVoice = useCallback(() => {
        setVoiceEnabled(false);
        voiceEnabledRef.current = false;
        setVoiceMode("wake");
        voiceModeRef.current = "wake";
        listeningRef.current = false;
        setIsListening(false);

        if (silenceTimerRef.current) {
            window.clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        setVoicePreview("");
        finalTranscriptRef.current = "";
        wakeBufferRef.current = "";
        captureFinalRef.current = "";
        captureInterimRef.current = "";

        try {
            recognitionRef.current?.stop?.();
        } catch (e) {
            console.error("[voice] stop failed", e);
        }
    }, []);

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <style>{`
        .bass-vertical-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 88px;
        height: 18px;
        background: transparent;
        cursor: pointer;
        transform: rotate(-90deg);
        transform-origin: center;
        }

        .bass-vertical-slider::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.12);
        }

        .bass-vertical-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: linear-gradient(180deg, rgba(34,211,238,1) 0%, rgba(139,92,246,1) 100%);
        border: 2px solid rgba(255,255,255,0.65);
        box-shadow: 0 0 10px rgba(34, 211, 238, 0.45);
        margin-top: -6px;
        }

        .bass-vertical-slider::-moz-range-track {
        height: 6px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.12);
        }

        .bass-vertical-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: linear-gradient(180deg, rgba(34,211,238,1) 0%, rgba(139,92,246,1) 100%);
        border: 2px solid rgba(255,255,255,0.65);
        box-shadow: 0 0 10px rgba(34, 211, 238, 0.45);
        }

        .eq-placeholder-slider {
          width: 88px;
          height: 18px;
          transform: rotate(-90deg);
          transform-origin: center;
          opacity: 0.35;
          pointer-events: none;
          accent-color: rgba(255, 255, 255, 0.35);
        }

        .eq-placeholder-slider::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .eq-placeholder-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.45);
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: none;
          margin-top: -5px;
        }

        .eq-placeholder-slider::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .eq-placeholder-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.45);
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: none;
        }
      `}</style>
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-5 py-3 rounded-xl shadow-lg backdrop-blur-md text-sm font-medium animate-fade-in-down max-w-md text-center ${
                toast.type === "error"
                  ? "bg-red-500/90 text-white"
                  : toast.type === "success"
                    ? "bg-green-500/90 text-white"
                    : "bg-white/15 text-white border border-white/20"
              }`}
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* User account icon */}
      <button
        onClick={() => isAuthenticated && navigate('/account')}
        title={
          isAuthenticated
            ? `Signed in as ${user?.username}`
            : "Guest — sign in to access your account"
        }
        className={`absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isAuthenticated
            ? "bg-primary-600/30 border border-primary-500/50 hover:bg-primary-600/50 hover:shadow-neon-purple cursor-pointer"
            : "bg-white/5 border border-white/10 opacity-50 cursor-default"
        }`}
      >
        <UserCircle className="w-5 h-5 text-white/80" />
      </button>

      {/* Add Upload Button */}
      <button
        onClick={() => setShowUploadModal(true)}
        className="absolute top-4 right-4 z-20 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg"
      >
        <Upload className="w-v h-4" />
        Upload Song
      </button>
      {/* ← ADD UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute -top-12 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕ Close
            </button>
            <SongUpload
              token={token}
              onUploadComplete={(filename) => {
                console.log("Uploaded:", filename);
                setShowUploadModal(false);
                refreshLibrary();
              }}
            />
          </div>
        </div>
      )}
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl transition-all duration-1000 ${
            isPlaying
              ? "scale-150 opacity-40 animate-pulse"
              : "animate-pulse-slow"
          }`}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-600/20 rounded-full blur-3xl transition-all duration-1000 ${
            isPlaying
              ? "scale-150 opacity-40 animate-pulse"
              : "animate-pulse-slow animation-delay-1000"
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
        className={`max-w-screen-2xl w-full relative z-10 flex transition-all duration-700 ease-out ${
          isPlaying
            ? "h-[calc(100vh-2rem)] flex-col lg:flex-row items-stretch gap-6 py-8"
            : "flex-col justify-center space-y-8"
        }`}
      >
        {/* Left sidebar: Library */}
        {isPlaying && (
          <aside
            className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
              isLibraryCollapsed ? "w-10" : "w-[340px] xl:w-[360px]"
            }`}
          >
            <div
              className={`h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden ${isLibraryCollapsed ? "p-0" : "p-4"}`}
            >
              {isLibraryCollapsed ? (
                /* Collapsed: just the expand button */
                <button
                  type="button"
                  onClick={() => setIsLibraryCollapsed(false)}
                  className="w-full h-full flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
                  title="Expand library"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              ) : (
                /* Expanded: full panel */
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold tracking-widest text-gray-300">
                      LIBRARY
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={refreshLibrary}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {libraryLoading ? "Loading…" : "Refresh"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsLibraryCollapsed(true)}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        title="Collapse library"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {libraryError && (
                    <div className="text-xs text-red-300 mb-2 truncate">
                      {libraryError}
                    </div>
                  )}

                  <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-12rem)] pr-3 library-scroll">
                    {librarySongs.length === 0 && !libraryLoading ? (
                      <div className="text-sm text-gray-500">
                        No songs found.
                      </div>
                    ) : (
                      librarySongs.map((s: any, idx: number) => {
                        const title =
                          s?.title ??
                          s?.name ??
                          s?.song_name ??
                          s?.id ??
                          "Untitled";
                        const artist = s?.artist ?? "";
                        const bpm =
                          typeof s?.bpm === "number" ? Math.round(s.bpm) : null;
                        const key = s?.key ?? "";
                        const scale = s?.scale ?? "";

                        const prettyPrompt = artist
                          ? `play ${title} by ${artist}`
                          : `play ${title}`;

                        const keyStr =
                          `${key}${scale ? ` ${scale}` : ""}`.trim();

                        return (
                          <button
                            key={s?.id ?? `${title}::${artist}::${idx}`}
                            type="button"
                            disabled={
                              connectionStatus !== "connected" || loading
                            }
                            onClick={() => handleSubmit(prettyPrompt)}
                            className="w-full text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 transition-colors disabled:opacity-50"
                          >
                            <div className="text-sm text-white/90 font-medium truncate">
                              {title}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {artist}
                              {bpm ? ` • ${bpm} BPM` : ""}
                              {keyStr ? ` • ${keyStr}` : ""}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
        {/* Left column */}
        <div
          className={`flex-1 relative flex flex-col transition-all duration-700 ease-out ${
            isPlaying ? "justify-between" : "justify-center"
          }`}
        >
          {/* Welcome text - fades out when playing */}
          <div
            className={`text-center space-y-5 transition-all duration-500 ${
              isPlaying
                ? "opacity-0 scale-95 absolute pointer-events-none"
                : "opacity-100 scale-100"
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
                isPlaying ? "opacity-0" : "opacity-100"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              />
              <span className="text-gray-400">
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "connecting"
                    ? "Connecting..."
                    : "Disconnected"}
              </span>
            </div>

          </div>

          {/* Music mode content - fades in when playing */}
          <div
            className={`flex-1 flex flex-col items-center justify-center transition-all duration-500 ${
              isPlaying
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 absolute pointer-events-none"
            }`}
          >
            {/* Transition info at the very top - shows upcoming mix */}
            <div className="w-full max-w-md mb-6">
              <TransitionInfo
                transition={pendingTransition}
                isTransitioning={isTransitioning}
                isQuickTransitionPending={isQuickTransitionPending}
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

          {/* Prompt box / Controls - transitions to bottom when playing */}
          <div
            className={`w-full transition-all duration-700 ease-out ${
              isPlaying ? "mt-auto" : ""
            }`}
          >
            {/* Only show the toggle while in music mode */}
            {isPlaying && (
              <div className="w-full max-w-2xl mx-auto px-4 mb-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setInputMode((m) =>
                      m === "prompt" ? "controls" : "prompt",
                    )
                  }
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition"
                >
                  <span
                    className={
                      inputMode === "prompt" ? "text-white" : "text-white/50"
                    }
                  >
                    Prompt
                  </span>

                  <span className="relative inline-flex h-5 w-10 items-center rounded-full bg-white/10 border border-white/10">
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white/70 transition-transform ${
                        inputMode === "controls"
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </span>

                  <span
                    className={
                      inputMode === "controls" ? "text-white" : "text-white/50"
                    }
                  >
                    Controls
                  </span>
                </button>
              </div>
            )}

            {/* Prompt mode */}
            {(!isPlaying || inputMode === "prompt") && (
              <div className="w-full max-w-2xl mx-auto px-4">
                {isListening && voicePreview && (
                  <div className="mb-2 text-xs text-white/60 truncate flex items-center gap-2">
                    <MicVocal className="w-4 h-4" />
                    <span>{voicePreview}</span>
                  </div>
                )}

                {!speechSupported && (
                  <div className="mb-2 text-xs text-white/40">
                    Voice input isn’t supported in this browser (works best in
                    Chrome).
                  </div>
                )}

                <PromptBox
                  onSubmit={handleSubmit}
                  loading={loading}
                  disabled={connectionStatus !== "connected"}
                  rightAccessory={
                    <button
                      type="button"
                      onClick={() => (isListening ? stopVoice() : startVoice())}
                      disabled={
                        !speechSupported ||
                        connectionStatus !== "connected" ||
                        loading
                      }
                      className="rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 disabled:opacity-50 text-white p-2 transition-colors"
                      title={
                        speechSupported
                          ? isListening
                            ? "Stop voice input"
                            : "Start voice input"
                          : "Voice input not supported in this browser"
                      }
                      aria-label={
                        isListening ? "Stop voice input" : "Start voice input"
                      }
                    >
                      {isListening ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>
                  }
                />
              </div>
            )}

            {/* Controls mode */}
            {isPlaying && inputMode === "controls" && (
              <div className="w-full max-w-2xl mx-auto px-4">
                <div className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
                  {/* Play / Pause */}
                  <button
                    type="button"
                    disabled={connectionStatus !== "connected" || !isPlaying}
                    onClick={() => {
                      if (isPaused) {
                        audioService.resume();
                        setIsPaused(false);
                      } else {
                        audioService.pause();
                        setIsPaused(true);
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? (
                      <Play className="w-4 h-4 ml-0.5" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>

                  {/* Next (quick transition) */}
                  <button
                    type="button"
                    disabled={connectionStatus !== "connected" || !isPlaying}
                    onClick={() => handleSubmit("skip to next song")}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title="Skip to next song"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Volume slider */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        const newVol = volume > 0 ? 0 : 1;
                        setVolume(newVol);
                        audioService.setVolume(newVol);
                      }}
                      className="text-white/60 hover:text-white transition-colors shrink-0 cursor-pointer"
                      title={volume === 0 ? "Unmute" : "Mute"}
                    >
                      {volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        audioService.setVolume(v);
                      }}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {isPlaying && (
              <p className="text-center text-gray-500 text-sm mt-3 animate-fade-in">
                {pendingTransition
                  ? "Transition queued! Ask for another song to queue more"
                  : "Request another song to mix it in"}
              </p>
            )}
          </div>
        </div>

        {/* Right column: full queue */}
        {isPlaying && (
          <aside className="w-full lg:w-[360px] flex-shrink-0 flex flex-col">
            <div className="h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-4 flex flex-col">
              {/* Tab toggle */}
              <div className="flex mb-3 bg-black/20 rounded-lg p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("queue")}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-medium rounded-md transition-all cursor-pointer ${
                    rightPanelTab === "queue"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Queue
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("logs")}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-medium rounded-md transition-all cursor-pointer ${
                    rightPanelTab === "logs"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Logs
                </button>
              </div>

              {/* Queue view */}
              {rightPanelTab === "queue" && (
                <div className="flex-1 min-h-0 flex flex-col relative">
                  <div className="flex-1 min-h-0">
                    <QueuePanel
                      currentTrack={currentTrack}
                      previousTrack={previousTrack}
                      upNext={upNext}
                      onReorder={(newOrder) =>
                        audioService.sendReorderQueue(newOrder)
                      }
                      onRemove={(index) =>
                        audioService.sendRemoveFromQueue(index)
                      }
                    />
                  </div>

                  {/* EQ/Bass concept UI anchored bottom-right */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[270px] max-w-[calc(100%-2rem)]">
                    <div className="flex items-end justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-3 backdrop-blur-xl shadow-lg w-full max-w-full overflow-hidden">
                      <div className="flex flex-col items-center opacity-45 w-[56px]">
                        <div className="text-[9px] tracking-widest text-white/35 mb-2">
                          #
                        </div>
                        <div className="h-28 flex items-center justify-center overflow-hidden w-full">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value="72"
                            readOnly
                            tabIndex={-1}
                            className="eq-placeholder-slider"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="mt-2 text-[9px] text-white/25">--</div>
                      </div>

                      <div className="flex flex-col items-center opacity-45 w-[56px]">
                        <div className="text-[9px] tracking-widest text-white/35 mb-2">
                          #
                        </div>
                        <div className="h-28 flex items-center justify-center overflow-hidden w-full">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value="38"
                            readOnly
                            tabIndex={-1}
                            className="eq-placeholder-slider"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="mt-2 text-[9px] text-white/25">--</div>
                      </div>

                      <div className="flex flex-col items-center rounded-xl bg-white/5 px-2 py-2 w-[64px] shrink-0">
                        <div className="text-[9px] tracking-widest text-white/60 mb-2">
                          BASS
                        </div>

                        <div className="h-28 flex items-center justify-center overflow-hidden w-full">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={bassLevel}
                            onChange={(e) => {
                              const val = clamp(Number(e.target.value), 0, 100);
                              setBassLevel(val);
                              setBassInput(String(val));
                            }}
                            className="bass-vertical-slider"
                            aria-label="Bass control"
                            title="Bass control"
                          />
                        </div>

                        <div className="mt-2 text-[9px] text-white/50 tabular-nums">
                          {isEditingBass ? (
                            <input
                              type="number"
                              value={bassInput}
                              autoFocus
                              min={0}
                              max={100}
                              onChange={(e) => setBassInput(e.target.value)}
                              onBlur={() => {
                                const val = clamp(Number(bassInput) || 0, 0, 100);
                                setBassLevel(val);
                                setBassInput(String(val));
                                setIsEditingBass(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = clamp(Number(bassInput) || 0, 0, 100);
                                  setBassLevel(val);
                                  setBassInput(String(val));
                                  setIsEditingBass(false);
                                }
                              }}
                              className="w-10 bg-black/40 border border-white/10 rounded text-center text-white outline-none"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsEditingBass(true)}
                              className="hover:text-white transition"
                            >
                              {bassLevel}%
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Logs view */}
              {rightPanelTab === "logs" && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto library-scroll rounded-lg bg-black/30 border border-white/5 p-3 font-mono text-[11px] leading-relaxed text-white/60">
                    {backendLogs.length === 0 ? (
                      <p className="text-white/20 italic">No logs yet...</p>
                    ) : (
                      backendLogs.map((line, i) => (
                        <div
                          key={i}
                          className={`py-0.5 ${
                            line.includes("ERROR") || line.includes("Error")
                              ? "text-red-400"
                              : line.includes("[WS]")
                                ? "text-neon-cyan/70"
                                : line.includes("[QUEUE]")
                                  ? "text-neon-green/70"
                                  : line.includes("[TRANSITION]") ||
                                      line.includes("[DEBUG]")
                                    ? "text-neon-purple/70"
                                    : ""
                          }`}
                        >
                          {line}
                        </div>
                      ))
                    )}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
