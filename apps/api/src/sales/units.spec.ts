import { inventoryQuantityForSale, isValidSaleQuantity } from './units';

describe('unidades de medida', () => {
  it('convierte unidades de venta a la unidad base del inventario', () => {
    expect(inventoryQuantityForSale(2, 453.592)).toBe(907.18);
    expect(inventoryQuantityForSale(3, 0.5)).toBe(1.5);
    expect(inventoryQuantityForSale(0.33, 0.333333)).toBe(0.11);
  });

  it('controla las ventas fraccionadas', () => {
    expect(isValidSaleQuantity(1.25, true)).toBe(true);
    expect(isValidSaleQuantity(1.25, false)).toBe(false);
    expect(isValidSaleQuantity(2, false)).toBe(true);
  });

  it('rechaza factores inválidos', () => {
    expect(() => inventoryQuantityForSale(1, 0)).toThrow('Factor de conversión inválido.');
  });
});
