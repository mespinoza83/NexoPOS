'use client';

import { useEffect, useState } from 'react';
import { AdminTabs, type AdminSection } from './admin-tabs';
import { MainSidebar } from './main-sidebar';

type AuditData = {
  items: Array<{ id: string; action: string; entityType: string; entityId?: string | null; reason?: string | null; ipAddress?: string | null; before?: unknown; after?: unknown; createdAt: string; user?: { firstName: string; lastName: string; email: string } | null }>;
  filters: { users: Array<{ id: string; firstName: string; lastName: string }>; actions: string[]; entityTypes: string[] };
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
};

type Props = { user: { firstName: string; lastName: string; branches: Array<{ name: string }> }; counts: { users: number; roles: number; permissions: number; branches: number; banks: number }; apiUrl: string; request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>; onSection: (section: AdminSection) => void; onBack: () => void; onSales: () => Promise<void>; onInventory: () => Promise<void>; onCash: () => Promise<void>; onReports: () => void; onCustomers: () => Promise<void>; onAdmin: () => Promise<void>; onLogout: () => void };

export function AuditView({ user, counts, apiUrl, request, onSection, onBack, onSales, onInventory, onCash, onReports, onCustomers, onAdmin, onLogout }: Props) {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entityType: '', userId: '', dateFrom: '', dateTo: '', page: 1, pageSize: 25 });
  const [selected, setSelected] = useState<AuditData['items'][number] | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
      Object.entries(filters).forEach(([key, value]) => { if (!['page', 'pageSize'].includes(key) && value) params.set(key, String(value)); });
      setLoading(true);
      void request(`${apiUrl}/admin/audit-logs?${params}`).then(async (response) => { if (!response.ok) throw new Error('No se pudo cargar la auditoría.'); setData(await response.json() as AuditData); }).finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [apiUrl, filters, request]);

  const update = (values: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...values, page: values.page ?? 1 }));
  return <main className="dashboard-shell"><MainSidebar active="admin" userName={`${user.firstName} ${user.lastName}`} userRole="Administrador" actions={{ dashboard: onBack, sales: () => { void onSales(); }, inventory: () => { void onInventory(); }, cash: () => { void onCash(); }, reports: onReports, customers: () => { void onCustomers(); }, admin: () => { void onAdmin(); } }} onLogout={onLogout} /><section className="dashboard-content admin-content"><header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Trazabilidad</p><h1>Auditoría</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header><div className="dashboard-rule" /><AdminTabs active="audit" counts={counts} onChange={onSection} /><section className="audit-panel"><div className="audit-filters"><label>Acción<select value={filters.action} onChange={(event) => update({ action: event.target.value })}><option value="">Todas</option>{data?.filters.actions.map((action) => <option key={action}>{action}</option>)}</select></label><label>Entidad<select value={filters.entityType} onChange={(event) => update({ entityType: event.target.value })}><option value="">Todas</option>{data?.filters.entityTypes.map((entity) => <option key={entity}>{entity}</option>)}</select></label><label>Usuario<select value={filters.userId} onChange={(event) => update({ userId: event.target.value })}><option value="">Todos</option>{data?.filters.users.map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}</select></label><label>Desde<input type="date" value={filters.dateFrom} onChange={(event) => update({ dateFrom: event.target.value })} /></label><label>Hasta<input type="date" value={filters.dateTo} onChange={(event) => update({ dateTo: event.target.value })} /></label></div><div className="audit-table"><div className="audit-row audit-heading"><span>Fecha</span><span>Usuario</span><span>Acción</span><span>Entidad</span><span>Motivo</span></div>{loading ? <div className="catalog-empty"><span className="loading-spinner dark-spinner" /></div> : data?.items.map((item) => <button className="audit-row" type="button" key={item.id} onClick={() => setSelected(item)}><span>{new Date(item.createdAt).toLocaleString('es-NI')}</span><span>{item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Sistema'}</span><strong>{item.action}</strong><span>{item.entityType}</span><span>{item.reason || '—'}</span></button>)}</div>{data && <footer className="history-pagination"><span>{data.pagination.totalRecords} eventos</span><label>Mostrar <select value={filters.pageSize} onChange={(event) => update({ pageSize: Number(event.target.value) })}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select> registros</label><div><button disabled={data.pagination.page <= 1} onClick={() => update({ page: data.pagination.page - 1 })}>← Anterior</button><b>{data.pagination.page} / {data.pagination.totalPages}</b><button disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => update({ page: data.pagination.page + 1 })}>Siguiente →</button></div></footer>}</section>{selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="audit-detail"><header><h2>{selected.action}</h2><button type="button" onClick={() => setSelected(null)}>×</button></header><p>{selected.entityType}{selected.entityId ? ` · ${selected.entityId}` : ''}</p><h3>Antes</h3><pre>{JSON.stringify(selected.before, null, 2) || 'Sin datos'}</pre><h3>Después</h3><pre>{JSON.stringify(selected.after, null, 2) || 'Sin datos'}</pre></section></div>}</section></main>;
}
