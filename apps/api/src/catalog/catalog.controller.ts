import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CatalogService } from './catalog.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateInventoryEntryDto } from './dto/create-inventory-entry.dto';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  @Permissions('products.read')
  products(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string, @Query('search') search?: string) {
    return this.catalog.listProducts(user, branchId, search);
  }

  @Get('categories')
  @Permissions('products.read')
  categories(@CurrentUser() user: AuthenticatedUser) { return this.catalog.listCategories(user.businessId); }

  @Get('measurement-units')
  @Permissions('products.read')
  measurementUnits(@CurrentUser() user: AuthenticatedUser) { return this.catalog.listMeasurementUnits(user.businessId); }

  @Get('inventory-movements')
  @Permissions('inventory.read')
  inventoryMovements(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.catalog.listInventoryMovements(user, branchId); }

  @Get('inventory-report')
  @Permissions('reports.sensitive.read')
  inventoryReport(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) { return this.catalog.inventoryReport(user, query); }

  @Get('inventory-entries')
  @Permissions('inventory.read')
  inventoryEntries(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.catalog.listInventoryEntries(user, branchId); }

  @Post('inventory-entries') @Permissions('inventory.adjust')
  createInventoryEntry(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryEntryDto) { return this.catalog.createInventoryEntry(user, dto); }

  @Get('inventory-counts')
  @Permissions('inventory.read')
  inventoryCounts(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) { return this.catalog.listInventoryCounts(user, branchId); }

  @Post('inventory-counts') @Permissions('inventory.adjust')
  createInventoryCount(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryCountDto) { return this.catalog.createInventoryCount(user, dto); }

  @Post('categories') @Permissions('products.manage')
  createCategory(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) { return this.catalog.createCategory(user, dto); }

  @Patch('categories/:categoryId') @Permissions('products.manage')
  updateCategory(@CurrentUser() user: AuthenticatedUser, @Param('categoryId') categoryId: string, @Body() dto: UpdateCategoryDto) { return this.catalog.updateCategory(user, categoryId, dto); }

  @Post('products') @Permissions('products.manage')
  createProduct(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) { return this.catalog.createProduct(user, dto); }

  @Patch('products/:productId') @Permissions('products.manage')
  updateProduct(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string, @Body() dto: UpdateProductDto) { return this.catalog.updateProduct(user, productId, dto); }

  @Post('products/:productId/adjust-inventory') @Permissions('inventory.adjust')
  adjustInventory(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string, @Body() dto: AdjustInventoryDto) { return this.catalog.adjustInventory(user, productId, dto); }
}
