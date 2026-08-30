import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'required_permissions';
export const ANY_REQUIRED_PERMISSIONS = 'any_required_permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);
export const PermissionsAny = (...permissions: string[]) => SetMetadata(ANY_REQUIRED_PERMISSIONS, permissions);
