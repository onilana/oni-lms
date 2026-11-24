import { normalizeAnswerSnapshot } from '../types/exam';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

function normalizeAttemptAnswerSnapshots(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeAttemptAnswerSnapshots);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (key === 'answers_snapshot') {
      normalized[key] = normalizeAnswerSnapshot(item);
    } else {
      normalized[key] = normalizeAttemptAnswerSnapshots(item);
    }
  }
  return normalized;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('oni_lms_token');

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data?.errors);
  }

  return normalizeAttemptAnswerSnapshots(data) as T;
}

export async function apiDownload(endpoint: string, filename: string): Promise<void> {
  const token = localStorage.getItem('oni_lms_token');
  const headers = new Headers({ Accept: 'application/octet-stream' });
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      data?.message ?? `Request failed with status ${response.status}`,
      data?.errors
    );
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename.replace(/[\\/:*?"<>|]/g, '_') || 'attachment';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
