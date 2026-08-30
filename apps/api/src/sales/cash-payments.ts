import { PaymentKind } from '@prisma/client';
import { roundMoney } from './currency';

export type PaymentWithKind = { amount: number; kind: PaymentKind };

export function cashPaymentTotal(payments: PaymentWithKind[]) {
  return roundMoney(payments.reduce((sum, payment) => payment.kind === PaymentKind.CASH ? sum + payment.amount : sum, 0));
}
