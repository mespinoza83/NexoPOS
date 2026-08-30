import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_REQUIRED_PERMISSIONS, REQUIRED_PERMISSIONS } from '../decorators/permissions.decorator';
import { REQUIRED_ROLES } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const permissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];
    const anyPermissions = this.reflector.getAllAndOverride<string[]>(ANY_REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];
    const roles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES, [context.getHandler(), context.getClass()]) ?? [];
    if (!permissions.length && !anyPermissions.length && !roles.length) return true;

    const user = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
    const hasPermissions = permissions.every((permission) => user.permissions.includes(permission));
    const hasAnyPermission = anyPermissions.length === 0 || anyPermissions.some((permission) => user.permissions.includes(permission));
    const hasRole = roles.length === 0 || roles.some((role) => user.roles.includes(role));
    if (!hasPermissions || !hasAnyPermission || !hasRole) throw new ForbiddenException('No tiene permisos para esta operación.');
    return true;
  }
}
