import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateInventoryEntryDto } from './dto/create-inventory-entry.dto';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(user: AuthenticatedUser, branchId?: string, search?: string) {
    const selectedBranchId = branchId ?? user.branches[0]?.id;
    if (!selectedBranchId || !user.branches.some((branch) => branch.id === selectedBranchId)) {
      throw new ForbiddenException('La sucursal no está autorizada.');
    }

    return this.prisma.product.findMany({
      where: {
        businessId: user.businessId,
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { internalCode: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      include: { category: { select: { id: true, name: true } }, inventory: { where: { branchId: selectedBranchId }, select: { quantity: true, minimumQuantity: true } } },
      orderBy: { name: 'asc' },
    });
  }

  listCategories(businessId: string) {
    return this.prisma.category.findMany({ where: { businessId }, include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' } });
  }

  async listInventoryMovements(user: AuthenticatedUser, branchId?: string) {
    const selectedBranchId = this.authorizedBranch(user, branchId);
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { branchId: selectedBranchId, product: { businessId: user.businessId } },
      include: { product: { select: { id: true, internalCode: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    const userIds = [...new Set(movements.map((movement) => movement.createdById))];
    const responsibleUsers = await this.prisma.user.findMany({ where: { id: { in: userIds }, businessId: user.businessId }, select: { id: true, firstName: true, lastName: true } });
    const names = new Map(responsibleUsers.map((responsible) => [responsible.id, `${responsible.firstName} ${responsible.lastName}`]));
    return movements.map((movement) => ({ ...movement, responsibleName: names.get(movement.createdById) ?? 'Usuario no disponible' }));
  }

  async listInventoryEntries(user: AuthenticatedUser, branchId?: string) {
    const selectedBranchId = this.authorizedBranch(user, branchId);
    const entries = await this.prisma.inventoryEntry.findMany({ where: { branchId: selectedBranchId }, include: { items: { include: { product: { select: { id: true, internalCode: true, name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    const userIds = [...new Set(entries.map((entry) => entry.createdById))];
    const responsibleUsers = await this.prisma.user.findMany({ where: { id: { in: userIds }, businessId: user.businessId }, select: { id: true, firstName: true, lastName: true } });
    const names = new Map(responsibleUsers.map((responsible) => [responsible.id, `${responsible.firstName} ${responsible.lastName}`]));
    return entries.map((entry) => ({ ...entry, responsibleName: names.get(entry.createdById) ?? 'Usuario no disponible' }));
  }

  async createInventoryEntry(user: AuthenticatedUser, dto: CreateInventoryEntryDto) {
    const branchId = this.authorizedBranch(user, dto.branchId);
    const uniqueProductIds = [...new Set(dto.items.map((item) => item.productId))];
    if (uniqueProductIds.length !== dto.items.length) throw new BadRequestException('No repita productos dentro de una misma entrada.');
    const products = await this.prisma.product.findMany({ where: { id: { in: uniqueProductIds }, businessId: user.businessId }, select: { id: true } });
    if (products.length !== uniqueProductIds.length) throw new BadRequestException('Uno o más productos no pertenecen al negocio.');
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replaceAll('-', '');
    const number = `ENT-${datePart}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.inventoryEntry.create({ data: { branchId, number, reference: this.optionalText(dto.reference), source: this.optionalText(dto.source), notes: this.optionalText(dto.notes), status: 'CONFIRMED', createdById: user.id, confirmedAt: now } });
      for (const item of dto.items) {
        const inventory = await tx.branchInventory.findUnique({ where: { branchId_productId: { branchId, productId: item.productId } } });
        const previous = Number(inventory?.quantity ?? 0);
        const resulting = previous + item.quantity;
        await tx.branchInventory.upsert({ where: { branchId_productId: { branchId, productId: item.productId } }, create: { branchId, productId: item.productId, quantity: resulting, minimumQuantity: 0 }, update: { quantity: resulting } });
        await tx.inventoryEntryItem.create({ data: { inventoryEntryId: entry.id, productId: item.productId, quantity: item.quantity, unitCost: item.unitCost, previousQuantity: previous, resultingQuantity: resulting } });
        await tx.inventoryMovement.create({ data: { branchId, productId: item.productId, type: 'PURCHASE', quantity: item.quantity, previousQuantity: previous, resultingQuantity: resulting, createdById: user.id, reason: dto.reason.trim(), referenceType: 'InventoryEntry', referenceId: entry.id } });
        if (item.unitCost !== undefined) await tx.product.update({ where: { id: item.productId }, data: { purchasePrice: item.unitCost } });
      }
      await tx.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'INVENTORY_ENTRY_CONFIRMED', entityType: 'InventoryEntry', entityId: entry.id, after: this.json({ ...entry, items: dto.items }), reason: dto.reason.trim() } });
      return tx.inventoryEntry.findUnique({ where: { id: entry.id }, include: { items: { include: { product: { select: { internalCode: true, name: true } } } } } });
    });
  }

  async listInventoryCounts(user: AuthenticatedUser, branchId?: string) {
    const selectedBranchId = this.authorizedBranch(user, branchId);
    return this.prisma.inventoryCount.findMany({ where: { branchId: selectedBranchId }, include: { items: { include: { product: { select: { id: true, internalCode: true, name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async createInventoryCount(user: AuthenticatedUser, dto: CreateInventoryCountDto) {
    const branchId = this.authorizedBranch(user, dto.branchId);
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    if (productIds.length !== dto.items.length) throw new BadRequestException('No repita productos dentro del conteo.');
    const existingProducts = await this.prisma.product.count({ where: { id: { in: productIds }, businessId: user.businessId } });
    if (existingProducts !== productIds.length) throw new BadRequestException('Uno o más productos no pertenecen al negocio.');
    const now = new Date();
    const number = `CON-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-8)}`;
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.inventoryCount.create({ data: { branchId, number, notes: this.optionalText(dto.notes), status: 'APPROVED', createdById: user.id, approvedAt: now } });
      for (const item of dto.items) {
        const inventory = await tx.branchInventory.findUnique({ where: { branchId_productId: { branchId, productId: item.productId } } });
        const expected = Number(inventory?.quantity ?? 0);
        const difference = item.countedQuantity - expected;
        await tx.branchInventory.upsert({ where: { branchId_productId: { branchId, productId: item.productId } }, create: { branchId, productId: item.productId, quantity: item.countedQuantity, minimumQuantity: 0 }, update: { quantity: item.countedQuantity } });
        await tx.inventoryCountItem.create({ data: { inventoryCountId: count.id, productId: item.productId, expectedQuantity: expected, countedQuantity: item.countedQuantity, difference } });
        if (difference !== 0) await tx.inventoryMovement.create({ data: { branchId, productId: item.productId, type: difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', quantity: Math.abs(difference), previousQuantity: expected, resultingQuantity: item.countedQuantity, createdById: user.id, reason: dto.reason.trim(), referenceType: 'InventoryCount', referenceId: count.id } });
      }
      await tx.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'INVENTORY_COUNT_APPROVED', entityType: 'InventoryCount', entityId: count.id, after: this.json({ ...count, items: dto.items }), reason: dto.reason.trim() } });
      return tx.inventoryCount.findUnique({ where: { id: count.id }, include: { items: true } });
    });
  }

  async createCategory(user: AuthenticatedUser, dto: CreateCategoryDto) {
    try {
      const category = await this.prisma.category.create({ data: { businessId: user.businessId, name: dto.name.trim(), active: dto.active ?? true } });
      await this.audit(user, 'CATEGORY_CREATED', 'Category', category.id, null, category);
      return category;
    } catch (error) { this.handleUnique(error, 'Ya existe una categoría con ese nombre.'); }
  }

  async updateCategory(user: AuthenticatedUser, categoryId: string, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findFirst({ where: { id: categoryId, businessId: user.businessId } });
    if (!current) throw new NotFoundException('Categoría no encontrada.');
    try {
      const category = await this.prisma.category.update({ where: { id: categoryId }, data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
      await this.audit(user, 'CATEGORY_UPDATED', 'Category', category.id, current, category);
      return category;
    } catch (error) { this.handleUnique(error, 'Ya existe una categoría con ese nombre.'); }
  }

  async createProduct(user: AuthenticatedUser, dto: CreateProductDto) {
    const branchId = this.authorizedBranch(user, dto.branchId);
    await this.requireCategory(user.businessId, dto.categoryId);
    if (dto.manualSalePrice && dto.salePrice !== undefined && !user.permissions.includes('prices.change')) throw new ForbiddenException('No tiene permiso para cambiar precios manualmente.');
    const salePrice = dto.manualSalePrice && dto.salePrice !== undefined ? dto.salePrice : this.calculatedPrice(dto.purchasePrice, dto.profitMargin);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({ data: { businessId: user.businessId, categoryId: dto.categoryId, internalCode: dto.internalCode.trim(), barcode: this.optionalText(dto.barcode), name: dto.name.trim(), description: this.optionalText(dto.description), purchasePrice: dto.purchasePrice, profitMargin: dto.profitMargin, salePrice, taxRate: dto.taxExempt ? 0 : (dto.taxRate ?? 15), taxExempt: dto.taxExempt ?? false, availableForSale: dto.availableForSale ?? true, imageUrl: this.optionalText(dto.imageUrl) } });
        await tx.branchInventory.create({ data: { branchId, productId: product.id, quantity: dto.initialQuantity, minimumQuantity: dto.minimumQuantity } });
        if (dto.initialQuantity > 0) await tx.inventoryMovement.create({ data: { branchId, productId: product.id, type: 'OPENING', quantity: dto.initialQuantity, previousQuantity: 0, resultingQuantity: dto.initialQuantity, createdById: user.id, reason: 'Existencia inicial' } });
        await tx.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'PRODUCT_CREATED', entityType: 'Product', entityId: product.id, after: this.json(product) } });
        return product;
      });
    } catch (error) { this.handleProductConflict(error); }
  }

  async updateProduct(user: AuthenticatedUser, productId: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findFirst({ where: { id: productId, businessId: user.businessId } });
    if (!current) throw new NotFoundException('Producto no encontrado.');
    if (dto.categoryId) await this.requireCategory(user.businessId, dto.categoryId);
    const branchId = dto.minimumQuantity !== undefined ? this.authorizedBranch(user, dto.branchId) : undefined;
    if (dto.manualSalePrice && dto.salePrice !== undefined && !user.permissions.includes('prices.change')) throw new ForbiddenException('No tiene permiso para cambiar precios manualmente.');
    const salePrice = dto.manualSalePrice && dto.salePrice !== undefined ? dto.salePrice : this.calculatedPrice(dto.purchasePrice ?? Number(current.purchasePrice), dto.profitMargin ?? Number(current.profitMargin));
    try {
      const product = await this.prisma.product.update({ where: { id: productId }, data: {
        ...(dto.internalCode !== undefined ? { internalCode: dto.internalCode.trim() } : {}), ...(dto.barcode !== undefined ? { barcode: this.optionalText(dto.barcode) } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.description !== undefined ? { description: this.optionalText(dto.description) } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}), ...(dto.purchasePrice !== undefined ? { purchasePrice: dto.purchasePrice } : {}),
        ...(dto.profitMargin !== undefined ? { profitMargin: dto.profitMargin } : {}), salePrice,
        ...(dto.availableForSale !== undefined ? { availableForSale: dto.availableForSale } : {}),
        ...(dto.taxExempt !== undefined ? { taxExempt: dto.taxExempt, ...(dto.taxExempt ? { taxRate: 0 } : {}) } : {}),
        ...(dto.taxRate !== undefined && !dto.taxExempt ? { taxRate: dto.taxRate } : {}), ...(dto.imageUrl !== undefined ? { imageUrl: this.optionalText(dto.imageUrl) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      } });
      if (branchId && dto.minimumQuantity !== undefined) {
        await this.prisma.branchInventory.upsert({ where: { branchId_productId: { branchId, productId } }, create: { branchId, productId, quantity: 0, minimumQuantity: dto.minimumQuantity }, update: { minimumQuantity: dto.minimumQuantity } });
      }
      await this.audit(user, 'PRODUCT_UPDATED', 'Product', product.id, current, product);
      return product;
    } catch (error) { this.handleProductConflict(error); }
  }

  async adjustInventory(user: AuthenticatedUser, productId: string, dto: AdjustInventoryDto) {
    const branchId = this.authorizedBranch(user, dto.branchId);
    const product = await this.prisma.product.findFirst({ where: { id: productId, businessId: user.businessId } });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.branchInventory.findUnique({ where: { branchId_productId: { branchId, productId } } });
      const previous = Number(inventory?.quantity ?? 0);
      const resulting = previous + (dto.type === 'ADJUSTMENT_IN' ? dto.quantity : -dto.quantity);
      if (resulting < 0) throw new BadRequestException('El ajuste dejaría el inventario en negativo.');
      const updated = await tx.branchInventory.upsert({ where: { branchId_productId: { branchId, productId } }, create: { branchId, productId, quantity: resulting, minimumQuantity: dto.minimumQuantity ?? 0 }, update: { quantity: resulting, ...(dto.minimumQuantity !== undefined ? { minimumQuantity: dto.minimumQuantity } : {}) } });
      const movement = await tx.inventoryMovement.create({ data: { branchId, productId, type: dto.type, quantity: dto.quantity, previousQuantity: previous, resultingQuantity: resulting, createdById: user.id, reason: dto.reason.trim() } });
      await tx.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'INVENTORY_ADJUSTED', entityType: 'InventoryMovement', entityId: movement.id, before: this.json(inventory), after: this.json(updated), reason: dto.reason.trim() } });
      return { inventory: updated, movement };
    });
  }

  private authorizedBranch(user: AuthenticatedUser, branchId?: string) { const selected = branchId ?? user.branches[0]?.id; if (!selected || !user.branches.some((branch) => branch.id === selected)) throw new ForbiddenException('La sucursal no está autorizada.'); return selected; }
  private async requireCategory(businessId: string, categoryId: string) { const category = await this.prisma.category.findFirst({ where: { id: categoryId, businessId, active: true } }); if (!category) throw new BadRequestException('La categoría no existe o está inactiva.'); }
  private calculatedPrice(purchasePrice: number, profitMargin: number) { return Math.round(purchasePrice * (1 + profitMargin / 100) * 100) / 100; }
  private optionalText(value?: string | null) { const clean = value?.trim(); return clean || null; }
  private json(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull { return value == null ? Prisma.JsonNull : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
  private audit(user: AuthenticatedUser, action: string, entityType: string, entityId: string, before: unknown, after: unknown) { return this.prisma.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action, entityType, entityId, before: this.json(before), after: this.json(after) } }); }
  private handleUnique(error: unknown, message: string): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException(message); throw error; }
  private handleProductConflict(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') { const target = String(error.meta?.target ?? ''); throw new ConflictException(target.includes('barcode') ? 'El código de barras ya pertenece a otro producto.' : 'El código interno ya pertenece a otro producto.'); } throw error; }
}
