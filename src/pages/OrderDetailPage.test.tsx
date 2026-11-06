import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderDetailPage } from './OrderDetailPage';
import { mockApi, problem, renderAt } from '../test/utils';
import type { Order, OrderStatus } from '../api/types';

const make = (status: OrderStatus): Order => ({
  id: '6730aa00000000000000beef', customerId: 'cust-1042', status, total: 3499, version: 1,
  items: [{ sku: 'KB-MECH-87', name: 'Mechanical keyboard', category: 'electronics', unitPrice: 3499, quantity: 1, lineTotal: 3499 }],
  history: [{ status: 'PLACED', at: '2026-11-06T09:00:00Z' }], createdAt: '2026-11-06T09:00:00Z', updatedAt: '2026-11-06T09:00:00Z',
});

const at = { path: '/orders/:id', route: '/orders/6730aa00000000000000beef' };

describe('OrderDetailPage', () => {
  it('offers only the moves the lifecycle allows', async () => {
    mockApi({ 'GET /api/orders/6730aa00000000000000beef': () => ({ body: make('SHIPPED') }) });
    renderAt(<OrderDetailPage />, at);

    expect(await screen.findByRole('button', { name: 'Mark delivered' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  });

  it('confirms an order and shows the new status', async () => {
    const api = mockApi({
      'GET /api/orders/6730aa00000000000000beef': () => ({ body: make('PLACED') }),
      'POST /api/orders/6730aa00000000000000beef/status': () => ({ body: make('CONFIRMED') }),
    });
    renderAt(<OrderDetailPage />, at);

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('button', { name: 'Mark shipped' })).toBeInTheDocument();
    expect(api.mock.calls[1][1]!.body).toBe('{"status":"CONFIRMED"}');
  });

  it('asks before cancelling', async () => {
    const api = mockApi({ 'GET /api/orders/6730aa00000000000000beef': () => ({ body: make('PLACED') }) });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderAt(<OrderDetailPage />, at);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('reloads the order when someone else moved it first', async () => {
    let current: OrderStatus = 'PLACED';
    mockApi({
      'GET /api/orders/6730aa00000000000000beef': () => ({ body: make(current) }),
      'POST /api/orders/6730aa00000000000000beef/status': () => {
        current = 'CANCELLED';
        return problem(409, 'ILLEGAL_TRANSITION', 'Cannot move order from CANCELLED to CONFIRMED');
      },
    });
    renderAt(<OrderDetailPage />, at);

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot move order from CANCELLED to CONFIRMED');
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument());
  });

  it('shows a not-found page for an unknown id', async () => {
    mockApi({ 'GET /api/orders/6730aa00000000000000beef': () => problem(404, 'NOT_FOUND', 'Order not found') });
    renderAt(<OrderDetailPage />, at);
    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
  });
});
