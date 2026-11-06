import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewProductPage, validateProduct } from './NewProductPage';
import { mockApi, problem, product, renderAt } from '../test/utils';

const fill = async (values: Record<string, string>) => {
  for (const [label, v] of Object.entries(values)) {
    const input = screen.getByLabelText(label);
    await userEvent.clear(input);
    await userEvent.type(input, v);
  }
};

describe('NewProductPage', () => {
  it('validates like the server before sending anything', async () => {
    const api = mockApi({});
    renderAt(<NewProductPage />);
    await fill({ SKU: 'k', Name: 'Keyboard', Category: 'electronics', 'Price (INR)': '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(screen.getByText("SKU must be 3-32 upper-case letters, digits or '-'")).toBeInTheDocument();
    expect(screen.getByText('Price (INR) must be at least 0.01')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('creates the product and goes back to the list', async () => {
    const api = mockApi({ 'POST /api/products': () => ({ status: 201, body: product() }) });
    renderAt(<NewProductPage />);
    await fill({ SKU: 'kb-mech-87', Name: 'Mechanical keyboard', Category: 'Electronics', 'Price (INR)': '3499.00', 'Opening stock': '10' });
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(await screen.findByTestId('navigated')).toBeInTheDocument();
    expect(JSON.parse(String(api.mock.calls[0][1]!.body))).toEqual({
      sku: 'KB-MECH-87', name: 'Mechanical keyboard', category: 'electronics', price: 3499, stock: 10,
    });
  });

  it('shows a duplicate SKU from the server next to the SKU field', async () => {
    mockApi({ 'POST /api/products': () => problem(409, 'DUPLICATE_SKU', 'SKU KB-MECH-87 already exists') });
    renderAt(<NewProductPage />);
    await fill({ SKU: 'KB-MECH-87', Name: 'Keyboard', Category: 'electronics', 'Price (INR)': '10' });
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(await screen.findByText('SKU already exists')).toBeInTheDocument();
  });

  it('rejects prices with more than two decimals', () => {
    expect(validateProduct({ sku: 'ABC', name: 'n', category: 'c', price: '1.999', stock: '0' })).toEqual({
      price: 'use at most 2 decimal places',
    });
  });
});
