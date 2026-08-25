import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-id',
    businessId: 'business-id',
    email: 'admin@nexopos.local',
    passwordHash: '',
    firstName: 'Admin',
    lastName: 'NexoPOS',
    status: 'ACTIVE' as const,
    roles: [{ role: { code: 'ADMIN', permissions: [{ permission: { code: 'settings.manage' } }] } }],
    branches: [{ branchId: 'branch-id', branch: { id: 'branch-id', code: 'PRUEBAS', name: 'Pruebas', active: true } }],
  };
  const prisma = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as never;
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') } as unknown as JwtService;

  beforeEach(async () => {
    jest.clearAllMocks();
    user.passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id });
    (prisma as unknown as { user: { findMany: jest.Mock } }).user.findMany.mockResolvedValue([user]);
    (prisma as unknown as { user: { findFirst: jest.Mock } }).user.findFirst.mockResolvedValue(user);
    (prisma as unknown as { user: { update: jest.Mock } }).user.update.mockResolvedValue(user);
    process.env.JWT_ACCESS_SECRET = 'test-secret';
  });

  it('verifies Argon2 credentials and returns the RBAC context', async () => {
    const service = new AuthService(prisma as never, jwt);

    const result = await service.login({ email: user.email, password: 'correct-password', branchId: 'branch-id' });

    expect(result.token).toBe('signed-token');
    expect(result.user.roles).toEqual(['ADMIN']);
    expect(result.user.permissions).toEqual(['settings.manage']);
    expect(result.user.branches[0].code).toBe('PRUEBAS');
  });

  it('rejects invalid credentials', async () => {
    const service = new AuthService(prisma as never, jwt);

    await expect(service.login({ email: user.email, password: 'wrong-password' })).rejects.toThrow('Credenciales inválidas.');
  });
});