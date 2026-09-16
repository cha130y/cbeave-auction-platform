import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAccessToken } from './access-token.store';
import { apiBaseUrl, apiRequest, refreshAccessToken } from './api-client';
import { ApiError } from './api-error';

const fetchMock = vi.fn();

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const emptyResponse = (status: number): Response =>
  new Response(null, { status });

const requestInitOf = (callIndex: number): RequestInit =>
  fetchMock.mock.calls[callIndex][1] as RequestInit;

const headersOf = (callIndex: number): Headers =>
  new Headers(requestInitOf(callIndex).headers);

const urlOf = (callIndex: number): string =>
  fetchMock.mock.calls[callIndex][0] as string;

const isRefreshCall = ([url]: unknown[]): boolean =>
  (url as string).endsWith('/auth/refresh');

const refreshCallCount = (): number =>
  fetchMock.mock.calls.filter(isRefreshCall).length;

const protectedCallCount = (): number =>
  fetchMock.mock.calls.filter((call) => !isRefreshCall(call)).length;

/** Resolves once `count()` reaches `expected`, or throws after a second. */
const waitForCallCount = async (
  count: () => number,
  expected: number,
): Promise<void> => {
  const deadline = Date.now() + 1000;

  while (count() < expected) {
    if (Date.now() > deadline) {
      throw new Error(`Expected ${expected} calls, saw ${count()}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

describe('apiRequest', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  describe('request shape', () => {
    it('joins the base URL with the path without doubling the slash', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('/auctions');

      expect(urlOf(0)).toBe(`${apiBaseUrl}/auctions`);
    });

    it('accepts a path without a leading slash', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('auctions');

      expect(urlOf(0)).toBe(`${apiBaseUrl}/auctions`);
    });

    it('always sends cookies and skips the cache by default', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('/auctions');

      expect(requestInitOf(0).credentials).toBe('include');
      expect(requestInitOf(0).cache).toBe('no-store');
    });

    it('lets the caller override the cache mode', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('/auctions', { cache: 'force-cache' });

      expect(requestInitOf(0).cache).toBe('force-cache');
    });

    it('declares JSON for a body the caller serialized', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('/auctions', {
        method: 'POST',
        body: JSON.stringify({ title: 'Watch' }),
      });

      expect(headersOf(0).get('Content-Type')).toBe('application/json');
    });

    it('leaves FormData to set its own multipart boundary', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      const body = new FormData();
      body.append('image', new Blob(['bytes']), 'watch.jpg');

      await apiRequest('/auctions/1/images', { method: 'POST', body });

      expect(headersOf(0).has('Content-Type')).toBe(false);
    });

    it('attaches the stored access token', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
      setAccessToken('stored-token');

      await apiRequest('/users/me');

      expect(headersOf(0).get('Authorization')).toBe('Bearer stored-token');
    });

    it('sends no Authorization header while signed out', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('/auctions');

      expect(headersOf(0).has('Authorization')).toBe(false);
    });

    it('keeps an Authorization header the caller set', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
      setAccessToken('stored-token');

      await apiRequest('/users/me', {
        headers: { Authorization: 'Bearer caller-token' },
      });

      expect(headersOf(0).get('Authorization')).toBe('Bearer caller-token');
    });
  });

  describe('responses', () => {
    it('returns the parsed body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [1, 2] }));

      await expect(apiRequest('/auctions')).resolves.toEqual({
        items: [1, 2],
      });
    });

    it('returns undefined for an empty 204', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204));

      await expect(apiRequest('/watchlist/1')).resolves.toBeUndefined();
    });

    it('throws an ApiError carrying the status and API message', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 409, message: 'Auction is not active', error: 'Conflict' },
          409,
        ),
      );

      await expect(apiRequest('/auctions/1/bids')).rejects.toMatchObject({
        name: 'ApiError',
        status: 409,
        message: 'Auction is not active',
        code: 'Conflict',
      });
    });
  });

  describe('unauthorized retry', () => {
    it('refreshes once and replays the request with the new token', async () => {
      fetchMock
        .mockResolvedValueOnce(emptyResponse(401))
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'me' }));

      await expect(apiRequest('/users/me')).resolves.toEqual({ id: 'me' });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(urlOf(1)).toBe(`${apiBaseUrl}/auth/refresh`);
      expect(headersOf(2).get('Authorization')).toBe('Bearer fresh-token');
    });

    it('retries only once, so a still-401 reply surfaces', async () => {
      fetchMock
        .mockResolvedValueOnce(emptyResponse(401))
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token' }))
        .mockResolvedValueOnce(emptyResponse(401));

      await expect(apiRequest('/users/me')).rejects.toMatchObject({
        status: 401,
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('keeps the original 401 when the refresh itself fails', async () => {
      fetchMock
        .mockResolvedValueOnce(emptyResponse(401))
        .mockResolvedValueOnce(
          jsonResponse({ message: 'Refresh token is invalid' }, 401),
        );

      await expect(apiRequest('/users/me')).rejects.toMatchObject({
        status: 401,
      });

      // The failed refresh clears the stale token rather than leaving it set.
      expect(headersOf(0).has('Authorization')).toBe(false);
    });

    it('does not refresh when the caller opted out', async () => {
      fetchMock.mockResolvedValueOnce(emptyResponse(401));

      await expect(
        apiRequest('/auth/me', { retryUnauthorized: false }),
      ).rejects.toMatchObject({ status: 401 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects a refresh response without a usable token', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ accessToken: '' }));

      await expect(refreshAccessToken()).rejects.toMatchObject({
        status: 502,
      });
    });
  });

  describe('refresh deduplication', () => {
    it('sends one refresh for requests that fail together', async () => {
      let refreshed = false;
      let releaseRefresh: () => void = () => undefined;

      const refreshGate = new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      });

      fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith('/auth/refresh')) {
          // Stay in flight until the test has let every protected request
          // reach its 401 and queue behind this one refresh.
          await refreshGate;
          refreshed = true;

          return jsonResponse({ accessToken: 'fresh-token' });
        }

        return refreshed ? jsonResponse({ id: 'me' }) : emptyResponse(401);
      });

      const pending = Promise.all([
        apiRequest('/users/me'),
        apiRequest('/notifications'),
        apiRequest('/watchlist'),
      ]);

      // Three protected calls, each with a 401 to read and a refresh to ask
      // for. Waiting on the count rather than on a fixed number of ticks keeps
      // this deterministic: a broken deduplication reaches three refreshes
      // here and fails the assertion below.
      await waitForCallCount(protectedCallCount, 3);

      releaseRefresh();
      await pending;

      expect(refreshCallCount()).toBe(1);
    });

    it('allows a new refresh after the previous one settled', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ accessToken: 'first-token' }));
      await refreshAccessToken();

      fetchMock.mockResolvedValue(jsonResponse({ accessToken: 'second' }));
      await expect(refreshAccessToken()).resolves.toBe('second');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ApiError.fromResponse', () => {
  it('joins a validation message array into one sentence', async () => {
    const error = await ApiError.fromResponse(
      jsonResponse(
        { message: ['title should not be empty', 'amount must be a string'] },
        400,
      ),
    );

    expect(error.message).toBe(
      'title should not be empty, amount must be a string',
    );
  });

  it('falls back to a readable sentence for a body it cannot parse', async () => {
    const error = await ApiError.fromResponse(
      new Response('<html>Bad gateway</html>', { status: 502 }),
    );

    expect(error.status).toBe(502);
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.message).not.toContain('<html>');
  });
});
