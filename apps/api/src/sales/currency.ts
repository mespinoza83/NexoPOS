export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function currencyFactor(baseCurrency: string, targetCurrency: string, exchangeRate: number) {
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new RangeError('La tasa de cambio debe ser mayor que cero.');
  if (baseCurrency === targetCurrency) return 1;
  if (baseCurrency === 'NIO' && targetCurrency === 'USD') return 1 / exchangeRate;
  if (baseCurrency === 'USD' && targetCurrency === 'NIO') return exchangeRate;
  throw new RangeError('Conversión de moneda no soportada.');
}

export function convertCurrency(value: number, sourceCurrency: string, targetCurrency: string, exchangeRate: number) {
  return roundMoney(value * currencyFactor(sourceCurrency, targetCurrency, exchangeRate));
}

export function toBaseCurrency(value: number, currency: string, baseCurrency: string, exchangeRate: number) {
  return convertCurrency(value, currency, baseCurrency, exchangeRate);
}
