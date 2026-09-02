# Distribución local de NexoPOS para Windows

Esta distribución instala NexoPOS en una laptop Windows x64 sin entregar el repositorio, TypeScript ni mapas de código fuente. Incluye el runtime de Node.js, la aplicación compilada, PostgreSQL, inicio automático, respaldo diario y manual de usuario.

## Consideración de protección

El paquete compilado dificulta el acceso casual al código, pero ningún software JavaScript instalado en un equipo ajeno es imposible de inspeccionar. La protección contractual y una firma digital del instalador siguen siendo necesarias. La base de datos comercial pertenece al cliente y debe poder exportarse o restaurarse.

## Requisitos del equipo del cliente

- Windows 10 u 11 de 64 bits.
- Cuenta con permisos de administrador durante la instalación.
- 8 GB de RAM recomendados y al menos 5 GB libres.
- Puerto local 3000, 3001 y 5433 disponibles.
- Impresora térmica configurada en Windows, si aplica.

## Preparar el instalador

1. Descarga el instalador oficial x64 de PostgreSQL 16. PostgreSQL publica instaladores Windows con modo silencioso y también binarios aptos para integradores.
2. Instala Inno Setup 7 x64 en el equipo donde compilarás la entrega.
3. Ejecuta desde la raíz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File deployment\windows\build-package.ps1 `
  -PostgresInstaller C:\Descargas\postgresql-16-windows-x64.exe `
  -CompileInstaller
```

El resultado se crea en `deployment\windows\dist\NexoPOS-Setup-1.1.0-x64.exe`.

## Actualizar una instalación existente

La versión 1.1.0 detecta automáticamente una instalación previa. Antes de reemplazar los binarios detiene NexoPOS y crea un respaldo en `C:\ProgramData\NexoPOS\backups`. Conserva la base de datos, la licencia, las credenciales y los secretos existentes; después aplica únicamente las migraciones pendientes y vuelve a iniciar los servicios. Si el respaldo falla, la actualización se cancela.

## Instalación en la laptop

1. Copia únicamente `NexoPOS-Setup-x64.exe` y su hash/ firma digital.
2. Ejecuta como administrador.
3. Escribe nombre del cliente, correo del administrador y contraseña inicial.
4. Espera la instalación de PostgreSQL, migraciones y configuración inicial.
5. Abre NexoPOS desde el acceso directo del escritorio.
6. Comprueba `http://localhost:3000` y realiza una venta controlada.

Los secretos se generan localmente y se guardan en `C:\ProgramData\NexoPOS\nexopos.env`. No se incluyen en el instalador. El identificador de licencia se deriva del `MachineGuid` de Windows y el API comprueba esa correspondencia al iniciar; una copia realizada en otra laptop no iniciarÃ¡ con la licencia original.

## Inicio y respaldo

- La tarea `NexoPOS Inicio` levanta API y web al iniciar Windows.
- PostgreSQL se instala como servicio `NexoPOSPostgreSQL`.
- La tarea `NexoPOS Respaldo Diario` genera un respaldo a las 02:00.
- Se conservan los últimos 30 respaldos en `C:\ProgramData\NexoPOS\backups`.
- El acceso `Respaldar ahora` permite ejecutar un respaldo manual.

## Desinstalación

La desinstalación detiene NexoPOS y elimina sus tareas y servicio. Los datos y respaldos en `C:\ProgramData\NexoPOS` se conservan deliberadamente para evitar pérdida accidental. Su eliminación debe ser una decisión separada y respaldada.

## Entrega comercial

- Firma digitalmente el `.exe` con un certificado de firma de código.
- Entrega contrato/licencia de uso, alcance de soporte y política de respaldos.
- Conserva de forma privada repositorio, claves de firma y procedimiento de actualización.
- Registra cliente, identificador de instalación, versión y fecha de entrega.
