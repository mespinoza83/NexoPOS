'use client';

import { FormEvent, useState } from 'react';
import Swal from 'sweetalert2';
import { AdminTabs, type AdminSection } from './admin-tabs';
import { MainSidebar } from './main-sidebar';

type Bank = { id: string; name: string; active: boolean; _count: { terminals: number } };
type Branch = { id: string; name: string; active: boolean };
type Terminal = { id: string; code: string; name: string; active: boolean; bankId: string; branchId: string; bank: { name: string }; branch: { name: string } };
type PaymentMethod = { id: string; code: string; name: string; kind: 'CASH' | 'BANK_TRANSFER' | 'POS' | 'OTHER'; active: boolean; _count: { payments: number; returnRefunds: number } };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

type Props = {
  user: { firstName: string; lastName: string; branches: Array<{ name: string }> };
  banks: Bank[];
  branches: Branch[];
  terminals: Terminal[];
  paymentMethods: PaymentMethod[];
  counts: { users: number; roles: number; permissions: number };
  apiUrl: string;
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onSection: (section: AdminSection) => void;
  onBack: () => void;
  onSales: () => Promise<void>;
  onInventory: () => Promise<void>;
  onCash: () => Promise<void>;
  onReports: () => void;
  onCustomers: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
};

export function BanksView({ user, banks, branches, terminals, paymentMethods, counts, apiUrl, request, onSection, onBack, onSales, onInventory, onCash, onReports, onCustomers, onRefresh, onLogout }: Props) {
  const [saving, setSaving] = useState(false);

  async function showError(title: string, error: unknown) {
    await Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title,
      text: error instanceof Error ? error.message : 'Error inesperado.',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      width: '22rem',
      customClass: { popup: 'compact-toast', title: 'compact-toast-title' },
    });
  }

  async function send(path: string, method: 'POST' | 'PATCH', body: object) {
    const response = await request(`${apiUrl}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({})) as { message?: string | string[] };
    if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo guardar.');
    await onRefresh();
  }

  async function createBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    try { await send('/admin/banks', 'POST', { name: new FormData(form).get('name') }); form.reset(); }
    catch (error) { await showError('No se pudo crear el banco', error); }
    finally { setSaving(false); }
  }

  async function createTerminal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    try {
      await send('/admin/pos-terminals', 'POST', { branchId: data.get('branchId'), bankId: data.get('bankId'), code: data.get('code'), name: data.get('name') });
      form.reset();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terminal POS creada', showConfirmButton: false, timer: 2000 });
    } catch (error) { await showError('No se pudo crear la terminal', error); }
    finally { setSaving(false); }
  }

  async function createPaymentMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    try {
      await send('/admin/payment-methods', 'POST', { code: data.get('code'), name: data.get('name'), kind: data.get('kind') });
      form.reset();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Método de pago creado', showConfirmButton: false, timer: 2000 });
    } catch (error) { await showError('No se pudo crear el método', error); }
    finally { setSaving(false); }
  }

  async function toggle(path: string, active: boolean) {
    try { await send(path, 'PATCH', { active: !active }); }
    catch (error) { await showError('No se pudo actualizar', error); }
  }

  async function editBank(bank: Bank) {
    const result = await Swal.fire({ title: 'Editar banco', input: 'text', inputLabel: 'Nombre', inputValue: bank.name, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', inputValidator: (value) => value.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : undefined });
    if (!result.isConfirmed) return;
    try { await send(`/admin/banks/${bank.id}`, 'PATCH', { name: result.value.trim() }); }
    catch (error) { await showError('No se pudo editar el banco', error); }
  }

  async function editTerminal(terminal: Terminal) {
    const result = await Swal.fire({ title: 'Editar terminal POS', html: `<label class="swal-field">Código<input id="terminal-code" class="swal2-input" maxlength="30" value="${escapeHtml(terminal.code)}"></label><label class="swal-field">Nombre<input id="terminal-name" class="swal2-input" maxlength="150" value="${escapeHtml(terminal.name)}"></label>`, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', preConfirm: () => { const code = (document.getElementById('terminal-code') as HTMLInputElement).value.trim(); const name = (document.getElementById('terminal-name') as HTMLInputElement).value.trim(); if (code.length < 2 || name.length < 2) { Swal.showValidationMessage('Código y nombre deben tener al menos 2 caracteres.'); return false; } return { code, name }; } });
    if (!result.isConfirmed || !result.value) return;
    try { await send(`/admin/pos-terminals/${terminal.id}`, 'PATCH', result.value); }
    catch (error) { await showError('No se pudo editar la terminal', error); }
  }

  async function editPaymentMethod(method: PaymentMethod) {
    const result = await Swal.fire({ title: 'Editar método de pago', html: `<label class="swal-field">Código<input id="method-code" class="swal2-input" maxlength="30" value="${escapeHtml(method.code)}"></label><label class="swal-field">Nombre<input id="method-name" class="swal2-input" maxlength="100" value="${escapeHtml(method.name)}"></label><label class="swal-field">Tipo<select id="method-kind" class="swal2-select"><option value="CASH" ${method.kind === 'CASH' ? 'selected' : ''}>Efectivo</option><option value="BANK_TRANSFER" ${method.kind === 'BANK_TRANSFER' ? 'selected' : ''}>Transferencia bancaria</option><option value="POS" ${method.kind === 'POS' ? 'selected' : ''}>Tarjeta POS</option><option value="OTHER" ${method.kind === 'OTHER' ? 'selected' : ''}>Otro</option></select></label>`, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', preConfirm: () => { const code = (document.getElementById('method-code') as HTMLInputElement).value.trim(); const name = (document.getElementById('method-name') as HTMLInputElement).value.trim(); const kind = (document.getElementById('method-kind') as HTMLSelectElement).value; if (code.length < 2 || name.length < 2) { Swal.showValidationMessage('Código y nombre deben tener al menos 2 caracteres.'); return false; } return { code, name, kind }; } });
    if (!result.isConfirmed || !result.value) return;
    try { await send(`/admin/payment-methods/${method.id}`, 'PATCH', result.value); }
    catch (error) { await showError('No se pudo editar el método', error); }
  }

  return <main className="dashboard-shell">
    <MainSidebar active="admin" userName={`${user.firstName} ${user.lastName}`} userRole="Administrador" actions={{ dashboard: onBack, sales: () => { void onSales(); }, inventory: () => { void onInventory(); }, cash: () => { void onCash(); }, reports: onReports, customers: () => { void onCustomers(); }, admin: () => { void onRefresh(); } }} onLogout={onLogout} />
    <section className="dashboard-content admin-content">
      <header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Medios financieros</p><h1>Bancos y terminales POS</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header>
      <div className="dashboard-rule" />
      <AdminTabs active="banks" counts={{ ...counts, branches: branches.length, banks: banks.length }} onChange={onSection} />
      <section className="admin-layout bank-admin-layout">
        <div className="admin-list">
          <div className="section-heading"><div><p className="eyebrow">Configuración</p><h2>Bancos</h2></div></div>
          {banks.map((bank) => <div className="admin-user-row bank-row" key={bank.id}><span className="user-initial">B</span><span><strong>{bank.name}</strong><small>{bank._count.terminals} terminales</small></span><em className={bank.active ? 'status-active' : 'status-inactive'}>{bank.active ? 'Activo' : 'Inactivo'}</em><span className="directory-actions"><button className="user-action-button" type="button" onClick={() => { void editBank(bank); }}>Editar</button><button className={bank.active ? 'user-action-button danger' : 'user-action-button'} type="button" onClick={() => { void toggle(`/admin/banks/${bank.id}`, bank.active); }}>{bank.active ? 'Inactivar' : 'Reactivar'}</button></span></div>)}
          <form className="admin-form compact-admin-form" onSubmit={createBank}><h3>Agregar banco</h3><input name="name" placeholder="Nombre del banco" required /><button className="primary-action" disabled={saving}>＋ Agregar</button></form>
        </div>
        <div className="admin-list">
          <div className="section-heading"><div><p className="eyebrow">Cobros con tarjeta</p><h2>Terminales POS</h2></div></div>
          {terminals.length === 0 ? <div className="catalog-empty"><p>No hay terminales configuradas.</p></div> : terminals.map((terminal) => <div className="admin-user-row bank-row" key={terminal.id}><span className="user-initial">P</span><span><strong>{terminal.name}</strong><small>{terminal.code} · {terminal.bank.name} · {terminal.branch.name}</small></span><em className={terminal.active ? 'status-active' : 'status-inactive'}>{terminal.active ? 'Activa' : 'Inactiva'}</em><span className="directory-actions"><button className="user-action-button" type="button" onClick={() => { void editTerminal(terminal); }}>Editar</button><button className={terminal.active ? 'user-action-button danger' : 'user-action-button'} type="button" onClick={() => { void toggle(`/admin/pos-terminals/${terminal.id}`, terminal.active); }}>{terminal.active ? 'Inactivar' : 'Reactivar'}</button></span></div>)}
          <form className="admin-form compact-admin-form" onSubmit={createTerminal}><h3>Agregar terminal</h3><select name="branchId" required defaultValue=""><option value="" disabled>Sucursal</option>{branches.filter((branch) => branch.active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select name="bankId" required defaultValue=""><option value="" disabled>Banco</option>{banks.filter((bank) => bank.active).map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}</select><input name="code" placeholder="Código, ej. POS-01" required /><input name="name" placeholder="Nombre de la terminal" required /><button className="primary-action" disabled={saving}>＋ Agregar terminal</button></form>
        </div>
        <div className="admin-list payment-method-list">
          <div className="section-heading"><div><p className="eyebrow">Formas de cobro</p><h2>Métodos de pago</h2></div></div>
          {paymentMethods.map((method) => <div className="admin-user-row bank-row" key={method.id}><span className="user-initial">M</span><span><strong>{method.name}</strong><small>{method.code} · {method.kind === 'CASH' ? 'Efectivo' : method.kind === 'BANK_TRANSFER' ? 'Transferencia' : method.kind === 'POS' ? 'Terminal POS' : 'Otro'}</small></span><em className={method.active ? 'status-active' : 'status-inactive'}>{method.active ? 'Activo' : 'Inactivo'}</em><span className="directory-actions"><button className="user-action-button" type="button" onClick={() => { void editPaymentMethod(method); }}>Editar</button><button className={method.active ? 'user-action-button danger' : 'user-action-button'} type="button" onClick={() => { void toggle(`/admin/payment-methods/${method.id}`, method.active); }}>{method.active ? 'Inactivar' : 'Reactivar'}</button></span></div>)}
          <form className="admin-form compact-admin-form" onSubmit={createPaymentMethod}><h3>Agregar método</h3><input name="code" placeholder="Código, ej. WALLET" required /><input name="name" placeholder="Nombre del método" required /><select name="kind" required defaultValue="OTHER"><option value="CASH">Efectivo</option><option value="BANK_TRANSFER">Transferencia bancaria</option><option value="POS">Tarjeta POS</option><option value="OTHER">Otro</option></select><button className="primary-action" disabled={saving}>＋ Agregar método</button></form>
        </div>
      </section>
    </section>
  </main>;
}
