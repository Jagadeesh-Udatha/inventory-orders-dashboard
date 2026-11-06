import type { ReactNode } from 'react';
import type { OrderStatus } from '../api/types';
import { ApiError } from '../api/client';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>;
}

export function StockBadge({ stock, threshold = 5 }: { stock: number; threshold?: number }) {
  if (stock === 0) return <span className="badge badge-cancelled">Out of stock</span>;
  if (stock <= threshold) return <span className="badge badge-placed">Low: {stock}</span>;
  return <span className="stock">{stock}</span>;
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Something went wrong';
  const canRetry = onRetry && (!(error instanceof ApiError) || error.retryable);
  return (
    <div className="banner banner-error" role="alert">
      <span>{message}</span>
      {canRetry && <button className="btn btn-small" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-small" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page + 1} of {totalPages}</span>
      <button className="btn btn-small" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
