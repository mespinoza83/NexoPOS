import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions, PermissionsAny } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateTaxSettingsDto } from './dto/update-tax-settings.dto';
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

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('access')
  @PermissionsAny('settings.manage', 'users.manage', 'roles.manage', 'customers.manage', 'audit.read')
  access(@CurrentUser() user: AuthenticatedUser) { return this.admin.overview(user.businessId); }

  @Get('audit-logs')
  @Permissions('audit.read')
  auditLogs(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) { return this.admin.auditLogs(user.businessId, query); }

  @Post('users')
  @Permissions('users.manage')
  createUser(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) { return this.admin.createUser(user.businessId, dto); }

  @Patch('users/:userId')
  @Permissions('users.manage')
  updateUser(@CurrentUser() user: AuthenticatedUser, @Param('userId') userId: string, @Body() dto: UpdateUserDto) { return this.admin.updateUser(user.businessId, userId, dto); }

  @Post('roles/:roleId/permissions')
  @Permissions('roles.manage')
  updateRolePermissions(@CurrentUser() user: AuthenticatedUser, @Param('roleId') roleId: string, @Body() dto: UpdateRolePermissionsDto) { return this.admin.updateRolePermissions(user.businessId, roleId, dto); }

  @Post('roles')
  @Permissions('roles.manage')
  createRole(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) { return this.admin.createRole(user.businessId, dto); }

  @Post('banks')
  @Permissions('settings.manage')
  createBank(@CurrentUser() user: AuthenticatedUser, @Body() body: { name?: string }) { return this.admin.createBank(user.businessId, body.name); }

  @Patch('banks/:bankId')
  @Permissions('settings.manage')
  updateBank(@CurrentUser() user: AuthenticatedUser, @Param('bankId') bankId: string, @Body() body: { name?: string; active?: boolean }) { return this.admin.updateBank(user.businessId, bankId, body); }

  @Patch('measurement-units/:unitId')
  @Permissions('settings.manage')
  updateMeasurementUnit(@CurrentUser() user: AuthenticatedUser, @Param('unitId') unitId: string, @Body() dto: UpdateMeasurementUnitDto) { return this.admin.updateMeasurementUnit(user.businessId, unitId, dto); }

  @Post('pos-terminals')
  @Permissions('settings.manage')
  createPosTerminal(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePosTerminalDto) { return this.admin.createPosTerminal(user.businessId, dto); }

  @Patch('pos-terminals/:terminalId')
  @Permissions('settings.manage')
  updatePosTerminal(@CurrentUser() user: AuthenticatedUser, @Param('terminalId') terminalId: string, @Body() dto: UpdatePosTerminalDto) { return this.admin.updatePosTerminal(user.businessId, terminalId, dto); }

  @Post('payment-methods')
  @Permissions('settings.manage')
  createPaymentMethod(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentMethodDto) { return this.admin.createPaymentMethod(user.businessId, dto); }

  @Patch('payment-methods/:methodId')
  @Permissions('settings.manage')
  updatePaymentMethod(@CurrentUser() user: AuthenticatedUser, @Param('methodId') methodId: string, @Body() dto: UpdatePaymentMethodDto) { return this.admin.updatePaymentMethod(user.businessId, methodId, dto); }

  @Post('cash-registers')
  @Permissions('settings.manage')
  createCashRegister(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCashRegisterDto) { return this.admin.createCashRegister(user.businessId, dto); }

  @Patch('cash-registers/:registerId')
  @Permissions('settings.manage')
  updateCashRegister(@CurrentUser() user: AuthenticatedUser, @Param('registerId') registerId: string, @Body() dto: UpdateCashRegisterDto) { return this.admin.updateCashRegister(user.businessId, registerId, dto); }

  @Patch('invoice-sequences/:sequenceId')
  @Permissions('settings.manage')
  updateInvoiceSequence(@CurrentUser() user: AuthenticatedUser, @Param('sequenceId') sequenceId: string, @Body() dto: UpdateInvoiceSequenceDto) { return this.admin.updateInvoiceSequence(user.businessId, sequenceId, dto); }

  @Post('branches')
  @Permissions('settings.manage')
  createBranch(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBranchDto) { return this.admin.createBranch(user.businessId, dto); }

  @Patch('branches/:branchId')
  @Permissions('settings.manage')
  updateBranch(@CurrentUser() user: AuthenticatedUser, @Param('branchId') branchId: string, @Body() dto: UpdateBranchDto) { return this.admin.updateBranch(user.businessId, branchId, dto); }

  @Post('customers')
  @Permissions('customers.manage')
  createCustomer(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCustomerDto) { return this.admin.createCustomer(user.businessId, dto); }

  @Patch('customers/:customerId')
  @Permissions('customers.manage')
  updateCustomer(@CurrentUser() user: AuthenticatedUser, @Param('customerId') customerId: string, @Body() dto: UpdateCustomerDto) { return this.admin.updateCustomer(user.businessId, customerId, dto); }

  @Patch('settings/taxes')
  @Permissions('settings.manage')
  updateTaxSettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateTaxSettingsDto) { return this.admin.updateTaxSettings(user, dto); }

  @Patch('settings/business')
  @Permissions('settings.manage')
  updateBusinessSettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateBusinessSettingsDto) { return this.admin.updateBusinessSettings(user, dto); }
}
