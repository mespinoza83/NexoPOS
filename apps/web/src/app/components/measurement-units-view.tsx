'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';
import { AdminTabs, type AdminSection } from './admin-tabs';
import { MainSidebar } from './main-sidebar';

export type MeasurementUnit = { id: string; code: string; name: string; abbreviation: string; decimals: number; active: boolean };

type Props = {
  user: { firstName: string; lastName: string; branches: Array<{ name: string }> };
  units: MeasurementUnit[];
  counts: { users: number; roles: number; permissions: number; branches: number; banks: number };
  apiUrl: string;
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onSection: (section: AdminSection) => void;
  onBack: () => void; onSales: () => Promise<void>; onInventory: () => Promise<void>; onCash: () => Promise<void>;
  onReports: () => void; onCustomers: () => Promise<void>; onRefresh: () => Promise<void>; onLogout: () => void;
};

export function MeasurementUnitsView({ user, units, counts, apiUrl, request, onSection, onBack, onSales, onInventory, onCash, onReports, onCustomers, onRefresh, onLogout }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);

  async function edit(unit: MeasurementUnit) {
    const result = await Swal.fire({
      title: 'Editar unidad de medida',
      html: `<label class="swal-field">Nombre<input id="unit-name" class="swal2-input" maxlength="40" value="${unit.name}"></label><label class="swal-field">Abreviatura<input id="unit-abbreviation" class="swal2-input" maxlength="12" value="${unit.abbreviation}"></label><label class="swal-field">Decimales visibles<select id="unit-decimals" class="swal2-select"><option value="0" ${unit.decimals === 0 ? 'selected' : ''}>0</option><option value="1" ${unit.decimals === 1 ? 'selected' : ''}>1</option><option value="2" ${unit.decimals === 2 ? 'selected' : ''}>2</option><option value="3" ${unit.decimals === 3 ? 'selected' : ''}>3</option></select></label>`,
      showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
      preConfirm: () => ({ name: (document.getElementById('unit-name') as HTMLInputElement).value.trim(), abbreviation: (document.getElementById('unit-abbreviation') as HTMLInputElement).value.trim(), decimals: Number((document.getElementById('unit-decimals') as HTMLSelectElement).value) }),
    });
    if (!result.isConfirmed || !result.value?.name || !result.value.abbreviation) return;
    await update(unit.id, result.value);
  }

  async function update(id: string, body: object) {
    setSavingId(id);
    try {
      const response = await request(`${apiUrl}/admin/measurement-units/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const detail = await response.json().catch(() => ({})) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(detail.message) ? detail.message.join(', ') : detail.message ?? 'No se pudo actualizar la medida.');
      await onRefresh();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Medida actualizada', showConfirmButton: false, timer: 1800 });
    } catch (error) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo guardar', text: error instanceof Error ? error.message : 'Error inesperado.', showConfirmButton: false, timer: 4000 });
    } finally { setSavingId(null); }
  }

  return <main className="dashboard-shell"><MainSidebar active="admin" userName={`${user.firstName} ${user.lastName}`} userRole="Administrador" actions={{ dashboard: onBack, sales: () => void onSales(), inventory: () => void onInventory(), cash: () => void onCash(), reports: onReports, customers: () => void onCustomers(), admin: () => void onRefresh() }} onLogout={onLogout} /><section className="dashboard-content admin-content"><header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Catálogo del negocio</p><h1>Unidades de medida</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header><div className="dashboard-rule" /><AdminTabs active="units" counts={{ ...counts, units: units.length }} onChange={onSection} /><section className="measurement-units-panel"><div className="section-heading"><div><p className="eyebrow">Presentación y precisión</p><h2>Medidas disponibles</h2><p>Configura el nombre, la abreviatura y los decimales que verá el usuario.</p></div></div><div className="measurement-unit-grid">{units.map((unit) => <article className="measurement-unit-card" key={unit.id}><span className="unit-symbol">{unit.abbreviation}</span><span><strong>{unit.name}</strong><small>{unit.code} · {unit.decimals} decimales</small></span><em className={unit.active ? 'status-active' : 'status-inactive'}>{unit.active ? 'Activa' : 'Inactiva'}</em><span className="directory-actions"><button className="user-action-button" type="button" onClick={() => void edit(unit)}>Editar</button><button disabled={savingId === unit.id} className={unit.active ? 'user-action-button danger' : 'user-action-button'} type="button" onClick={() => void update(unit.id, { active: !unit.active })}>{unit.active ? 'Inactivar' : 'Reactivar'}</button></span></article>)}</div></section></section></main>;
}
