import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { SalesService } from './sales.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SuspendSaleDto } from './dto/suspend-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}
  @Get('setup') @Permissions('sales.create') setup(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.sales.setup(user, branchId); }
  @Get() @Permissions('sales.read') list(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.sales.list(user, branchId); }
  @Get('history') @Permissions('reports.read') history(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) { return this.sales.history(user, query); }
  @Get('products-report') @Permissions('reports.sensitive.read') productsReport(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) { return this.sales.productsReport(user, query); }
  @Get('reports-dashboard') @Permissions('reports.sensitive.read') reportsDashboard(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string, @Query('days') days?: string) { return this.sales.reportsDashboard(user, branchId, days); }
  @Post() @Permissions('sales.create') create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSaleDto) { return this.sales.create(user, dto); }
  @Post(':invoiceId/void') @Permissions('sales.void') void(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string, @Body() dto: VoidSaleDto) { return this.sales.void(user, invoiceId, dto); }
  @Post(':invoiceId/reprint') @Permissions('invoices.reprint') reprint(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string) { return this.sales.reprint(user, invoiceId); }
  @Post(':invoiceId/returns') @Permissions('returns.process') createReturn(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string, @Body() dto: CreateReturnDto) { return this.sales.createReturn(user, invoiceId, dto); }
  @Post('customers') @Permissions('sales.create') createCustomer(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCustomerDto) { return this.sales.createCustomer(user, dto); }
  @Get('suspended/list') @Permissions('sales.create') suspended(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.sales.listSuspended(user, branchId); }
  @Post('suspended') @Permissions('sales.create') suspend(@CurrentUser() user: AuthenticatedUser, @Body() dto: SuspendSaleDto) { return this.sales.suspend(user, dto); }
  @Post('suspended/:suspendedId/cancel') @Permissions('sales.create') cancelSuspended(@CurrentUser() user: AuthenticatedUser, @Param('suspendedId') suspendedId: string) { return this.sales.cancelSuspended(user, suspendedId); }
}
