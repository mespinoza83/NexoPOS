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

Fundación en desarrollo: API, Prisma, identidad y RBAC iniciales están implementados.

## Ejecutar localmente (Windows / VS Code)

Requisitos: Node.js 22 o superior, pnpm 10 o superior y Docker Desktop iniciado.

```powershell
cd C:\Desarrollo\nexopos
Copy-Item apps\api\.env.example apps\api\.env
docker compose up -d
pnpm install
pnpm --filter @nexopos/api db:generate
pnpm --filter @nexopos/api db:migrate -- --name initial_schema
$env:SEED_ADMIN_PASSWORD = "una-clave-local-de-al-menos-12-caracteres"
pnpm --filter @nexopos/api db:seed
pnpm dev
```

Abre `http://localhost:3000` para la interfaz y `http://localhost:3001/api/v1/health` para verificar la API. El archivo `.env` no se debe versionar ni compartir.

### Identidad y RBAC

- `POST /api/v1/auth/login`: recibe `email`, `password` y opcionalmente `businessId` y `branchId`. Devuelve el usuario y establece un JWT de acceso en la cookie HttpOnly `nexopos_access_token`.
- `GET /api/v1/auth/me`: requiere la cookie de sesión y devuelve usuario, roles, permisos y sucursales activas autorizadas.
- `POST /api/v1/auth/logout`: elimina la cookie de sesión.

Las rutas protegidas pueden usar `JwtAuthGuard` y combinar `@Roles(...)` o `@Permissions(...)` con `PermissionsGuard`. Los permisos se consultan desde Prisma en cada request, de modo que los cambios de estado, roles o sucursales tienen efecto sin esperar a que expire el JWT.

## Próximo paso

Tras confirmar las decisiones críticas indicadas en la documentación, se instalarán las dependencias y se implementará el módulo de identidad, permisos y configuración inicial.
