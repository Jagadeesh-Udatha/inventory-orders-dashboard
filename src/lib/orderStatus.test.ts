import { isFinal, nextStatuses } from './orderStatus';

describe('order lifecycle (mirrors the server enum)', () => {
  it.each([
    ['PLACED', ['CONFIRMED', 'CANCELLED']],
    ['CONFIRMED', ['SHIPPED', 'CANCELLED']],
    ['SHIPPED', ['DELIVERED']],
    ['DELIVERED', []],
    ['CANCELLED', []],
  ] as const)('%s can move to %j', (from, to) => {
    expect(nextStatuses(from)).toEqual(to);
  });

  it('treats delivered and cancelled as final', () => {
    expect(isFinal('DELIVERED')).toBe(true);
    expect(isFinal('CANCELLED')).toBe(true);
    expect(isFinal('SHIPPED')).toBe(false);
  });
});
