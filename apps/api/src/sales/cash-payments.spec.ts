import { PaymentKind } from '@prisma/client';
import { cashPaymentTotal } from './cash-payments';

describe('cashPaymentTotal', () => {
  it('incluye únicamente pagos en efectivo', () => {
    expect(cashPaymentTotal([
      { amount: 100, kind: PaymentKind.CASH },
      { amount: 250, kind: PaymentKind.BANK_TRANSFER },
      { amount: 300, kind: PaymentKind.POS },
      { amount: 50, kind: PaymentKind.OTHER },
    ])).toBe(100);
  });

  it('devuelve cero para transferencia, POS y otros métodos', () => {
    expect(cashPaymentTotal([
      { amount: 125, kind: PaymentKind.BANK_TRANSFER },
      { amount: 75, kind: PaymentKind.POS },
      { amount: 20, kind: PaymentKind.OTHER },
    ])).toBe(0);
  });

  it('suma y redondea la parte en efectivo de un pago mixto', () => {
    expect(cashPaymentTotal([
      { amount: 10.005, kind: PaymentKind.CASH },
      { amount: 5.335, kind: PaymentKind.CASH },
      { amount: 90, kind: PaymentKind.POS },
    ])).toBe(15.34);
  });
});
