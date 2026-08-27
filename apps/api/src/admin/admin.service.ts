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

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(businessId: string) {
    const [users, roles, permissions, branches, business] = await Promise.all([
      this.prisma.user.findMany({ where: { businessId }, select: { id: true, email: true, firstName: true, lastName: true, status: true, roles: { select: { role: { select: { id: true, code: true, name: true } } } }, branches: { select: { branch: { select: { id: true, code: true, name: true } } } } }, orderBy: { lastName: 'asc' } }),
      this.prisma.role.findMany({ where: { businessId }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.permission.findMany({ where: { businessId }, orderBy: { code: 'asc' } }),
      this.prisma.branch.findMany({ where: { businessId, active: true }, orderBy: { name: 'asc' } }),
      this.prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { legalName: true, commercialName: true, taxId: true, address: true, phone: true, email: true, logoUrl: true, defaultCurrency: true, timezone: true, receiptPaperWidth: true, receiptMessage: true, taxesEnabled: true, ivaRate: true } }),
    ]);
    return { users, roles, permissions, branches, business };
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
    const before = await this.prisma.business.findUniqueOrThrow({ where: { id: user.businessId }, select: { legalName: true, commercialName: true, taxId: true, address: true, phone: true, email: true, logoUrl: true, defaultCurrency: true, timezone: true, receiptPaperWidth: true, receiptMessage: true } });
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
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, businessId, active: true } });
      if (!branch) throw new NotFoundException('Sucursal no disponible.');
    }
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.user.update({ where: { id: userId }, data: { ...(dto.email ? { email: dto.email.toLowerCase() } : {}), ...(dto.firstName ? { firstName: dto.firstName } : {}), ...(dto.lastName ? { lastName: dto.lastName } : {}), ...(dto.password ? { passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }) } : {}), ...(dto.status ? { status: dto.status } : {}) } });
        if (dto.roleId) {
          await transaction.userRole.deleteMany({ where: { userId } });
          await transaction.userRole.create({ data: { userId, roleId: dto.roleId } });
        }
        if (dto.branchId) {
          await transaction.userBranch.deleteMany({ where: { userId } });
          await transaction.userBranch.create({ data: { userId, branchId: dto.branchId } });
        }
      });
      return this.overview(businessId);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un usuario con ese correo.');
      throw error;
    }
  }
}
