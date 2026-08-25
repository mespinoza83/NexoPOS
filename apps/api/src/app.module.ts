import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { AdminModule } from './admin/admin.module';

@Module({ imports: [PrismaModule, AuthModule, CatalogModule, AdminModule], controllers: [HealthController] })
export class AppModule {}
