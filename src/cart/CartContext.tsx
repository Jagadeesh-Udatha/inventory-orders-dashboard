import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { Product } from '../api/types';

export interface CartLine {
  sku: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
}

type Action =
  | { type: 'add'; product: Product }
  | { type: 'setQuantity'; sku: string; quantity: number }
  | { type: 'remove'; sku: string }
  | { type: 'clear' };

/** The API accepts at most 100 units per line and 50 lines per order. */
export const MAX_QTY = 100;
export const MAX_LINES = 50;

export function cartReducer(lines: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case 'add': {
      const p = action.product;
      const existing = lines.find((l) => l.sku === p.sku);
      if (existing) {
        const quantity = Math.min(existing.quantity + 1, p.stock, MAX_QTY);
        return lines.map((l) => (l.sku === p.sku ? { ...l, quantity, stock: p.stock, price: p.price } : l));
      }
      if (p.stock < 1 || lines.length >= MAX_LINES) return lines;
      return [...lines, { sku: p.sku, name: p.name, price: p.price, stock: p.stock, quantity: 1 }];
    }
    case 'setQuantity': {
      if (action.quantity < 1) return lines.filter((l) => l.sku !== action.sku);
      return lines.map((l) =>
        l.sku === action.sku ? { ...l, quantity: Math.min(Math.floor(action.quantity), MAX_QTY) } : l,
      );
    }
    case 'remove':
      return lines.filter((l) => l.sku !== action.sku);
    case 'clear':
      return [];
  }
}

interface Cart {
  lines: CartLine[];
  count: number;
  total: number;
  add: (p: Product) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

const CartCtx = createContext<Cart | null>(null);
const STORAGE_KEY = 'cart.v1';

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, undefined, loadLines);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* private mode: the cart just won't survive a reload */
    }
  }, [lines]);

  const add = useCallback((product: Product) => dispatch({ type: 'add', product }), []);
  const setQuantity = useCallback((sku: string, quantity: number) => dispatch({ type: 'setQuantity', sku, quantity }), []);
  const remove = useCallback((sku: string) => dispatch({ type: 'remove', sku }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo<Cart>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      total: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      add, setQuantity, remove, clear,
    }),
    [lines, add, setQuantity, remove, clear],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): Cart {
  const cart = useContext(CartCtx);
  if (!cart) throw new Error('useCart must be used inside <CartProvider>');
  return cart;
}
