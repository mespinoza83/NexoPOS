'use client';

import { FormEvent, useState } from 'react';
import Swal from 'sweetalert2';
import { MainSidebar } from './main-sidebar';
import { AdminTabs, type AdminSection } from './admin-tabs';

export type Branch = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  active: boolean;
  _count: { users: number; registers: number; invoices: number };
};
type CashRegister = { id: string; branchId: string; code: string; name: string; active: boolean; branch: { name: string }; _count: { sessions: number } };
type InvoiceSequence = { id: string; branchId: string; series: string; next: number; branch: { name: string } };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

type Props = {
  user: { firstName: string; lastName: string; branches: Array<{ name: string }> };
  branches: Branch[];
  cashRegisters: CashRegister[];
  invoiceSequences: InvoiceSequence[];
  counts: { users: number; roles: number; permissions: number; banks: number };
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

export function BranchesView({ user, branches, cashRegisters, invoiceSequences, counts, apiUrl, request, onSection, onBack, onSales, onInventory, onCash, onReports, onCustomers, onRefresh, onLogout }: Props) {
  const [saving, setSaving] = useState(false);

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    try {
      const response = await request(`${apiUrl}/admin/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.get('code'), name: form.get('name'), address: form.get('address') || undefined, phone: form.get('phone') || undefined }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo crear la sucursal.');
      formElement.reset();
      await onRefresh();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Sucursal creada', showConfirmButton: false, timer: 2200 });
    } catch (error) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo guardar', text: error instanceof Error ? error.message : 'Ocurrió un error inesperado.', showConfirmButton: false, timer: 4000, timerProgressBar: true, width: '22rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } });
    } finally {
      setSaving(false);
    }
  }

  async function toggleBranch(branch: Branch) {
    const response = await request(`${apiUrl}/admin/branches/${branch.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !branch.active }) });
    const result = await response.json().catch(() => ({})) as { message?: string | string[] };
    if (!response.ok) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo actualizar', text: Array.isArray(result.message) ? result.message.join(', ') : result.message, showConfirmButton: false, timer: 4000, timerProgressBar: true, width: '22rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } });
      return;
    }
    await onRefresh();
  }

  async function editBranch(branch: Branch) {
    const result = await Swal.fire({ title: 'Editar sucursal', html: `<label class="swal-field">Código<input id="branch-code" class="swal2-input" maxlength="20" value="${escapeHtml(branch.code)}"></label><label class="swal-field">Nombre<input id="branch-name" class="swal2-input" maxlength="150" value="${escapeHtml(branch.name)}"></label><label class="swal-field">Dirección<input id="branch-address" class="swal2-input" maxlength="250" value="${escapeHtml(branch.address ?? '')}"></label><label class="swal-field">Teléfono<input id="branch-phone" class="swal2-input" maxlength="30" value="${escapeHtml(branch.phone ?? '')}"></label>`, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', preConfirm: () => { const code = (document.getElementById('branch-code') as HTMLInputElement).value.trim(); const name = (document.getElementById('branch-name') as HTMLInputElement).value.trim(); const address = (document.getElementById('branch-address') as HTMLInputElement).value.trim(); const phone = (document.getElementById('branch-phone') as HTMLInputElement).value.trim(); if (code.length < 2 || name.length < 2) { Swal.showValidationMessage('Código y nombre deben tener al menos 2 caracteres.'); return false; } return { code, name, address, phone }; } });
    if (!result.isConfirmed || !result.value) return;
    try { await send(`/admin/branches/${branch.id}`, 'PATCH', result.value); }
    catch (error) { await showError('No se pudo editar la sucursal', error); }
  }

  async function send(path: string, method: 'POST' | 'PATCH', body: object) {
    const response = await request(`${apiUrl}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({})) as { message?: string | string[] };
    if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo guardar.');
    await onRefresh();
  }

  async function showError(title: string, error: unknown) {
    await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title, text: error instanceof Error ? error.message : 'Error inesperado.', showConfirmButton: false, timer: 4000, timerProgressBar: true, width: '22rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } });
  }

  async function createRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    try { await send('/admin/cash-registers', 'POST', { branchId: data.get('branchId'), code: data.get('code'), name: data.get('name') }); form.reset(); }
    catch (error) { await showError('No se pudo crear la caja', error); }
    finally { setSaving(false); }
  }

  async function toggleRegister(register: CashRegister) {
    try { await send(`/admin/cash-registers/${register.id}`, 'PATCH', { active: !register.active }); }
    catch (error) { await showError('No se pudo actualizar la caja', error); }
  }

  async function editRegister(register: CashRegister) {
    const result = await Swal.fire({ title: 'Editar caja registradora', html: `<label class="swal-field">Código<input id="register-code" class="swal2-input" maxlength="30" value="${escapeHtml(register.code)}"></label><label class="swal-field">Nombre<input id="register-name" class="swal2-input" maxlength="100" value="${escapeHtml(register.name)}"></label>`, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', preConfirm: () => { const code = (document.getElementById('register-code') as HTMLInputElement).value.trim(); const name = (document.getElementById('register-name') as HTMLInputElement).value.trim(); if (code.length < 2 || name.length < 2) { Swal.showValidationMessage('Código y nombre deben tener al menos 2 caracteres.'); return false; } return { code, name }; } });
    if (!result.isConfirmed || !result.value) return;
    try { await send(`/admin/cash-registers/${register.id}`, 'PATCH', result.value); }
    catch (error) { await showError('No se pudo editar la caja', error); }
  }

  async function changeSequence(sequence: InvoiceSequence) {
    const result = await Swal.fire({ title: `Numeración ${sequence.branch.name}`, input: 'number', inputLabel: `Próximo número de la serie ${sequence.series}`, inputValue: sequence.next, inputAttributes: { min: String(sequence.next), step: '1' }, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed) return;
    try { await send(`/admin/invoice-sequences/${sequence.id}`, 'PATCH', { next: Number(result.value) }); }
    catch (error) { await showError('No se pudo actualizar la numeración', error); }
  }

  return <main className="dashboard-shell">
    <MainSidebar active="admin" userName={`${user.firstName} ${user.lastName}`} userRole="Administrador" actions={{ dashboard: onBack, sales: () => { void onSales(); }, inventory: () => { void onInventory(); }, cash: () => { void onCash(); }, reports: onReports, customers: () => { void onCustomers(); }, admin: () => { void onRefresh(); } }} onLogout={onLogout} />
    <section className="dashboard-content admin-content">
      <header className="dashboard-header"><div><button className="back-action" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Administración del negocio</p><h1>Sucursales</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header>
      <div className="dashboard-rule" />
      <AdminTabs active="branches" counts={{ ...counts, branches: branches.length }} onChange={onSection} />
      <section className="admin-layout directory-admin-layout">
        <div className="admin-list">
          <div className="section-heading"><div><p className="eyebrow">Directorio</p><h2>Sucursales del negocio</h2></div></div>
          {branches.length === 0 ? <div className="catalog-empty"><p>No hay sucursales registradas todavía.</p></div> : branches.map((branch) => <div className="admin-user-row directory-row" key={branch.id}><span className="user-initial">S</span><span><strong>{branch.name}</strong><small>{branch.code} · {branch.address || 'Sin dirección'} · {branch.phone || 'Sin teléfono'}</small></span><span>{branch._count.users} usuarios · {branch._count.invoices} ventas</span><em className={branch.active ? 'status-active' : 'status-inactive'}>{branch.active ? 'Activa' : 'Inactiva'}</em><span className="directory-actions"><button className="user-action-button" type="button" onClick={() => { void editBranch(branch); }}>Editar</button><button className={branch.active ? 'user-action-button danger' : 'user-action-button'} type="button" onClick={() => { void toggleBranch(branch); }}>{branch.active ? 'Inactivar' : 'Reactivar'}</button></span></div>)}
        </div>
        <form className="admin-form" onSubmit={createBranch}>
          <p className="eyebrow">Nuevo registro</p><h2>Agregar sucursal</h2>
          <input name="code" placeholder="Código, ej. MGA-02" required minLength={2} />
          <input name="name" placeholder="Nombre de la sucursal" required />
          <input name="address" placeholder="Dirección" />
          <input name="phone" placeholder="Teléfono" />
          <p className="tax-help">Se creará automáticamente una caja principal y la numeración de facturas.</p>
          <button className="primary-action" disabled={saving}>{saving ? 'Guardando...' : '＋ Guardar'}</button>
        </form>
      </section>
      <section className="admin-layout branch-operations-layout">
        <div className="admin-list">
          <div className="section-heading"><div><p className="eyebrow">Operación</p><h2>Cajas registradoras</h2></div></div>
          {cashRegisters.map((register) => <div className="admin-user-row directory-row" key={register.id}><span className="user-initial">C</span><span><strong>{register.name}</strong><small>{register.code} · {register.branch.name}</small></span><span>{register._count.sessions} sesiones</span><em className={register.active ? 'status-active' : 'status-inactive'}>{register.active ? 'Activa' : 'Inactiva'}</em><span className="directory-actions"><button className="user-action-button" type="button" onClick={() => { void editRegister(register); }}>Editar</button><button className={register.active ? 'user-action-button danger' : 'user-action-button'} type="button" onClick={() => { void toggleRegister(register); }}>{register.active ? 'Inactivar' : 'Reactivar'}</button></span></div>)}
          <form className="admin-form compact-admin-form" onSubmit={createRegister}><h3>Agregar caja</h3><select name="branchId" required defaultValue=""><option value="" disabled>Sucursal</option>{branches.filter((branch) => branch.active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><input name="code" placeholder="Código, ej. CAJA-02" required /><input name="name" placeholder="Nombre de la caja" required /><button className="primary-action" disabled={saving}>＋ Agregar caja</button></form>
        </div>
        <div className="admin-list">
          <div className="section-heading"><div><p className="eyebrow">Facturación</p><h2>Numeración por sucursal</h2></div></div>
          {invoiceSequences.map((sequence) => <div className="admin-user-row sequence-row" key={sequence.id}><span className="user-initial">N</span><span><strong>{sequence.branch.name}</strong><small>Serie {sequence.series}</small></span><span>Próxima: {sequence.series}-{String(sequence.next).padStart(8, '0')}</span><button className="user-action-button" type="button" onClick={() => { void changeSequence(sequence); }}>Configurar</button></div>)}
          <p className="tax-help">Por seguridad, el consecutivo solamente puede avanzar. Las ventas nuevas consumirán el número configurado aquí.</p>
        </div>
      </section>
    </section>
  </main>;
}
