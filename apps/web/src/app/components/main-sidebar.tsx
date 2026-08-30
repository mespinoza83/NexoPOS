'use client';

import { useEffect, useState } from 'react';

export type MainSection = 'dashboard' | 'sales' | 'inventory' | 'cash' | 'reports' | 'customers' | 'admin';

type Props = { active: MainSection; userName: string; userRole?: string; permissions?: string[]; actions: Record<MainSection, () => void>; onLogout: () => void; loggingOut?: boolean };

const menuPermissions: Partial<Record<MainSection, string[]>> = {
  sales: ['sales.create', 'sales.read'],
  inventory: ['products.read', 'products.manage', 'inventory.read', 'inventory.adjust'],
  cash: ['cash.manage'],
  reports: ['reports.read', 'reports.sensitive.read'],
  customers: ['customers.manage'],
  admin: ['settings.manage', 'users.manage', 'roles.manage', 'audit.read'],
};

function Icon({ name }: { name: MainSection }) {
  const paths: Record<MainSection, React.ReactNode> = {
    dashboard: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
    sales: <><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.9a2 2 0 0 0 1.9-1.4L21 8H6" /></>,
    inventory: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4M4 7v10l8 4 8-4V7M12 11v10" /></>,
    cash: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M7 10h10M7 15h4" /><circle cx="17" cy="15" r="1" /></>,
    reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19v-2a4.5 4.5 0 0 1 9 0v2M16 7a3 3 0 0 1 0 6M17 15a4 4 0 0 1 3.5 4" /></>,
    admin: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3A1.7 1.7 0 0 0 14 21v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3L7 19.8 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14h-.2v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  };
  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function MainSidebar({ active, userName, userRole = 'Usuario', permissions, actions, onLogout, loggingOut = false }: Props) {
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>(() => permissions ?? []);
  useEffect(() => {
    if (permissions) {
      setEffectivePermissions(permissions);
      window.sessionStorage.setItem('nexopos.permissions', JSON.stringify(permissions));
      return;
    }
    try { setEffectivePermissions(JSON.parse(window.sessionStorage.getItem('nexopos.permissions') ?? '[]') as string[]); }
    catch { setEffectivePermissions([]); }
  }, [permissions]);
  const items: Array<[MainSection, string, string]> = [['dashboard', '01', 'Resumen'], ['sales', '02', 'Ventas'], ['inventory', '03', 'Inventario'], ['cash', '04', 'Caja'], ['reports', '05', 'Reportes'], ['customers', '06', 'Clientes'], ['admin', '07', 'Administración']];
  const visibleItems = items.filter(([section]) => !menuPermissions[section] || menuPermissions[section]!.some((permission) => effectivePermissions.includes(permission)));
  return <aside className="sidebar"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div><p className="sidebar-caption">Centro de operación</p><nav className="main-nav" aria-label="Navegación principal">{visibleItems.map(([section, number, label]) => <button className={`nav-item ${active === section ? 'active' : ''} ${section === 'admin' ? 'admin-nav' : ''}`} type="button" key={section} onClick={actions[section]}><Icon name={section} /><span>{number}</span>{label}</button>)}</nav><div className="sidebar-footer"><div className="user-chip"><span><strong>{userName}</strong><small>{userRole}</small></span></div><button className="logout-button" type="button" onClick={onLogout} disabled={loggingOut}>{loggingOut ? 'Saliendo...' : 'Cerrar sesión'}</button></div></aside>;
}
