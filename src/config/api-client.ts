import { ApiErrorSchema } from '@/schemas';
import { z, type ZodType } from 'zod';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Readonly<Record<string, string>>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/u, '') ?? '';
const REQUEST_TIMEOUT_MS = 20_000;

const BetterAuthErrorSchema = z.object({
  code: z.string().min(1).max(80),
  message: z.string().min(1).max(240),
});

function errorFromBody(status: number, body: unknown, fallback: string): ApiError {
  const appError = ApiErrorSchema.safeParse(body);
  if (appError.success) {
    return new ApiError(
      status,
      appError.data.error.code,
      appError.data.error.message,
      appError.data.error.fields ?? {},
    );
  }
  const authError = BetterAuthErrorSchema.safeParse(body);
  if (authError.success) {
    return new ApiError(status, authError.data.code, authError.data.message);
  }
  return new ApiError(status, 'REQUEST_FAILED', fallback);
}

function apiUrl(path: string): string {
  return `${backendUrl}${path}`;
}

async function responseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  return response.json() as Promise<unknown>;
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(0, 'REQUEST_TIMEOUT', 'Server terlalu lama merespons. Coba lagi.');
    }
    throw error;
  }
}

function jsonHeaders(csrfToken: string, custom?: HeadersInit): Headers {
  const headers = new Headers(custom);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', csrfToken);
  return headers;
}

async function request<T>(path: string, schema: ZodType<T>, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const response = await fetchWithTimeout(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  });
  const body = await responseJson(response);

  if (!response.ok) {
    throw errorFromBody(response.status, body, 'Permintaan tidak dapat diproses. Coba lagi.');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(502, 'INVALID_RESPONSE', 'Data dari server tidak dapat dibaca dengan aman.');
  }
  return parsed.data;
}

export function requestBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Data permintaan belum valid. Periksa isian lalu coba lagi.',
    );
  }
  return parsed.data;
}

export function apiGet<T>(path: string, schema: ZodType<T>, init: RequestInit = {}): Promise<T> {
  return request(path, schema, init);
}

export function apiPostPublic<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> {
  return request(path, schema, {
    method: 'POST',
    headers: jsonHeaders(''),
    body: JSON.stringify(body),
  });
}

export function apiPost<T>(
  path: string,
  body: unknown,
  schema: ZodType<T>,
  csrfToken: string,
  headers: HeadersInit = {},
): Promise<T> {
  return request(path, schema, {
    method: 'POST',
    headers: jsonHeaders(csrfToken, headers),
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  schema: ZodType<T>,
  csrfToken: string,
): Promise<T> {
  return request(path, schema, {
    method: 'PATCH',
    headers: jsonHeaders(csrfToken),
    body: JSON.stringify(body),
  });
}

export async function apiPostWithoutResponse(
  path: string,
  body: unknown,
  headers: HeadersInit = {},
): Promise<void> {
  const response = await fetchWithTimeout(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const body = await responseJson(response);
    throw errorFromBody(response.status, body, 'Permintaan tidak dapat diproses.');
  }
}

export function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Terjadi gangguan. Coba lagi.';
}
