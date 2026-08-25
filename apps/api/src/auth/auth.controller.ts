import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_MAX_AGE } from './auth.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { token, refreshToken, user } = await this.auth.login(dto);
    this.setSessionCookies(response, token, refreshToken);
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const currentRefreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!currentRefreshToken) throw new UnauthorizedException('Sesión de renovación requerida.');
    const { token, refreshToken, user } = await this.auth.refresh(currentRefreshToken);
    this.setSessionCookies(response, token, refreshToken);
    return { user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(ACCESS_TOKEN_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    return { success: true };
  }

  private cookieOptions() {
    return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: ACCESS_TOKEN_MAX_AGE, path: '/' };
  }

  private setSessionCookies(response: Response, token: string, refreshToken: string) {
    response.cookie(ACCESS_TOKEN_COOKIE, token, this.cookieOptions());
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { ...this.cookieOptions(), maxAge: REFRESH_TOKEN_MAX_AGE });
  }
}
