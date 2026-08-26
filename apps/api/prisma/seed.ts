import { PrismaClient, PaymentKind } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const rawPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!rawPassword || rawPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  const business = await prisma.business.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      legalName: 'Comercial NexoPacífico, S.A.',
      defaultCurrency: 'NIO',
      ivaRate: 15,
      invoicesElectronic: false,
      receiptMessage: 'Gracias por su compra.',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { businessId_code: { businessId: business.id, code: 'PRUEBAS' } },
    update: {},
    create: { businessId: business.id, code: 'PRUEBAS', name: 'Sucursal de Pruebas' },
  });

  await prisma.cashRegister.upsert({
    where: { branchId_code: { branchId: branch.id, code: 'CAJA-01' } },
    update: { name: 'Caja principal', active: true },
    create: { branchId: branch.id, code: 'CAJA-01', name: 'Caja principal' },
  });

  const permissions = [
    ['products.manage', 'Gestionar productos'],
    ['sales.create', 'Registrar ventas'],
    ['sales.negative_inventory', 'Vender con inventario negativo'],
    ['prices.change', 'Cambiar precios'],
    ['inventory.adjust', 'Ajustar inventario'],
    ['sales.discount', 'Aplicar descuentos'],
    ['sales.void', 'Anular facturas'],
    ['returns.process', 'Procesar devoluciones'],
    ['invoices.reprint', 'Reimprimir facturas'],
    ['cash.manage', 'Gestionar caja'],
    ['cash.withdrawals', 'Registrar retiros y gastos'],
    ['reports.sensitive.read', 'Consultar reportes sensibles'],
    ['settings.manage', 'Gestionar configuración'],
  ];
  for (const [code, name] of permissions) {
    await prisma.permission.upsert({
      where: { businessId_code: { businessId: business.id, code } },
      update: {},
      create: { businessId: business.id, code, name },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { businessId_code: { businessId: business.id, code: 'ADMIN' } },
    update: {},
    create: { businessId: business.id, code: 'ADMIN', name: 'Administrador', system: true },
  });
  const allPermissions = await prisma.permission.findMany({ where: { businessId: business.id } });
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  const cashierRole = await prisma.role.upsert({
    where: { businessId_code: { businessId: business.id, code: 'CASHIER' } },
    update: { name: 'Cajero' },
    create: { businessId: business.id, code: 'CASHIER', name: 'Cajero', system: true },
  });
  const cashierPermissionCodes = ['sales.create', 'sales.discount', 'cash.manage', 'invoices.reprint'];
  const cashierPermissions = allPermissions.filter(({ code }) => cashierPermissionCodes.includes(code));
  for (const permission of cashierPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: cashierRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: cashierRole.id, permissionId: permission.id },
    });
  }

  const user = await prisma.user.upsert({
    where: { businessId_email: { businessId: business.id, email: 'admin@nexopos.local' } },
    update: {},
    create: {
      businessId: business.id,
      email: 'admin@nexopos.local',
      passwordHash: await argon2.hash(rawPassword, { type: argon2.argon2id }),
      firstName: 'Administrador',
      lastName: 'NexoPOS',
    },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: adminRole.id } }, update: {}, create: { userId: user.id, roleId: adminRole.id } });
  await prisma.userBranch.upsert({ where: { userId_branchId: { userId: user.id, branchId: branch.id } }, update: {}, create: { userId: user.id, branchId: branch.id } });

  const paymentMethods: Array<[string, string, PaymentKind]> = [
  ['CASH', 'Efectivo', PaymentKind.CASH],
  ['TRANSFER', 'Transferencia bancaria', PaymentKind.BANK_TRANSFER],
  ['POS', 'Tarjeta POS', PaymentKind.POS],
  ['OTHER', 'Otro método', PaymentKind.OTHER],
];

for (const [code, name, kind] of paymentMethods) {
  await prisma.paymentMethod.upsert({
    where: { businessId_code: { businessId: business.id, code } },
    update: {},
    create: { businessId: business.id, code, name, kind },
  });
}

const bank = await prisma.bank.upsert({ where: { businessId_name: { businessId: business.id, name: 'Banco de Pruebas' } }, update: {}, create: { businessId: business.id, name: 'Banco de Pruebas' } });
await prisma.posTerminal.upsert({ where: { branchId_code: { branchId: branch.id, code: 'POS-01' } }, update: { bankId: bank.id }, create: { branchId: branch.id, bankId: bank.id, code: 'POS-01', name: 'Terminal POS 01' } });
}

main().finally(() => prisma.$disconnect());
