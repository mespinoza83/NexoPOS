# NexoPOS

Sistema web de punto de venta e inventario, multi-sucursal y en español.

## Arquitectura

El proyecto es un monorepo con:

- `apps/web`: Next.js y TypeScript para la interfaz responsive.
- `apps/api`: NestJS, TypeScript y API REST versionada.
- PostgreSQL: datos transaccionales.
- Redis (fase de despliegue): caché, colas y limitación de solicitudes.

La documentación funcional y de datos está en [`docs/arquitectura.md`](docs/arquitectura.md).

## Estado

La versión piloto incluye autenticación y RBAC, administración del negocio,
catálogo e inventario, ventas multimoneda, pagos mixtos, caja, anulaciones,
devoluciones, impresión térmica, auditoría y reportes exportables.

La validación automatizada actual comprende 28 pruebas del API y 8 pruebas E2E
en Chromium. Consulta [la guía operativa](docs/operacion.md) para los flujos de
trabajo y el procedimiento de liberación.

## Ejecutar localmente (Windows / VS Code)

Requisitos: Node.js 22 o superior, pnpm 10 o superior y Docker Desktop iniciado.

```powershell
cd C:\Desarrollo\nexopos
Copy-Item apps\api\.env.example apps\api\.env
docker compose up -d
pnpm install
pnpm --filter @nexopos/api db:generate
pnpm --filter @nexopos/api db:migrate -- --name initial_schema
$env:SEED_ADMIN_PASSWORD = "define-una-clave-local-segura"
pnpm --filter @nexopos/api db:seed
pnpm dev
```

Abre `http://localhost:3000` para la interfaz y `http://localhost:3001/api/v1/health` para verificar la API. El archivo `.env` no se debe versionar ni compartir.

### Identidad y RBAC

- `POST /api/v1/auth/login`: recibe `email`, `password` y opcionalmente `businessId` y `branchId`. Devuelve el usuario y establece un JWT de acceso en la cookie HttpOnly `nexopos_access_token`.
- `GET /api/v1/auth/me`: requiere la cookie de sesión y devuelve usuario, roles, permisos y sucursales activas autorizadas.
- `POST /api/v1/auth/logout`: elimina la cookie de sesión.

Las rutas protegidas pueden usar `JwtAuthGuard` y combinar `@Roles(...)` o `@Permissions(...)` con `PermissionsGuard`. Los permisos se consultan desde Prisma en cada request, de modo que los cambios de estado, roles o sucursales tienen efecto sin esperar a que expire el JWT.

## Validación

```powershell
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
$env:E2E_ADMIN_EMAIL = "admin@nexopos.local"
$env:E2E_ADMIN_PASSWORD = "la-clave-local-del-administrador"
pnpm test:e2e
```

Las pruebas E2E modifican únicamente la base local de desarrollo de forma
controlada. No deben ejecutarse contra producción.

## Antes de producción

- Reemplazar los secretos locales por valores únicos administrados fuera del repositorio.
- Configurar HTTPS, dominio, CORS definitivo y limitación de solicitudes.
- Automatizar respaldos y probar la restauración de PostgreSQL.
- Centralizar logs y monitorear disponibilidad, errores y almacenamiento.
- Completar una prueba de aceptación con usuarios y dispositivos reales.
