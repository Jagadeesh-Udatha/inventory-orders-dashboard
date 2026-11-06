import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { CartProvider } from '../cart/CartContext';
import type { Product } from '../api/types';

type Handler = (url: URL, init: RequestInit) => { status?: number; body?: unknown } | Promise<{ status?: number; body?: unknown }>;

/**
 * Replaces fetch with a router of `"METHOD /path"` -> handler. Unmatched calls fail the test loudly.
 * Returns the mock so tests can assert on what was sent.
 */
export function mockApi(routes: Record<string, Handler>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const key = `${init.method ?? 'GET'} ${url.pathname}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    const { status = 200, body } = await handler(url, init);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    });
  });
}

export const problem = (status: number, code: string, detail: string, errors?: Record<string, string>) => ({
  status,
  body: { type: 'about:blank', title: 'Error', status, detail, code, ...(errors ? { errors } : {}) },
});

export function renderAt(ui: ReactElement, { path = '/', route = '/' }: { path?: string; route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <CartProvider>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<div data-testid="navigated" />} />
          </Routes>
        </CartProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1', sku: 'KB-MECH-87', name: 'Mechanical keyboard', category: 'electronics', price: 3499, stock: 10,
    active: true, createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z', version: 0, ...overrides,
  };
}

export const page = <T,>(content: T[], extra: Partial<{ page: number; totalPages: number; totalElements: number }> = {}) => ({
  content, page: 0, size: 10, totalElements: content.length, totalPages: 1, ...extra,
});
