/**
 * Client-side fetch wrapper for our own /api routes. Use it as the queryFn / mutationFn body in
 * React Query hooks so errors are uniform and retry rules in QueryProvider can read the status.
 */

/** Non-2xx response from an /api route. `status` is the HTTP status (401, 404, 500...). */
export class ApiError extends Error {
  readonly status: number;
  /** Parsed JSON body when the server sent one. */
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  /** Plain objects are sent as JSON with the matching Content-Type; strings, FormData and Blobs pass through. */
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  /** Query string params; undefined, null and '' values are skipped. */
  params?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Fetches `url`, throws ApiError on any non-2xx (401 included), returns parsed JSON as T.
 * 204 and empty bodies resolve to undefined.
 */
export async function apiFetch<T>(url: string, init: ApiFetchInit = {}): Promise<T> {
  const { params, body, headers, ...rest } = init;
  const requestUrl = withParams(url, params);
  const requestHeaders = new Headers(headers);
  const requestBody = serializeBody(body, requestHeaders);

  const response = await fetch(requestUrl, { ...rest, headers: requestHeaders, body: requestBody });
  const payload = await readJson(response);

  if (!response.ok) {
    const message = errorMessage(payload, response);
    throw new ApiError(response.status, message, payload);
  }
  return payload as T;
}

/** True when `error` is an ApiError with one of the given statuses. */
export function isApiError(error: unknown, ...statuses: number[]): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  return statuses.length === 0 || statuses.includes(error.status);
}

function withParams(url: string, params: ApiFetchInit['params']): string {
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  if (!query) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${query}`;
}

function serializeBody(body: ApiFetchInit['body'], headers: Headers): BodyInit | null | undefined {
  if (body === undefined || body === null) return body;
  const isPlainJson = Array.isArray(body) || Object.getPrototypeOf(body) === Object.prototype;
  if (!isPlainJson) return body as BodyInit;
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return JSON.stringify(body);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(payload: unknown, response: Response): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return response.statusText || `Request failed with status ${response.status}`;
}
