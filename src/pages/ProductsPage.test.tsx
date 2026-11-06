import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsPage } from './ProductsPage';
import { mockApi, page, product, renderAt } from '../test/utils';

const keyboard = product();
const mouse = product({ id: 'p2', sku: 'MS-WL-01', name: 'Wireless mouse', price: 899, stock: 0 });

describe('ProductsPage', () => {
  it('lists products with price and stock state', async () => {
    mockApi({ 'GET /api/products': () => ({ body: page([keyboard, mouse]) }) });
    renderAt(<ProductsPage />, { path: '/products', route: '/products' });

    const row = (await screen.findByText('Mechanical keyboard')).closest('tr')!;
    expect(within(row).getByText('₹3,499.00')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Wireless mouse to cart' })).toBeDisabled();
  });

  it('sends the search text, filters and sort to the API', async () => {
    const api = mockApi({ 'GET /api/products': () => ({ body: page([keyboard]) }) });
    renderAt(<ProductsPage />, { path: '/products', route: '/products?sort=price:desc' });
    await screen.findByText('Mechanical keyboard');

    await userEvent.type(screen.getByLabelText('Search products'), 'keyb');
    await userEvent.click(screen.getByLabelText('In stock only'));

    await waitFor(() => {
      const last = new URL(String(api.mock.calls.at(-1)![0]), 'http://localhost');
      expect(Object.fromEntries(last.searchParams)).toMatchObject({ q: 'keyb', inStock: 'true', sort: 'price', dir: 'desc', page: '0' });
    });
  });

  it('restocks a product and reloads the list', async () => {
    let stock = 2;
    const api = mockApi({
      'GET /api/products': () => ({ body: page([product({ stock })]) }),
      'POST /api/products/KB-MECH-87/restock': (_u, init) => {
        stock += JSON.parse(String(init.body)).quantity;
        return { body: product({ stock }) };
      },
    });
    renderAt(<ProductsPage />, { path: '/products', route: '/products' });
    expect(await screen.findByText('Low: 2')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Restock quantity for KB-MECH-87'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Restock' }));

    expect(await screen.findByText('22')).toBeInTheDocument();
    expect(api.mock.calls.some(([u, i]) => String(u).endsWith('/restock') && i?.body === '{"quantity":20}')).toBe(true);
  });

  it('adds to the cart up to the stock on hand', async () => {
    mockApi({ 'GET /api/products': () => ({ body: page([product({ stock: 1 })]) }) });
    renderAt(<ProductsPage />, { path: '/products', route: '/products' });

    const add = await screen.findByRole('button', { name: 'Add Mechanical keyboard to cart' });
    await userEvent.click(add);
    expect(add).toHaveTextContent('In cart (1)');
    expect(add).toBeDisabled();
  });
});
