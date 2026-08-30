'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { MainSidebar } from './main-sidebar';

export type Customer = {
  id: string;
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  _count: { invoices: number };
};

type Props = {
  user: { firstName: string; lastName: string; branches: Array<{ name: string }> };
  customers: Customer[];
  apiUrl: string;
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onBack: () => void;
  onSales: () => Promise<void>;
  onInventory: () => Promise<void>;
  onCash: () => Promise<void>;
  onReports: () => void;
  onAdmin: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
};

const emptyForm = { name: '', taxId: '', phone: '', email: '' };

export function CustomersView({ user, customers, apiUrl, request, onBack, onSales, onInventory, onCash, onReports, onAdmin, onRefresh, onLogout }: Props) {
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((customer) => [customer.name, customer.taxId, customer.phone, customer.email].some((value) => value?.toLowerCase().includes(term)));
  }, [customers, search]);
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / perPage));
  const visibleCustomers = filteredCustomers.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [search, perPage]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function editCustomer(customer: Customer) {
    setEditingId(customer.id);
    setForm({ name: customer.name, taxId: customer.taxId ?? '', phone: customer.phone ?? '', email: customer.email ?? '' });
    window.setTimeout(() => document.querySelector('.customer-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const wasEditing = Boolean(editingId);
    setSaving(true);
    try {
      const response = await request(editingId ? `${apiUrl}/admin/customers/${editingId}` : `${apiUrl}/admin/customers`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({})) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo guardar.');
      clearForm();
      await onRefresh();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: wasEditing ? 'Cliente actualizado' : 'Cliente creado', showConfirmButton: false, timer: 2200 });
    } catch (error) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo guardar', text: error instanceof Error ? error.message : 'Ocurrió un error inesperado.', showConfirmButton: false, timer: 4000, timerProgressBar: true, width: '22rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(customer: Customer) {
    const response = await request(`${apiUrl}/admin/customers/${customer.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !customer.active }) });
    const result = await response.json().catch(() => ({})) as { message?: string | string[] };
    if (!response.ok) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo actualizar', text: Array.isArray(result.message) ? result.message.join(', ') : result.message, showConfirmButton: false, timer: 4000, timerProgressBar: true, width: '22rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } });
      return;
    }
    await onRefresh();
  }

  return <main className="dashboard-shell">
    <MainSidebar active="customers" userName={`${user.firstName} ${user.lastName}`} userRole="Administrador" actions={{ dashboard: onBack, sales: () => { void onSales(); }, inventory: () => { void onInventory(); }, cash: () => { void onCash(); }, reports: onReports, customers: () => undefined, admin: () => { void onAdmin(); } }} onLogout={onLogout} />
    <section className="dashboard-content admin-content">
      <header className="dashboard-header"><div><button className="back-action" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Directorio comercial</p><h1>Clientes</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header>
      <div className="dashboard-rule" />
      <section className="admin-layout directory-admin-layout">
        <div className="admin-list">
          <div className="section-heading"><div><p className="eyebrow">Directorio</p><h2>Clientes registrados</h2></div></div>
          <div className="catalog-search customer-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, identificación, teléfono o correo" /></div>
          {visibleCustomers.length === 0 ? <div className="catalog-empty"><p>{search ? 'No hay clientes que coincidan con la búsqueda.' : 'No hay clientes registrados todavía.'}</p></div> : visibleCustomers.map((customer) => <div className="admin-user-row directory-row" key={customer.id}><span className="user-initial">C</span><span><strong>{customer.name}</strong><small>{customer.taxId || 'Sin identificación'} · {customer.phone || customer.email || 'Sin contacto'}</small></span><span>{customer._count.invoices} compras</span><em className={customer.active ? 'status-active' : 'status-inactive'}>{customer.active ? 'Activo' : 'Inactivo'}</em><span className="directory-actions"><button className="user-action-button" type="button" onClick={() => editCustomer(customer)}>Editar</button><button className={customer.active ? 'user-action-button danger' : 'user-action-button'} type="button" onClick={() => { void toggle(customer); }}>{customer.active ? 'Inactivar' : 'Reactivar'}</button></span></div>)}
          {filteredCustomers.length > 0 && <div className="catalog-pagination"><div className="pagination-summary"><span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredCustomers.length)} de {filteredCustomers.length}</span><label>Mostrar <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))}><option value={5}>5</option><option value={8}>8</option><option value={10}>10</option><option value={20}>20</option></select> registros</label></div><nav aria-label="Paginación de clientes"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>← Anterior</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" className={number === page ? 'page-active' : ''} aria-current={number === page ? 'page' : undefined} key={number} onClick={() => setPage(number)}>{number}</button>)}<button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Siguiente →</button></nav></div>}
        </div>
        <form className="admin-form customer-form" onSubmit={submit}>
          <p className="eyebrow">{editingId ? 'Edición' : 'Nuevo registro'}</p><h2>{editingId ? 'Editar cliente' : 'Agregar cliente'}</h2>
          <input name="name" placeholder="Nombre completo o razón social" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <input name="taxId" placeholder="Cédula o RUC" value={form.taxId} onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} />
          <input name="phone" placeholder="Teléfono" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <input name="email" type="email" placeholder="Correo electrónico" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <p className="tax-help">{editingId ? 'Modifica los datos y guarda los cambios.' : 'El cliente quedará disponible inmediatamente en el punto de venta.'}</p>
          {editingId && <button className="secondary-action" type="button" onClick={clearForm}>Cancelar edición</button>}
          <button className="primary-action" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : '＋ Guardar'}</button>
        </form>
      </section>
    </section>
  </main>;
}
