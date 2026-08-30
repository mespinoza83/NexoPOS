import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService banks', () => {
  const prisma = {
    bank: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    branch: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    user: { findFirst: jest.fn(), update: jest.fn() },
    userBranch: { deleteMany: jest.fn(), createMany: jest.fn() },
    userRole: { deleteMany: jest.fn(), create: jest.fn() },
    role: { findFirst: jest.fn() },
    cashRegister: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    invoiceSequence: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    cashSession: { count: jest.fn(), findFirst: jest.fn() },
    customer: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    posTerminal: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    paymentMethod: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
    invoicePayment: { count: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates a trimmed bank for the authenticated business', async () => {
    prisma.bank.create.mockResolvedValue({ id: 'bank-id' });
    const service = new AdminService(prisma as never);
    jest.spyOn(service, 'overview').mockResolvedValue({ banks: [] } as never);

    await service.createBank('business-id', '  BAC  ');

    expect(prisma.bank.create).toHaveBeenCalledWith({ data: { businessId: 'business-id', name: 'BAC' } });
  });

  it('rejects an empty or duplicate bank name', async () => {
    const service = new AdminService(prisma as never);
    await expect(service.createBank('business-id', '   ')).rejects.toBeInstanceOf(ConflictException);
    prisma.bank.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.createBank('business-id', 'BAC')).rejects.toThrow('Ya existe un banco con ese nombre.');
  });

  it('does not update a bank from another business', async () => {
    prisma.bank.findFirst.mockResolvedValue(null);
    const service = new AdminService(prisma as never);

    await expect(service.updateBank('business-id', 'foreign-bank', { active: false })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.bank.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign-bank', businessId: 'business-id' } });
  });

  it('creates a branch with its initial cash register and invoice sequence', async () => {
    prisma.branch.create.mockResolvedValue({ id: 'branch-id' });
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => callback(prisma));
    const service = new AdminService(prisma as never);
    jest.spyOn(service, 'overview').mockResolvedValue({ branches: [] } as never);

    await service.createBranch('business-id', { code: ' mga-02 ', name: 'Sucursal Norte' });

    expect(prisma.branch.create).toHaveBeenCalledWith({ data: { businessId: 'business-id', code: 'MGA-02', name: 'Sucursal Norte', address: null, phone: null } });
    expect(prisma.cashRegister.create).toHaveBeenCalledWith({ data: { branchId: 'branch-id', code: 'CAJA-01', name: 'Caja principal' } });
    expect(prisma.invoiceSequence.create).toHaveBeenCalledWith({ data: { branchId: 'branch-id' } });
  });

  it('does not update a customer from another business', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    const service = new AdminService(prisma as never);

    await expect(service.updateCustomer('business-id', 'foreign-customer', { active: false })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign-customer', businessId: 'business-id' } });
  });

  it('creates a POS terminal only with an active branch and bank from the business', async () => {
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch-id' });
    prisma.bank.findFirst.mockResolvedValue({ id: 'bank-id' });
    prisma.posTerminal.create.mockResolvedValue({ id: 'terminal-id' });
    const service = new AdminService(prisma as never);
    jest.spyOn(service, 'overview').mockResolvedValue({ terminals: [] } as never);

    await service.createPosTerminal('business-id', { branchId: 'branch-id', bankId: 'bank-id', code: ' pos-01 ', name: 'Terminal principal' });

    expect(prisma.posTerminal.create).toHaveBeenCalledWith({ data: { branchId: 'branch-id', bankId: 'bank-id', code: 'POS-01', name: 'Terminal principal' } });
    expect(prisma.branch.findFirst).toHaveBeenCalledWith({ where: { id: 'branch-id', businessId: 'business-id', active: true }, select: { id: true } });
    expect(prisma.bank.findFirst).toHaveBeenCalledWith({ where: { id: 'bank-id', businessId: 'business-id', active: true }, select: { id: true } });
  });

  it('does not update a POS terminal from another business', async () => {
    prisma.posTerminal.findFirst.mockResolvedValue(null);
    const service = new AdminService(prisma as never);

    await expect(service.updatePosTerminal('business-id', 'foreign-terminal', { active: false })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents disabling the last active payment method', async () => {
    prisma.paymentMethod.findFirst.mockResolvedValue({ id: 'cash-id', active: true });
    prisma.paymentMethod.count.mockResolvedValue(1);
    const service = new AdminService(prisma as never);

    await expect(service.updatePaymentMethod('business-id', 'cash-id', { active: false })).rejects.toThrow('El negocio debe conservar al menos un método de pago activo.');
    expect(prisma.paymentMethod.update).not.toHaveBeenCalled();
  });

  it('creates a normalized payment method for the business', async () => {
    prisma.paymentMethod.create.mockResolvedValue({ id: 'method-id' });
    const service = new AdminService(prisma as never);
    jest.spyOn(service, 'overview').mockResolvedValue({ paymentMethods: [] } as never);

    await service.createPaymentMethod('business-id', { code: ' wallet ', name: ' Billetera ', kind: 'OTHER' as never });

    expect(prisma.paymentMethod.create).toHaveBeenCalledWith({ data: { businessId: 'business-id', code: 'WALLET', name: 'Billetera', kind: 'OTHER' } });
  });

  it('does not change the kind of a payment method with recorded payments', async () => {
    prisma.paymentMethod.findFirst.mockResolvedValue({ id: 'method-id', active: true, kind: 'CASH' });
    prisma.invoicePayment.count.mockResolvedValue(3);
    const service = new AdminService(prisma as never);

    await expect(service.updatePaymentMethod('business-id', 'method-id', { kind: 'POS' as never })).rejects.toThrow('No se puede cambiar el tipo de un método que ya tiene pagos registrados.');
    expect(prisma.paymentMethod.update).not.toHaveBeenCalled();
  });

  it('does not disable a cash register with an open session', async () => {
    prisma.cashRegister.findFirst.mockResolvedValue({ id: 'register-id', active: true });
    prisma.cashSession.findFirst.mockResolvedValue({ id: 'session-id' });
    const service = new AdminService(prisma as never);

    await expect(service.updateCashRegister('business-id', 'register-id', { active: false })).rejects.toThrow('Cierre la sesión abierta antes de inactivar la caja.');
    expect(prisma.cashRegister.update).not.toHaveBeenCalled();
  });

  it('does not move invoice numbering backwards', async () => {
    prisma.invoiceSequence.findFirst.mockResolvedValue({ id: 'sequence-id', next: 25 });
    const service = new AdminService(prisma as never);

    await expect(service.updateInvoiceSequence('business-id', 'sequence-id', { next: 24 })).rejects.toThrow('El próximo número no puede ser menor que 25.');
    expect(prisma.invoiceSequence.update).not.toHaveBeenCalled();
  });

  it('replaces all authorized branches when updating a user', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-id' });
    prisma.branch.findMany.mockResolvedValue([{ id: 'branch-1' }, { id: 'branch-2' }]);
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => callback(prisma));
    const service = new AdminService(prisma as never);
    jest.spyOn(service, 'overview').mockResolvedValue({ users: [] } as never);

    await service.updateUser('business-id', 'user-id', { branchIds: ['branch-1', 'branch-2'] });

    expect(prisma.userBranch.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-id' } });
    expect(prisma.userBranch.createMany).toHaveBeenCalledWith({ data: [{ userId: 'user-id', branchId: 'branch-1' }, { userId: 'user-id', branchId: 'branch-2' }] });
  });
});
