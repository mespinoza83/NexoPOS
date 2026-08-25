import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({ imports: [AuthModule], controllers: [CatalogController], providers: [CatalogService, JwtAuthGuard, PermissionsGuard] })
export class CatalogModule {}
