import { query, request } from './client';
import type {
  CategorySales, Order, OrderStatus, Page, PlaceOrderInput, Product, ProductInput, ProductQuery,
} from './types';

export const productsApi = {
  search: (q: ProductQuery, signal?: AbortSignal) =>
    request<Page<Product>>(
      `/api/products${query({ q: q.q?.trim(), category: q.category, inStock: q.inStock || undefined, page: q.page, size: q.size, sort: q.sort, dir: q.dir })}`,
      { signal },
    ),
  create: (input: ProductInput) => request<Product>('/api/products', { method: 'POST', body: input }),
  restock: (sku: string, quantity: number) =>
    request<Product>(`/api/products/${encodeURIComponent(sku)}/restock`, { method: 'POST', body: { quantity } }),
};

export const ordersApi = {
  /** The same idempotency key must be sent on every retry of one checkout, so a retry never orders twice. */
  place: (input: PlaceOrderInput, idempotencyKey: string) =>
    request<Order>('/api/orders', { method: 'POST', body: input, headers: { 'Idempotency-Key': idempotencyKey } }),
  get: (id: string) => request<Order>(`/api/orders/${encodeURIComponent(id)}`),
  forCustomer: (customerId: string, status: OrderStatus | '', page: number) =>
    request<Page<Order>>(`/api/orders${query({ customerId, status, page, size: 10 })}`),
  changeStatus: (id: string, status: OrderStatus) =>
    request<Order>(`/api/orders/${encodeURIComponent(id)}/status`, { method: 'POST', body: { status } }),
};

export const reportsApi = {
  salesByCategory: (from: string, to: string) =>
    request<CategorySales[]>(`/api/reports/sales-by-category${query({ from, to })}`),
  lowStock: (threshold: number) => request<Product[]>(`/api/reports/low-stock${query({ threshold })}`),
};
