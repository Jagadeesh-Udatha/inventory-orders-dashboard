import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartPage } from './CartPage';
import { mockApi, problem, renderAt } from '../test/utils';
import type { Order } from '../api/types';

const order: Order = {
  id: '6730aa00000000000000beef', customerId: 'cust-1042', items: [], total: 6998, status: 'PLACED',
  history: [], createdAt: '2026-11-06T09:00:00Z', updatedAt: '2026-11-06T09:00:00Z', version: 0,
};

function seedCart() {
  localStorage.setItem('cart.v1', JSON.stringify([{ sku: 'KB-MECH-87', name: 'Mechanical keyboard', price: 3499, stock: 10, quantity: 2 }]));
}

const keyOf = (init: RequestInit) => (init.headers as Record<string, string>)['Idempotency-Key'];

describe('CartPage checkout', () => {
  it('places the order with an Idempotency-Key and clears the cart', async () => {
    seedCart();
    const api = mockApi({ 'POST /api/orders': () => ({ status: 201, body: order }) });
    renderAt(<CartPage />);

    await userEvent.type(screen.getByLabelText('Customer ID'), 'cust-1042');
    await userEvent.click(screen.getByRole('button', { name: /Place order/ }));

    expect(await screen.findByTestId('navigated')).toBeInTheDocument();
    const init = api.mock.calls[0][1]!;
    expect(keyOf(init)).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(String(init.body))).toEqual({ customerId: 'cust-1042', items: [{ sku: 'KB-MECH-87', quantity: 2 }] });
    expect(JSON.parse(localStorage.getItem('cart.v1')!)).toEqual([]);
  });

  it('retries after a server error with the same key, so the order is never placed twice', async () => {
    seedCart();
    let calls = 0;
    const api = mockApi({
      'POST /api/orders': () => (++calls === 1 ? problem(503, 'HTTP_503', 'Service unavailable') : { status: 200, body: order }),
    });
    renderAt(<CartPage />);

    await userEvent.type(screen.getByLabelText('Customer ID'), 'cust-1042');
    await userEvent.click(screen.getByRole('button', { name: /Place order/ }));
    expect(await screen.findByText(/it will not be charged twice/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('navigated')).toBeInTheDocument();
    expect(keyOf(api.mock.calls[1][1]!)).toBe(keyOf(api.mock.calls[0][1]!));
  });

  it('uses a new key once the cart changes', async () => {
    seedCart();
    const api = mockApi({ 'POST /api/orders': () => problem(409, 'INSUFFICIENT_STOCK', 'Not enough stock for KB-MECH-87') });
    renderAt(<CartPage />);

    await userEvent.type(screen.getByLabelText('Customer ID'), 'cust-1042');
    await userEvent.click(screen.getByRole('button', { name: /Place order/ }));
    expect(await screen.findByText(/Nothing was reserved/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Quantity of KB-MECH-87'), { target: { value: '1' } });
    await vi.waitFor(() => expect(screen.queryByText(/Nothing was reserved/)).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Place order/ }));

    await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(keyOf(api.mock.calls[1][1]!)).not.toBe(keyOf(api.mock.calls[0][1]!));
  });
});
