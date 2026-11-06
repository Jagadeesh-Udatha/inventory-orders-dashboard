import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { reportsApi } from '../api/endpoints';
import { Empty, ErrorBanner, StockBadge } from '../components/ui';
import { addDays, formatMoney, isoDate } from '../lib/format';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function ReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(isoDate(addDays(today, -29)));
  const [to, setTo] = useState(isoDate(today));
  const [threshold, setThreshold] = useState(5);

  // The API's `to` is exclusive, so the picked end date is sent as the next day to include it.
  const toExclusive = to ? isoDate(addDays(new Date(to), 1)) : '';
  const validRange = Boolean(from && to && from <= to);

  const sales = useQuery({
    queryKey: ['sales', from, toExclusive],
    queryFn: () => reportsApi.salesByCategory(from, toExclusive),
    enabled: validRange,
  });
  const lowStock = useQuery({
    queryKey: ['low-stock', threshold],
    queryFn: () => reportsApi.lowStock(threshold),
  });

  const rows = sales.data ?? [];
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 0);

  return (
    <section>
      <h1>Reports</h1>

      <div className="grid-2">
        <div className="card">
          <header className="card-header">
            <h2>Sales by category</h2>
            <div className="filters compact">
              <input type="date" aria-label="From" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              <span>to</span>
              <input type="date" aria-label="To" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          </header>
          {!validRange && <p className="field-error">Pick a start date on or before the end date.</p>}
          <ErrorBanner error={sales.error} onRetry={() => sales.refetch()} />
          {sales.isFetching && !sales.data ? (
            <p className="muted">Loading...</p>
          ) : rows.length === 0 && validRange && !sales.error ? (
            <Empty>No sales in this period.</Empty>
          ) : (
            <>
              <div className="stats">
                <div><span className="muted">Revenue</span><strong>{formatMoney(totalRevenue)}</strong></div>
                <div><span className="muted">Units</span><strong>{rows.reduce((s, r) => s + r.unitsSold, 0)}</strong></div>
              </div>
              <ul className="bars" aria-label="Revenue by category">
                {rows.map((r) => (
                  <li key={r.category}>
                    <span className="bar-label">{r.category}</span>
                    <span className="bar-track">
                      <span className="bar" style={{ width: `${maxRevenue ? (r.revenue / maxRevenue) * 100 : 0}%` }} />
                    </span>
                    <span className="bar-value">{formatMoney(r.revenue)}</span>
                    <span className="muted small">{plural(r.unitsSold, 'unit')} · {plural(r.orders, 'order')}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card">
          <header className="card-header">
            <h2>Low stock</h2>
            <label className="filters compact">
              <span>At or below</span>
              <input
                type="number"
                min={0}
                aria-label="Low stock threshold"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </header>
          <ErrorBanner error={lowStock.error} onRetry={() => lowStock.refetch()} />
          {lowStock.data?.length === 0 ? (
            <Empty>Nothing is at or below {threshold} units.</Empty>
          ) : (
            <table className="table">
              <tbody>
                {lowStock.data?.map((p) => (
                  <tr key={p.sku}>
                    <td>{p.name}<div className="mono muted">{p.sku}</div></td>
                    <td className="num"><StockBadge stock={p.stock} threshold={threshold} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
