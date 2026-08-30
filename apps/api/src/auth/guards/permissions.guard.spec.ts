import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ANY_REQUIRED_PERMISSIONS, REQUIRED_PERMISSIONS } from '../decorators/permissions.decorator';
import { REQUIRED_ROLES } from '../decorators/roles.decorator';

describe('PermissionsGuard', () => {
  function context(permissions: string[]) {
    return { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { permissions, roles: [] } }) }) } as never;
  }

  it('accepts a user with any one of the alternative permissions', () => {
    const reflector = { getAllAndOverride: jest.fn((key: string) => key === ANY_REQUIRED_PERMISSIONS ? ['settings.manage', 'users.manage'] : []) } as unknown as Reflector;
    expect(new PermissionsGuard(reflector).canActivate(context(['users.manage']))).toBe(true);
  });

  it('rejects a user without any alternative permission', () => {
    const reflector = { getAllAndOverride: jest.fn((key: string) => key === ANY_REQUIRED_PERMISSIONS ? ['settings.manage', 'users.manage'] : key === REQUIRED_PERMISSIONS || key === REQUIRED_ROLES ? [] : []) } as unknown as Reflector;
    expect(() => new PermissionsGuard(reflector).canActivate(context(['sales.create']))).toThrow(ForbiddenException);
  });
});
