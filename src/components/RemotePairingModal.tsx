import { memo, useMemo, useState } from "react";
import { Check, Copy, QrCode, Smartphone, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  pairingUrl: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  onClose: () => void;
};

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return null;

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function RemotePairingModal({
  isOpen,
  pairingUrl,
  expiresAt,
  isLoading,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  const qrImageUrl = useMemo(() => {
    if (!pairingUrl) return null;

    return `https://quickchart.io/qr?size=280&text=${encodeURIComponent(
      pairingUrl,
    )}`;
  }, [pairingUrl]);

  const isLocalhost = useMemo(() => {
    if (!pairingUrl) return false;

    try {
      const url = new URL(pairingUrl);
      return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    } catch {
      return false;
    }
  }, [pairingUrl]);

  const handleCopy = async () => {
    if (!pairingUrl) return;

    try {
      await copyText(pairingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy pairing link", error);
    }
  };

  if (!isOpen) return null;

  const expiryLabel = formatExpiry(expiresAt);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0d0619]/95 p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close remote pairing modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary-600/15 p-3 text-primary-200">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Remote Control
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Scan to Control</h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/65">
          Open this link on your phone to control the desktop DJ with text or
          voice prompts.
        </p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          {isLoading ? (
            <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-black/20 text-center text-white/50">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              <p className="text-sm">Generating a secure pairing link…</p>
            </div>
          ) : pairingUrl && qrImageUrl ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="QR code for the mobile remote control link"
                  className="mx-auto h-64 w-64 rounded-xl"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/40">
                  <Smartphone className="h-3.5 w-3.5" />
                  Pairing Link
                </p>
                <p className="break-all text-sm leading-6 text-white/75">
                  {pairingUrl}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-500"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-center text-sm text-white/45">
              The pairing link couldn’t be generated.
            </div>
          )}
        </div>

        {expiryLabel && (
          <p className="mt-4 text-xs text-white/45">
            Pairing link expires {expiryLabel}.
          </p>
        )}

        {isLocalhost && (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100/85">
            This link points to `localhost`, so a phone won’t be able to reach
            it. Use your LAN IP or deployed domain when testing the remote on a
            real device.
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(RemotePairingModal);
