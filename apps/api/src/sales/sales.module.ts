import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({ imports: [AuthModule], controllers: [SalesController], providers: [SalesService, JwtAuthGuard, PermissionsGuard] })
export class SalesModule {}
