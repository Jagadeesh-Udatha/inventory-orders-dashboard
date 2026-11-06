import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { ordersApi } from '../api/endpoints';
import type { Order, OrderStatus } from '../api/types';
import { ErrorBanner, StatusBadge } from '../components/ui';
import { formatDateTime, formatMoney } from '../lib/format';
import { ACTION_LABEL, nextStatuses } from '../lib/orderStatus';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const placed = (useLocation().state as { placed?: boolean } | null)?.placed;
  const qc = useQueryClient();

  const order = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.get(id) });

  const move = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.changeStatus(id, status),
    onSuccess: (updated) => {
      qc.setQueryData(['order', id], updated);
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (updated.status === 'CANCELLED') qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => {
      // Someone else moved the order first: reload it so the buttons match what the server now allows
      if (e instanceof ApiError && (e.code === 'ILLEGAL_TRANSITION' || e.code === 'CONCURRENT_UPDATE')) {
        qc.invalidateQueries({ queryKey: ['order', id] });
      }
    },
  });

  if (order.isPending) return <p className="muted">Loading order...</p>;
  if (order.error) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return notFound ? (
      <section className="narrow"><h1>Order not found</h1><Link to="/orders">Back to orders</Link></section>
    ) : (
      <ErrorBanner error={order.error} onRetry={() => order.refetch()} />
    );
  }

  const o: Order = order.data;
  const actions = nextStatuses(o.status);

  return (
    <section className="narrow">
      {placed && <div className="banner banner-ok" role="status">Order placed. Stock has been reserved.</div>}
      <header className="page-header">
        <div>
          <h1>Order <span className="mono">{o.id.slice(-8)}</span></h1>
          <p className="muted">{o.customerId} · placed {formatDateTime(o.createdAt)}</p>
        </div>
        <StatusBadge status={o.status} />
      </header>

      <table className="table">
        <thead><tr><th>Item</th><th className="num">Unit price</th><th className="num">Qty</th><th className="num">Line total</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.sku}>
              <td>{i.name}<div className="mono muted">{i.sku} · {i.category}</div></td>
              <td className="num">{formatMoney(i.unitPrice)}</td>
              <td className="num">{i.quantity}</td>
              <td className="num">{formatMoney(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={3}>Total</td><td className="num strong">{formatMoney(o.total)}</td></tr></tfoot>
      </table>
      <p className="muted small">Prices are a snapshot from when the order was placed.</p>

      {actions.length > 0 && (
        <div className="form-actions">
          {actions.map((s) => (
            <button
              key={s}
              className={s === 'CANCELLED' ? 'btn btn-danger' : 'btn btn-primary'}
              disabled={move.isPending}
              onClick={() => {
                if (s !== 'CANCELLED' || window.confirm('Cancel this order? Reserved stock goes back on the shelf.')) move.mutate(s);
              }}
            >
              {ACTION_LABEL[s]}
            </button>
          ))}
        </div>
      )}
      <ErrorBanner error={move.error} />

      <h2>History</h2>
      <ol className="timeline">
        {o.history.map((h, idx) => (
          <li key={idx}><StatusBadge status={h.status} /> <span className="muted">{formatDateTime(h.at)}</span></li>
        ))}
      </ol>
    </section>
  );
}
