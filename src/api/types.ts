/** Shapes returned by inventory-orders-api. Money arrives as a JSON number (BigDecimal). */

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  idempotencyKey?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  history: { status: OrderStatus; at: string }[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PlaceOrderInput {
  customerId: string;
  items: { sku: string; quantity: number }[];
}

export interface CategorySales {
  category: string;
  unitsSold: number;
  revenue: number;
  orders: number;
}

export type SortField = 'name' | 'price' | 'stock' | 'createdAt';

export interface ProductQuery {
  q?: string;
  category?: string;
  inStock?: boolean;
  page: number;
  size: number;
  sort: SortField;
  dir: 'asc' | 'desc';
}
