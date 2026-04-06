import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, MicOff, Pause, Play, SkipForward } from "lucide-react";
import PromptBox from "../components/PromptBox";
import {
  fetchRemoteSession,
  sendRemoteCommand,
  type RemoteSessionState,
  type RemoteTrack,
} from "../services/remoteControl";

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  0?: {
    transcript?: string;
  };
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = {
  error?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };

function getSpeechRecognitionCtor() {
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatTrack(track: RemoteTrack | null | undefined) {
  if (!track?.title) return "Nothing playing";

  return track.artist ? `${track.title} - ${track.artist}` : track.title;
}

function formatPosition(seconds: number | undefined) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RemoteControl() {
  const [searchParams] = useSearchParams();
  const pairToken = searchParams.get("pair") ?? "";
  const [sessionState, setSessionState] = useState<RemoteSessionState | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voicePreview, setVoicePreview] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const submittingRef = useRef(false);

  const speechSupported = useMemo(() => {
    return !!getSpeechRecognitionCtor();
  }, []);

  const refreshState = useCallback(async () => {
    if (!pairToken) {
      setError("Missing pairing token.");
      setLoading(false);
      return;
    }

    try {
      const nextState = await fetchRemoteSession(pairToken);
      setSessionState(nextState);
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to connect to the desktop DJ."));
    } finally {
      setLoading(false);
    }
  }, [pairToken]);

  useEffect(() => {
    refreshState();

    const interval = window.setInterval(refreshState, 1500);
    return () => window.clearInterval(interval);
  }, [refreshState]);

  const submitCommand = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!pairToken || submittingRef.current) return;

      submittingRef.current = true;
      setSubmitting(true);

      try {
        const response = await sendRemoteCommand(pairToken, payload);
        setSessionState(response.state);

        const nextError = response.messages.find((msg) => msg.type === "error");
        setError(
          nextError?.message
            ? String(nextError.message)
            : null,
        );
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Command failed."));
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [pairToken],
  );

  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      await submitCommand({ type: "prompt", data: prompt });
      setVoicePreview("");
    },
    [submitCommand],
  );

  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      finalTranscript = "";
      setVoicePreview("");
      setIsListening(true);
    };

    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = (event.results[i]?.[0]?.transcript ?? "").trim();
        if (!chunk) continue;

        if (event.results[i].isFinal) {
          finalTranscript = `${finalTranscript} ${chunk}`.trim();
        } else {
          interim = `${interim} ${chunk}`.trim();
        }
      }

      setVoicePreview(`${finalTranscript} ${interim}`.trim());
    };

    recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
      console.error("[remote-voice] recognition error", event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const prompt = finalTranscript.trim();
      if (prompt) {
        void handlePromptSubmit(prompt);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {
        // Ignore shutdown errors.
      }
      recognitionRef.current = null;
    };
  }, [handlePromptSubmit, speechSupported]);

  const toggleVoice = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      if (isListening) {
        recognition.stop();
      } else {
        setError(null);
        recognition.start();
      }
    } catch (err) {
      console.error("[remote-voice] start failed", err);
      setIsListening(false);
    }
  };

  const currentTrack = sessionState?.queue_status.current_track ?? null;
  const upcoming = sessionState?.queue_status.queue ?? [];
  const pendingTransition = sessionState?.queue_status.pending_transition;
  const isPaused = sessionState?.queue_status.state === "paused";
  const isPlaying =
    sessionState?.queue_status.state === "playing" ||
    sessionState?.queue_status.state === "transitioning" ||
    sessionState?.queue_status.state === "paused";

  return (
    <div className="min-h-screen bg-gradient-dark px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
            Mobile Remote
          </p>
          <h1 className="mt-2 text-3xl font-semibold">AI DJ Control</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Send prompts from your phone while the desktop keeps the audio
            running.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              Now Playing
            </p>
            <p className="mt-2 text-lg font-medium text-white">
              {formatTrack(currentTrack)}
            </p>
            <p className="mt-1 text-sm text-white/45">
              Position {formatPosition(sessionState?.queue_status.current_position)}
            </p>

            {pendingTransition && (
              <p className="mt-3 rounded-xl border border-primary-500/20 bg-primary-500/10 px-3 py-2 text-sm text-primary-100">
                Mixing into {pendingTransition.song_b} soon.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void submitCommand({ type: isPaused ? "resume" : "pause" })
              }
              disabled={!sessionState?.host_connected || submitting || !isPlaying}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPaused ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void submitCommand({ type: "quick_transition" })}
              disabled={!sessionState?.host_connected || submitting || !isPlaying}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Status
              </p>
              <p className="mt-1 truncate text-sm text-white/75">
                {sessionState?.host_connected
                  ? isPaused
                    ? "Paused"
                    : isPlaying
                      ? "Live"
                      : "Ready"
                  : "Desktop unavailable"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
          {voicePreview && (
            <div className="mb-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              {voicePreview}
            </div>
          )}

          {!speechSupported && (
            <p className="mb-3 text-sm text-white/40">
              Voice input works best in Chrome on mobile.
            </p>
          )}

          <PromptBox
            onSubmit={handlePromptSubmit}
            loading={submitting}
            disabled={!sessionState?.host_connected}
            rightAccessory={
              <button
                type="button"
                onClick={toggleVoice}
                disabled={!speechSupported || submitting || !sessionState?.host_connected}
                className="rounded-xl border border-white/10 bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                title={isListening ? "Stop voice input" : "Start voice input"}
              >
                {isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            }
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
            Up Next
          </p>

          {upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">Queue is empty.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {upcoming.map((track, index) => (
                <div
                  key={`${track.title ?? "track"}-${track.artist ?? "artist"}-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <p className="text-sm font-medium text-white">
                    {track.title ?? "Unknown track"}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {track.artist ?? "Unknown artist"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <p className="text-center text-sm text-white/40">
            Connecting to the desktop DJ…
          </p>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
