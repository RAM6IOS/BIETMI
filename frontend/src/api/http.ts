import { API_BASE } from './config';

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export function getAuthToken(): string {
  const stored = localStorage.getItem('bietmi_token');
  if (!stored) {
    throw new ApiError(401, 'Unauthorized');
  }
  return stored;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getAuthToken();
  const url = new URL(API_BASE + path, window.location.origin);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let errorCode: string | undefined;
    try {
      const data = await response.json();
      if (typeof data?.errorCode === 'string') errorCode = data.errorCode;
      if (typeof data?.message === 'string') message = data.message;
      else if (data?.message) message = JSON.stringify(data.message);
    } catch {
      // ignore parse errors, keep default message
    }
    throw new ApiError(response.status, message, errorCode);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
