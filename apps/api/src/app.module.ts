import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { AdminModule } from './admin/admin.module';
import { SalesModule } from './sales/sales.module';

@Module({ imports: [PrismaModule, AuthModule, CatalogModule, AdminModule, SalesModule], controllers: [HealthController] })
export class AppModule {}
