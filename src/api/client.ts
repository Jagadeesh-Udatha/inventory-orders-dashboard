/**
 * A small fetch wrapper. Every non-2xx response from the API is an RFC 7807 problem document
 * with a stable `code`; it is turned into an ApiError so screens can react to the code
 * (e.g. INSUFFICIENT_STOCK) instead of parsing messages.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Network failures and 5xx are worth retrying; 4xx are the caller's problem and are not. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

interface Problem {
  title?: string;
  detail?: string;
  code?: string;
  errors?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.ok) {
    return (res.status === 204 ? undefined : await res.json()) as T;
  }
  const problem: Problem = await res.json().catch(() => ({}));
  throw new ApiError(
    res.status,
    problem.code ?? `HTTP_${res.status}`,
    problem.detail ?? problem.title ?? res.statusText,
    problem.errors ?? {},
  );
}

/** Builds a query string, leaving out empty values so the API applies its own defaults. */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}
