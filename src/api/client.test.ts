import { ApiError, query, request } from './client';
import { mockApi, problem } from '../test/utils';

describe('request', () => {
  it('returns parsed JSON on success and sends a JSON body', async () => {
    const fetchMock = mockApi({ 'POST /api/things': () => ({ status: 201, body: { id: 'a1' } }) });
    await expect(request('/api/things', { method: 'POST', body: { n: 1 } })).resolves.toEqual({ id: 'a1' });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe('{"n":1}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('turns a problem document into an ApiError with code and field errors', async () => {
    mockApi({ 'POST /api/products': () => problem(400, 'VALIDATION_FAILED', 'One or more fields are invalid', { sku: 'bad' }) });
    const err = (await request('/api/products', { method: 'POST', body: {} }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', fieldErrors: { sku: 'bad' } });
    expect(err.retryable).toBe(false);
  });

  it('reports network failures as a retryable NETWORK error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await request('/api/x').catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK', retryable: true });
  });

  it('falls back to the HTTP status when the error body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }));
    const err = await request('/api/x').catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: 'HTTP_502', retryable: true });
  });
});

describe('query', () => {
  it('drops empty values and encodes the rest', () => {
    expect(query({ q: 'a b', category: '', page: 0, inStock: undefined, x: null })).toBe('?q=a+b&page=0');
    expect(query({})).toBe('');
  });
});
