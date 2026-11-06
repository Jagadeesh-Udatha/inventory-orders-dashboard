import { screen, within } from '@testing-library/react';
import { ReportsPage } from './ReportsPage';
import { mockApi, product, renderAt } from '../test/utils';

describe('ReportsPage', () => {
  it('shows revenue per category and sends an exclusive end date', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-06T12:00:00Z') });
    const api = mockApi({
      'GET /api/reports/sales-by-category': () => ({
        body: [
          { category: 'electronics', unitsSold: 12, revenue: 41988, orders: 9 },
          { category: 'books', unitsSold: 5, revenue: 2495, orders: 4 },
        ],
      }),
      'GET /api/reports/low-stock': () => ({ body: [product({ stock: 0 })] }),
    });
    renderAt(<ReportsPage />);

    const bars = await screen.findByRole('list', { name: 'Revenue by category' });
    expect(within(bars).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('electronics₹41,988.00'),
      expect.stringContaining('books₹2,495.00'),
    ]);
    expect(screen.getByText('₹44,483.00')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();

    const salesUrl = new URL(String(api.mock.calls.find(([u]) => String(u).includes('sales'))![0]), 'http://localhost');
    expect(salesUrl.searchParams.get('from')).toBe('2026-10-08');
    expect(salesUrl.searchParams.get('to')).toBe('2026-11-07');
    vi.useRealTimers();
  });
});
