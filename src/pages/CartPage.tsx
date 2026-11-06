import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { ordersApi } from '../api/endpoints';
import type { PlaceOrderInput } from '../api/types';
import { MAX_QTY, useCart } from '../cart/CartContext';
import { Empty } from '../components/ui';
import { formatMoney } from '../lib/format';

export const CUSTOMER_KEY = 'customerId';

function newKey(): string {
  return crypto.randomUUID();
}

export function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState(() => localStorage.getItem(CUSTOMER_KEY) ?? '');

  // One key per checkout attempt. A retry after a timeout or a 5xx reuses it, so the server returns the
  // order it already created instead of reserving stock twice. Changing the cart starts a new attempt.
  const idempotencyKey = useRef(newKey());
  const cartSignature = cart.lines.map((l) => `${l.sku}x${l.quantity}`).join(',');

  const place = useMutation({
    mutationFn: (input: PlaceOrderInput) => ordersApi.place(input, idempotencyKey.current),
    onSuccess: (order) => {
      localStorage.setItem(CUSTOMER_KEY, order.customerId);
      cart.clear();
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`, { state: { placed: true } });
    },
  });

  const { reset } = place;
  useEffect(() => {
    idempotencyKey.current = newKey();
    reset(); // an old error (e.g. not enough stock) no longer applies to the edited cart
  }, [cartSignature, customerId, reset]);

  if (cart.lines.length === 0) {
    return (
      <section className="narrow">
        <h1>Cart</h1>
        <Empty>Your cart is empty. <Link to="/products">Browse products</Link></Empty>
      </section>
    );
  }

  const error = place.error;
  const tooMany = cart.lines.filter((l) => l.quantity > l.stock);

  return (
    <section className="narrow">
      <h1>Cart</h1>
      <table className="table">
        <thead><tr><th>Product</th><th className="num">Price</th><th className="num">Qty</th><th className="num">Total</th><th /></tr></thead>
        <tbody>
          {cart.lines.map((l) => (
            <tr key={l.sku}>
              <td>{l.name}<div className="mono muted">{l.sku}</div></td>
              <td className="num">{formatMoney(l.price)}</td>
              <td className="num">
                <input
                  type="number"
                  min={1}
                  max={Math.min(l.stock, MAX_QTY)}
                  aria-label={`Quantity of ${l.sku}`}
                  value={l.quantity}
                  onChange={(e) => cart.setQuantity(l.sku, Number(e.target.value))}
                />
                {l.quantity > l.stock && <small className="field-error">only {l.stock} left</small>}
              </td>
              <td className="num">{formatMoney(l.price * l.quantity)}</td>
              <td><button className="btn btn-small btn-ghost" onClick={() => cart.remove(l.sku)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={3}>Total</td><td className="num strong">{formatMoney(cart.total)}</td><td /></tr></tfoot>
      </table>

      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          place.mutate({ customerId: customerId.trim(), items: cart.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })) });
        }}
      >
        <label className="field">
          <span>Customer ID</span>
          <input required maxLength={64} placeholder="cust-1042" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        </label>

        {error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK' && (
          <div className="banner banner-error" role="alert">
            {error.message}. Stock changed since you added it; lower the quantity and try again. Nothing was reserved.
          </div>
        )}
        {error && !(error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK') && (
          <div className="banner banner-error" role="alert">
            {(error as Error).message}
            {error instanceof ApiError && error.retryable && ' Placing the order again is safe: it will not be charged twice.'}
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-primary" disabled={place.isPending || !customerId.trim() || tooMany.length > 0}>
            {place.isPending ? 'Placing order...' : error ? 'Try again' : `Place order · ${formatMoney(cart.total)}`}
          </button>
        </div>
      </form>
    </section>
  );
}
