import { convertCurrency, currencyFactor, roundMoney, toBaseCurrency } from './currency';

describe('currency utilities', () => {
  const rate = 36.6243;

  it('mantiene el importe cuando la moneda es la misma', () => {
    expect(convertCurrency(125.678, 'NIO', 'NIO', rate)).toBe(125.68);
    expect(currencyFactor('USD', 'USD', rate)).toBe(1);
  });

  it('convierte córdobas a dólares', () => {
    expect(convertCurrency(3662.43, 'NIO', 'USD', rate)).toBe(100);
  });

  it('convierte dólares a córdobas', () => {
    expect(convertCurrency(100, 'USD', 'NIO', rate)).toBe(3662.43);
    expect(toBaseCurrency(10, 'USD', 'NIO', rate)).toBe(366.24);
  });

  it('redondea los importes monetarios a dos decimales', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(convertCurrency(1, 'USD', 'NIO', 36.666)).toBe(36.67);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rechaza la tasa inválida %s', (invalidRate) => {
    expect(() => convertCurrency(10, 'USD', 'NIO', invalidRate)).toThrow(RangeError);
  });

  it('rechaza monedas no soportadas', () => {
    expect(() => convertCurrency(10, 'EUR', 'NIO', rate)).toThrow('Conversión de moneda no soportada.');
  });
});
