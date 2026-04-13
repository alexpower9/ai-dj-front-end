import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

type DJHelpButtonProps = {
  title?: string;
  tips?: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const defaultTips = [
  "LOGIN: Create an account or sign in to save setlists, upload your own songs, and control your personal library. You can still explore the DJ as a guest, but saved features are tied to your account.",
  "LIBRARY: Browse the available songs in the system library. Logged-in users can also upload personal tracks and use them in requests, queues, and setlists.",
  "REQUESTS: Ask for songs in natural language, such as 'Play Wake Me Up by Avicii', 'Queue Stargazing', or 'Give me a chill late-night mix'. The AI DJ will try to match the request and keep the queue moving.",
  "VOICE CONTROL: Use your voice to control the DJ. Say 'Hey Tempo' followed by your request to interact hands-free.",
  "QUEUE: The queue shows what is playing now and what is coming next. You can add songs, remove songs, and reorder upcoming tracks to shape the flow of the mix.",
  "AUTOPLAY: After you request or queue music, the DJ can keep the session going by automatically adding similar songs so playback does not stop between requests.",
  "MIXING: The app blends songs together instead of stopping abruptly. Use dynamic mode for smarter, model-driven transitions, or classic mode for a more standard crossfade.",
  "QUICK TRANSITION: Press the skip button once to jump to a sooner transition, and press the skip button twice to transition immidiately.",
  "SETLISTS: Logged-in users can build and save setlists for planned sessions. You can load a setlist into the DJ and let the system queue the songs in order.",
  "REMOTE CONTROL: You can pair a remote session to control playback, queue actions, and transitions from another device while the main DJ session stays on the host machine.",
  "UPLOADS: When you upload a song, the system processes its features and segments so it can be searched, queued, and mixed with the rest of the library.",
  "TROUBLESHOOTING: If a song is not found, try a simpler title or include the artist name. If controls are unavailable, check that your session is connected and, for saved features, that you are logged in.",
];

export default function DJHelpButton({
  title = "Quick Help",
  tips = defaultTips,
  isOpen,
  onOpenChange,
}: DJHelpButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved =
      typeof next === "function"
        ? (next as (prev: boolean) => boolean)(open)
        : next;
    if (onOpenChange) {
      onOpenChange(resolved);
      return;
    }
    setInternalOpen(resolved);
  };
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <style>{`
        .help-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.65) rgba(255, 255, 255, 0.08);
        }

        .help-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .help-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
        }

        .help-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(139, 92, 246, 0.85),
            rgba(45, 212, 191, 0.8),
            rgba(59, 130, 246, 0.85)
          );
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }

        .help-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(167, 139, 250, 0.95),
            rgba(94, 234, 212, 0.95),
            rgba(96, 165, 250, 0.95)
          );
        }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={title}
        aria-label="Open help"
        aria-expanded={open}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-white/85"
      >
        <CircleHelp className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute top-12 left-0 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/20 bg-black/35 backdrop-blur-md shadow-2xl p-4 pt-3 text-sm text-white/85">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close help"
            className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors"
          >
            ×
          </button>

          <h3 className="text-xs tracking-widest text-white/60 uppercase mb-2">
            Quick Help
          </h3>
          <ul className="help-scroll max-h-64 overflow-y-auto pr-2 space-y-1.5 list-disc pl-4 text-white/80">
            {tips.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
