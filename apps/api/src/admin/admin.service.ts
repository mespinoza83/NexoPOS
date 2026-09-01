import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateTaxSettingsDto } from './dto/update-tax-settings.dto';
import { AuthenticatedUser } from '../auth/auth.types';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreatePosTerminalDto } from './dto/create-pos-terminal.dto';
import { UpdatePosTerminalDto } from './dto/update-pos-terminal.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { UpdateInvoiceSequenceDto } from './dto/update-invoice-sequence.dto';
import { UpdateMeasurementUnitDto } from './dto/update-measurement-unit.dto';
import { CreateMeasurementUnitDto } from './dto/create-measurement-unit.dto';

const DEFAULT_MEASUREMENT_UNITS = [
  ['UNIT', 'Unidad', 'unid.', 0], ['GRAM', 'Gramo', 'g', 2], ['KILOGRAM', 'Kilogramo', 'kg', 2],
  ['POUND', 'Libra', 'lb', 2], ['OUNCE', 'Onza', 'oz', 2], ['MILLILITER', 'Mililitro', 'ml', 2],
  ['LITER', 'Litro', 'L', 2], ['FLUID_OUNCE', 'Onza líquida', 'fl oz', 2], ['METER', 'Metro', 'm', 2],
  ['CENTIMETER', 'Centímetro', 'cm', 2], ['DOZEN', 'Docena', 'doc.', 2], ['BOX', 'Caja', 'caja', 0],
  ['PACKAGE', 'Paquete', 'paq.', 0],
] as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(businessId: string) {
    await this.ensureMeasurementUnits(businessId);
    const [users, roles, permissions, branches, business, banks, customers, terminals, paymentMethods, cashRegisters, invoiceSequences, measurementUnits] = await Promise.all([
      this.prisma.user.findMany({ where: { businessId }, select: { id: true, email: true, firstName: true, lastName: true, status: true, roles: { select: { role: { select: { id: true, code: true, name: true } } } }, branches: { select: { branch: { select: { id: true, code: true, name: true } } } } }, orderBy: { lastName: 'asc' } }),
      this.prisma.role.findMany({ where: { businessId }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.permission.findMany({ where: { businessId }, orderBy: { code: 'asc' } }),
      this.prisma.branch.findMany({ where: { businessId }, select: { id: true, code: true, name: true, address: true, phone: true, active: true, _count: { select: { users: true, registers: true, invoices: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { legalName: true, commercialName: true, taxId: true, address: true, phone: true, email: true, logoUrl: true, defaultCurrency: true, exchangeRate: true, timezone: true, receiptPaperWidth: true, receiptMessage: true, taxesEnabled: true, ivaRate: true } }),
      this.prisma.bank.findMany({ where: { businessId }, select: { id: true, name: true, active: true, _count: { select: { terminals: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.customer.findMany({ where: { businessId }, select: { id: true, name: true, taxId: true, phone: true, email: true, active: true, _count: { select: { invoices: true } } }, orderBy: { name: 'asc' }, take: 1000 }),
      this.prisma.posTerminal.findMany({ where: { branch: { businessId } }, select: { id: true, code: true, name: true, active: true, bankId: true, branchId: true, bank: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } }, orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }] }),
      this.prisma.paymentMethod.findMany({ where: { businessId }, select: { id: true, code: true, name: true, kind: true, active: true, _count: { select: { payments: true, returnRefunds: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.cashRegister.findMany({ where: { branch: { businessId } }, select: { id: true, branchId: true, code: true, name: true, active: true, branch: { select: { id: true, name: true } }, _count: { select: { sessions: true } } }, orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }] }),
      this.prisma.invoiceSequence.findMany({ where: { branch: { businessId } }, select: { id: true, branchId: true, series: true, next: true, branch: { select: { id: true, name: true } } }, orderBy: { branch: { name: 'asc' } } }),
      this.prisma.measurementUnit.findMany({ where: { businessId }, select: { id: true, code: true, name: true, abbreviation: true, decimals: true, active: true }, orderBy: { name: 'asc' } }),
    ]);
    return { users, roles, permissions, branches, business, banks, customers, terminals, paymentMethods, cashRegisters, invoiceSequences, measurementUnits };
  }

  private async ensureMeasurementUnits(businessId: string) {
    await this.prisma.$transaction(DEFAULT_MEASUREMENT_UNITS.map(([code, name, abbreviation, decimals]) => this.prisma.measurementUnit.upsert({
      where: { businessId_code: { businessId, code } },
      create: { businessId, code, name, abbreviation, decimals },
      update: {},
    })));
  }

  async updateMeasurementUnit(businessId: string, unitId: string, dto: UpdateMeasurementUnitDto) {
    const unit = await this.prisma.measurementUnit.findFirst({ where: { id: unitId, businessId } });
    if (!unit) throw new NotFoundException('Unidad de medida no encontrada.');
    await this.prisma.measurementUnit.update({ where: { id: unitId }, data: {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.abbreviation !== undefined ? { abbreviation: dto.abbreviation.trim() } : {}),
      ...(dto.decimals !== undefined ? { decimals: dto.decimals } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    } });
    return this.overview(businessId);
  }

  async createMeasurementUnit(businessId: string, dto: CreateMeasurementUnitDto) {
    try {
      await this.prisma.measurementUnit.create({ data: { businessId, code: dto.code.trim().toUpperCase(), name: dto.name.trim(), abbreviation: dto.abbreviation.trim(), decimals: dto.decimals } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una unidad con ese código.');
      throw error;
    }
  }

  async deleteMeasurementUnit(businessId: string, unitId: string) {
    const unit = await this.prisma.measurementUnit.findFirst({ where: { id: unitId, businessId } });
    if (!unit) throw new NotFoundException('Unidad de medida no encontrada.');
    const [products, invoices] = await Promise.all([
      this.prisma.product.count({ where: { businessId, OR: [{ inventoryUnit: unit.code }, { saleUnit: unit.code }] } }),
      this.prisma.invoiceItem.count({ where: { saleUnit: unit.code, invoice: { branch: { businessId } } } }),
    ]);
    if (products || invoices) throw new ConflictException('No se puede eliminar una medida utilizada por productos o facturas. Puede inactivarla.');
    await this.prisma.measurementUnit.delete({ where: { id: unitId } });
    return this.overview(businessId);
  }

  async auditLogs(businessId: string, query: Record<string, string | undefined>) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(query.pageSize) || 25));
    const dateFrom = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00`) : undefined;
    const dateTo = query.dateTo ? new Date(`${query.dateTo}T23:59:59.999`) : undefined;
    const where = { businessId, ...(query.userId ? { userId: query.userId } : {}), ...(query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {}), ...(query.entityType ? { entityType: query.entityType } : {}), ...((dateFrom || dateTo) ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}) };
    const [items, totalRecords, users, actions, entityTypes] = await Promise.all([
      this.prisma.auditLog.findMany({ where, select: { id: true, action: true, entityType: true, entityId: true, reason: true, ipAddress: true, before: true, after: true, createdAt: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditLog.count({ where }),
      this.prisma.user.findMany({ where: { businessId }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
      this.prisma.auditLog.findMany({ where: { businessId }, distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      this.prisma.auditLog.findMany({ where: { businessId }, distinct: ['entityType'], select: { entityType: true }, orderBy: { entityType: 'asc' } }),
    ]);
    return { items, filters: { users, actions: actions.map(({ action }) => action), entityTypes: entityTypes.map(({ entityType }) => entityType) }, pagination: { page, pageSize, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)) } };
  }

  async createBranch(businessId: string, dto: CreateBranchDto) {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const branch = await transaction.branch.create({ data: { businessId, code: dto.code.trim().toUpperCase(), name: dto.name.trim(), address: dto.address?.trim() || null, phone: dto.phone?.trim() || null } });
        await transaction.cashRegister.create({ data: { branchId: branch.id, code: 'CAJA-01', name: 'Caja principal' } });
        await transaction.invoiceSequence.create({ data: { branchId: branch.id } });
      });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una sucursal con ese código.');
      throw error;
    }
  }

  async updateBranch(businessId: string, branchId: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, businessId } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada.');
    if (dto.active === false && branch.active) {
      const [activeBranches, openSessions] = await Promise.all([
        this.prisma.branch.count({ where: { businessId, active: true } }),
        this.prisma.cashSession.count({ where: { cashRegister: { branchId }, status: 'OPEN' } }),
      ]);
      if (activeBranches <= 1) throw new ConflictException('El negocio debe conservar al menos una sucursal activa.');
      if (openSessions > 0) throw new ConflictException('Cierre las cajas abiertas antes de inactivar la sucursal.');
    }
    try {
      await this.prisma.branch.update({ where: { id: branchId }, data: { ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}), ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}), ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una sucursal con ese código.');
      throw error;
    }
  }

  async createCustomer(businessId: string, dto: CreateCustomerDto) {
    await this.prisma.customer.create({ data: { businessId, name: dto.name.trim(), taxId: dto.taxId?.trim() || null, phone: dto.phone?.trim() || null, email: dto.email?.trim().toLowerCase() || null } });
    return this.overview(businessId);
  }

  async updateCustomer(businessId: string, customerId: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, businessId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    await this.prisma.customer.update({ where: { id: customerId }, data: { ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.taxId !== undefined ? { taxId: dto.taxId.trim() || null } : {}), ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}), ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() || null } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
    return this.overview(businessId);
  }

  async createBank(businessId: string, rawName?: string) {
    const name = rawName?.trim();
    if (!name) throw new ConflictException('Indique el nombre del banco.');
    try {
      await this.prisma.bank.create({ data: { businessId, name } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un banco con ese nombre.');
      throw error;
    }
  }

  async updateBank(businessId: string, bankId: string, dto: { name?: string; active?: boolean }) {
    const bank = await this.prisma.bank.findFirst({ where: { id: bankId, businessId } });
    if (!bank) throw new NotFoundException('Banco no encontrado.');
    try {
      await this.prisma.bank.update({ where: { id: bankId }, data: { ...(dto.name?.trim() ? { name: dto.name.trim() } : {}), ...(typeof dto.active === 'boolean' ? { active: dto.active } : {}) } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un banco con ese nombre.');
      throw error;
    }
  }

  async createPosTerminal(businessId: string, dto: CreatePosTerminalDto) {
    const [branch, bank] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: dto.branchId, businessId, active: true }, select: { id: true } }),
      this.prisma.bank.findFirst({ where: { id: dto.bankId, businessId, active: true }, select: { id: true } }),
    ]);
    if (!branch || !bank) throw new NotFoundException('La sucursal o el banco no pertenece al negocio o está inactivo.');
    try {
      await this.prisma.posTerminal.create({ data: { branchId: branch.id, bankId: bank.id, code: dto.code.trim().toUpperCase(), name: dto.name.trim() } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una terminal con ese código en la sucursal.');
      throw error;
    }
  }

  async updatePosTerminal(businessId: string, terminalId: string, dto: UpdatePosTerminalDto) {
    const terminal = await this.prisma.posTerminal.findFirst({ where: { id: terminalId, branch: { businessId } } });
    if (!terminal) throw new NotFoundException('Terminal POS no encontrada.');
    const branchId = dto.branchId ?? terminal.branchId;
    const bankId = dto.bankId ?? terminal.bankId;
    const [branch, bank] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: branchId, businessId }, select: { id: true } }),
      this.prisma.bank.findFirst({ where: { id: bankId, businessId }, select: { id: true } }),
    ]);
    if (!branch || !bank) throw new NotFoundException('La sucursal o el banco no pertenece al negocio.');
    try {
      await this.prisma.posTerminal.update({ where: { id: terminalId }, data: { branchId, bankId, ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}), ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una terminal con ese código en la sucursal.');
      throw error;
    }
  }

  async createPaymentMethod(businessId: string, dto: CreatePaymentMethodDto) {
    try {
      await this.prisma.paymentMethod.create({ data: { businessId, code: dto.code.trim().toUpperCase(), name: dto.name.trim(), kind: dto.kind } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un método de pago con ese código.');
      throw error;
    }
  }

  async updatePaymentMethod(businessId: string, methodId: string, dto: UpdatePaymentMethodDto) {
    const method = await this.prisma.paymentMethod.findFirst({ where: { id: methodId, businessId } });
    if (!method) throw new NotFoundException('Método de pago no encontrado.');
    if (dto.kind && dto.kind !== method.kind) {
      const uses = await this.prisma.invoicePayment.count({ where: { paymentMethodId: methodId } });
      if (uses > 0) throw new ConflictException('No se puede cambiar el tipo de un método que ya tiene pagos registrados.');
    }
    if (dto.active === false && method.active) {
      const activeMethods = await this.prisma.paymentMethod.count({ where: { businessId, active: true } });
      if (activeMethods <= 1) throw new ConflictException('El negocio debe conservar al menos un método de pago activo.');
    }
    try {
      await this.prisma.paymentMethod.update({ where: { id: methodId }, data: { ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}), ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.kind ? { kind: dto.kind } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un método de pago con ese código.');
      throw error;
    }
  }

  async createCashRegister(businessId: string, dto: CreateCashRegisterDto) {
    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, businessId, active: true }, select: { id: true } });
    if (!branch) throw new NotFoundException('Sucursal no disponible.');
    try {
      await this.prisma.cashRegister.create({ data: { branchId: branch.id, code: dto.code.trim().toUpperCase(), name: dto.name.trim() } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una caja con ese código en la sucursal.');
      throw error;
    }
  }

  async updateCashRegister(businessId: string, registerId: string, dto: UpdateCashRegisterDto) {
    const register = await this.prisma.cashRegister.findFirst({ where: { id: registerId, branch: { businessId } } });
    if (!register) throw new NotFoundException('Caja registradora no encontrada.');
    if (dto.active === false && register.active) {
      const openSession = await this.prisma.cashSession.findFirst({ where: { cashRegisterId: registerId, status: 'OPEN' }, select: { id: true } });
      if (openSession) throw new ConflictException('Cierre la sesión abierta antes de inactivar la caja.');
    }
    try {
      await this.prisma.cashRegister.update({ where: { id: registerId }, data: { ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}), ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una caja con ese código en la sucursal.');
      throw error;
    }
  }

  async updateInvoiceSequence(businessId: string, sequenceId: string, dto: UpdateInvoiceSequenceDto) {
    const sequence = await this.prisma.invoiceSequence.findFirst({ where: { id: sequenceId, branch: { businessId } } });
    if (!sequence) throw new NotFoundException('Numeración de factura no encontrada.');
    if (dto.next < sequence.next) throw new ConflictException(`El próximo número no puede ser menor que ${sequence.next}.`);
    await this.prisma.invoiceSequence.update({ where: { id: sequenceId }, data: { next: dto.next } });
    return this.overview(businessId);
  }

  async updateTaxSettings(user: AuthenticatedUser, dto: UpdateTaxSettingsDto) {
    const before = await this.prisma.business.findUniqueOrThrow({ where: { id: user.businessId }, select: { taxesEnabled: true, ivaRate: true } });
    await this.prisma.$transaction([
      this.prisma.business.update({ where: { id: user.businessId }, data: { taxesEnabled: dto.taxesEnabled, ivaRate: dto.ivaRate } }),
      this.prisma.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'TAX_SETTINGS_UPDATED', entityType: 'Business', entityId: user.businessId, before: { taxesEnabled: before.taxesEnabled, ivaRate: Number(before.ivaRate) }, after: { taxesEnabled: dto.taxesEnabled, ivaRate: dto.ivaRate } } }),
    ]);
    return this.overview(user.businessId);
  }

  async updateBusinessSettings(user: AuthenticatedUser, dto: UpdateBusinessSettingsDto) {
    const normalized = { ...dto, defaultCurrency: dto.defaultCurrency.toUpperCase(), commercialName: dto.commercialName || null, taxId: dto.taxId || null, address: dto.address || null, phone: dto.phone || null, email: dto.email || null, logoUrl: dto.logoUrl || null, receiptMessage: dto.receiptMessage || null };
    const before = await this.prisma.business.findUniqueOrThrow({ where: { id: user.businessId }, select: { legalName: true, commercialName: true, taxId: true, address: true, phone: true, email: true, logoUrl: true, defaultCurrency: true, exchangeRate: true, timezone: true, receiptPaperWidth: true, receiptMessage: true } });
    await this.prisma.$transaction([
      this.prisma.business.update({ where: { id: user.businessId }, data: normalized }),
      this.prisma.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'BUSINESS_SETTINGS_UPDATED', entityType: 'Business', entityId: user.businessId, before, after: normalized } }),
    ]);
    return this.overview(user.businessId);
  }

  async createUser(businessId: string, dto: CreateUserDto) {
    const [roles, branches] = await Promise.all([
      this.prisma.role.findMany({ where: { id: { in: dto.roleIds }, businessId } }),
      this.prisma.branch.findMany({ where: { id: { in: dto.branchIds }, businessId, active: true } }),
    ]);
    if (roles.length !== dto.roleIds.length || branches.length !== dto.branchIds.length) throw new NotFoundException('Rol o sucursal no disponible.');
    try {
      return await this.prisma.user.create({ data: { businessId, email: dto.email.toLowerCase(), firstName: dto.firstName, lastName: dto.lastName, passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }), status: dto.status ?? 'ACTIVE', roles: { create: dto.roleIds.map((roleId) => ({ roleId })) }, branches: { create: dto.branchIds.map((branchId) => ({ branchId })) } }, select: { id: true, email: true, firstName: true, lastName: true, status: true } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un usuario con ese correo.');
      throw error;
    }
  }

  async updateRolePermissions(businessId: string, roleId: string, dto: UpdateRolePermissionsDto) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, businessId } });
    if (!role) throw new NotFoundException('Rol no encontrado.');
    const permissions = await this.prisma.permission.findMany({ where: { id: { in: dto.permissionIds }, businessId } });
    if (permissions.length !== dto.permissionIds.length) throw new NotFoundException('Permiso no disponible.');
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...dto.permissionIds.map((permissionId) => this.prisma.rolePermission.create({ data: { roleId, permissionId } })),
    ]);
    return this.overview(businessId);
  }

  async createRole(businessId: string, dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({ data: { businessId, code: dto.code.toUpperCase(), name: dto.name, description: dto.description } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un rol con ese código.');
      throw error;
    }
  }

  async updateUser(businessId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, businessId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, businessId } });
      if (!role) throw new NotFoundException('Rol no disponible.');
    }
    if (dto.branchIds) {
      const branches = await this.prisma.branch.findMany({ where: { id: { in: dto.branchIds }, businessId, active: true } });
      if (branches.length !== dto.branchIds.length) throw new NotFoundException('Una o más sucursales no están disponibles.');
    }
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.user.update({ where: { id: userId }, data: { ...(dto.email ? { email: dto.email.toLowerCase() } : {}), ...(dto.firstName ? { firstName: dto.firstName } : {}), ...(dto.lastName ? { lastName: dto.lastName } : {}), ...(dto.password ? { passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }) } : {}), ...(dto.status ? { status: dto.status } : {}) } });
        if (dto.roleId) {
          await transaction.userRole.deleteMany({ where: { userId } });
          await transaction.userRole.create({ data: { userId, roleId: dto.roleId } });
        }
        if (dto.branchIds) {
          await transaction.userBranch.deleteMany({ where: { userId } });
          await transaction.userBranch.createMany({ data: dto.branchIds.map((branchId) => ({ userId, branchId })) });
        }
      });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un usuario con ese correo.');
      throw error;
    }
  }
}
