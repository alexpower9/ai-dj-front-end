import type { TransitionInfo } from "./audioStream";

export type RemoteTrack = {
  title?: string | null;
  artist?: string | null;
  is_auto_queued?: boolean;
};

export type RemoteQueueStatus = {
  state: "stopped" | "playing" | "paused" | "transitioning";
  current_track: RemoteTrack | null;
  current_position: number;
  pending_transition: TransitionInfo | null;
  queue_length: number;
  queue: RemoteTrack[];
  auto_play_enabled: boolean;
  transition_mode: "dynamic" | "classic" | string;
  recently_played: string[];
};

export type RemoteSessionState = {
  room_id: string;
  host_connected: boolean;
  pair_expires_at: string;
  queue_status: RemoteQueueStatus;
  current_track: RemoteTrack | null;
  queue: RemoteTrack[];
  upcoming: RemoteTrack[];
};

export type RemoteCommandMessage = {
  type: string;
  message?: string;
  [key: string]: unknown;
};

export type RemoteCommandResponse = {
  ok: boolean;
  messages: RemoteCommandMessage[];
  state: RemoteSessionState;
};

const BASE = "/api/remote";

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;

    try {
      const data = await res.json();
      detail = data?.detail ?? data?.message ?? detail;
    } catch {
      // Ignore JSON parse failures and keep the fallback message.
    }

    throw new Error(detail);
  }

  return res.json();
}

export async function fetchRemoteSession(
  pairToken: string,
): Promise<RemoteSessionState> {
  const res = await fetch(
    `${BASE}/session?pair=${encodeURIComponent(pairToken)}`,
  );

  return readJson<RemoteSessionState>(res);
}

export async function sendRemoteCommand(
  pairToken: string,
  payload: Record<string, unknown>,
): Promise<RemoteCommandResponse> {
  const res = await fetch(
    `${BASE}/commands?pair=${encodeURIComponent(pairToken)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return readJson<RemoteCommandResponse>(res);
}
