const API_BASE = 'http://localhost:3000/api/v1';

/**
 * Public auth API — no Bearer token required.
 * These endpoints are called from unauthenticated pages.
 */

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : `Request failed (${response.status})`;
    const error: Error & { errorCode?: string } = new Error(message);
    error.errorCode = typeof data?.errorCode === 'string' ? data.errorCode : undefined;
    throw error;
  }

  return data as T;
}

/** Initiates password reset. Always returns a generic message (anti-enumeration). */
export function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return publicPost<ForgotPasswordResponse>('/auth/forgot-password', { email });
}

/** Completes password reset with a raw token from the email link. */
export function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  return publicPost<ResetPasswordResponse>('/auth/reset-password', {
    token,
    newPassword,
  });
}
