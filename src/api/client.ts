import { randomUUID } from 'expo-crypto';

import { API_URL } from '@/auth/config';
import { getAccessToken } from '@/auth/session';

/** Error body returned by the backend's GlobalExceptionHandler. */
export type ApiErrorBody = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string> | null;
  requestId?: string | null;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
  get fieldErrors(): Record<string, string> {
    return this.body.fieldErrors ?? {};
  }
}

/** Every successful response is wrapped as { data, timestamp }. */
type Envelope<T> = { data: T; timestamp: string };

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /**
   * Sent as Idempotency-Key on mutations so a retry after a dropped connection
   * is not applied twice. Generate once per user action and reuse on retry.
   */
  idempotencyKey?: string;
};

export const newIdempotencyKey = () => randomUUID();

const passwordChangeListeners = new Set<() => void>();

export function onPasswordChangeRequired(listener: () => void) {
  passwordChangeListeners.add(listener);
  return () => {
    passwordChangeListeners.delete(listener);
  };
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = `${API_URL}${path}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

async function send(method: Method, path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['Idempotency-Key'] = opts.idempotencyKey ?? newIdempotencyKey();
  return fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

async function toError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody = { code: `HTTP_${res.status}`, message: `Request failed (${res.status})` };
  try {
    const json = (await res.json()) as Partial<ApiErrorBody>;
    if (json && typeof json.message === 'string') body = { ...body, ...json } as ApiErrorBody;
  } catch {}
  return new ApiError(res.status, body);
}

/**
 * Calls the API with the current access token, refreshing it once on 401.
 * Decimal amounts arrive as strings (e.g. "905.50"); keep them as strings
 * and format them for display rather than converting to floating point.
 */
export async function api<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(method, path, opts, await getAccessToken());
  if (res.status === 401) {
    const fresh = await getAccessToken({ forceRefresh: true });
    if (fresh) res = await send(method, path, opts, fresh);
  }
  if (!res.ok) {
    const error = await toError(res);
    if (error.body.code === 'PASSWORD_CHANGE_REQUIRED') passwordChangeListeners.forEach((l) => l());
    throw error;
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as Envelope<T>;
  return json.data;
}

/** A message suitable for showing to the user. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof TypeError) return 'Cannot reach the server. Check your connection.';
  return 'Something went wrong. Please try again.';
}

/**
 * The backend stores the response for each Idempotency-Key, including 4xx
 * errors. Keep the key while retrying after a network failure (so the action
 * is applied once), but take a new one after the server answered, so a
 * corrected request isn't answered with the stored error.
 */
export function nextKeyAfter(error: unknown, key: string): string {
  return error instanceof ApiError ? newIdempotencyKey() : key;
}
