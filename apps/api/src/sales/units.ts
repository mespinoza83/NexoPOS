export function inventoryQuantityForSale(saleQuantity: number, saleUnitFactor: number) {
  if (!Number.isFinite(saleQuantity) || saleQuantity <= 0) throw new Error('Cantidad de venta inválida.');
  if (!Number.isFinite(saleUnitFactor) || saleUnitFactor <= 0) throw new Error('Factor de conversión inválido.');
  return Math.round(saleQuantity * saleUnitFactor * 1_000_000) / 1_000_000;
}

export function isValidSaleQuantity(quantity: number, allowFractionalSale: boolean) {
  return allowFractionalSale || Number.isInteger(quantity);
}
