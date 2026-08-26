import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, AuthTokenPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(dto: LoginDto) {
    const users = await this.prisma.user.findMany({
      where: { email: dto.email.toLowerCase(), ...(dto.businessId ? { businessId: dto.businessId } : {}) },
      include: { branches: { include: { branch: true } } },
    });
    if (users.length !== 1) throw new UnauthorizedException('Credenciales inválidas.');
    const user = users[0];
    let passwordMatches = false;
    try {
      passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    } catch {
      passwordMatches = false;
    }
    if (user.status !== 'ACTIVE' || !passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    if (dto.branchId && !user.branches.some(({ branchId }) => branchId === dto.branchId)) {
      throw new UnauthorizedException('La sucursal no está autorizada para este usuario.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const payload: AuthTokenPayload = { sub: user.id, businessId: user.businessId, ...(dto.branchId ? { branchId: dto.branchId } : {}) };
    const tokens = await this.createTokens(payload);
    return { ...tokens, user: await this.getAuthenticatedUser(payload) };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<AuthTokenPayload>(refreshToken, { secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_ACCESS_SECRET });
      const user = await this.getAuthenticatedUser(payload);
      return { ...(await this.createTokens(payload)), user };
    } catch {
      throw new UnauthorizedException('La sesión de renovación es inválida o expiró.');
    }
  }

  private async createTokens(payload: AuthTokenPayload) {
    const [token, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '8h' }),
      this.jwt.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_ACCESS_SECRET, expiresIn: '30d' }),
    ]);
    return { token, refreshToken };
  }

  async getAuthenticatedUser(payload: AuthTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, businessId: payload.businessId, status: 'ACTIVE' },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        branches: { where: { branch: { active: true } }, include: { branch: true } },
      },
    });
    if (!user) throw new UnauthorizedException('Usuario no disponible.');

    return {
      id: user.id,
      businessId: user.businessId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map(({ role }) => role.code),
      permissions: [...new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code)))],
      branches: user.branches.map(({ branch }) => ({ id: branch.id, code: branch.code, name: branch.name })),
      ...(payload.branchId ? { branchId: payload.branchId } : {}),
    };
  }
}
