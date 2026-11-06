import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ordersApi } from '../api/endpoints';
import { ORDER_STATUSES, type OrderStatus } from '../api/types';
import { Empty, ErrorBanner, Pagination, StatusBadge } from '../components/ui';
import { formatDateTime, formatMoney } from '../lib/format';
import { CUSTOMER_KEY } from './CartPage';

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const customerId = params.get('customerId') ?? localStorage.getItem(CUSTOMER_KEY) ?? '';
  const status = (params.get('status') ?? '') as OrderStatus | '';
  const page = Number(params.get('page') ?? 0);
  const [input, setInput] = useState(customerId);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  const orders = useQuery({
    queryKey: ['orders', customerId, status, page],
    queryFn: () => ordersApi.forCustomer(customerId, status, page),
    enabled: customerId !== '',
    placeholderData: keepPreviousData,
  });

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    set({ customerId: input.trim(), page: '' });
  };

  return (
    <section>
      <h1>Orders</h1>
      <form className="filters" onSubmit={lookup}>
        <input aria-label="Customer ID" placeholder="Customer ID, e.g. cust-1042" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn" disabled={!input.trim()}>Find orders</button>
        <select aria-label="Status" value={status} onChange={(e) => set({ status: e.target.value, page: '' })}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </form>

      <ErrorBanner error={orders.error} onRetry={() => orders.refetch()} />

      {!customerId ? (
        <Empty>Enter a customer ID to see their orders.</Empty>
      ) : orders.isPending ? (
        <p className="muted">Loading orders...</p>
      ) : orders.data?.content.length === 0 ? (
        <Empty>No {status ? status.toLowerCase() + ' ' : ''}orders for {customerId}.</Empty>
      ) : orders.data ? (
        <>
          <table className="table">
            <thead><tr><th>Order</th><th>Placed</th><th className="num">Items</th><th className="num">Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.data.content.map((o) => (
                <tr key={o.id}>
                  <td><Link className="mono" to={`/orders/${o.id}`}>{o.id.slice(-8)}</Link></td>
                  <td>{formatDateTime(o.createdAt)}</td>
                  <td className="num">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="num">{formatMoney(o.total)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={orders.data.page} totalPages={orders.data.totalPages} onChange={(p) => set({ page: String(p) })} />
        </>
      ) : null}
    </section>
  );
}
