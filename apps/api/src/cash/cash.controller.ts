import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CashService } from './cash.service';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
@Controller('cash') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController { constructor(private readonly cash: CashService) {} @Get() @Permissions('cash.manage') overview(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.cash.overview(user, branchId); } @Get('report') @Permissions('reports.sensitive.read') report(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) { return this.cash.report(user, query); } @Post('sessions') @Permissions('cash.manage') open(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpenCashSessionDto) { return this.cash.open(user, dto); } @Post('sessions/:sessionId/movements') @Permissions('cash.manage') movement(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string, @Body() dto: CreateCashMovementDto) { return this.cash.movement(user, sessionId, dto); } @Post('sessions/:sessionId/close') @Permissions('cash.manage') close(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string, @Body() dto: CloseCashSessionDto) { return this.cash.close(user, sessionId, dto); } }
