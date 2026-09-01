export function inventoryQuantityForSale(saleQuantity: number, saleUnitFactor: number) {
  if (!Number.isFinite(saleQuantity) || saleQuantity <= 0) throw new Error('Cantidad de venta inválida.');
  if (!Number.isFinite(saleUnitFactor) || saleUnitFactor <= 0) throw new Error('Factor de conversión inválido.');
  // Existencias y movimientos se almacenan con escala 2; el factor conserva
  // escala 6, pero el resultado debe redondearse una sola vez al límite real.
  return Math.round(saleQuantity * saleUnitFactor * 100) / 100;
}

export function isValidSaleQuantity(quantity: number, allowFractionalSale: boolean) {
  return allowFractionalSale || Number.isInteger(quantity);
}
