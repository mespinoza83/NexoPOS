import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
@Module({ imports: [AuthModule], controllers: [CashController], providers: [CashService, JwtAuthGuard, PermissionsGuard] })
export class CashModule {}
