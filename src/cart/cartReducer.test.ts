import { cartReducer, MAX_QTY } from './CartContext';
import { product } from '../test/utils';

describe('cartReducer', () => {
  it('adds a product once and then increases its quantity', () => {
    let lines = cartReducer([], { type: 'add', product: product() });
    lines = cartReducer(lines, { type: 'add', product: product() });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it('never adds more than the stock on hand', () => {
    const p = product({ stock: 1 });
    const lines = cartReducer(cartReducer([], { type: 'add', product: p }), { type: 'add', product: p });
    expect(lines[0].quantity).toBe(1);
  });

  it('ignores products that are out of stock', () => {
    expect(cartReducer([], { type: 'add', product: product({ stock: 0 }) })).toEqual([]);
  });

  it('caps a line at the API maximum and removes it at zero', () => {
    const lines = cartReducer([], { type: 'add', product: product({ stock: 500 }) });
    expect(cartReducer(lines, { type: 'setQuantity', sku: 'KB-MECH-87', quantity: 250 })[0].quantity).toBe(MAX_QTY);
    expect(cartReducer(lines, { type: 'setQuantity', sku: 'KB-MECH-87', quantity: 0 })).toEqual([]);
  });
});
