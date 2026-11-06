import type { OrderStatus } from '../api/types';

/**
 * Mirrors OrderStatus.next() on the server so the UI only offers moves the API will accept.
 * The server stays the source of truth: an out-of-date screen still gets 409 ILLEGAL_TRANSITION.
 */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const nextStatuses = (s: OrderStatus): OrderStatus[] => NEXT[s];
export const isFinal = (s: OrderStatus) => NEXT[s].length === 0;

export const ACTION_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Place',
  CONFIRMED: 'Confirm',
  SHIPPED: 'Mark shipped',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
};
