export type AdminSection = 'users' | 'roles' | 'permissions' | 'banks' | 'branches' | 'units' | 'taxes' | 'audit';

type Props = {
  active: AdminSection;
  counts: { users: number; roles: number; permissions: number; branches: number; banks: number; units?: number };
  onChange: (section: AdminSection) => void;
};

export function AdminTabs({ active, counts, onChange }: Props) {
  const tabs: Array<{ section: AdminSection; label: string; count?: number }> = [
    { section: 'users', label: 'Usuarios', count: counts.users },
    { section: 'roles', label: 'Roles', count: counts.roles },
    { section: 'permissions', label: 'Permisos', count: counts.permissions },
    { section: 'branches', label: 'Sucursales', count: counts.branches },
    { section: 'banks', label: 'Bancos', count: counts.banks },
    { section: 'units', label: 'Medidas', count: counts.units },
    { section: 'taxes', label: 'Configuración' },
    { section: 'audit', label: 'Auditoría' },
  ];

  return <div className="admin-tabs">
    {tabs.map((tab) => <button className={active === tab.section ? 'tab-active' : ''} type="button" key={tab.section} onClick={() => onChange(tab.section)}>{tab.label}{tab.count !== undefined && <> <b>{tab.count}</b></>}</button>)}
  </div>;
}
