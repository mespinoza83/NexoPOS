import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('access')
  access(@CurrentUser() user: AuthenticatedUser) { return this.admin.overview(user.businessId); }

  @Post('users')
  createUser(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) { return this.admin.createUser(user.businessId, dto); }

  @Patch('users/:userId')
  updateUser(@CurrentUser() user: AuthenticatedUser, @Param('userId') userId: string, @Body() dto: UpdateUserDto) { return this.admin.updateUser(user.businessId, userId, dto); }

  @Post('roles/:roleId/permissions')
  updateRolePermissions(@CurrentUser() user: AuthenticatedUser, @Param('roleId') roleId: string, @Body() dto: UpdateRolePermissionsDto) { return this.admin.updateRolePermissions(user.businessId, roleId, dto); }

  @Post('roles')
  createRole(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) { return this.admin.createRole(user.businessId, dto); }
}