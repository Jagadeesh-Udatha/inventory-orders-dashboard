import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productsApi } from '../api/endpoints';
import type { Product, ProductQuery, SortField } from '../api/types';
import { useCart } from '../cart/CartContext';
import { Empty, ErrorBanner, Pagination, StockBadge } from '../components/ui';
import { formatMoney } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';

const SORTS: { value: string; label: string }[] = [
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
  { value: 'stock:asc', label: 'Stock: lowest first' },
  { value: 'createdAt:desc', label: 'Newest' },
];
const PAGE_SIZE = 10;

/** Filters live in the URL, so a filtered view can be bookmarked or shared and survives a reload. */
function useProductQuery(): [ProductQuery, (patch: Partial<Record<string, string>>) => void] {
  const [params, setParams] = useSearchParams();
  const [sort, dir] = (params.get('sort') ?? 'name:asc').split(':') as [SortField, 'asc' | 'desc'];
  const q: ProductQuery = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    inStock: params.get('inStock') === 'true',
    page: Number(params.get('page') ?? 0),
    size: PAGE_SIZE,
    sort,
    dir,
  };
  const update = (patch: Partial<Record<string, string>>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page'); // any filter change goes back to the first page
    setParams(next, { replace: true });
  };
  return [q, update];
}

export function ProductsPage() {
  const [q, update] = useProductQuery();
  const [text, setText] = useState(q.q ?? '');
  const debouncedText = useDebounced(text);
  useEffect(() => {
    if (debouncedText !== q.q) update({ q: debouncedText });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the debounced text should trigger this
  }, [debouncedText]);

  const products = useQuery({
    queryKey: ['products', q],
    queryFn: ({ signal }) => productsApi.search(q, signal),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });

  return (
    <section>
      <header className="page-header">
        <h1>Products</h1>
        <Link className="btn" to="/products/new">Add product</Link>
      </header>

      <div className="filters">
        <input
          type="search"
          aria-label="Search products"
          placeholder="Search by name or SKU"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          aria-label="Category"
          placeholder="Category"
          value={q.category}
          onChange={(e) => update({ category: e.target.value.trim().toLowerCase() })}
        />
        <select aria-label="Sort" value={`${q.sort}:${q.dir}`} onChange={(e) => update({ sort: e.target.value })}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={q.inStock} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} />
          In stock only
        </label>
      </div>

      <ErrorBanner error={products.error} onRetry={() => products.refetch()} />

      {products.isPending ? (
        <p className="muted">Loading products...</p>
      ) : products.data && products.data.content.length === 0 ? (
        <Empty>No products match these filters.</Empty>
      ) : products.data ? (
        <>
          <p className="muted" aria-live="polite">
            {products.data.totalElements} product{products.data.totalElements === 1 ? '' : 's'}
            {products.isFetching && ' · updating...'}
          </p>
          <table className="table">
            <thead>
              <tr><th>SKU</th><th>Name</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th /></tr>
            </thead>
            <tbody>
              {products.data.content.map((p) => <ProductRow key={p.sku} product={p} />)}
            </tbody>
          </table>
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            onChange={(p) => update({ page: String(p) })}
          />
        </>
      ) : null}
    </section>
  );
}

function ProductRow({ product }: { product: Product }) {
  const cart = useCart();
  const qc = useQueryClient();
  const [restockQty, setRestockQty] = useState('');
  const inCart = cart.lines.find((l) => l.sku === product.sku)?.quantity ?? 0;

  const restock = useMutation({
    mutationFn: (qty: number) => productsApi.restock(product.sku, qty),
    onSuccess: () => {
      setRestockQty('');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });
  const qty = Number(restockQty);

  return (
    <tr>
      <td className="mono">{product.sku}</td>
      <td>{product.name}</td>
      <td>{product.category}</td>
      <td className="num">{formatMoney(product.price)}</td>
      <td className="num"><StockBadge stock={product.stock} /></td>
      <td className="actions">
        <button
          className="btn btn-small"
          disabled={product.stock === 0 || inCart >= product.stock}
          onClick={() => cart.add(product)}
          aria-label={`Add ${product.name} to cart`}
        >
          {inCart ? `In cart (${inCart})` : 'Add to cart'}
        </button>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (qty > 0) restock.mutate(qty);
          }}
        >
          <input
            type="number"
            min={1}
            max={100000}
            aria-label={`Restock quantity for ${product.sku}`}
            placeholder="+ qty"
            value={restockQty}
            onChange={(e) => setRestockQty(e.target.value)}
          />
          <button className="btn btn-small btn-ghost" disabled={!(qty > 0) || restock.isPending}>Restock</button>
        </form>
        {restock.error && <span className="field-error" role="alert">{(restock.error as Error).message}</span>}
      </td>
    </tr>
  );
}
