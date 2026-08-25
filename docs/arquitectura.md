# Arquitectura de NexoPOS

## Objetivo y alcance inicial

NexoPOS es un POS web multi-sucursal para ventas de contado, inventario, cajas, pagos mixtos, devoluciones y auditoría. La primera versión no habilita crédito ni cuentas por cobrar, pero conserva la relación opcional de cliente en las ventas.

## Arquitectura recomendada

Monorepo `pnpm` con TypeScript de extremo a extremo:

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| Web | Next.js, React, Tailwind CSS | POS, administración y reportes responsive |
| API | NestJS, REST/OpenAPI, class-validator | reglas de negocio, autorización y transacciones |
| Datos | PostgreSQL + Prisma ORM | integridad, migraciones y consultas |
| Operación | Docker Compose | PostgreSQL, Redis y ejecución local reproducible |
| Seguridad | Argon2id, JWT rotatorio en cookie segura, RBAC | identidad, sesiones y permisos granulares |

La API es el único componente que accede a la base de datos. Las operaciones que afectan dinero o existencias se ejecutan en transacciones de PostgreSQL y generan una entrada de auditoría.

## Principios críticos

- Los importes se almacenan como `numeric(14,2)` y nunca como `float`.
- Las existencias se calculan y resguardan por `producto + sucursal`; los movimientos son inmutables y las anulaciones generan reversos trazables.
- Una factura pagada no se edita. Anulaciones y devoluciones son documentos independientes.
- Los permisos se validan en la API; ocultar un botón en la interfaz no es autorización.
- Productos y categorías con historial se desactivan, no se eliminan.
- Las contraseñas se guardan solo como hash Argon2id, nunca en texto plano.

## Decisiones confirmadas

- **Jurisdicción:** Nicaragua, con IVA inicial del 15 % configurable desde administración.
- **Monedas:** Córdobas nicaragüenses (`NIO`) y dólares estadounidenses (`USD`); la moneda y tasa de cambio se seleccionan y registran en cada factura.
- **Existencias:** no se permite confirmar una venta si un artículo no tiene existencia disponible. No habrá excepción por rol en la primera versión.
- **Comprobantes:** se imprimen comprobantes térmicos. La factura electrónica fiscal no se implementa en v1, pero la configuración queda preparada para integrarla.
- **Devoluciones POS:** se registran manualmente, con referencia, autorización, usuario y auditoría; no habrá integración con el adquirente bancario en v1.

## Datos iniciales de desarrollo

- **Negocio:** Comercial NexoPacífico, S.A.
- **RUC:** opcional; el negocio de prueba se crea sin RUC.
- **Primera sucursal:** Sucursal de Pruebas (`PRUEBAS`).

## Modelo de datos relacional

### Organización e identidad

- `businesses`: datos fiscales, moneda y configuración global.
- `branches`: sucursales pertenecientes al negocio.
- `users`: identidad, hash de contraseña, estado y metadatos de acceso.
- `roles`, `permissions`, `role_permissions`, `user_branches`: RBAC y alcance por sucursal.
- `audit_logs`: actor, acción, entidad, valores anteriores/nuevos, motivo, IP y fecha.

### Catálogo e inventario

- `categories`: categoría, estado y negocio.
- `products`: código interno único por negocio, código de barras opcional único, precios, impuesto, estado y disponibilidad.
- `product_images`: imagen opcional del producto.
- `branch_inventory`: saldo actual y mínimo por producto/sucursal; clave única compuesta.
- `inventory_movements`: kardex inmutable con tipo, cantidad, saldo previo/posterior, documento y responsable.
- `inventory_transfers` y `inventory_transfer_items`: reservados para transferencia futura entre sucursales.

### Ventas y cobros

- `customers`: opcional y preparado para crédito futuro.
- `invoice_sequences`: consecutivo transaccional por sucursal y serie.
- `invoices`: cabecera, estado, totales, caja, cliente opcional y usuario.
- `invoice_items`: cantidades, precio/costo históricos, descuento e impuestos congelados.
- `invoice_discounts`: descuentos por factura o línea, responsable y motivo.
- `payment_methods`, `banks`, `pos_terminals`: configuración activa por sucursal.
- `invoice_payments`: uno o más pagos, banco/terminal/referencia/tarjeta cuando corresponda.

### Caja y devoluciones

- `cash_registers`: caja física/lógica por sucursal.
- `cash_sessions`: apertura, cierre, efectivo esperado/contado/diferencia y estado.
- `cash_movements`: ingresos, retiros, gastos y ajustes autorizados.
- `returns`, `return_items`, `return_refunds`: documento independiente, artículos, motivo, aprobación y reembolsos.

### Restricciones esenciales

- Índices únicos: `(business_id, internal_code)`, `(business_id, barcode)` cuando no sea nulo, `(branch_id, product_id)` y `(branch_id, invoice_number)`.
- Restricciones de cantidad positiva, porcentaje entre 0 y 100 y pagos positivos.
- Una devolución no puede superar la cantidad vendida menos la ya devuelta.
- La confirmación de una venta bloquea el inventario afectado y verifica disponibilidad en la misma transacción.

## Pantallas y flujos principales

1. **Inicio de sesión** → selección de sucursal autorizada → apertura de caja si no existe una sesión activa.
2. **POS** → búsqueda/lector → carrito → descuentos autorizados → pagos mixtos → confirmación transaccional → impresión/reimpresión autorizada.
3. **Catálogo** → categorías → producto → saldo por sucursal y ajustes auditados.
4. **Caja** → apertura → movimientos autorizados → cierre con arqueo y diferencia.
5. **Devoluciones** → localizar factura → seleccionar cantidades → aprobación → reembolso/restauración de inventario.
6. **Administración** → usuarios/roles, sucursales, impuestos, bancos, POS, métodos de pago y numeración.
7. **Reportes** → filtros compartidos → vista/exportación PDF o Excel.

## Fases priorizadas

1. **Fundación:** monorepo, PostgreSQL, migraciones, identidad, RBAC, auditoría y configuración del negocio.
2. **Catálogo e inventario:** productos, categorías, existencias por sucursal, movimientos y alertas.
3. **POS y caja:** facturas, descuentos, impuestos, pagos mixtos, sesiones de caja e impresión térmica.
4. **Correcciones controladas:** anulaciones, devoluciones, reversos y trazabilidad completa.
5. **Información y operación:** reportes, exportación, monitoreo, copias de seguridad y despliegue.

## Decisiones que deben confirmarse antes de los módulos afectados

1. **País y régimen fiscal:** determina formato de factura, identificadores y reglas legales de impuestos.
2. **Moneda y redondeo:** propongo moneda configurable con redondeo a dos decimales inicialmente.
3. **Venta sin existencias:** propongo deshabilitarla por defecto y concederla solo mediante permiso explícito.
4. **Devolución de tarjeta/POS:** ¿se integra con el adquirente/terminal o se registra como reembolso manual verificado? Propongo registro manual en v1, sin integración bancaria.
5. **Impresión térmica:** propongo impresión desde navegador mediante plantilla 58/80 mm; la impresión silenciosa directa requeriría un agente local o integración específica.
6. **Factura electrónica:** ¿se requiere en v1? No debe asumirse porque cambia el diseño de numeración, firma y envío fiscal.
7. **Negocio inicial:** nombre legal, identificación fiscal, sucursal inicial, impuestos y catálogo de métodos de pago para las migraciones de datos iniciales.
