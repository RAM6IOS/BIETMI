import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMe } from './me';
import type { Me } from './me';
import { ApiError } from './http';

describe('fetchMe', () => {
  beforeEach(() => {
    localStorage.setItem('bietmi_token', 'jwt-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('requests /auth/me with the bearer token and returns the live profile', async () => {
    const me: Me = {
      id: 'u1',
      username: 'ali',
      fullName: 'Ali Ben',
      role: 'commercial',
      workspace: 'production',
      isActive: true,
      mustChangePassword: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => me,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchMe();

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe('/api/v1/auth/me');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer jwt-token',
    );
    expect(result).toEqual(me);
  });

  it('throws ApiError(401) when the session is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      }),
    );

    await expect(fetchMe()).rejects.toBeInstanceOf(ApiError);
  });
});