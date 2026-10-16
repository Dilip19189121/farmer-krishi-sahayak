/**
 * Central API client for the Krishi Sahayak backend (FastAPI).
 * Contract reference: backend/docs/api_contract.md
 * Base URL comes from VITE_API_BASE (see frontend/.env).
 */

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '') ||
  'http://127.0.0.1:8000';

// ---------------------------------------------------------------------------
// Types (mirrors of the backend response shapes)
// ---------------------------------------------------------------------------

export interface ChatSource {
  kind: string;
  source: string;
  page: number | null;
  distance?: number;
}

export interface ChatResponse {
  answer: string;
  provider: string;
  sources: ChatSource[];
  cached: boolean;
  sources_count: number | null;
}

export interface VoiceChatResponse extends ChatResponse {
  transcribed_text: string;
  detected_language: string; // 'te' | 'hi' | 'en' | 'und'
  /** Optional TTS audio returned by the backend (if present, play it). */
  audio_url?: string;
  audio?: string;
}

export interface ApiScheme {
  name: string;
  description: string;
  source_url: string | null;
  chunk_count: number;
  source_files: string[];
}

export interface SchemesResponse {
  schemes: ApiScheme[];
  total_knowledge_chunks: number;
}

export interface PriceRecord {
  commodity: string;
  group: string | null;
  market: string | null;
  msp: number | null;
  date: string;
  price: number | null;
  arrival: number | null;
}

export interface PricesResponse {
  report: {
    source_file: string;
    unit: string;
    dates: string[];
    market_scope: string;
  };
  count: number;
  records: PriceRecord[];
}

export interface GrievanceCreate {
  problem: string;
  name?: string | null;
  village?: string | null;
  phone?: string | null;
}

export interface GrievanceCreated {
  grievance_id: string;
  status: string;
}

export interface GrievanceOut {
  grievance_id: string;
  name: string | null;
  village: string | null;
  phone: string | null;
  problem: string;
  status: 'new' | 'seen' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface OfficerLoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
}

export interface HardwareStatus {
  status: string;
  state: string;
  gpio_available: boolean;
  camera_on: boolean;
  session_state: string; // FSM state | 'inactive'
  session_start: string | null;
  remaining_seconds: number | null;
  session_timeout_minutes?: number;
  detected_language?: string | null;
  turns_answered?: number;
  cooldown_left?: number;
  last_reason?: string | null;
  last_error?: string | null;
}

export interface HardwareTriggerResponse {
  status: string;
  state: string;
  session_state: string;
  cooldown_left: number;
  [key: string]: unknown;
}

export interface PresenceStatusResponse {
  status: string;
  faces?: number;
  streak?: number;
  present?: boolean;
  fired?: boolean;
  cooldown_left?: number;
  message?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Session token (officer Bearer auth)
// ---------------------------------------------------------------------------

let officerToken: string | null = null;
try {
  officerToken = window.sessionStorage.getItem('krishiOfficerToken');
} catch {
  officerToken = null;
}

export const setOfficerToken = (token: string | null) => {
  officerToken = token;
  try {
    if (token) window.sessionStorage.setItem('krishiOfficerToken', token);
    else window.sessionStorage.removeItem('krishiOfficerToken');
  } catch {
    // storage unavailable — token stays in memory only
  }
};

export const getOfficerToken = () => officerToken;

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
        ? detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join('; ')
        : JSON.stringify(detail)
    );
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail: unknown = `HTTP ${res.status}`;
    try {
      detail = await res.json();
      if (detail && typeof detail === 'object' && 'detail' in detail) {
        detail = (detail as { detail: unknown }).detail;
      }
    } catch {
      // keep HTTP status fallback
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
};

const get = <T>(path: string) =>
  request<T>(path, { method: 'GET', headers: { Accept: 'application/json' } });

const jsonRequest = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(officerToken ? { Authorization: `Bearer ${officerToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** GET / — health check. */
export const getHealth = () => get<{ status: string }>('/');

/** POST /chat — text query (session_id enables memory + cache). */
export const postChat = (query: string, sessionId?: string | null) =>
  jsonRequest<ChatResponse>('POST', '/chat', {
    query,
    session_id: sessionId ?? null,
  });

/** POST /chat/voice — audio clip (multipart/form-data, field "file"). */
export const postChatVoice = (
  file: Blob,
  filename: string,
  sessionId?: string | null
) => {
  const form = new FormData();
  form.append('file', file, filename);
  if (sessionId) form.append('session_id', sessionId);
  const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  return request<VoiceChatResponse>(`/chat/voice${qs}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });
};

/** GET /schemes — scheme summaries from the knowledge base. */
export const getSchemes = () => get<SchemesResponse>('/schemes');

/** GET /prices — market price records. */
export const getPrices = () => get<PricesResponse>('/prices');

/** POST /officer/login — issue a Bearer token. */
export const officerLogin = (username: string, password: string) =>
  jsonRequest<OfficerLoginResponse>('POST', '/officer/login', { username, password });

/** POST /grievance — file a new grievance. */
export const createGrievance = (payload: GrievanceCreate) =>
  jsonRequest<GrievanceCreated>('POST', '/grievance', payload);

/** GET /grievance/{grievance_id} — fetch one grievance. */
export const getGrievance = (grievanceId: string) =>
  get<GrievanceOut>(`/grievance/${encodeURIComponent(grievanceId)}`);

/** GET /grievance/officer/list — all grievances (Bearer required).
 * Shape observed live: { count, grievances: [...] } (older/contract shape was a bare array).
 */
export const listGrievances = async () => {
  const data = await jsonRequest<GrievanceOut[] | { count: number; grievances: GrievanceOut[] }>(
    'GET',
    '/grievance/officer/list'
  );
  if (Array.isArray(data)) return data;
  return data.grievances ?? [];
};

/** PATCH /grievance/{grievance_id}/status — update status (Bearer required). */
export const updateGrievanceStatus = (
  grievanceId: string,
  status: GrievanceOut['status']
) => jsonRequest<GrievanceOut>('PATCH', `/grievance/${encodeURIComponent(grievanceId)}/status`, { status });

/** GET /hardware/status — kiosk FSM state + remaining session seconds. */
export const getHardwareStatus = () => get<HardwareStatus>('/hardware/status');

/** POST /hardware/trigger — manual stand-in for the ultrasonic sensor.
 * force=true is the laptop demo default (no sensor to confirm a presence).
 */
export const hardwareTrigger = (force = true) =>
  request<HardwareTriggerResponse>(`/hardware/trigger?force=${force}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });

/** POST /presence/start — start the presence watchdog. */
export const presenceStart = (cameraIndex = 0) =>
  request<{ status: string }>(`/presence/start?camera_index=${cameraIndex}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });

/** GET /presence/status — watchdog state. */
export const getPresenceStatus = () =>
  get<PresenceStatusResponse>('/presence/status');

/** POST /presence/stop — stop the watchdog. */
export const presenceStop = () =>
  request<{ status: string }>('/presence/stop', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
