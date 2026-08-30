# Guía operativa de NexoPOS

## Inicio de jornada

1. Inicia sesión con un usuario activo.
2. Confirma que la sucursal mostrada sea la correcta.
3. Abre **Caja**.
4. Selecciona la caja registradora e ingresa el efectivo inicial contado.
5. Verifica que el estado sea **Abierta** antes de recibir pagos en efectivo.

## Registrar una venta

1. Abre **Ventas**.
2. Busca el producto por nombre, código interno o código de barras.
3. Confirma cantidad, descuentos y moneda.
4. Selecciona uno o varios métodos de pago.
5. En transferencia o POS, registra banco, terminal y referencia cuando corresponda.
6. Confirma la venta y entrega o imprime el comprobante.

Transferencias y POS quedan registrados en la factura y los reportes, pero no
aumentan el efectivo esperado. El cambio solamente puede originarse de un pago
en efectivo.

## Anular una venta

1. Localiza la factura desde Ventas o el historial.
2. Selecciona **Anular venta**.
3. Escribe un motivo verificable y confirma.

La anulación restaura las existencias y revierte únicamente el efectivo
recibido. La factura permanece disponible con estado **Anulada**.

## Registrar una devolución

1. Localiza la factura.
2. Selecciona **Registrar devolución**.
3. Indica productos, cantidades, motivo y método de reembolso.
4. Confirma el reembolso.

La devolución restaura las cantidades indicadas. La factura cambia a
**Devuelta parcialmente** o **Devuelta totalmente**. Un reembolso en efectivo
reduce la caja; transferencia y POS se registran sin modificar el efectivo
físico.

## Movimientos y cierre de caja

- **Ingreso**: efectivo añadido que no corresponde a una venta.
- **Retiro**: efectivo retirado.
- **Gasto**: salida respaldada por un motivo.

Para cerrar:

1. Revisa el efectivo esperado y los movimientos.
2. Cuenta físicamente el efectivo.
3. Selecciona **Cerrar caja** e ingresa el monto contado.
4. Revisa la diferencia y documenta cualquier desviación.

Transferencias y POS no forman parte del efectivo contado.

## Reportes y auditoría

- **Ventas**: facturas, estados, clientes, cajeros y métodos de pago.
- **Productos**: cantidades netas, devoluciones, ventas, costo y utilidad.
- **Inventario**: existencias, mínimos, alertas y valoración.
- **Caja**: turnos, efectivo, diferencias, gastos y retiros.
- **Auditoría**: acciones administrativas y transaccionales según permisos.

Las exportaciones llamadas **Excel** generan CSV compatible con Excel. Los PDF
se producen mediante una vista imprimible del navegador.

## Validar una liberación

```powershell
pnpm lint
pnpm test
pnpm build
$env:E2E_ADMIN_EMAIL = "admin@nexopos.local"
$env:E2E_ADMIN_PASSWORD = "la-clave-local-del-administrador"
pnpm test:e2e
```

Resultado esperado para la versión piloto:

- 28 pruebas del API aprobadas.
- 8 pruebas E2E aprobadas.
- Compilación del API y la web sin errores.

## Incidentes

1. Evita repetir una venta si no conoces su resultado; consulta el historial.
2. No edites directamente las tablas de facturas, inventario o caja.
3. Conserva hora, usuario, sucursal, factura y mensaje mostrado.
4. Consulta Auditoría y los logs del API.
5. Restaura respaldos solamente mediante un procedimiento probado.
