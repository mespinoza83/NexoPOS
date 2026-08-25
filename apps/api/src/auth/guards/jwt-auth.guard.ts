import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';
import { AuthService } from '../auth.service';
import { AuthTokenPayload } from '../auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('Sesión requerida.');

    try {
      const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token, { secret: process.env.JWT_ACCESS_SECRET });
      request.user = await this.auth.getAuthenticatedUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
  }
}