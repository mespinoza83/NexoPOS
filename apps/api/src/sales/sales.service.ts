import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentKind, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SuspendSaleDto } from './dto/suspend-sale.dto';

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async setup(user: AuthenticatedUser, branchId?: string) {
    const selectedBranchId = this.authorizedBranch(user, branchId);
    const [business, paymentMethods, banks, terminals, customers] = await Promise.all([
      this.prisma.business.findUnique({ where: { id: user.businessId }, select: { legalName: true, commercialName: true, taxId: true, address: true, phone: true, logoUrl: true, defaultCurrency: true, exchangeRate: true, ivaRate: true, taxesEnabled: true, timezone: true, receiptPaperWidth: true, receiptMessage: true } }),
      this.prisma.paymentMethod.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: 'asc' } }),
      this.prisma.bank.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: 'asc' } }),
      this.prisma.posTerminal.findMany({ where: { branchId: selectedBranchId, active: true }, include: { bank: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.customer.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: 'asc' }, take: 500 }),
    ]);
    return { business, paymentMethods, banks, terminals, customers };
  }

  createCustomer(user: AuthenticatedUser, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { businessId: user.businessId, name: dto.name.trim(), taxId: dto.taxId?.trim() || null, phone: dto.phone?.trim() || null, email: dto.email?.trim().toLowerCase() || null } });
  }

  listSuspended(user: AuthenticatedUser, branchId?: string) { const selected = this.authorizedBranch(user, branchId); return this.prisma.suspendedSale.findMany({ where: { branchId: selected, businessId: user.businessId }, orderBy: { updatedAt: 'desc' } }); }
  async suspend(user: AuthenticatedUser, dto: SuspendSaleDto) { const branchId = this.authorizedBranch(user, dto.branchId); const suspended = await this.prisma.suspendedSale.create({ data: { businessId: user.businessId, branchId, createdById: user.id, label: dto.label.trim(), data: JSON.parse(JSON.stringify(dto.data)) as Prisma.InputJsonValue } }); await this.prisma.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'SALE_SUSPENDED', entityType: 'SuspendedSale', entityId: suspended.id, after: JSON.parse(JSON.stringify(suspended.data)) as Prisma.InputJsonValue } }); return suspended; }
  async cancelSuspended(user: AuthenticatedUser, suspendedId: string) { const suspended = await this.prisma.suspendedSale.findFirst({ where: { id: suspendedId, businessId: user.businessId } }); if (!suspended) throw new NotFoundException('Venta suspendida no encontrada.'); await this.prisma.$transaction([this.prisma.suspendedSale.delete({ where: { id: suspended.id } }), this.prisma.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'SUSPENDED_SALE_CANCELLED', entityType: 'SuspendedSale', entityId: suspended.id, before: JSON.parse(JSON.stringify(suspended.data)) as Prisma.InputJsonValue } })]); return { success: true }; }

  async list(user: AuthenticatedUser, branchId?: string) {
    const selectedBranchId = this.authorizedBranch(user, branchId);
    return this.prisma.invoice.findMany({ where: { branchId: selectedBranchId }, include: { customer: true, createdBy: { select: { firstName: true, lastName: true } }, items: { include: { product: { select: { name: true, internalCode: true } } } }, payments: { include: { paymentMethod: true, bank: true, posTerminal: true } }, discounts: true, returns: { where: { status: 'COMPLETED' }, include: { items: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async history(user: AuthenticatedUser, query: Record<string, string | undefined>) {
    const branchId = this.authorizedBranch(user, query.branchId);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(query.pageSize) || 10));
    const search = query.search?.trim();
    const dateFrom = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00`) : undefined;
    const dateTo = query.dateTo ? new Date(`${query.dateTo}T23:59:59.999`) : undefined;
    const status = Object.values(InvoiceStatus).includes(query.status as InvoiceStatus) ? query.status as InvoiceStatus : undefined;
    const where: Prisma.InvoiceWhereInput = { branchId, ...(status ? { status } : {}), ...(query.userId ? { createdById: query.userId } : {}), ...(query.paymentMethodId ? { payments: { some: { paymentMethodId: query.paymentMethodId } } } : {}), ...((dateFrom || dateTo) ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}), ...(search ? { OR: [{ number: { contains: search, mode: 'insensitive' } }, { customer: { name: { contains: search, mode: 'insensitive' } } }, { items: { some: { product: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { internalCode: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }] } } } }, { payments: { some: { reference: { contains: search, mode: 'insensitive' } } } }] } : {}) };
    const include = { customer: true, createdBy: { select: { id: true, firstName: true, lastName: true } }, items: { include: { product: { select: { name: true, internalCode: true } } } }, payments: { include: { paymentMethod: true, bank: true, posTerminal: true } }, discounts: true, returns: { where: { status: 'COMPLETED' as const }, include: { items: true } } };
    const [items, totalRecords, totals, users, paymentMethods, business] = await Promise.all([
      this.prisma.invoice.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({ where, _sum: { subtotal: true, discountTotal: true, taxTotal: true, total: true } }),
      this.prisma.user.findMany({ where: { businessId: user.businessId, invoices: { some: { branchId } } }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
      this.prisma.paymentMethod.findMany({ where: { businessId: user.businessId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.business.findUniqueOrThrow({ where: { id: user.businessId }, select: { legalName: true, commercialName: true, taxId: true, address: true, phone: true, logoUrl: true, defaultCurrency: true, timezone: true, receiptPaperWidth: true, receiptMessage: true } }),
    ]);
    return { items, business, pagination: { page, pageSize, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)) }, totals: { subtotal: totals._sum.subtotal ?? 0, discounts: totals._sum.discountTotal ?? 0, taxes: totals._sum.taxTotal ?? 0, total: totals._sum.total ?? 0 }, filters: { users, paymentMethods } };
  }

  async productsReport(user: AuthenticatedUser, query: Record<string, string | undefined>) {
    const branchId = this.authorizedBranch(user, query.branchId);
    const dateFrom = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00`) : undefined;
    const dateTo = query.dateTo ? new Date(`${query.dateTo}T23:59:59.999`) : undefined;
    const search = query.search?.trim();
    const items = await this.prisma.invoiceItem.findMany({
      where: { invoice: { branchId, status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_RETURNED, InvoiceStatus.FULLY_RETURNED] }, ...((dateFrom || dateTo) ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}) }, ...(search ? { product: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { internalCode: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }] } } : {}) },
      include: { product: { select: { id: true, internalCode: true, name: true, category: { select: { name: true } } } }, returnItems: { where: { returnDoc: { status: 'COMPLETED' } }, select: { quantity: true } } },
    });
    const grouped = new Map<string, { productId: string; internalCode: string; name: string; category: string; soldQuantity: number; returnedQuantity: number; netQuantity: number; netSales: number; cost: number; estimatedProfit: number }>();
    for (const item of items) {
      const soldQuantity = Number(item.quantity);
      const returnedQuantity = item.returnItems.reduce((sum, returned) => sum + Number(returned.quantity), 0);
      const netQuantity = Math.max(0, soldQuantity - returnedQuantity);
      const ratio = soldQuantity > 0 ? netQuantity / soldQuantity : 0;
      const netSales = money((Number(item.lineTotal) - Number(item.taxAmount)) * ratio);
      const cost = money(Number(item.unitCost) * netQuantity);
      const current = grouped.get(item.productId) ?? { productId: item.product.id, internalCode: item.product.internalCode, name: item.product.name, category: item.product.category.name, soldQuantity: 0, returnedQuantity: 0, netQuantity: 0, netSales: 0, cost: 0, estimatedProfit: 0 };
      current.soldQuantity += soldQuantity; current.returnedQuantity += returnedQuantity; current.netQuantity += netQuantity; current.netSales = money(current.netSales + netSales); current.cost = money(current.cost + cost); current.estimatedProfit = money(current.netSales - current.cost);
      grouped.set(item.productId, current);
    }
    const products = [...grouped.values()].sort((a, b) => b.netSales - a.netSales);
    return { products, totals: products.reduce((sum, product) => ({ soldQuantity: sum.soldQuantity + product.soldQuantity, returnedQuantity: sum.returnedQuantity + product.returnedQuantity, netQuantity: sum.netQuantity + product.netQuantity, netSales: money(sum.netSales + product.netSales), cost: money(sum.cost + product.cost), estimatedProfit: money(sum.estimatedProfit + product.estimatedProfit) }), { soldQuantity: 0, returnedQuantity: 0, netQuantity: 0, netSales: 0, cost: 0, estimatedProfit: 0 }) };
  }

  async create(user: AuthenticatedUser, dto: CreateSaleDto) {
    const branchId = this.authorizedBranch(user, dto.branchId);
    if (dto.idempotencyKey) { const existing = await this.prisma.invoice.findUnique({ where: { branchId_idempotencyKey: { branchId, idempotencyKey: dto.idempotencyKey } }, include: { items: { include: { product: true } }, payments: { include: { paymentMethod: true, bank: true, posTerminal: true } }, discounts: true } }); if (existing) return existing; }
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    if (productIds.length !== dto.items.length) throw new BadRequestException('No repita productos en la venta; aumente la cantidad de la línea existente.');
    const hasDiscount = (dto.discountPercent ?? 0) > 0 || dto.items.some((item) => (item.discountPercent ?? 0) > 0);
    if (hasDiscount && !user.permissions.includes('sales.discount')) throw new ForbiddenException('No tiene permiso para aplicar descuentos.');
    if ((dto.discountPercent ?? 0) > 0 && !dto.discountReason?.trim()) throw new BadRequestException('Indique el motivo del descuento de factura.');
    if (dto.items.some((item) => (item.discountPercent ?? 0) > 0 && !item.discountReason?.trim())) throw new BadRequestException('Indique el motivo de cada descuento por producto.');

    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({ where: { id: user.businessId } });
      if (!business) throw new NotFoundException('Negocio no encontrado.');
      if (dto.customerId) { const customer = await tx.customer.findFirst({ where: { id: dto.customerId, businessId: user.businessId, active: true } }); if (!customer) throw new BadRequestException('Cliente no válido.'); }
      const products = await tx.product.findMany({ where: { id: { in: productIds }, businessId: user.businessId }, include: { inventory: { where: { branchId } } } });
      if (products.length !== productIds.length) throw new BadRequestException('Uno o más productos no existen.');
      const productMap = new Map(products.map((product) => [product.id, product]));
      const prepared = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        if (product.status !== 'ACTIVE' || !product.availableForSale) throw new BadRequestException(`${product.name} no está disponible para venta.`);
        const stock = Number(product.inventory[0]?.quantity ?? 0);
        if (stock < item.quantity && !user.permissions.includes('sales.negative_inventory')) throw new BadRequestException(`Existencia insuficiente para ${product.name}. Disponible: ${stock.toFixed(3)}.`);
        if (item.unitPrice !== undefined && money(item.unitPrice) !== money(Number(product.salePrice)) && !user.permissions.includes('prices.change')) throw new ForbiddenException(`No tiene permiso para cambiar el precio de ${product.name}.`);
        const unitPrice = item.unitPrice ?? Number(product.salePrice);
        const base = money(unitPrice * item.quantity);
        const discountPercent = item.discountPercent ?? 0;
        const itemDiscount = money(base * discountPercent / 100);
        return { item, product, stock, unitPrice, base, discountPercent, itemDiscount, netBeforeInvoiceDiscount: base - itemDiscount };
      });
      const subtotal = money(prepared.reduce((sum, line) => sum + line.base, 0));
      const itemDiscountTotal = money(prepared.reduce((sum, line) => sum + line.itemDiscount, 0));
      const invoiceDiscountPercent = dto.discountPercent ?? 0;
      const invoiceDiscount = money((subtotal - itemDiscountTotal) * invoiceDiscountPercent / 100);
      const taxTotal = money(prepared.reduce((sum, line) => { const taxable = line.netBeforeInvoiceDiscount * (1 - invoiceDiscountPercent / 100); const rate = Number(line.product.taxRate) || Number(business.ivaRate); return sum + (business.taxesEnabled && !line.product.taxExempt ? taxable * rate / 100 : 0); }, 0));
      const discountTotal = money(itemDiscountTotal + invoiceDiscount);
      const total = money(subtotal - discountTotal + taxTotal);

      const paymentMethods = await tx.paymentMethod.findMany({ where: { id: { in: dto.payments.map((payment) => payment.paymentMethodId) }, businessId: user.businessId, active: true } });
      if (paymentMethods.length !== new Set(dto.payments.map((payment) => payment.paymentMethodId)).size) throw new BadRequestException('Uno o más métodos de pago no son válidos.');
      const methodMap = new Map(paymentMethods.map((method) => [method.id, method]));
      const requestedBankIds = [...new Set(dto.payments.flatMap((payment) => payment.bankId ? [payment.bankId] : []))];
      const requestedTerminalIds = [...new Set(dto.payments.flatMap((payment) => payment.posTerminalId ? [payment.posTerminalId] : []))];
      const [validBanks, validTerminals] = await Promise.all([
        tx.bank.findMany({ where: { id: { in: requestedBankIds }, businessId: user.businessId, active: true }, select: { id: true } }),
        tx.posTerminal.findMany({ where: { id: { in: requestedTerminalIds }, branchId, active: true }, select: { id: true, bankId: true } }),
      ]);
      const validBankIds = new Set(validBanks.map((bank) => bank.id));
      const terminalMap = new Map(validTerminals.map((terminal) => [terminal.id, terminal]));
      for (const payment of dto.payments) {
        const method = methodMap.get(payment.paymentMethodId)!;
        if (method.kind === PaymentKind.BANK_TRANSFER && !payment.bankId) throw new BadRequestException('Seleccione el banco destino para la transferencia.');
        if (method.kind === PaymentKind.POS && (!payment.bankId || !payment.posTerminalId || !payment.cardType)) throw new BadRequestException('Seleccione banco, terminal y tipo de tarjeta para el pago POS.');
        if (payment.bankId && !validBankIds.has(payment.bankId)) throw new BadRequestException('El banco seleccionado no es válido.');
        if (payment.posTerminalId && (!terminalMap.has(payment.posTerminalId) || terminalMap.get(payment.posTerminalId)?.bankId !== payment.bankId)) throw new BadRequestException('La terminal POS no corresponde al banco y sucursal seleccionados.');
      }
      const paid = money(dto.payments.reduce((sum, payment) => sum + payment.amount, 0));
      if (paid < total) throw new BadRequestException(`El pago es insuficiente. Pendiente: C$ ${(total - paid).toFixed(2)}.`);
      const cashPaid = money(dto.payments.filter((payment) => methodMap.get(payment.paymentMethodId)?.kind === PaymentKind.CASH).reduce((sum, payment) => sum + payment.amount, 0));
      const changeAmount = money(paid - total);
      if (changeAmount > cashPaid) throw new BadRequestException('El cambio sólo puede originarse de pagos en efectivo.');

      const sequence = await tx.invoiceSequence.upsert({ where: { branchId_series: { branchId, series: 'A' } }, create: { branchId, series: 'A', next: 1 }, update: {} });
      await tx.invoiceSequence.update({ where: { id: sequence.id }, data: { next: { increment: 1 } } });
      const number = `A-${String(sequence.next).padStart(8, '0')}`;
      const cashSession = await tx.cashSession.findFirst({ where: { status: 'OPEN', cashRegister: { branchId } }, orderBy: { openedAt: 'desc' } });
      if (cashPaid > 0 && !cashSession) throw new BadRequestException('Debe abrir una caja antes de recibir pagos en efectivo.');
      const invoice = await tx.invoice.create({ data: { branchId, cashSessionId: cashSession?.id, customerId: dto.customerId, createdById: user.id, number, idempotencyKey: dto.idempotencyKey, currency: business.defaultCurrency, exchangeRate: business.exchangeRate, status: 'PAID', subtotal, discountTotal, taxTotal, total, changeAmount, paidAt: new Date() } });

      for (const line of prepared) {
        const allocatedInvoiceDiscount = money(line.netBeforeInvoiceDiscount * invoiceDiscountPercent / 100);
        const taxable = line.netBeforeInvoiceDiscount - allocatedInvoiceDiscount;
        const taxRate = business.taxesEnabled && !line.product.taxExempt ? (Number(line.product.taxRate) || Number(business.ivaRate)) : 0;
        const taxAmount = money(taxable * taxRate / 100);
        const invoiceItem = await tx.invoiceItem.create({ data: { invoiceId: invoice.id, productId: line.product.id, quantity: line.item.quantity, unitPrice: line.unitPrice, unitCost: line.product.purchasePrice, discountPercent: line.discountPercent, discountAmount: line.itemDiscount, taxRate, taxAmount, lineTotal: money(taxable + taxAmount) } });
        if (line.itemDiscount > 0) await tx.invoiceDiscount.create({ data: { invoiceId: invoice.id, invoiceItemId: invoiceItem.id, scope: 'ITEM', percent: line.discountPercent, amount: line.itemDiscount, reason: line.item.discountReason!.trim(), appliedById: user.id } });
        const resulting = line.stock - line.item.quantity;
        await tx.branchInventory.upsert({ where: { branchId_productId: { branchId, productId: line.product.id } }, create: { branchId, productId: line.product.id, quantity: resulting, minimumQuantity: 0 }, update: { quantity: resulting } });
        await tx.inventoryMovement.create({ data: { branchId, productId: line.product.id, type: 'SALE', quantity: line.item.quantity, previousQuantity: line.stock, resultingQuantity: resulting, referenceType: 'Invoice', referenceId: invoice.id, reason: `Venta ${number}`, createdById: user.id } });
      }
      if (invoiceDiscount > 0) await tx.invoiceDiscount.create({ data: { invoiceId: invoice.id, scope: 'INVOICE', percent: invoiceDiscountPercent, amount: invoiceDiscount, reason: dto.discountReason!.trim(), appliedById: user.id } });
      for (const payment of dto.payments) await tx.invoicePayment.create({ data: { invoiceId: invoice.id, paymentMethodId: payment.paymentMethodId, bankId: payment.bankId, posTerminalId: payment.posTerminalId, amount: payment.amount, cardType: payment.cardType, reference: payment.reference?.trim() || null, notes: payment.notes?.trim() || null, receivedById: user.id } });
      if (cashSession && cashPaid > 0) await tx.cashMovement.create({ data: { cashSessionId: cashSession.id, type: 'SALE_CASH', amount: money(cashPaid - changeAmount), referenceType: 'Invoice', referenceId: invoice.id, reason: `Venta ${number}`, createdById: user.id } });
      await tx.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'INVOICE_PAID', entityType: 'Invoice', entityId: invoice.id, after: JSON.parse(JSON.stringify({ invoice, items: dto.items, payments: dto.payments })) as Prisma.InputJsonValue } });
      return tx.invoice.findUnique({ where: { id: invoice.id }, include: { items: { include: { product: true } }, payments: { include: { paymentMethod: true, bank: true, posTerminal: true } }, discounts: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch(async (error: unknown) => { if ((error as { code?: string }).code === 'P2002' && dto.idempotencyKey) { const existing = await this.prisma.invoice.findUnique({ where: { branchId_idempotencyKey: { branchId, idempotencyKey: dto.idempotencyKey } }, include: { items: { include: { product: true } }, payments: { include: { paymentMethod: true, bank: true, posTerminal: true } }, discounts: true } }); if (existing) return existing; } throw error; });
  }

  async createReturn(user: AuthenticatedUser, invoiceId: string, dto: CreateReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, branch: { businessId: user.businessId } }, include: { items: true, returns: { where: { status: 'COMPLETED' }, include: { items: true } }, payments: { include: { paymentMethod: true } } } });
      if (!invoice) throw new NotFoundException('Factura no encontrada.');
      if (!['PAID', 'PARTIALLY_RETURNED'].includes(invoice.status)) throw new BadRequestException('La factura no admite devoluciones en su estado actual.');
      const itemMap = new Map(invoice.items.map((item) => [item.id, item]));
      if (new Set(dto.items.map((item) => item.invoiceItemId)).size !== dto.items.length) throw new BadRequestException('No repita productos en la devolución.');
      let refundTotal = 0;
      for (const requested of dto.items) {
        const sold = itemMap.get(requested.invoiceItemId);
        if (!sold) throw new BadRequestException('Uno de los productos no pertenece a la factura.');
        const alreadyReturned = invoice.returns.flatMap((returnDoc) => returnDoc.items).filter((item) => item.invoiceItemId === sold.id).reduce((sum, item) => sum + Number(item.quantity), 0);
        const available = Number(sold.quantity) - alreadyReturned;
        if (requested.quantity > available) throw new BadRequestException(`La cantidad a devolver supera las ${available.toFixed(3)} unidades disponibles.`);
        refundTotal += Number(sold.lineTotal) * requested.quantity / Number(sold.quantity);
      }
      refundTotal = money(refundTotal);
      const requestedRefund = money(dto.refunds.reduce((sum, refund) => sum + refund.amount, 0));
      if (requestedRefund !== refundTotal) throw new BadRequestException(`Los reembolsos deben sumar C$ ${refundTotal.toFixed(2)}.`);
      const methods = await tx.paymentMethod.findMany({ where: { id: { in: dto.refunds.map((refund) => refund.paymentMethodId) }, businessId: user.businessId, active: true } });
      if (methods.length !== new Set(dto.refunds.map((refund) => refund.paymentMethodId)).size) throw new BadRequestException('Método de reembolso no válido.');
      const methodMap = new Map(methods.map((method) => [method.id, method]));
      const returnDoc = await tx.return.create({ data: { invoiceId: invoice.id, number: `DEV-${Date.now()}`, status: 'COMPLETED', reason: dto.reason.trim(), createdById: user.id, approvedById: user.id, completedAt: new Date() } });
      for (const requested of dto.items) {
        const sold = itemMap.get(requested.invoiceItemId)!;
        await tx.returnItem.create({ data: { returnId: returnDoc.id, invoiceItemId: sold.id, productId: sold.productId, quantity: requested.quantity } });
        const inventory = await tx.branchInventory.findUnique({ where: { branchId_productId: { branchId: invoice.branchId, productId: sold.productId } } });
        const previous = Number(inventory?.quantity ?? 0);
        const resulting = previous + requested.quantity;
        await tx.branchInventory.upsert({ where: { branchId_productId: { branchId: invoice.branchId, productId: sold.productId } }, create: { branchId: invoice.branchId, productId: sold.productId, quantity: resulting, minimumQuantity: 0 }, update: { quantity: resulting } });
        await tx.inventoryMovement.create({ data: { branchId: invoice.branchId, productId: sold.productId, type: 'RETURN', quantity: requested.quantity, previousQuantity: previous, resultingQuantity: resulting, referenceType: 'Return', referenceId: returnDoc.id, reason: dto.reason.trim(), createdById: user.id } });
      }
      for (const refund of dto.refunds) await tx.returnRefund.create({ data: { returnId: returnDoc.id, paymentMethodId: refund.paymentMethodId, amount: refund.amount, bankId: refund.bankId, posTerminalId: refund.posTerminalId, reference: refund.reference?.trim() || null } });
      const cashRefund = money(dto.refunds.filter((refund) => methodMap.get(refund.paymentMethodId)?.kind === PaymentKind.CASH).reduce((sum, refund) => sum + refund.amount, 0));
      if (cashRefund > 0 && invoice.cashSessionId) await tx.cashMovement.create({ data: { cashSessionId: invoice.cashSessionId, type: 'RETURN_CASH', amount: cashRefund, referenceType: 'Return', referenceId: returnDoc.id, reason: dto.reason.trim(), createdById: user.id } });
      const totalSold = invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);
      const previouslyReturned = invoice.returns.flatMap((returnDoc) => returnDoc.items).reduce((sum, item) => sum + Number(item.quantity), 0);
      const nowReturned = dto.items.reduce((sum, item) => sum + item.quantity, 0);
      const status = previouslyReturned + nowReturned >= totalSold ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED';
      await tx.invoice.update({ where: { id: invoice.id }, data: { status } });
      await tx.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'RETURN_COMPLETED', entityType: 'Return', entityId: returnDoc.id, after: JSON.parse(JSON.stringify({ invoiceId, refundTotal, ...dto })) as Prisma.InputJsonValue, reason: dto.reason.trim() } });
      return tx.return.findUnique({ where: { id: returnDoc.id }, include: { items: { include: { product: true } }, refunds: { include: { paymentMethod: true } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async void(user: AuthenticatedUser, invoiceId: string, dto: VoidSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, branch: { businessId: user.businessId } }, include: { items: true, payments: { include: { paymentMethod: true } } } });
      if (!invoice) throw new NotFoundException('Factura no encontrada.');
      if (invoice.status !== 'PAID') throw new BadRequestException('Sólo se pueden anular facturas pagadas.');
      for (const item of invoice.items) { const inventory = await tx.branchInventory.findUnique({ where: { branchId_productId: { branchId: invoice.branchId, productId: item.productId } } }); const previous = Number(inventory?.quantity ?? 0); const resulting = previous + Number(item.quantity); await tx.branchInventory.upsert({ where: { branchId_productId: { branchId: invoice.branchId, productId: item.productId } }, create: { branchId: invoice.branchId, productId: item.productId, quantity: resulting, minimumQuantity: 0 }, update: { quantity: resulting } }); await tx.inventoryMovement.create({ data: { branchId: invoice.branchId, productId: item.productId, type: 'SALE_VOID', quantity: item.quantity, previousQuantity: previous, resultingQuantity: resulting, referenceType: 'Invoice', referenceId: invoice.id, reason: dto.reason.trim(), createdById: user.id } }); }
      const updated = await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'VOIDED', voidReason: dto.reason.trim(), voidedAt: new Date() } });
      const cashReceived = money(invoice.payments.filter((payment) => payment.paymentMethod.kind === PaymentKind.CASH).reduce((sum, payment) => sum + Number(payment.amount), 0) - Number(invoice.changeAmount));
      if (invoice.cashSessionId && cashReceived > 0) await tx.cashMovement.create({ data: { cashSessionId: invoice.cashSessionId, type: 'RETURN_CASH', amount: cashReceived, referenceType: 'Invoice', referenceId: invoice.id, reason: dto.reason.trim(), createdById: user.id } });
      await tx.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'INVOICE_VOIDED', entityType: 'Invoice', entityId: invoice.id, before: JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonValue, after: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue, reason: dto.reason.trim() } });
      return updated;
    });
  }

  async reprint(user: AuthenticatedUser, invoiceId: string) { const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, branch: { businessId: user.businessId } }, include: { branch: true, createdBy: { select: { firstName: true, lastName: true } }, customer: true, items: { include: { product: true } }, payments: { include: { paymentMethod: true, bank: true, posTerminal: true } } } }); if (!invoice) throw new NotFoundException('Factura no encontrada.'); await this.prisma.auditLog.create({ data: { businessId: user.businessId, userId: user.id, action: 'INVOICE_REPRINTED', entityType: 'Invoice', entityId: invoice.id } }); return invoice; }
  private authorizedBranch(user: AuthenticatedUser, branchId?: string) { const selected = branchId ?? user.branches[0]?.id; if (!selected || !user.branches.some((branch) => branch.id === selected)) throw new ForbiddenException('La sucursal no está autorizada.'); return selected; }
}
