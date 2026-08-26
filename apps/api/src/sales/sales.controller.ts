import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}
  @Get('setup') setup(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.sales.setup(user, branchId); }
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.sales.list(user, branchId); }
  @Post() @Permissions('sales.create') create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSaleDto) { return this.sales.create(user, dto); }
  @Post(':invoiceId/void') @Permissions('sales.void') void(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string, @Body() dto: VoidSaleDto) { return this.sales.void(user, invoiceId, dto); }
  @Post(':invoiceId/reprint') @Permissions('invoices.reprint') reprint(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string) { return this.sales.reprint(user, invoiceId); }
}
