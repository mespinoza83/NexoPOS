# Unidades de medida en NexoPOS

Cada producto define cuatro datos relacionados:

- **Unidad de inventario:** unidad base en la que se reciben, cuentan y ajustan existencias.
- **Unidad de venta:** unidad que el cajero utiliza al vender.
- **Equivalencia:** cantidad de inventario que se descuenta por cada unidad vendida.
- **PresentaciÃ³n:** texto descriptivo, por ejemplo `Botella 12 oz` o `Saco 50 lb`.

Los productos existentes conservan `Unidad` como unidad de inventario y venta, con equivalencia `1`.

## Ejemplos

| Producto | Inventario | Venta | Equivalencia | Fraccionado |
|---|---|---|---:|---|
| Gaseosa en botella | Unidad | Unidad | 1 | No |
| Carne almacenada en gramos | Gramo | Libra | 453.592 | SÃ­ |
| Aceite almacenado en mililitros | Mililitro | Litro | 1000 | SÃ­ |
| Huevos almacenados individualmente | Unidad | Docena | 12 | No |

La existencia inicial, entradas, conteos, ajustes y mÃ­nimos siempre se registran en la unidad de inventario. El precio de venta corresponde a una unidad de venta. El precio de compra corresponde a una unidad base de inventario.

Las ventas guardan una copia de la unidad y equivalencia utilizadas. Por eso una devoluciÃ³n o anulaciÃ³n restaura correctamente el inventario aunque la configuraciÃ³n del producto cambie posteriormente.

La unidad de inventario no se puede cambiar mientras exista inventario distinto de cero en alguna sucursal. Primero debe realizarse un conteo o ajuste autorizado que deje la existencia en cero.
