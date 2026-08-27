'use client';

import { FormEvent, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type AuthUser = {
  id?: string;
  businessId?: string;
  email?: string;
  firstName: string;
  lastName: string;
  permissions?: string[];
  branches: Array<{ id: string; name: string; code?: string }>;
};

type CatalogProduct = {
  id: string;
  internalCode: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  purchasePrice: string | number;
  profitMargin: string | number;
  salePrice: string | number;
  taxRate: string | number;
  taxExempt: boolean;
  status: string;
  availableForSale: boolean;
  category: { id: string; name: string };
  inventory: Array<{ quantity: string | number; minimumQuantity: string | number }>;
};

type CatalogCategory = { id: string; name: string; active: boolean; _count?: { products: number } };
type InventoryMovement = { id: string; type: string; quantity: string | number; previousQuantity: string | number; resultingQuantity: string | number; status: string; reason?: string | null; createdAt: string; responsibleName: string; product: { id: string; internalCode: string; name: string } };
type InventoryEntry = { id: string; number: string; reference?: string | null; source?: string | null; notes?: string | null; status: string; createdAt: string; responsibleName: string; items: Array<{ id: string; quantity: string | number; unitCost?: string | number | null; product: { id: string; internalCode: string; name: string } }> };
type InventoryCount = { id: string; number: string; status: string; createdAt: string; items: Array<{ id: string; expectedQuantity: string | number; countedQuantity: string | number; difference: string | number; product: { id: string; internalCode: string; name: string } }> };
type SalesSetup = { business: { defaultCurrency: string; exchangeRate: string | number; ivaRate: string | number; taxesEnabled: boolean }; paymentMethods: Array<{ id: string; code: string; name: string; kind: 'CASH' | 'BANK_TRANSFER' | 'POS' | 'OTHER' }>; banks: Array<{ id: string; name: string }>; terminals: Array<{ id: string; bankId: string; code: string; name: string; bank: { id: string; name: string } }>; customers: Array<{ id: string; name: string; taxId?: string | null; phone?: string | null; email?: string | null }> };
type SalesInvoice = { id: string; number: string; status: string; subtotal: string | number; discountTotal: string | number; taxTotal: string | number; total: string | number; changeAmount: string | number; createdAt: string; paidAt?: string | null; customer?: { name?: string | null } | null; createdBy?: { firstName: string; lastName: string }; items: Array<{ id: string; quantity: string | number; unitPrice: string | number; discountPercent: string | number; discountAmount: string | number; taxRate: string | number; taxAmount: string | number; lineTotal: string | number; product: { name: string; internalCode: string } }>; payments: Array<{ id: string; amount: string | number; cardType?: string | null; reference?: string | null; paymentMethod: { name: string }; bank?: { name: string } | null; posTerminal?: { name: string } | null }>; discounts: Array<{ id: string; scope: string; percent: string | number; amount: string | number; reason: string }>; returns?: Array<{ items: Array<{ invoiceItemId: string; quantity: string | number }> }> };

type CashData = { registers: Array<{ id: string; code: string; name: string }>; openSession: { id: string; openedAt: string; openingAmount: string | number; expectedCash: string | number; cashRegister: { name: string }; movements: Array<{ id: string; type: string; amount: string | number; reason?: string | null; createdAt: string }>; invoices: Array<{ id: string; number: string; total: string | number; createdAt: string }> } | null; recentSessions: Array<{ id: string; openedAt: string; closedAt?: string | null; openingAmount: string | number; expectedCash?: string | number | null; countedCash?: string | number | null; difference?: string | number | null; status: string; cashRegister: { name: string } }> };

type SuspendedSale = { id: string; label: string; createdAt: string; data: { customerId?: string; invoiceDiscount?: number; invoiceDiscountReason?: string; items?: Array<{ productId: string; quantity: number; discountPercent: number; discountReason: string }>; payments?: Array<{ paymentMethodId: string; amount: number; bankId: string; posTerminalId: string; cardType: 'DEBIT' | 'CREDIT'; reference: string }> } };

type SalesHistoryData = { items: SalesInvoice[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number }; totals: { subtotal: string | number; discounts: string | number; taxes: string | number; total: string | number }; filters: { users: Array<{ id: string; firstName: string; lastName: string }>; paymentMethods: Array<{ id: string; name: string }> } };

type AdminData = {
  users: Array<{ id: string; email: string; firstName: string; lastName: string; status: string; roles: Array<{ role: { id: string; name: string } }>; branches: Array<{ branch: { id: string; name: string } }> }>;
  roles: Array<{ id: string; code: string; name: string; description?: string | null; permissions: Array<{ permission: { id: string; code: string; name: string } }>; _count: { users: number } }>;
  permissions: Array<{ id: string; code: string; name: string; description?: string | null }>;
  branches: Array<{ id: string; name: string; code: string }>;
  business: { taxesEnabled: boolean; ivaRate: string | number };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
let sessionRefresh: Promise<boolean> | null = null;

async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestInit = { ...init, credentials: 'include' as const };
  let response = await fetch(input, requestInit);
  if (response.status !== 401) return response;

  sessionRefresh ??= fetch(`${apiUrl}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((refreshResponse) => refreshResponse.ok)
    .catch(() => false)
    .finally(() => { sessionRefresh = null; });
  if (await sessionRefresh) response = await fetch(input, requestInit);
  return response;
}

type MenuIconName = 'home' | 'sales' | 'inventory' | 'cash' | 'reports' | 'admin';

function MenuIcon({ name }: { name: MenuIconName }) {
  const paths: Record<MenuIconName, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
    sales: <><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.9a2 2 0 0 0 1.9-1.4L21 8H6" /><path d="m14 5 2-2 2 2M16 3v7" /></>,
    inventory: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4M4 7v10l8 4 8-4V7M12 11v10" /></>,
    cash: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M7 10h10M7 15h4" /><circle cx="17" cy="15" r="1" /></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    admin: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  };

  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

type StockAlertLevel = 'OUT_OF_STOCK' | 'BELOW_MINIMUM' | 'AT_MINIMUM' | 'NEAR_MINIMUM' | 'HEALTHY';

function getStockAlert(quantity: number, minimum: number): { level: StockAlertLevel; label: string; className: string } {
  if (quantity <= 0) return { level: 'OUT_OF_STOCK', label: 'Sin existencia', className: 'alert-critical' };
  if (minimum <= 0) return { level: 'HEALTHY', label: 'Disponible', className: 'alert-healthy' };
  if (quantity < minimum) return { level: 'BELOW_MINIMUM', label: 'Debajo del mínimo', className: 'alert-critical' };
  if (quantity === minimum) return { level: 'AT_MINIMUM', label: 'En el mínimo', className: 'alert-warning' };
  if (quantity <= minimum * 1.2) return { level: 'NEAR_MINIMUM', label: 'Cerca del mínimo', className: 'alert-near' };
  return { level: 'HEALTHY', label: 'Disponible', className: 'alert-healthy' };
}

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([]);
  const [salesSetup, setSalesSetup] = useState<SalesSetup | null>(null);
  const [salesHistory, setSalesHistory] = useState<SalesInvoice[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [cashData, setCashData] = useState<CashData | null>(null);
  const [cashLoading, setCashLoading] = useState(false);

  useEffect(() => {
    authenticatedFetch(`${apiUrl}/auth/me`)
      .then(async (response) => {
        if (response.ok) {
          const result = (await response.json()) as { user?: AuthUser };
          if (result.user) setUser(result.user);
        }
      })
      .catch(() => undefined)
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const renewSession = () => { void fetch(`${apiUrl}/auth/refresh`, { method: 'POST', credentials: 'include' }).then(async (response) => { if (response.ok) { const result = await response.json() as { user?: AuthUser }; if (result.user) setUser(result.user); } }).catch(() => undefined); };
    const interval = window.setInterval(renewSession, 10 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') renewSession(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { user?: AuthUser; message?: string };
      if (!response.ok || !result.user) {
        throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo iniciar sesión.');
      }
      setUser(result.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo conectar con el API.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      setLoggingOut(false);
    }
  }

  async function openCatalog() {
    setActiveView('inventory');
    setCatalogLoading(true);
    try {
      const [productsResponse, categoriesResponse, movementsResponse, entriesResponse, countsResponse] = await Promise.all([
        authenticatedFetch(`${apiUrl}/catalog/products`),
        authenticatedFetch(`${apiUrl}/catalog/categories`),
        authenticatedFetch(`${apiUrl}/catalog/inventory-movements`),
        authenticatedFetch(`${apiUrl}/catalog/inventory-entries`),
        authenticatedFetch(`${apiUrl}/catalog/inventory-counts`),
      ]);
      if (productsResponse.ok) setProducts((await productsResponse.json()) as CatalogProduct[]);
      if (categoriesResponse.ok) setCategories((await categoriesResponse.json()) as CatalogCategory[]);
      if (movementsResponse.ok) setInventoryMovements((await movementsResponse.json()) as InventoryMovement[]);
      if (entriesResponse.ok) setInventoryEntries((await entriesResponse.json()) as InventoryEntry[]);
      if (countsResponse.ok) setInventoryCounts((await countsResponse.json()) as InventoryCount[]);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function openAdmin() {
    setActiveView('admin');
    setAdminLoading(true);
    setAdminError('');
    try {
      const response = await authenticatedFetch(`${apiUrl}/admin/access`);
      const result = (await response.json().catch(() => ({}))) as AdminData & { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'No se pudo cargar Administración.');
      setAdminData(result);
    } catch (requestError) {
      setAdminData(null);
      setAdminError(requestError instanceof Error ? requestError.message : 'No se pudo conectar con la API.');
    } finally {
      setAdminLoading(false);
    }
  }

  async function openSales() {
    setActiveView('sales'); setSalesLoading(true);
    try {
      const [productsResponse, setupResponse, historyResponse] = await Promise.all([authenticatedFetch(`${apiUrl}/catalog/products`), authenticatedFetch(`${apiUrl}/sales/setup`), authenticatedFetch(`${apiUrl}/sales`)]);
      if (productsResponse.ok) setProducts((await productsResponse.json()) as CatalogProduct[]);
      if (setupResponse.ok) setSalesSetup((await setupResponse.json()) as SalesSetup);
      if (historyResponse.ok) setSalesHistory((await historyResponse.json()) as SalesInvoice[]);
    } finally { setSalesLoading(false); }
  }

  async function openCash() {
    setActiveView('cash'); setCashLoading(true);
    try { const response = await authenticatedFetch(`${apiUrl}/cash`); const result = await response.json().catch(() => ({})) as CashData & { message?: string }; if (!response.ok) throw new Error(result.message ?? 'No se pudo cargar Caja.'); setCashData(result); }
    catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo abrir Caja', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); setActiveView('dashboard'); }
    finally { setCashLoading(false); }
  }

  if (user) {
    if (activeView === 'admin') return adminData ? <AdminView user={user} data={adminData} loading={adminLoading} onBack={() => setActiveView('dashboard')} onSales={openSales} onInventory={openCatalog} onCash={openCash} onReports={() => setActiveView('sales-history')} onRefresh={openAdmin} onLogout={handleLogout} /> : <AdminStatusView loading={adminLoading} error={adminError} onRetry={openAdmin} onBack={() => setActiveView('dashboard')} />;
    if (activeView === 'inventory') {
      return <InventoryView user={user} products={products} categories={categories} movements={inventoryMovements} entries={inventoryEntries} counts={inventoryCounts} loading={catalogLoading} onRefresh={openCatalog} onBack={() => setActiveView('dashboard')} onSales={openSales} onCash={openCash} onReports={() => setActiveView('sales-history')} onAdmin={openAdmin} onLogout={handleLogout} />;
    }
    if (activeView === 'sales' && salesSetup) return <SalesView user={user} products={products} setup={salesSetup} invoices={salesHistory} loading={salesLoading} onRefresh={openSales} onReports={() => setActiveView('sales-history')} onBack={() => setActiveView('dashboard')} onInventory={openCatalog} onCash={openCash} onAdmin={openAdmin} onLogout={handleLogout} />;
    if (activeView === 'sales-history') return <SalesHistoryView user={user} onBack={() => setActiveView('sales')} onDashboard={() => setActiveView('dashboard')} onInventory={openCatalog} onCash={openCash} onAdmin={openAdmin} onLogout={handleLogout} />;
    if (activeView === 'cash' && cashData) return <CashView user={user} data={cashData} loading={cashLoading} onRefresh={openCash} onBack={() => setActiveView('dashboard')} onSales={openSales} onInventory={openCatalog} onReports={() => setActiveView('sales-history')} onAdmin={openAdmin} onLogout={handleLogout} />;

    return (
      <main className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div>
          <p className="sidebar-caption">Centro de operación</p>
          <nav className="main-nav" aria-label="Navegación principal">
            <button className="nav-item active" type="button" onClick={() => setActiveView('dashboard')}><MenuIcon name="home" /><span>01</span>Resumen</button>
            <button className="nav-item" type="button" onClick={() => { void openSales(); }}><MenuIcon name="sales" /><span>02</span>Ventas</button>
            <button className="nav-item" type="button" onClick={openCatalog}><MenuIcon name="inventory" /><span>03</span>Inventario</button>
            <button className="nav-item" type="button" onClick={() => { void openCash(); }}><MenuIcon name="cash" /><span>04</span>Caja</button>
            <button className="nav-item" type="button" onClick={() => setActiveView('sales-history')}><MenuIcon name="reports" /><span>05</span>Reportes</button>
            <button className="nav-item admin-nav" type="button" onClick={openAdmin}><MenuIcon name="admin" /><span>06</span>Administración</button>
          </nav>
          <div className="sidebar-footer">
            <div className="user-chip"><span><strong>{user.firstName} {user.lastName}</strong><small>Administrador</small></span></div>
            <button className="logout-button" type="button" onClick={handleLogout} disabled={loggingOut}><span className="logout-icon" aria-hidden="true">↪</span>{loggingOut ? 'Saliendo...' : 'Cerrar sesión'}</button>
          </div>
        </aside>
        <section className="dashboard-content">
          <header className="dashboard-header">
            <div><p className="eyebrow">Domingo, 23 de agosto de 2026</p><h1>Buenos días, {user.firstName}.</h1></div>
            <div className="branch-selector"><span className="live-dot" /> <span>{user.branches[0]?.name ?? 'Sin sucursal'}</span><span className="chevron">⌄</span></div>
          </header>
          <div className="dashboard-rule" />
          <section className="metric-grid" aria-label="Indicadores del día">
            <article className="metric-card metric-featured"><div className="metric-top"><span>Ventas del día</span><span className="metric-icon">↗</span></div><strong>C$ 24,860.00</strong><small><b>+12.8%</b> frente a ayer</small><div className="sparkline"><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="metric-card"><div className="metric-top"><span>Transacciones</span><span className="metric-icon">#</span></div><strong>186</strong><small><b>+18</b> desde ayer</small></article>
            <article className="metric-card"><div className="metric-top"><span>Ticket promedio</span><span className="metric-icon">C$</span></div><strong>C$ 133.66</strong><small>Meta diaria <b>C$ 125.00</b></small></article>
            <article className="metric-card metric-alert"><div className="metric-top"><span>Stock por revisar</span><span className="metric-icon">!</span></div><strong>08</strong><small>productos bajo mínimo</small></article>
          </section>
          <div className="dashboard-columns">
            <section className="activity-panel"><div className="section-heading"><div><p className="eyebrow">Seguimiento</p><h2>Actividad reciente</h2></div><button type="button" className="text-action">Ver todo →</button></div><div className="activity-list"><div className="activity-row"><span className="activity-badge sale">↗</span><span><strong>Venta #004281</strong><small>Hace 4 minutos · POS-01</small></span><b>+ C$ 1,240.00</b></div><div className="activity-row"><span className="activity-badge stock">+</span><span><strong>Entrada de inventario</strong><small>Hace 18 minutos · 24 productos</small></span><b className="neutral">Inventario</b></div><div className="activity-row"><span className="activity-badge sale">↗</span><span><strong>Venta #004280</strong><small>Hace 26 minutos · POS-01</small></span><b>+ C$ 680.00</b></div><div className="activity-row"><span className="activity-badge return">↩</span><span><strong>Devolución #00038</strong><small>Hace 42 minutos · Autorizada</small></span><b className="negative">- C$ 420.00</b></div></div></section>
            <section className="quick-panel"><p className="eyebrow">Accesos rápidos</p><h2>¿Qué necesitas hacer?</h2><button type="button" className="quick-action"><span className="quick-icon coral">＋</span><span><strong>Nueva venta</strong><small>Abrir punto de venta</small></span><span>→</span></button><button type="button" className="quick-action"><span className="quick-icon teal">⌕</span><span><strong>Buscar producto</strong><small>Consultar catálogo y stock</small></span><span>→</span></button><button type="button" className="quick-action"><span className="quick-icon gold">▣</span><span><strong>Ver caja</strong><small>Estado de caja actual</small></span><span>→</span></button></section>
          </div>
        </section>
      </main>
    );
  }

  if (authLoading) return <main className="auth-loading"><span className="loading-spinner dark-spinner" /><p>Comprobando sesión...</p></main>;

  return (
    <main className="login-shell">
      <section className="brand-panel">
        <p className="eyebrow">NexoPOS / Operación</p>
        <h1>Todo tu negocio, en movimiento.</h1>
        <p>Ventas, inventario y caja reunidos en un solo lugar.</p>
        <div className="brand-line" />
      </section>
      <section className="login-panel">
        <div className="panel-heading">
          <p className="eyebrow">Acceso seguro</p>
          <h2>Inicia sesión</h2>
          <p>Ingresa tus credenciales para continuar.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button type="submit" disabled={loading} aria-busy={loading}>
            {loading && <span className="loading-spinner" aria-hidden="true" />}
            <span>{loading ? 'Verificando...' : 'Entrar'}</span>
          </button>
        </form>
      </section>
    </main>
  );
}

function receiptText(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

async function printThermalReceipt(invoice: SalesInvoice) {
  const printWindow = window.open('', 'nexopos-thermal-receipt', 'width=420,height=720');
  if (!printWindow) { await Swal.fire({ icon: 'warning', title: 'Ventana bloqueada', text: 'Permite las ventanas emergentes para imprimir el comprobante.' }); return; }
  printWindow.document.write('<p style="font-family:sans-serif;padding:20px">Preparando comprobante...</p>');
  const response = await authenticatedFetch(`${apiUrl}/sales/${invoice.id}/reprint`, { method: 'POST' });
  if (!response.ok) { printWindow.close(); const result = await response.json().catch(() => ({})) as { message?: string }; await Swal.fire({ icon: 'error', title: 'No se puede imprimir', text: result.message ?? 'No tiene permiso para reimprimir.' }); return; }
  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const itemRows = invoice.items.map((item) => `<div class="item"><b>${receiptText(item.product.name)}</b><small>${receiptText(item.product.internalCode)}</small><div><span>${Number(item.quantity).toFixed(3)} x C$ ${Number(item.unitPrice).toFixed(2)}</span><strong>C$ ${Number(item.lineTotal).toFixed(2)}</strong></div></div>`).join('');
  const paymentRows = invoice.payments.map((payment) => `<div class="row"><span>${receiptText(payment.paymentMethod.name)}</span><b>C$ ${Number(payment.amount).toFixed(2)}</b></div>${payment.bank?.name || payment.reference ? `<small>${receiptText([payment.bank?.name, payment.reference ? `Ref. ${payment.reference}` : ''].filter(Boolean).join(' · '))}</small>` : ''}`).join('');
  const status = ({ PAID: 'PAGADA', VOIDED: 'ANULADA', PARTIALLY_RETURNED: 'DEVUELTA PARCIAL', FULLY_RETURNED: 'DEVUELTA TOTAL' } as Record<string, string>)[invoice.status] ?? invoice.status;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${receiptText(invoice.number)}</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:80mm;background:#fff;color:#000}body{font:10px/1.35 "Courier New",monospace;padding:3mm}.center{text-align:center}.brand{font-size:18px;letter-spacing:1px}.line{border-top:1px dashed #000;margin:2mm 0}.row{display:flex;justify-content:space-between;gap:2mm;margin:.8mm 0}.info .row span:first-child{flex:0 0 16mm}.info .row span:last-child{text-align:right}.item{margin-bottom:2mm}.item b,.item small{display:block}.item small,.payments small{font-size:9px}.item div{display:flex;justify-content:space-between;margin-top:.5mm}.total{border-top:1px solid #000;border-bottom:1px solid #000;font-size:14px;padding:1mm 0;margin:1.5mm 0}.footer{font-weight:bold;padding:1mm 0 3mm;text-align:center}@media screen{body{margin:auto;border:1px solid #ddd;min-height:100vh}}</style></head><body><header class="center"><b class="brand">NEXOPOS</b><div>Comprobante de venta</div></header><div class="line"></div><section class="info"><div class="row"><span>Factura:</span><span>${receiptText(invoice.number)}</span></div><div class="row"><span>Fecha:</span><span>${receiptText(new Date(invoice.paidAt ?? invoice.createdAt).toLocaleString('es-NI'))}</span></div><div class="row"><span>Cliente:</span><span>${receiptText(invoice.customer?.name ?? 'Consumidor final')}</span></div><div class="row"><span>Cajero:</span><span>${receiptText(invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : 'No disponible')}</span></div><div class="row"><span>Estado:</span><span>${receiptText(status)}</span></div></section><div class="line"></div>${itemRows}<div class="line"></div><div class="row"><span>Subtotal</span><span>C$ ${Number(invoice.subtotal).toFixed(2)}</span></div><div class="row"><span>Descuentos</span><span>- C$ ${Number(invoice.discountTotal).toFixed(2)}</span></div><div class="row"><span>Impuestos</span><span>C$ ${Number(invoice.taxTotal).toFixed(2)}</span></div><div class="row total"><b>TOTAL</b><b>C$ ${Number(invoice.total).toFixed(2)}</b></div><div class="row"><span>Pagado</span><span>C$ ${paid.toFixed(2)}</span></div><div class="row"><span>Cambio</span><span>C$ ${Number(invoice.changeAmount).toFixed(2)}</span></div><div class="line"></div><section class="payments"><div class="center"><b>FORMA DE PAGO</b></div>${paymentRows}</section><div class="line"></div><footer class="footer">Gracias por su compra</footer><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),200));</script></body></html>`);
  printWindow.document.close();
  printWindow.focus();
}

function SalesHistoryView({ user, onBack, onDashboard, onInventory, onCash, onAdmin, onLogout }: { user: AuthUser; onBack: () => void; onDashboard: () => void; onInventory: () => Promise<void>; onCash: () => Promise<void>; onAdmin: () => Promise<void>; onLogout: () => void }) {
  const [data, setData] = useState<SalesHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', status: '', userId: '', paymentMethodId: '', page: 1, pageSize: 10 });
  useEffect(() => { const timer = window.setTimeout(() => { const params = new URLSearchParams({ branchId: user.branches[0]?.id ?? '', page: String(filters.page), pageSize: String(filters.pageSize) }); Object.entries(filters).forEach(([key, value]) => { if (!['page', 'pageSize'].includes(key) && value) params.set(key, String(value)); }); setLoading(true); authenticatedFetch(`${apiUrl}/sales/history?${params}`).then(async (response) => { if (!response.ok) throw new Error('No se pudo cargar el historial.'); setData((await response.json()) as SalesHistoryData); }).catch(async (error) => { await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: error instanceof Error ? error.message : 'Error al cargar historial', showConfirmButton: false, timer: 3000 }); }).finally(() => setLoading(false)); }, 250); return () => window.clearTimeout(timer); }, [filters, user.branches]);
  const updateFilter = (update: Partial<typeof filters>) => setFilters((current) => ({ ...current, page: 1, ...update }));
  async function printInvoice(invoice: SalesInvoice) { await printThermalReceipt(invoice); }
  const statusLabel: Record<string, string> = { PAID: 'Pagada', VOIDED: 'Anulada', PARTIALLY_RETURNED: 'Devuelta parcialmente', FULLY_RETURNED: 'Devuelta totalmente', DRAFT: 'Borrador' };
  return <main className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div><p className="sidebar-caption">Centro de operación</p><nav className="main-nav" aria-label="Navegación principal"><button className="nav-item" type="button" onClick={onDashboard}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item" type="button" onClick={onBack}><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item" type="button" onClick={() => { void onInventory(); }}><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item" type="button" onClick={() => { void onCash(); }}><MenuIcon name="cash" /><span>04</span>Caja</button><button className="nav-item active" type="button"><MenuIcon name="reports" /><span>05</span>Reportes</button><button className="nav-item admin-nav" type="button" onClick={() => { void onAdmin(); }}><MenuIcon name="admin" /><span>06</span>Administración</button></nav><div className="sidebar-footer"><strong>{user.firstName} {user.lastName}</strong><button className="logout-button" onClick={onLogout}>Cerrar sesión</button></div></aside><section className="dashboard-content history-content"><header className="dashboard-header"><div><button className="back-action" onClick={onBack}>← Volver al punto de venta</button><p className="eyebrow">Consulta y auditoría</p><h1>Historial de ventas</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name}</div></header><div className="dashboard-rule" /><section className="history-filters"><label className="history-search">Buscar<input value={filters.search} onChange={(event) => updateFilter({ search: event.target.value })} placeholder="Factura, cliente, producto o referencia" /></label><label>Desde<input type="date" value={filters.dateFrom} onChange={(event) => updateFilter({ dateFrom: event.target.value })} /></label><label>Hasta<input type="date" value={filters.dateTo} onChange={(event) => updateFilter({ dateTo: event.target.value })} /></label><label>Estado<select value={filters.status} onChange={(event) => updateFilter({ status: event.target.value })}><option value="">Todos</option><option value="PAID">Pagada</option><option value="VOIDED">Anulada</option><option value="PARTIALLY_RETURNED">Devuelta parcialmente</option><option value="FULLY_RETURNED">Devuelta totalmente</option></select></label><label>Cajero<select value={filters.userId} onChange={(event) => updateFilter({ userId: event.target.value })}><option value="">Todos</option>{data?.filters.users.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></label><label>Método<select value={filters.paymentMethodId} onChange={(event) => updateFilter({ paymentMethodId: event.target.value })}><option value="">Todos</option>{data?.filters.paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></section><div className="history-metrics"><div><span>Subtotal</span><strong>C$ {Number(data?.totals.subtotal ?? 0).toFixed(2)}</strong></div><div><span>Descuentos</span><strong>- C$ {Number(data?.totals.discounts ?? 0).toFixed(2)}</strong></div><div><span>Impuestos</span><strong>C$ {Number(data?.totals.taxes ?? 0).toFixed(2)}</strong></div><div><span>Total facturado</span><strong>C$ {Number(data?.totals.total ?? 0).toFixed(2)}</strong></div></div><section className="history-table"><div className="history-row history-heading"><span>Factura</span><span>Fecha</span><span>Cliente</span><span>Cajero</span><span>Estado</span><span>Total</span></div>{loading ? <div className="catalog-empty"><span className="loading-spinner dark-spinner" /></div> : !data?.items.length ? <div className="catalog-empty"><p>No hay ventas con estos filtros.</p></div> : data.items.map((invoice) => <button className="history-row" key={invoice.id} onClick={() => setSelectedInvoice(invoice)}><strong>{invoice.number}</strong><span>{new Date(invoice.createdAt).toLocaleString('es-NI')}</span><span>{invoice.customer?.name ?? 'Consumidor final'}</span><span>{invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : '—'}</span><em className={`history-status status-${invoice.status.toLowerCase()}`}>{statusLabel[invoice.status] ?? invoice.status}</em><strong>C$ {Number(invoice.total).toFixed(2)}</strong></button>)}</section><footer className="history-pagination"><span>Mostrando {data?.items.length ?? 0} de {data?.pagination.totalRecords ?? 0}</span><label>Mostrar<select value={filters.pageSize} onChange={(event) => updateFilter({ pageSize: Number(event.target.value) })}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option></select> registros</label><div><button disabled={(data?.pagination.page ?? 1) <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>← Anterior</button><b>{data?.pagination.page ?? 1} / {data?.pagination.totalPages ?? 1}</b><button disabled={(data?.pagination.page ?? 1) >= (data?.pagination.totalPages ?? 1)} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Siguiente →</button></div></footer>{selectedInvoice && <SaleDetailModal invoice={selectedInvoice} canVoid={false} canReturn={false} onVoid={() => undefined} onReturn={() => undefined} onPrint={() => { void printInvoice(selectedInvoice); }} onClose={() => setSelectedInvoice(null)} />}</section></main>;
}

function CashView({ user, data, loading, onRefresh, onBack, onSales, onInventory, onReports, onAdmin, onLogout }: { user: AuthUser; data: CashData; loading: boolean; onRefresh: () => Promise<void>; onBack: () => void; onSales: () => Promise<void>; onInventory: () => Promise<void>; onReports: () => void; onAdmin: () => Promise<void>; onLogout: () => void }) {
  async function openSession(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await authenticatedFetch(`${apiUrl}/cash/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cashRegisterId: form.get('cashRegisterId'), openingAmount: Number(form.get('openingAmount')) }) }); const result = await response.json().catch(() => ({})) as { message?: string }; if (!response.ok) { await Swal.fire({ icon: 'error', title: 'No se pudo abrir la caja', text: result.message }); return; } await onRefresh(); await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Caja abierta', showConfirmButton: false, timer: 2200 }); }
  async function addMovement(type: 'INCOME' | 'WITHDRAWAL' | 'EXPENSE' | 'ADJUSTMENT') { if (!data.openSession) return; const amount = await Swal.fire({ title: type === 'INCOME' ? 'Registrar ingreso' : type === 'WITHDRAWAL' ? 'Registrar retiro' : type === 'EXPENSE' ? 'Registrar gasto' : 'Ajustar caja', input: 'number', inputLabel: 'Monto', inputAttributes: { min: '0.01', step: '0.01' }, showCancelButton: true, confirmButtonText: 'Continuar' }); if (!amount.isConfirmed) return; const reason = await Swal.fire({ title: 'Motivo del movimiento', input: 'textarea', inputValidator: (value) => value.trim().length < 3 ? 'Escribe al menos 3 caracteres.' : undefined, showCancelButton: true, confirmButtonText: 'Registrar' }); if (!reason.isConfirmed) return; const response = await authenticatedFetch(`${apiUrl}/cash/sessions/${data.openSession.id}/movements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount: Number(amount.value), reason: reason.value.trim() }) }); const result = await response.json().catch(() => ({})) as { message?: string }; if (!response.ok) { await Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: result.message }); return; } await onRefresh(); }
  async function closeSession() { if (!data.openSession) return; const counted = await Swal.fire({ title: 'Cerrar caja', text: `Efectivo esperado: C$ ${Number(data.openSession.expectedCash).toFixed(2)}`, input: 'number', inputLabel: 'Efectivo contado', inputAttributes: { min: '0', step: '0.01' }, showCancelButton: true, confirmButtonText: 'Cerrar caja', confirmButtonColor: '#e45f48' }); if (!counted.isConfirmed) return; const response = await authenticatedFetch(`${apiUrl}/cash/sessions/${data.openSession.id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ countedCash: Number(counted.value) }) }); const result = await response.json().catch(() => ({})) as { message?: string; difference?: string | number }; if (!response.ok) { await Swal.fire({ icon: 'error', title: 'No se pudo cerrar', text: result.message }); return; } await onRefresh(); await Swal.fire({ icon: Number(result.difference) === 0 ? 'success' : 'warning', title: 'Caja cerrada', text: `Diferencia: C$ ${Number(result.difference).toFixed(2)}` }); }
  const movementLabels: Record<string, string> = { SALE_CASH: 'Venta en efectivo', INCOME: 'Ingreso', WITHDRAWAL: 'Retiro', EXPENSE: 'Gasto', ADJUSTMENT: 'Ajuste', RETURN_CASH: 'Devolución' };
  return <main className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div><p className="sidebar-caption">Centro de operación</p><nav className="main-nav"><button className="nav-item" onClick={onBack}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item" onClick={() => { void onSales(); }}><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item" onClick={() => { void onInventory(); }}><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item active"><MenuIcon name="cash" /><span>04</span>Caja</button><button className="nav-item" onClick={onReports}><MenuIcon name="reports" /><span>05</span>Reportes</button><button className="nav-item admin-nav" onClick={() => { void onAdmin(); }}><MenuIcon name="admin" /><span>06</span>Administración</button></nav><div className="sidebar-footer"><strong>{user.firstName} {user.lastName}</strong><button className="logout-button" onClick={onLogout}>Cerrar sesión</button></div></aside><section className="dashboard-content"><header className="dashboard-header"><div><button className="back-action" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Control de efectivo</p><h1>Caja</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name}</div></header><div className="dashboard-rule" />{loading ? <div className="catalog-empty"><span className="loading-spinner dark-spinner" /></div> : data.openSession ? <><div className="cash-summary"><div><span>Estado</span><strong className="cash-open">Abierta</strong></div><div><span>Monto inicial</span><strong>C$ {Number(data.openSession.openingAmount).toFixed(2)}</strong></div><div><span>Efectivo esperado</span><strong>C$ {Number(data.openSession.expectedCash).toFixed(2)}</strong></div><div><span>Ventas del turno</span><strong>{data.openSession.invoices.length}</strong></div></div><div className="cash-actions"><button onClick={() => { void addMovement('INCOME'); }}>＋ Ingreso</button><button onClick={() => { void addMovement('WITHDRAWAL'); }}>− Retiro</button><button onClick={() => { void addMovement('EXPENSE'); }}>Registrar gasto</button><button className="cash-close" onClick={() => { void closeSession(); }}>Cerrar caja</button></div><section className="cash-panel"><div className="section-heading"><div><p className="eyebrow">Turno actual</p><h2>Movimientos de efectivo</h2></div><small>Abierta {new Date(data.openSession.openedAt).toLocaleString('es-NI')}</small></div>{data.openSession.movements.length === 0 ? <p className="cash-empty">Todavía no hay movimientos.</p> : data.openSession.movements.map((movement) => <div className="cash-movement" key={movement.id}><span><strong>{movementLabels[movement.type] ?? movement.type}</strong><small>{movement.reason || new Date(movement.createdAt).toLocaleString('es-NI')}</small></span><b className={['WITHDRAWAL', 'EXPENSE', 'RETURN_CASH'].includes(movement.type) ? 'cash-negative' : ''}>{['WITHDRAWAL', 'EXPENSE', 'RETURN_CASH'].includes(movement.type) ? '−' : '+'} C$ {Number(movement.amount).toFixed(2)}</b></div>)}</section></> : <section className="cash-open-layout"><div><p className="eyebrow">Inicio de turno</p><h2>No hay una caja abierta</h2><p>Abre una caja antes de recibir pagos en efectivo.</p></div><form onSubmit={openSession}><label>Caja registradora<select name="cashRegisterId" required defaultValue={data.registers[0]?.id}>{data.registers.map((register) => <option key={register.id} value={register.id}>{register.name}</option>)}</select></label><label>Monto inicial<input name="openingAmount" type="number" min="0" step="0.01" defaultValue="0" required /></label><button className="primary-action" disabled={!data.registers.length}>Abrir caja</button>{!data.registers.length && <small>No hay cajas registradoras configuradas. Ejecuta nuevamente el seed.</small>}</form></section>}</section></main>;
}

function SalesView({ user, products, setup, invoices, loading, onRefresh, onReports, onBack, onInventory, onCash, onAdmin, onLogout }: { user: AuthUser; products: CatalogProduct[]; setup: SalesSetup; invoices: SalesInvoice[]; loading: boolean; onRefresh: () => Promise<void>; onReports: () => void; onBack: () => void; onInventory: () => Promise<void>; onCash: () => Promise<void>; onAdmin: () => Promise<void>; onLogout: () => void }) {
  type CartLine = { product: CatalogProduct; quantity: number; discountPercent: number; discountReason: string };
  type PaymentLine = { paymentMethodId: string; amount: number; bankId: string; posTerminalId: string; cardType: 'DEBIT' | 'CREDIT'; reference: string };
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceDiscountReason, setInvoiceDiscountReason] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [payments, setPayments] = useState<PaymentLine[]>([{ paymentMethodId: setup.paymentMethods[0]?.id ?? '', amount: 0, bankId: '', posTerminalId: '', cardType: 'DEBIT', reference: '' }]);
  const [processing, setProcessing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [returningInvoice, setReturningInvoice] = useState<SalesInvoice | null>(null);
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [showSuspended, setShowSuspended] = useState(false);
  const [paymentAttemptId, setPaymentAttemptId] = useState(() => globalThis.crypto.randomUUID());
  useEffect(() => { authenticatedFetch(`${apiUrl}/sales/suspended/list?branchId=${user.branches[0]?.id ?? ''}`).then(async (response) => { if (response.ok) setSuspendedSales((await response.json()) as SuspendedSale[]); }).catch(() => undefined); }, [user.branches]);
  const normalized = search.trim().toLocaleLowerCase();
  const results = normalized ? products.filter((product) => product.status === 'ACTIVE' && product.availableForSale && [product.name, product.internalCode, product.barcode ?? ''].some((value) => value.toLocaleLowerCase().includes(normalized))).slice(0, 8) : [];
  const itemSubtotal = cart.reduce((sum, line) => sum + Number(line.product.salePrice) * line.quantity, 0);
  const itemDiscountTotal = cart.reduce((sum, line) => sum + Number(line.product.salePrice) * line.quantity * line.discountPercent / 100, 0);
  const afterItemDiscount = itemSubtotal - itemDiscountTotal;
  const invoiceDiscountAmount = afterItemDiscount * invoiceDiscount / 100;
  const taxTotal = cart.reduce((sum, line) => { const lineNet = Number(line.product.salePrice) * line.quantity * (1 - line.discountPercent / 100) * (1 - invoiceDiscount / 100); const rate = Number(line.product.taxRate) || Number(setup.business.ivaRate); return sum + (setup.business.taxesEnabled && !line.product.taxExempt ? lineNet * rate / 100 : 0); }, 0);
  const total = Math.round((afterItemDiscount - invoiceDiscountAmount + taxTotal) * 100) / 100;
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const change = Math.max(0, Math.round((paid - total) * 100) / 100);

  function addProduct(product: CatalogProduct) { setCart((current) => current.some((line) => line.product.id === product.id) ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, quantity: 1, discountPercent: 0, discountReason: '' }]); setSearch(''); }
  function updateCart(productId: string, update: Partial<Omit<CartLine, 'product'>>) { setCart((current) => current.map((line) => line.product.id === productId ? { ...line, ...update } : line)); }
  function updatePayment(index: number, update: Partial<PaymentLine>) { setPayments((current) => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...update } : payment)); }
  async function completeSale() {
    if (!cart.length) { await Swal.fire({ icon: 'warning', title: 'Agrega productos a la venta' }); return; }
    if (paid < total) { await Swal.fire({ icon: 'warning', title: 'Pago incompleto', text: `Faltan C$ ${(total - paid).toFixed(2)}.` }); return; }
    setProcessing(true);
    try {
      const response = await authenticatedFetch(`${apiUrl}/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId: user.branches[0]?.id, idempotencyKey: paymentAttemptId, customerId: customerId || undefined, items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity, discountPercent: line.discountPercent, discountReason: line.discountReason })), discountPercent: invoiceDiscount, discountReason: invoiceDiscountReason, payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount), bankId: payment.bankId || undefined, posTerminalId: payment.posTerminalId || undefined, reference: payment.reference || undefined, cardType: setup.paymentMethods.find((method) => method.id === payment.paymentMethodId)?.kind === 'POS' ? payment.cardType : undefined })) }) });
      const result = await response.json() as SalesInvoice & { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'No se pudo completar la venta.');
      setCart([]); setPayments([{ paymentMethodId: setup.paymentMethods[0]?.id ?? '', amount: 0, bankId: '', posTerminalId: '', cardType: 'DEBIT', reference: '' }]); setInvoiceDiscount(0); setInvoiceDiscountReason(''); setPaymentAttemptId(globalThis.crypto.randomUUID()); await onRefresh();
      await Swal.fire({ icon: 'success', title: 'Venta completada', html: `<strong>${result.number}</strong><br>Total C$ ${Number(result.total).toFixed(2)}<br>Cambio C$ ${Number(result.changeAmount).toFixed(2)}`, confirmButtonText: 'Aceptar' });
    } catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo completar', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
    finally { setProcessing(false); }
  }

  async function suspendCurrentSale() { if (!cart.length) { await Swal.fire({ icon: 'warning', title: 'No hay productos para suspender' }); return; } const prompt = await Swal.fire({ title: 'Suspender venta', input: 'text', inputLabel: 'Nombre o referencia', inputPlaceholder: 'Ej. Mesa 3 o cliente esperando', showCancelButton: true, confirmButtonText: 'Suspender', inputValidator: (value) => value.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : undefined }); if (!prompt.isConfirmed) return; const data = { customerId, invoiceDiscount, invoiceDiscountReason, items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity, discountPercent: line.discountPercent, discountReason: line.discountReason })), payments }; const response = await authenticatedFetch(`${apiUrl}/sales/suspended`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId: user.branches[0]?.id, label: prompt.value.trim(), data }) }); const result = await response.json().catch(() => ({})) as SuspendedSale & { message?: string }; if (!response.ok) { await Swal.fire({ icon: 'error', title: 'No se pudo suspender', text: result.message }); return; } setSuspendedSales((current) => [result, ...current]); setCart([]); setCustomerId(''); setInvoiceDiscount(0); setInvoiceDiscountReason(''); setPayments([{ paymentMethodId: setup.paymentMethods[0]?.id ?? '', amount: 0, bankId: '', posTerminalId: '', cardType: 'DEBIT', reference: '' }]); setPaymentAttemptId(globalThis.crypto.randomUUID()); await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Venta suspendida', showConfirmButton: false, timer: 2200 }); }
  async function restoreSuspended(suspended: SuspendedSale) { const restored = (suspended.data.items ?? []).flatMap((item) => { const product = products.find((candidate) => candidate.id === item.productId); return product ? [{ product, quantity: item.quantity, discountPercent: item.discountPercent, discountReason: item.discountReason }] : []; }); setCart(restored); setCustomerId(suspended.data.customerId ?? ''); setInvoiceDiscount(suspended.data.invoiceDiscount ?? 0); setInvoiceDiscountReason(suspended.data.invoiceDiscountReason ?? ''); if (suspended.data.payments?.length) setPayments(suspended.data.payments); await cancelSuspended(suspended, false); setShowSuspended(false); setPaymentAttemptId(globalThis.crypto.randomUUID()); }
  async function cancelSuspended(suspended: SuspendedSale, confirm = true) { if (confirm) { const decision = await Swal.fire({ icon: 'warning', title: `Cancelar ${suspended.label}`, text: 'El borrador se eliminará sin afectar inventario ni caja.', showCancelButton: true, confirmButtonText: 'Eliminar borrador', cancelButtonText: 'Volver' }); if (!decision.isConfirmed) return; } const response = await authenticatedFetch(`${apiUrl}/sales/suspended/${suspended.id}/cancel`, { method: 'POST' }); if (response.ok) setSuspendedSales((current) => current.filter((item) => item.id !== suspended.id)); }

  async function voidInvoice(invoice: SalesInvoice) {
    const confirmation = await Swal.fire({ title: `Anular ${invoice.number}`, text: 'El inventario y los movimientos de caja serán revertidos.', icon: 'warning', input: 'textarea', inputLabel: 'Motivo obligatorio', inputPlaceholder: 'Describe el motivo de la anulación', showCancelButton: true, confirmButtonText: 'Anular venta', cancelButtonText: 'Cancelar', confirmButtonColor: '#e45f48', inputValidator: (value) => value.trim().length < 3 ? 'Escribe un motivo de al menos 3 caracteres.' : undefined });
    if (!confirmation.isConfirmed) return;
    const response = await authenticatedFetch(`${apiUrl}/sales/${invoice.id}/void`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: confirmation.value.trim() }) });
    const result = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) { await Swal.fire({ icon: 'error', title: 'No se pudo anular', text: result.message ?? 'Ocurrió un error inesperado.' }); return; }
    setSelectedInvoice(null);
    await onRefresh();
    await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Venta anulada e inventario restaurado', showConfirmButton: false, timer: 2600 });
  }

  async function printInvoice(invoice: SalesInvoice) {
    await printThermalReceipt(invoice);
  }

  async function returnCompleted() {
    setReturningInvoice(null);
    setSelectedInvoice(null);
    await onRefresh();
    await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Devolución completada e inventario restaurado', showConfirmButton: false, timer: 2800 });
  }

  async function createCustomer() {
    const prompt = await Swal.fire({ title: 'Nuevo cliente', input: 'text', inputLabel: 'Nombre o razón social', inputPlaceholder: 'Nombre del cliente', showCancelButton: true, confirmButtonText: 'Crear cliente', cancelButtonText: 'Cancelar', inputValidator: (value) => value.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : undefined });
    if (!prompt.isConfirmed) return;
    const response = await authenticatedFetch(`${apiUrl}/sales/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: prompt.value.trim() }) });
    const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok || !result.id) { await Swal.fire({ icon: 'error', title: 'No se pudo crear el cliente', text: result.message ?? 'Error inesperado.' }); return; }
    await onRefresh();
    setCustomerId(result.id);
  }

  return <main className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div><p className="sidebar-caption">Centro de operación</p><nav className="main-nav"><button className="nav-item" type="button" onClick={onBack}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item active" type="button"><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item" type="button" onClick={() => { void onInventory(); }}><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item" type="button" onClick={() => { void onCash(); }}><MenuIcon name="cash" /><span>04</span>Caja</button><button className="nav-item" type="button" onClick={onReports}><MenuIcon name="reports" /><span>05</span>Reportes</button><button className="nav-item admin-nav" type="button" onClick={() => { void onAdmin(); }}><MenuIcon name="admin" /><span>06</span>Administración</button></nav><div className="sidebar-footer"><div className="user-chip"><span><strong>{user.firstName} {user.lastName}</strong><small>Cajero</small></span></div><button className="logout-button" type="button" onClick={onLogout}>Cerrar sesión</button></div></aside><section className="dashboard-content sales-content"><header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Punto de venta</p><h1>Nueva venta</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header><div className="dashboard-rule" />{loading ? <div className="catalog-empty"><span className="loading-spinner dark-spinner" /><p>Cargando punto de venta...</p></div> : <div className="pos-layout"><section className="pos-products"><div className="pos-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) addProduct(results[0]); }} placeholder="Buscar o escanear nombre, código interno o código de barras" autoFocus /></div>{results.length > 0 && <div className="pos-results">{results.map((product) => <button type="button" key={product.id} onClick={() => addProduct(product)}><span><strong>{product.name}</strong><small>{product.internalCode}{product.barcode ? ` · ${product.barcode}` : ''}</small></span><span>C$ {Number(product.salePrice).toFixed(2)}<small>{Number(product.inventory[0]?.quantity ?? 0).toFixed(3)} disponibles</small></span></button>)}</div>}<div className="cart-table"><div className="cart-row cart-heading"><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Desc. %</span><span>Total</span><span /></div>{cart.length === 0 ? <div className="cart-empty">Busca un producto para comenzar la venta.</div> : cart.map((line) => <div className="cart-row" key={line.product.id}><span><strong>{line.product.name}</strong><small>{line.product.internalCode}</small></span><input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateCart(line.product.id, { quantity: Number(event.target.value) })} /><span>C$ {Number(line.product.salePrice).toFixed(2)}</span><span><input type="number" min="0" max="100" step="0.01" value={line.discountPercent} onChange={(event) => updateCart(line.product.id, { discountPercent: Number(event.target.value) })} />{line.discountPercent > 0 && <input className="discount-reason" value={line.discountReason} onChange={(event) => updateCart(line.product.id, { discountReason: event.target.value })} placeholder="Motivo" />}</span><strong>C$ {(Number(line.product.salePrice) * line.quantity * (1 - line.discountPercent / 100)).toFixed(2)}</strong><button type="button" onClick={() => setCart((current) => current.filter((item) => item.product.id !== line.product.id))}>×</button></div>)}</div><div className="sales-history"><div className="sales-history-heading"><h2>Ventas recientes</h2><button type="button" onClick={onReports}>Ver historial completo →</button></div>{invoices.slice(0, 5).map((invoice) => <span key={invoice.id}><button className="sale-number-link" type="button" onClick={() => setSelectedInvoice(invoice)}>{invoice.number}</button><small>{new Date(invoice.createdAt).toLocaleString('es-NI')}</small><em>{invoice.status === 'PAID' ? 'Pagada' : invoice.status}</em><strong>C$ {Number(invoice.total).toFixed(2)}</strong></span>)}</div></section><aside className="checkout-panel"><div className="customer-selector"><select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Consumidor final</option>{setup.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><button type="button" onClick={() => { void createCustomer(); }}>＋ Cliente</button></div><h2>Resumen</h2><dl><div><dt>Subtotal</dt><dd>C$ {itemSubtotal.toFixed(2)}</dd></div><div><dt>Descuento productos</dt><dd>- C$ {itemDiscountTotal.toFixed(2)}</dd></div><div className="invoice-discount"><dt>Descuento factura %</dt><dd><input type="number" min="0" max="100" step="0.01" value={invoiceDiscount} onChange={(event) => setInvoiceDiscount(Number(event.target.value))} /></dd></div>{invoiceDiscount > 0 && <div><dt>Motivo</dt><dd><input value={invoiceDiscountReason} onChange={(event) => setInvoiceDiscountReason(event.target.value)} /></dd></div>}<div><dt>Impuestos</dt><dd>C$ {taxTotal.toFixed(2)}</dd></div><div className="checkout-total"><dt>Total</dt><dd>C$ {total.toFixed(2)}</dd></div></dl><div className="payment-heading"><h3>Pagos</h3><button type="button" onClick={() => setPayments((current) => [...current, { paymentMethodId: setup.paymentMethods[0]?.id ?? '', amount: 0, bankId: '', posTerminalId: '', cardType: 'DEBIT', reference: '' }])}>＋ Mixto</button></div><div className="payment-list">{payments.map((payment, index) => { const method = setup.paymentMethods.find((item) => item.id === payment.paymentMethodId); return <div className="payment-line" key={index}><select value={payment.paymentMethodId} onChange={(event) => updatePayment(index, { paymentMethodId: event.target.value, bankId: '', posTerminalId: '' })}>{setup.paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" step="0.01" value={payment.amount} onChange={(event) => updatePayment(index, { amount: Number(event.target.value) })} placeholder="Monto" />{(method?.kind === 'BANK_TRANSFER' || method?.kind === 'POS') && <select value={payment.bankId} onChange={(event) => updatePayment(index, { bankId: event.target.value, posTerminalId: '' })}><option value="">Banco</option>{setup.banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}</select>}{method?.kind === 'POS' && <><select value={payment.posTerminalId} onChange={(event) => updatePayment(index, { posTerminalId: event.target.value })}><option value="">Terminal POS</option>{setup.terminals.filter((terminal) => !payment.bankId || terminal.bankId === payment.bankId).map((terminal) => <option key={terminal.id} value={terminal.id}>{terminal.name}</option>)}</select><select value={payment.cardType} onChange={(event) => updatePayment(index, { cardType: event.target.value as 'DEBIT' | 'CREDIT' })}><option value="DEBIT">Débito</option><option value="CREDIT">Crédito</option></select></>} {method?.kind !== 'CASH' && <input value={payment.reference} onChange={(event) => updatePayment(index, { reference: event.target.value })} placeholder="Referencia" />}{payments.length > 1 && <button type="button" onClick={() => setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index))}>Quitar</button>}</div>; })}</div><div className="payment-balance"><span>Pagado <strong>C$ {paid.toFixed(2)}</strong></span><span>Pendiente <strong>C$ {Math.max(0, total - paid).toFixed(2)}</strong></span><span>Cambio <strong>C$ {change.toFixed(2)}</strong></span></div><div className="sale-final-actions"><button className="suspend-sale" type="button" disabled={processing || cart.length === 0} onClick={() => { void suspendCurrentSale(); }}>Suspender</button><button className="complete-sale" type="button" disabled={processing || cart.length === 0} onClick={() => { void completeSale(); }}>{processing ? 'Procesando...' : `Cobrar C$ ${total.toFixed(2)}`}</button></div><button className="suspended-sales-link" type="button" onClick={() => setShowSuspended(true)}>Ventas suspendidas <b>{suspendedSales.length}</b></button></aside></div>}{selectedInvoice && <SaleDetailModal invoice={selectedInvoice} canVoid={Boolean(user.permissions?.includes('sales.void'))} canReturn={Boolean(user.permissions?.includes('returns.process'))} onVoid={() => { void voidInvoice(selectedInvoice); }} onReturn={() => setReturningInvoice(selectedInvoice)} onPrint={() => { void printInvoice(selectedInvoice); }} onClose={() => setSelectedInvoice(null)} />}{returningInvoice && <SaleReturnModal invoice={returningInvoice} setup={setup} onComplete={returnCompleted} onClose={() => setReturningInvoice(null)} />}{showSuspended && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSuspended(false); }}><section className="suspended-modal"><header><div><p className="eyebrow">Borradores</p><h2>Ventas suspendidas</h2><span>No afectan inventario ni caja hasta que se cobran.</span></div><button type="button" onClick={() => setShowSuspended(false)}>×</button></header>{suspendedSales.length === 0 ? <p className="cash-empty">No hay ventas suspendidas.</p> : <div className="suspended-list">{suspendedSales.map((suspended) => <div key={suspended.id}><span><strong>{suspended.label}</strong><small>{new Date(suspended.createdAt).toLocaleString('es-NI')} · {suspended.data.items?.length ?? 0} productos</small></span><button type="button" onClick={() => { void restoreSuspended(suspended); }}>Recuperar</button><button className="danger" type="button" onClick={() => { void cancelSuspended(suspended); }}>Cancelar</button></div>)}</div>}</section></div>}</section></main>;
}

function SaleReturnModal({ invoice, setup, onComplete, onClose }: { invoice: SalesInvoice; setup: SalesSetup; onComplete: () => Promise<void>; onClose: () => void }) {
  const available = invoice.items.map((item) => ({ item, returned: invoice.returns?.flatMap((returnDoc) => returnDoc.items).filter((returnedItem) => returnedItem.invoiceItemId === item.id).reduce((sum, returnedItem) => sum + Number(returnedItem.quantity), 0) ?? 0 }));
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(invoice.payments[0]?.paymentMethod ? setup.paymentMethods.find((method) => method.name === invoice.payments[0].paymentMethod.name)?.id ?? setup.paymentMethods[0]?.id ?? '' : setup.paymentMethods[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const total = available.reduce((sum, { item }) => sum + Number(item.lineTotal) * (quantities[item.id] ?? 0) / Number(item.quantity), 0);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const items = available.filter(({ item }) => (quantities[item.id] ?? 0) > 0).map(({ item }) => ({ invoiceItemId: item.id, quantity: quantities[item.id] })); if (!items.length) { await Swal.fire({ icon: 'warning', title: 'Selecciona al menos una cantidad' }); return; } setSaving(true); try { const response = await authenticatedFetch(`${apiUrl}/sales/${invoice.id}/returns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, items, refunds: [{ paymentMethodId, amount: Math.round(total * 100) / 100 }] }) }); const result = await response.json().catch(() => ({})) as { message?: string | string[] }; if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo completar la devolución.'); await onComplete(); } catch (error) { await Swal.fire({ icon: 'error', title: 'No se pudo devolver', text: error instanceof Error ? error.message : 'Error inesperado.' }); } finally { setSaving(false); } }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="sale-return-modal" onSubmit={submit}><header><div><p className="eyebrow">Devolución</p><h2>{invoice.number}</h2><span>Selecciona los productos y cantidades que regresan.</span></div><button type="button" onClick={onClose}>×</button></header><div className="return-items"><div className="return-row return-heading"><span>Producto</span><span>Vendido</span><span>Disponible</span><span>Devolver</span><span>Reembolso</span></div>{available.map(({ item, returned }) => { const remaining = Number(item.quantity) - returned; return <div className="return-row" key={item.id}><span><strong>{item.product.name}</strong><small>{item.product.internalCode}</small></span><span>{Number(item.quantity).toFixed(3)}</span><span>{remaining.toFixed(3)}</span><input type="number" min="0" max={remaining} step="0.001" value={quantities[item.id] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))} /><strong>C$ {(Number(item.lineTotal) * (quantities[item.id] ?? 0) / Number(item.quantity)).toFixed(2)}</strong></div>; })}</div><div className="return-fields"><label>Motivo<textarea required minLength={3} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo de la devolución" /></label><label>Método de reembolso<select required value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}>{setup.paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label></div><div className="return-total"><span>Total a reembolsar</span><strong>C$ {total.toFixed(2)}</strong></div><footer><button className="secondary-action" type="button" onClick={onClose}>Cancelar</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Procesando...' : 'Confirmar devolución'}</button></footer></form></div>;
}

function ThermalReceipt({ invoice }: { invoice: SalesInvoice }) {
  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const statusLabels: Record<string, string> = { PAID: 'PAGADA', VOIDED: 'ANULADA', PARTIALLY_RETURNED: 'DEVUELTA PARCIAL', FULLY_RETURNED: 'DEVUELTA TOTAL' };
  return <section className="thermal-receipt" aria-hidden="true"><header><strong>NEXOPOS</strong><span>Comprobante de venta</span></header><div className="thermal-separator" /><dl className="thermal-info"><div><dt>Factura:</dt><dd>{invoice.number}</dd></div><div><dt>Fecha:</dt><dd>{new Date(invoice.paidAt ?? invoice.createdAt).toLocaleString('es-NI')}</dd></div><div><dt>Cliente:</dt><dd>{invoice.customer?.name ?? 'Consumidor final'}</dd></div><div><dt>Cajero:</dt><dd>{invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : 'No disponible'}</dd></div><div><dt>Estado:</dt><dd>{statusLabels[invoice.status] ?? invoice.status}</dd></div></dl><div className="thermal-separator" /><div className="thermal-items">{invoice.items.map((item) => <div className="thermal-item" key={item.id}><strong>{item.product.name}</strong><small>{item.product.internalCode}</small><span>{Number(item.quantity).toFixed(3)} x C$ {Number(item.unitPrice).toFixed(2)}</span><b>C$ {Number(item.lineTotal).toFixed(2)}</b>{Number(item.discountAmount) > 0 && <em>Desc. -C$ {Number(item.discountAmount).toFixed(2)}</em>}{Number(item.taxAmount) > 0 && <em>Impuesto C$ {Number(item.taxAmount).toFixed(2)}</em>}</div>)}</div><div className="thermal-separator" /><dl className="thermal-totals"><div><dt>Subtotal</dt><dd>C$ {Number(invoice.subtotal).toFixed(2)}</dd></div>{Number(invoice.discountTotal) > 0 && <div><dt>Descuentos</dt><dd>- C$ {Number(invoice.discountTotal).toFixed(2)}</dd></div>}<div><dt>Impuestos</dt><dd>C$ {Number(invoice.taxTotal).toFixed(2)}</dd></div><div className="thermal-total"><dt>TOTAL</dt><dd>C$ {Number(invoice.total).toFixed(2)}</dd></div><div><dt>Pagado</dt><dd>C$ {paid.toFixed(2)}</dd></div><div><dt>Cambio</dt><dd>C$ {Number(invoice.changeAmount).toFixed(2)}</dd></div></dl><div className="thermal-separator" /><section className="thermal-payments"><strong>FORMA DE PAGO</strong>{invoice.payments.map((payment) => <div key={payment.id}><span>{payment.paymentMethod.name}</span><b>C$ {Number(payment.amount).toFixed(2)}</b>{(payment.bank?.name || payment.reference) && <small>{[payment.bank?.name, payment.reference ? `Ref. ${payment.reference}` : null].filter(Boolean).join(' · ')}</small>}</div>)}</section><div className="thermal-separator" /><footer>Gracias por su compra</footer></section>;
}

function SaleDetailModal({ invoice, canVoid, canReturn, onVoid, onReturn, onPrint, onClose }: { invoice: SalesInvoice; canVoid: boolean; canReturn: boolean; onVoid: () => void; onReturn: () => void; onPrint: () => void; onClose: () => void }) {
  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const status = invoice.status === 'PAID' ? 'Pagada' : invoice.status === 'VOIDED' ? 'Anulada' : invoice.status;
  return <div className="modal-backdrop sale-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="sale-detail-modal" role="dialog" aria-modal="true" aria-labelledby="sale-detail-title"><ThermalReceipt invoice={invoice} /><header><div><p className="eyebrow">Detalle de venta</p><h2 id="sale-detail-title">Factura {invoice.number}</h2><span>{new Date(invoice.paidAt ?? invoice.createdAt).toLocaleString('es-NI')} · {invoice.customer?.name ?? 'Consumidor final'}</span></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><div className="sale-detail-meta"><span>Estado<strong className={invoice.status === 'PAID' ? 'sale-paid' : 'sale-voided'}>{status}</strong></span><span>Cajero<strong>{invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : 'No disponible'}</strong></span><span>Productos<strong>{invoice.items.length}</strong></span></div><div className="sale-detail-table"><div className="sale-detail-row sale-detail-heading"><span>Producto</span><span>Cant.</span><span>Precio</span><span>Desc.</span><span>Impuesto</span><span>Total</span></div>{invoice.items.map((item) => <div className="sale-detail-row" key={item.id}><span><strong>{item.product.name}</strong><small>{item.product.internalCode}</small></span><span>{Number(item.quantity).toFixed(3)}</span><span>C$ {Number(item.unitPrice).toFixed(2)}</span><span>{Number(item.discountPercent).toFixed(2)}%<small>- C$ {Number(item.discountAmount).toFixed(2)}</small></span><span>{Number(item.taxRate).toFixed(2)}%<small>C$ {Number(item.taxAmount).toFixed(2)}</small></span><strong>C$ {Number(item.lineTotal).toFixed(2)}</strong></div>)}</div><div className="sale-detail-footer"><section><h3>Pagos</h3>{invoice.payments.map((payment) => <div className="sale-payment-detail" key={payment.id}><span><strong>{payment.paymentMethod.name}</strong><small>{[payment.bank?.name, payment.posTerminal?.name, payment.cardType === 'DEBIT' ? 'Débito' : payment.cardType === 'CREDIT' ? 'Crédito' : null, payment.reference ? `Ref. ${payment.reference}` : null].filter(Boolean).join(' · ')}</small></span><b>C$ {Number(payment.amount).toFixed(2)}</b></div>)}</section><dl><div><dt>Subtotal</dt><dd>C$ {Number(invoice.subtotal).toFixed(2)}</dd></div><div><dt>Descuentos</dt><dd>- C$ {Number(invoice.discountTotal).toFixed(2)}</dd></div><div><dt>Impuestos</dt><dd>C$ {Number(invoice.taxTotal).toFixed(2)}</dd></div><div className="sale-detail-total"><dt>Total</dt><dd>C$ {Number(invoice.total).toFixed(2)}</dd></div><div><dt>Pagado</dt><dd>C$ {paid.toFixed(2)}</dd></div><div><dt>Cambio</dt><dd>C$ {Number(invoice.changeAmount).toFixed(2)}</dd></div></dl></div>{invoice.discounts.length > 0 && <div className="sale-discount-notes"><strong>Motivos de descuento</strong>{invoice.discounts.map((discount) => <span key={discount.id}>{discount.scope === 'INVOICE' ? 'Factura' : 'Producto'}: {discount.reason} ({Number(discount.percent).toFixed(2)}%)</span>)}</div>}<footer><div>{canVoid && invoice.status === 'PAID' && <button className="sale-void-action" type="button" onClick={onVoid}>Anular venta</button>}{canReturn && ['PAID', 'PARTIALLY_RETURNED'].includes(invoice.status) && <button className="sale-return-action" type="button" onClick={onReturn}>Registrar devolución</button>}</div><button className="secondary-action" type="button" onClick={onPrint}>Imprimir comprobante</button><button className="primary-action" type="button" onClick={onClose}>Cerrar</button></footer></section></div>;
}

function InventoryView({ user, products, categories, movements, entries, counts, loading, onRefresh, onBack, onSales, onCash, onReports, onAdmin, onLogout }: { user: AuthUser; products: CatalogProduct[]; categories: CatalogCategory[]; movements: InventoryMovement[]; entries: InventoryEntry[]; counts: InventoryCount[]; loading: boolean; onRefresh: () => Promise<void>; onBack: () => void; onSales: () => Promise<void>; onCash: () => Promise<void>; onReports: () => void; onAdmin: () => Promise<void>; onLogout: () => void }) {
  const totalProducts = products.length;
  const stockAlerts = products.map((product) => ({ product, alert: getStockAlert(Number(product.inventory[0]?.quantity ?? 0), Number(product.inventory[0]?.minimumQuantity ?? 0)) })).filter(({ alert }) => alert.level !== 'HEALTHY');
  const lowStock = stockAlerts.length;
  const [search, setSearch] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(8);
  const [categorySearch, setCategorySearch] = useState('');
  const [inventoryTab, setInventoryTab] = useState<'products' | 'entries' | 'counts' | 'movements' | 'alerts'>('products');
  const [movementSearch, setMovementSearch] = useState('');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryItems, setEntryItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([{ productId: '', quantity: 1, unitCost: 0 }]);
  const [savingEntry, setSavingEntry] = useState(false);
  const [showCountForm, setShowCountForm] = useState(false);
  const [countedQuantities, setCountedQuantities] = useState<Record<string, number>>({});
  const [savingCount, setSavingCount] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleProducts = normalizedSearch ? products.filter((product) => [product.name, product.internalCode, product.barcode ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedSearch))) : products;
  const productPageCount = Math.max(1, Math.ceil(visibleProducts.length / productsPerPage));
  const paginatedProducts = visibleProducts.slice((productPage - 1) * productsPerPage, productPage * productsPerPage);
  const normalizedCategorySearch = categorySearch.trim().toLocaleLowerCase();
  const visibleCategories = normalizedCategorySearch ? categories.filter((category) => category.name.toLocaleLowerCase().includes(normalizedCategorySearch)) : categories;
  const normalizedMovementSearch = movementSearch.trim().toLocaleLowerCase();
  const visibleMovements = normalizedMovementSearch ? movements.filter((movement) => [movement.product.name, movement.product.internalCode, movement.type, movement.reason ?? '', movement.responsibleName].some((value) => value.toLocaleLowerCase().includes(normalizedMovementSearch))) : movements;
  const alertProducts = stockAlerts;

  useEffect(() => { setProductPage(1); }, [search, products.length, productsPerPage]);

  useEffect(() => { if (productPage > productPageCount) setProductPage(productPageCount); }, [productPage, productPageCount]);

  function generateBarcode() {
    const base = `200${Date.now().toString().slice(-9)}`;
    const checksum = (10 - base.split('').reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0) % 10) % 10;
    setBarcodeValue(`${base}${checksum}`);
  }

  useEffect(() => {
    if (!showProductForm && !showCategoryManager && !showEntryForm && !showCountForm) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowProductForm(false); setShowCategoryManager(false); setShowEntryForm(false); setShowCountForm(false); setEditingProduct(null); }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [showProductForm, showCategoryManager, showEntryForm, showCountForm]);

  async function apiRequest(path: string, options: RequestInit) {
    const response = await authenticatedFetch(`${apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const result = await response.json().catch(() => ({})) as { message?: string | string[] };
    if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo completar la operación.');
    return result;
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const purchasePrice = Number(form.get('purchasePrice'));
    const profitMargin = Number(form.get('profitMargin'));
    const manualSalePrice = form.get('manualSalePrice') === 'on';
    const payload = {
      internalCode: String(form.get('internalCode') ?? '').trim(), barcode: String(form.get('barcode') ?? '').trim(), name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(), categoryId: String(form.get('categoryId') ?? ''), purchasePrice, profitMargin,
      salePrice: manualSalePrice ? Number(form.get('salePrice')) : Math.round(purchasePrice * (1 + profitMargin / 100) * 100) / 100,
      manualSalePrice, availableForSale: form.get('availableForSale') === 'on', taxExempt: form.get('taxExempt') === 'on', taxRate: Number(form.get('taxRate') ?? 0),
      ...(String(form.get('imageUrl') ?? '').trim() ? { imageUrl: String(form.get('imageUrl')).trim() } : {}), minimumQuantity: Number(form.get('minimumQuantity') ?? 0), branchId: user.branches[0]?.id, ...(!editingProduct ? { initialQuantity: Number(form.get('initialQuantity') ?? 0) } : {}),
    };
    setSavingProduct(true);
    try {
      await apiRequest(editingProduct ? `/catalog/products/${editingProduct.id}` : '/catalog/products', { method: editingProduct ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      await onRefresh();
      setShowProductForm(false); setEditingProduct(null); setBarcodeValue('');
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: editingProduct ? 'Producto actualizado' : 'Producto creado', timer: 1800, timerProgressBar: true, showConfirmButton: false, width: '18rem', padding: '.65rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } });
    } catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
    finally { setSavingProduct(false); }
  }

  async function createCategory() {
    const prompt = await Swal.fire({ title: 'Nueva categoría', input: 'text', inputLabel: 'Nombre', inputPlaceholder: 'Ej. Bebidas', showCancelButton: true, confirmButtonText: 'Crear', cancelButtonText: 'Cancelar', inputValidator: (value) => value.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : undefined });
    if (!prompt.isConfirmed) return;
    try { await apiRequest('/catalog/categories', { method: 'POST', body: JSON.stringify({ name: prompt.value }) }); await onRefresh(); }
    catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo crear', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
  }

  async function renameCategory(category: CatalogCategory) {
    const prompt = await Swal.fire({ title: 'Renombrar categoría', input: 'text', inputValue: category.name, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', inputValidator: (value) => value.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : undefined });
    if (!prompt.isConfirmed) return;
    try { await apiRequest(`/catalog/categories/${category.id}`, { method: 'PATCH', body: JSON.stringify({ name: prompt.value.trim() }) }); await onRefresh(); }
    catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo actualizar', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
  }

  async function toggleCategory(category: CatalogCategory) {
    const nextActive = !category.active;
    const confirmation = await Swal.fire({ icon: 'question', title: `${nextActive ? 'Activar' : 'Inactivar'} categoría`, text: `¿Deseas ${nextActive ? 'activar' : 'inactivar'} “${category.name}”?`, showCancelButton: true, confirmButtonText: nextActive ? 'Sí, activar' : 'Sí, inactivar', cancelButtonText: 'Cancelar', confirmButtonColor: nextActive ? '#16858d' : '#e86f51' });
    if (!confirmation.isConfirmed) return;
    try { await apiRequest(`/catalog/categories/${category.id}`, { method: 'PATCH', body: JSON.stringify({ active: nextActive }) }); await onRefresh(); await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Categoría ${nextActive ? 'activada' : 'inactivada'}`, timer: 1800, showConfirmButton: false, width: '18rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } }); }
    catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo cambiar el estado', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
  }

  async function toggleProduct(product: CatalogProduct) {
    const nextStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const activating = nextStatus === 'ACTIVE';
    const confirmation = await Swal.fire({ icon: 'question', title: `${activating ? 'Activar' : 'Inactivar'} producto`, text: `¿Deseas ${activating ? 'activar' : 'inactivar'} “${product.name}”?`, showCancelButton: true, confirmButtonText: activating ? 'Sí, activar' : 'Sí, inactivar', cancelButtonText: 'Cancelar', confirmButtonColor: activating ? '#16858d' : '#e86f51' });
    if (!confirmation.isConfirmed) return;
    try { await apiRequest(`/catalog/products/${product.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) }); await onRefresh(); await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Producto ${activating ? 'activado' : 'inactivado'}`, timer: 1800, showConfirmButton: false, width: '18rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } }); }
    catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo cambiar el estado', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
  }

  async function adjustProduct(product: CatalogProduct) {
    const result = await Swal.fire({ title: `Ajustar ${product.name}`, html: '<select id="adjust-type" class="swal2-select"><option value="ADJUSTMENT_IN">Entrada</option><option value="ADJUSTMENT_OUT">Salida</option></select><input id="adjust-quantity" class="swal2-input" type="number" min="0.001" step="0.001" placeholder="Cantidad"><input id="adjust-reason" class="swal2-input" placeholder="Motivo obligatorio">', showCancelButton: true, confirmButtonText: 'Registrar', cancelButtonText: 'Cancelar', preConfirm: () => { const type = (document.getElementById('adjust-type') as HTMLSelectElement).value; const quantity = Number((document.getElementById('adjust-quantity') as HTMLInputElement).value); const reason = (document.getElementById('adjust-reason') as HTMLInputElement).value.trim(); if (quantity <= 0 || reason.length < 3) { Swal.showValidationMessage('Indica una cantidad válida y un motivo.'); return false; } return { type, quantity, reason }; } });
    if (!result.isConfirmed || !result.value) return;
    try { await apiRequest(`/catalog/products/${product.id}/adjust-inventory`, { method: 'POST', body: JSON.stringify({ ...result.value, branchId: user.branches[0]?.id }) }); await onRefresh(); }
    catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo ajustar', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
  }

  async function saveInventoryEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validItems = entryItems.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) { await Swal.fire({ icon: 'warning', title: 'Agrega al menos un producto' }); return; }
    setSavingEntry(true);
    try {
      await apiRequest('/catalog/inventory-entries', { method: 'POST', body: JSON.stringify({ branchId: user.branches[0]?.id, reference: String(form.get('reference') ?? ''), source: String(form.get('source') ?? ''), notes: String(form.get('notes') ?? ''), reason: String(form.get('reason') ?? ''), items: validItems }) });
      await onRefresh(); setShowEntryForm(false); setEntryItems([{ productId: '', quantity: 1, unitCost: 0 }]);
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Entrada confirmada', timer: 1800, showConfirmButton: false, width: '18rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } });
    } catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo registrar la entrada', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
    finally { setSavingEntry(false); }
  }

  function openCountForm() {
    setCountedQuantities(Object.fromEntries(products.filter((product) => product.status === 'ACTIVE').map((product) => [product.id, Number(product.inventory[0]?.quantity ?? 0)])));
    setShowCountForm(true);
  }

  async function saveInventoryCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSavingCount(true);
    try { await apiRequest('/catalog/inventory-counts', { method: 'POST', body: JSON.stringify({ branchId: user.branches[0]?.id, reason: String(form.get('reason') ?? ''), notes: String(form.get('notes') ?? ''), items: Object.entries(countedQuantities).map(([productId, countedQuantity]) => ({ productId, countedQuantity })) }) }); await onRefresh(); setShowCountForm(false); await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Conteo aprobado', timer: 1800, showConfirmButton: false, width: '18rem', customClass: { popup: 'compact-toast', title: 'compact-toast-title' } }); }
    catch (requestError) { await Swal.fire({ icon: 'error', title: 'No se pudo aprobar el conteo', text: requestError instanceof Error ? requestError.message : 'Error inesperado.' }); }
    finally { setSavingCount(false); }
  }


  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div>
        <p className="sidebar-caption">Centro de operación</p>
        <nav className="main-nav" aria-label="Navegación principal"><button className="nav-item" type="button" onClick={onBack}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item" type="button" onClick={() => { void onSales(); }}><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item active" type="button"><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item" type="button" onClick={() => { void onCash(); }}><MenuIcon name="cash" /><span>04</span>Caja</button><button className="nav-item" type="button" onClick={onReports}><MenuIcon name="reports" /><span>05</span>Reportes</button><button className="nav-item admin-nav" type="button" onClick={() => { void onAdmin(); }}><MenuIcon name="admin" /><span>06</span>Administración</button></nav>
        <div className="sidebar-footer"><div className="user-chip"><span><strong>{user.firstName} {user.lastName}</strong><small>Administrador</small></span></div><button className="logout-button" type="button" onClick={onLogout}><span className="logout-icon" aria-hidden="true">↪</span>Cerrar sesión</button></div>
      </aside>
      <section className={`dashboard-content catalog-content inventory-tab-${inventoryTab}`}>
        <header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Catálogo / Inventario</p><h1>Productos</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}<span className="chevron">⌄</span></div></header>
        <div className="dashboard-rule" />
        <nav className="inventory-tabs" aria-label="Secciones de inventario"><button className={inventoryTab === 'products' ? 'tab-active' : ''} type="button" onClick={() => setInventoryTab('products')}>Productos <span>{products.length}</span></button><button className={inventoryTab === 'entries' ? 'tab-active' : ''} type="button" onClick={() => setInventoryTab('entries')}>Entradas <span>{entries.length}</span></button><button className={inventoryTab === 'counts' ? 'tab-active' : ''} type="button" onClick={() => setInventoryTab('counts')}>Conteo físico <span>{counts.length}</span></button><button className={inventoryTab === 'movements' ? 'tab-active' : ''} type="button" onClick={() => setInventoryTab('movements')}>Movimientos / Kardex <span>{movements.length}</span></button><button className={inventoryTab === 'alerts' ? 'tab-active' : ''} type="button" onClick={() => setInventoryTab('alerts')}>Alertas <span>{alertProducts.length}</span></button></nav>
        {alertProducts.length > 0 && <aside className="stock-alert-banner" role="alert"><span className="stock-alert-icon">!</span><div><strong>{alertProducts.length === 1 ? 'Producto con existencia por revisar' : `${alertProducts.length} productos con existencia por revisar`}</strong><div className="stock-alert-items">{alertProducts.slice(0, 5).map(({ product, alert }) => <span key={product.id}><b>{product.name}</b>: {Number(product.inventory[0]?.quantity ?? 0).toFixed(3)} uds. · {alert.label}</span>)}{alertProducts.length > 5 && <span>＋ {alertProducts.length - 5} alertas adicionales</span>}</div></div><button type="button" onClick={() => setInventoryTab('alerts')}>Ver alertas →</button></aside>}
        <div className="catalog-toolbar"><div><strong>{totalProducts}</strong><span> productos en catálogo</span></div><div className="catalog-toolbar-actions"><button className="secondary-action" type="button" onClick={() => setShowCategoryManager(true)}>Administrar categorías</button><button className="primary-action" type="button" onClick={() => { setEditingProduct(null); setBarcodeValue(''); setShowProductForm(true); }}><span aria-hidden="true">＋</span>Nuevo producto</button></div></div>
        {showCategoryManager && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCategoryManager(false); }}><section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title"><div className="modal-heading"><div><p className="eyebrow">Catálogo</p><h2 id="category-modal-title">Administrar categorías</h2><p>Crea, renombra o cambia el estado de tus categorías.</p></div><button className="form-close" type="button" onClick={() => setShowCategoryManager(false)} aria-label="Cerrar">×</button></div><div className="category-tools"><div className="category-search"><span aria-hidden="true">⌕</span><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Buscar categoría" aria-label="Buscar categoría" /></div><button className="primary-action category-create" type="button" onClick={() => { void createCategory(); }}>＋ Nueva categoría</button></div><div className="category-list">{categories.length === 0 ? <p className="category-empty">Todavía no hay categorías.</p> : visibleCategories.length === 0 ? <p className="category-empty">No hay categorías que coincidan con “{categorySearch}”.</p> : visibleCategories.map((category) => <div className="category-row" key={category.id}><span><strong>{category.name}</strong><small>{category._count?.products ?? 0} productos</small></span><em className={category.active ? 'status-active' : 'status-inactive'}>{category.active ? 'Activa' : 'Inactiva'}</em><div><button type="button" onClick={() => { void renameCategory(category); }}>Renombrar</button><button className={category.active ? 'danger' : ''} type="button" onClick={() => { void toggleCategory(category); }}>{category.active ? 'Inactivar' : 'Activar'}</button></div></div>)}</div></section></div>}
        {showProductForm && <form className="product-form" onSubmit={saveProduct}><div className="product-form-heading"><div><p className="eyebrow">{editingProduct ? 'Editar producto' : 'Digitación manual'}</p><h2>{editingProduct ? editingProduct.name : 'Nuevo producto'}</h2><p>El código de barras es opcional. Puedes escribirlo o escanearlo con el lector.</p></div><button className="form-close" type="button" onClick={() => { setShowProductForm(false); setEditingProduct(null); }} aria-label="Cerrar">×</button></div><div className="product-form-grid"><label>Código interno<input name="internalCode" required defaultValue={editingProduct?.internalCode} /></label><label>Código de barras (opcional)<span className="barcode-input-row"><input name="barcode" inputMode="numeric" autoFocus={!editingProduct} value={barcodeValue} onChange={(event) => setBarcodeValue(event.target.value.replace(/\D/g, ''))} placeholder="Escribe o genera el código" /><button type="button" onClick={generateBarcode}>Generar EAN-13</button></span></label><label className="field-wide">Nombre<input name="name" required minLength={2} defaultValue={editingProduct?.name} /></label><label className="field-wide">Descripción<textarea name="description" rows={2} defaultValue={editingProduct?.description ?? ''} /></label><label>Categoría<select name="categoryId" required defaultValue={editingProduct?.category.id ?? categories.find((item) => item.active)?.id}>{categories.filter((item) => item.active || item.id === editingProduct?.category.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Precio de compra<input name="purchasePrice" type="number" min="0" step="0.01" required defaultValue={editingProduct?.purchasePrice ?? 0} /></label><label>Ganancia %<input name="profitMargin" type="number" min="0" max="999.99" step="0.01" required defaultValue={editingProduct?.profitMargin ?? 0} /></label><label>Precio de venta<input name="salePrice" type="number" min="0" step="0.01" defaultValue={editingProduct?.salePrice ?? 0} /></label>{!editingProduct && <label>Existencia inicial<input name="initialQuantity" type="number" min="0" step="0.001" required defaultValue="0" /></label>}<label>Existencia mínima<input name="minimumQuantity" type="number" min="0" step="0.001" required defaultValue={editingProduct?.inventory[0]?.minimumQuantity ?? 0} /></label><label>Impuesto %<input name="taxRate" type="number" min="0" max="100" step="0.01" defaultValue={editingProduct?.taxRate ?? 15} /></label><label className="field-wide">URL de imagen (opcional)<input name="imageUrl" type="url" placeholder="https://..." /></label></div><div className="product-checks"><label><input name="manualSalePrice" type="checkbox" /> Editar precio de venta manualmente</label><label><input name="availableForSale" type="checkbox" defaultChecked={editingProduct?.availableForSale ?? true} /> Disponible para venta</label><label><input name="taxExempt" type="checkbox" defaultChecked={editingProduct?.taxExempt ?? false} /> Exento de impuesto</label></div><div className="product-form-actions"><button className="secondary-action" type="button" onClick={() => setShowProductForm(false)}>Cancelar</button><button className="primary-action" type="submit" disabled={savingProduct}>{savingProduct ? 'Guardando...' : 'Guardar producto'}</button></div></form>}
        <section className="catalog-stats"><div><span className="stat-dot teal-dot" />Productos activos<strong>{products.filter((product) => product.status === 'ACTIVE').length}</strong></div><div><span className="stat-dot coral-dot" />Alertas de stock<strong>{lowStock}</strong></div><div><span className="stat-dot gold-dot" />Disponibles para venta<strong>{products.filter((product) => product.availableForSale).length}</strong></div></section>
        <section className="catalog-panel"><div className="catalog-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar productos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Escanea o busca por nombre, código interno o código de barras" /></div>{loading ? <div className="catalog-empty"><span className="loading-spinner dark-spinner" /><p>Cargando catálogo...</p></div> : products.length === 0 ? <div className="catalog-empty"><span className="empty-icon">▦</span><h2>Tu catálogo está listo</h2><p>Aún no hay productos registrados en esta sucursal.</p></div> : visibleProducts.length === 0 ? <div className="catalog-empty"><h2>Sin coincidencias</h2><p>No encontramos productos para “{search}”.</p></div> : <div className="product-table"><div className="product-row product-heading"><span>Producto / código</span><span>Categoría</span><span>Precio</span><span>Existencia</span><span>Estado</span><span>Acciones</span></div>{paginatedProducts.map((product) => { const quantity = Number(product.inventory[0]?.quantity ?? 0); const minimum = Number(product.inventory[0]?.minimumQuantity ?? 0); return <div className="product-row" key={product.id}><span><strong>{product.name}</strong><small>{product.internalCode}{product.barcode ? ` · ${product.barcode}` : ' · Sin código de barras'}</small></span><span>{product.category.name}</span><span>C$ {Number(product.salePrice).toFixed(2)}</span><span className={getStockAlert(quantity, minimum).level === 'HEALTHY' ? 'stock-ok' : getStockAlert(quantity, minimum).className}>{quantity.toFixed(3)} uds.</span><span><em className={product.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{product.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</em></span><span className="product-actions"><button type="button" onClick={() => { setEditingProduct(product); setBarcodeValue(product.barcode ?? ''); setShowProductForm(true); }}>Editar</button><button type="button" onClick={() => { void adjustProduct(product); }}>Ajustar</button><button type="button" className={product.status === 'ACTIVE' ? 'danger' : ''} onClick={() => { void toggleProduct(product); }}>{product.status === 'ACTIVE' ? 'Inactivar' : 'Activar'}</button></span></div>; })}</div>}{visibleProducts.length > 0 && <div className="catalog-pagination"><div className="pagination-summary"><span>Mostrando {(productPage - 1) * productsPerPage + 1}–{Math.min(productPage * productsPerPage, visibleProducts.length)} de {visibleProducts.length}</span><label>Mostrar <select value={productsPerPage} onChange={(event) => setProductsPerPage(Number(event.target.value))}><option value={5}>5</option><option value={8}>8</option><option value={10}>10</option><option value={20}>20</option></select> registros</label></div><nav aria-label="Paginación de productos"><button type="button" disabled={productPage === 1} onClick={() => setProductPage((page) => page - 1)}>← Anterior</button>{Array.from({ length: productPageCount }, (_, index) => index + 1).map((page) => <button type="button" className={page === productPage ? 'page-active' : ''} aria-current={page === productPage ? 'page' : undefined} key={page} onClick={() => setProductPage(page)}>{page}</button>)}<button type="button" disabled={productPage === productPageCount} onClick={() => setProductPage((page) => page + 1)}>Siguiente →</button></nav></div>}</section>
        {inventoryTab === 'entries' && <section className="inventory-section"><div className="inventory-section-heading"><div><p className="eyebrow">Recepción</p><h2>Entradas de inventario</h2></div><button className="primary-action" type="button" onClick={() => setShowEntryForm(true)}>＋ Nueva entrada</button></div>{entries.length === 0 ? <div className="catalog-empty"><h2>Sin entradas registradas</h2><p>Crea un documento para recibir varios productos.</p></div> : <div className="entry-list">{entries.map((entry) => <article className="entry-row" key={entry.id}><span><strong>{entry.number}</strong><small>{new Date(entry.createdAt).toLocaleString('es-NI')} · {entry.responsibleName}</small></span><span><strong>{entry.source || 'Origen no indicado'}</strong><small>{entry.reference || 'Sin referencia'}</small></span><span><strong>{entry.items.length}</strong><small>productos</small></span><span><strong>{entry.items.reduce((sum, item) => sum + Number(item.quantity), 0).toFixed(3)}</strong><small>unidades</small></span><em className="status-active">Confirmada</em></article>)}</div>}</section>}
        {showEntryForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEntryForm(false); }}><form className="entry-modal" onSubmit={saveInventoryEntry}><div className="modal-heading"><div><p className="eyebrow">Inventario</p><h2>Nueva entrada</h2><p>Recibe varios productos en un único documento confirmado.</p></div><button className="form-close" type="button" onClick={() => setShowEntryForm(false)}>×</button></div><div className="entry-meta"><label>Origen o proveedor<input name="source" placeholder="Ej. Distribuidora Central" /></label><label>Referencia<input name="reference" placeholder="Factura, orden o remisión" /></label><label className="entry-wide">Motivo<input name="reason" required minLength={3} placeholder="Ej. Compra semanal" /></label><label className="entry-wide">Observaciones<textarea name="notes" rows={2} /></label></div><div className="entry-items-heading"><h3>Productos recibidos</h3><button className="secondary-action" type="button" onClick={() => setEntryItems((items) => [...items, { productId: '', quantity: 1, unitCost: 0 }])}>＋ Agregar producto</button></div><div className="entry-items">{entryItems.map((item, index) => <div className="entry-item" key={index}><label>Producto<select value={item.productId} required onChange={(event) => setEntryItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, productId: event.target.value } : current))}><option value="">Seleccionar producto</option>{products.filter((product) => product.status === 'ACTIVE').map((product) => <option key={product.id} value={product.id}>{product.internalCode} · {product.name}</option>)}</select></label><label>Cantidad<input type="number" min="0.001" step="0.001" required value={item.quantity} onChange={(event) => setEntryItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, quantity: Number(event.target.value) } : current))} /></label><label>Costo unitario<input type="number" min="0" step="0.01" value={item.unitCost} onChange={(event) => setEntryItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, unitCost: Number(event.target.value) } : current))} /></label><button className="entry-remove" type="button" disabled={entryItems.length === 1} onClick={() => setEntryItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button></div>)}</div><div className="entry-total"><span>Total estimado</span><strong>C$ {entryItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0).toFixed(2)}</strong></div><div className="product-form-actions"><button className="secondary-action" type="button" onClick={() => setShowEntryForm(false)}>Cancelar</button><button className="primary-action" type="submit" disabled={savingEntry}>{savingEntry ? 'Confirmando...' : 'Confirmar entrada'}</button></div></form></div>}
        {inventoryTab === 'counts' && <section className="inventory-section"><div className="inventory-section-heading"><div><p className="eyebrow">Control físico</p><h2>Conteos de inventario</h2></div><button className="primary-action" type="button" onClick={openCountForm}>＋ Nuevo conteo</button></div>{counts.length === 0 ? <div className="catalog-empty"><h2>Sin conteos realizados</h2><p>Registra las cantidades físicas para detectar diferencias.</p></div> : <div className="entry-list">{counts.map((count) => <article className="entry-row" key={count.id}><span><strong>{count.number}</strong><small>{new Date(count.createdAt).toLocaleString('es-NI')}</small></span><span><strong>{count.items.length}</strong><small>productos contados</small></span><span><strong>{count.items.filter((item) => Number(item.difference) !== 0).length}</strong><small>diferencias</small></span><span><strong>{count.items.reduce((sum, item) => sum + Math.abs(Number(item.difference)), 0).toFixed(3)}</strong><small>ajuste total</small></span><em className="status-active">Aprobado</em></article>)}</div>}</section>}
        {showCountForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCountForm(false); }}><form className="entry-modal" onSubmit={saveInventoryCount}><div className="modal-heading"><div><p className="eyebrow">Inventario</p><h2>Conteo físico</h2><p>Compara la existencia del sistema con la cantidad encontrada.</p></div><button className="form-close" type="button" onClick={() => setShowCountForm(false)}>×</button></div><div className="entry-meta"><label className="entry-wide">Motivo<input name="reason" required minLength={3} placeholder="Ej. Conteo mensual" /></label><label className="entry-wide">Observaciones<textarea name="notes" rows={2} /></label></div><div className="count-table"><div className="count-row count-heading"><span>Producto</span><span>Sistema</span><span>Conteo físico</span><span>Diferencia</span></div>{products.filter((product) => product.status === 'ACTIVE').map((product) => { const expected = Number(product.inventory[0]?.quantity ?? 0); const counted = countedQuantities[product.id] ?? expected; return <div className="count-row" key={product.id}><span><strong>{product.name}</strong><small>{product.internalCode}</small></span><span>{expected.toFixed(3)}</span><input type="number" min="0" step="0.001" value={counted} onChange={(event) => setCountedQuantities((current) => ({ ...current, [product.id]: Number(event.target.value) }))} /><span className={counted - expected === 0 ? 'stock-ok' : 'stock-low'}>{(counted - expected).toFixed(3)}</span></div>; })}</div><div className="product-form-actions"><button className="secondary-action" type="button" onClick={() => setShowCountForm(false)}>Cancelar</button><button className="primary-action" type="submit" disabled={savingCount}>{savingCount ? 'Aprobando...' : 'Aprobar y ajustar'}</button></div></form></div>}
        {inventoryTab === 'movements' && <section className="inventory-section"><div className="inventory-section-heading"><div><p className="eyebrow">Trazabilidad</p><h2>Movimientos de inventario</h2></div><span>{visibleMovements.length} registros</span></div><div className="catalog-search"><span aria-hidden="true">⌕</span><input value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="Buscar por producto, código, tipo, motivo o responsable" /></div>{visibleMovements.length === 0 ? <div className="catalog-empty"><h2>Sin movimientos</h2><p>Los ajustes y existencias iniciales aparecerán aquí.</p></div> : <div className="movement-table"><div className="movement-row movement-heading"><span>Fecha</span><span>Producto</span><span>Tipo</span><span>Cantidad</span><span>Anterior → Resultado</span><span>Responsable / motivo</span></div>{visibleMovements.map((movement) => <div className="movement-row" key={movement.id}><span>{new Date(movement.createdAt).toLocaleString('es-NI')}</span><span><strong>{movement.product.name}</strong><small>{movement.product.internalCode}</small></span><span><em>{movement.type.replaceAll('_', ' ')}</em></span><span>{Number(movement.quantity).toFixed(3)}</span><span>{Number(movement.previousQuantity).toFixed(3)} → <strong>{Number(movement.resultingQuantity).toFixed(3)}</strong></span><span><strong>{movement.responsibleName}</strong><small>{movement.reason ?? 'Sin observación'}</small></span></div>)}</div>}</section>}
        {inventoryTab === 'alerts' && <section className="inventory-section"><div className="inventory-section-heading"><div><p className="eyebrow">Reposición</p><h2>Productos por revisar</h2></div><span>{alertProducts.length} alertas</span></div>{alertProducts.length === 0 ? <div className="catalog-empty"><h2>Inventario saludable</h2><p>No hay productos agotados, cerca o debajo del mínimo.</p></div> : <div className="alert-grid">{alertProducts.map(({ product, alert }) => { const quantity = Number(product.inventory[0]?.quantity ?? 0); const minimum = Number(product.inventory[0]?.minimumQuantity ?? 0); return <article className="inventory-alert" key={product.id}><span className={alert.className}>{alert.label}</span><h3>{product.name}</h3><p>{product.internalCode} · {product.category.name}</p><div><span>Existencia <strong>{quantity.toFixed(3)}</strong></span><span>Mínimo <strong>{minimum.toFixed(3)}</strong></span></div><button type="button" onClick={() => { void adjustProduct(product); }}>Registrar entrada</button></article>; })}</div>}</section>}
      </section>
    </main>
  );
}

function AdminStatusView({ loading, error, onRetry, onBack }: { loading: boolean; error: string; onRetry: () => Promise<void>; onBack: () => void }) {
  return <main className="admin-status-page"><section className="admin-status-card">{loading ? <><span className="loading-spinner dark-spinner" /><h1>Cargando Administración</h1><p>Consultando usuarios, roles y configuración.</p></> : <><span className="admin-status-icon">!</span><h1>No se pudo abrir Administración</h1><p>{error || 'La API no devolvió la información requerida.'}</p><div><button className="secondary-action" type="button" onClick={onBack}>Volver al resumen</button><button className="primary-action" type="button" onClick={() => { void onRetry(); }}>Reintentar</button></div></>}</section></main>;
}

function AdminView({ user, data, loading, onBack, onSales, onInventory, onCash, onReports, onRefresh, onLogout }: { user: AuthUser; data: AdminData; loading: boolean; onBack: () => void; onSales: () => Promise<void>; onInventory: () => Promise<void>; onCash: () => Promise<void>; onReports: () => void; onRefresh: () => Promise<void>; onLogout: () => void }) {
  const [tab, setTab] = useState<'users' | 'roles' | 'permissions' | 'taxes'>('users');
  const [roleId, setRoleId] = useState(data.roles[0]?.id ?? '');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(data.roles[0]?.permissions.map(({ permission }) => permission.id) ?? []);
  const [message, setMessage] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    document.querySelectorAll('.admin-user-actions').forEach((element) => element.remove());
    document.querySelectorAll<HTMLElement>('.admin-user-row').forEach((row, index) => {
      const item = data.users[index];
      if (!item) return;
      const actions = document.createElement('span');
      actions.className = 'admin-user-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'user-action-button';
      editButton.textContent = 'Editar';
      editButton.onclick = () => editUser(item);
      actions.append(editButton);
      if (item.status === 'ACTIVE') {
        const disableButton = document.createElement('button');
        disableButton.type = 'button';
        disableButton.className = 'user-action-button danger';
        disableButton.textContent = 'Inactivar';
        disableButton.onclick = () => changeUserStatus(item.id, 'INACTIVE');
        actions.append(disableButton);
      } else {
        const enableButton = document.createElement('button');
        enableButton.type = 'button';
        enableButton.className = 'user-action-button';
        enableButton.textContent = 'Reactivar';
        enableButton.onclick = () => changeUserStatus(item.id, 'ACTIVE');
        actions.append(enableButton);
      }
      row.append(actions);
    });
  }, [data.users]);

  function editUser(item: AdminData['users'][number]) {
    const form = document.querySelector<HTMLFormElement>('.admin-layout .admin-form');
    if (!form) return;
    setEditingUserId(item.id);
    form.querySelector<HTMLInputElement>('[name="firstName"]')!.value = item.firstName;
    form.querySelector<HTMLInputElement>('[name="lastName"]')!.value = item.lastName;
    form.querySelector<HTMLInputElement>('[name="email"]')!.value = item.email;
    form.querySelector<HTMLInputElement>('[name="password"]')!.value = '';
    form.querySelector<HTMLSelectElement>('[name="roleId"]')!.value = item.roles[0]?.role.id ?? '';
    form.querySelector<HTMLSelectElement>('[name="branchId"]')!.value = item.branches[0]?.branch.id ?? '';
    form.querySelector('h2')!.textContent = 'Editar usuario';
    form.querySelector('button[type="submit"]')!.textContent = 'Guardar cambios';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function changeUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE') {
    const confirmation = await Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: status === 'ACTIVE' ? '¿Reactivar usuario?' : '¿Inactivar usuario?', showCancelButton: true, confirmButtonText: status === 'ACTIVE' ? 'Reactivar' : 'Inactivar', cancelButtonText: 'Cancelar', confirmButtonColor: status === 'ACTIVE' ? '#167d86' : '#f06c4e' });
    if (!confirmation.isConfirmed) return;
    const response = await authenticatedFetch(`${apiUrl}/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (response.ok) { await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: status === 'ACTIVE' ? 'Usuario reactivado' : 'Usuario inactivado', showConfirmButton: false, timer: 2200 }); await onRefresh(); }
  }

  function selectRole(id: string) {
    setRoleId(id);
    setSelectedPermissions(data.roles.find((role) => role.id === id)?.permissions.map(({ permission }) => permission.id) ?? []);
  }

  async function savePermissions() {
    try {
      const response = await authenticatedFetch(`${apiUrl}/admin/roles/${roleId}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissionIds: selectedPermissions }) });
      if (!response.ok) throw new Error('No se pudieron guardar los permisos.');
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Permisos guardados', showConfirmButton: false, timer: 2200 });
      await onRefresh();
    } catch (requestError) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error al guardar permisos', text: requestError instanceof Error ? requestError.message : 'Ocurrió un error inesperado.', showConfirmButton: false, timer: 4000 });
    }
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await authenticatedFetch(`${apiUrl}/admin/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: form.get('code'), name: form.get('name'), description: form.get('description') }) });
      const result = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo crear el rol.');
      formElement.reset();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Rol creado satisfactoriamente', showConfirmButton: false, timer: 2200 });
      await onRefresh();
    } catch (requestError) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo crear el rol', text: requestError instanceof Error ? requestError.message : 'Ocurrió un error inesperado.', showConfirmButton: false, timer: 4000 });
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingUser) return;
    setCreatingUser(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const body = { email: form.get('email'), firstName: form.get('firstName'), lastName: form.get('lastName'), ...(form.get('password') ? { password: form.get('password') } : {}), ...(editingUserId ? { roleId: form.get('roleId'), branchId: form.get('branchId') } : { password: form.get('password'), roleIds: [form.get('roleId')], branchIds: [form.get('branchId')] }) };
      const response = await authenticatedFetch(editingUserId ? `${apiUrl}/admin/users/${editingUserId}` : `${apiUrl}/admin/users`, { method: editingUserId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) {
        const detail = Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo crear el usuario.';
        throw new Error(detail);
      }
      formElement.reset();
      setEditingUserId(null);
      formElement.querySelector('h2')!.textContent = 'Crear usuario';
      formElement.querySelector('button[type="submit"]')!.textContent = '＋ Crear usuario';
      setMessage('Usuario creado correctamente.');
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Usuario guardado', text: 'Ya aparece en la tabla.', showConfirmButton: false, timer: 2800, timerProgressBar: true });
      await onRefresh();
    } catch (requestError) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo guardar', text: requestError instanceof Error ? requestError.message : 'Ocurrió un error inesperado.', showConfirmButton: false, timer: 4500, timerProgressBar: true });
    } finally {
      setCreatingUser(false);
    }
  }

  useEffect(() => {
    const tabs = document.querySelector('.admin-tabs');
    if (!tabs) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Impuestos';
    button.className = tab === 'taxes' ? 'tab-active' : '';
    button.onclick = () => setTab('taxes');
    tabs.append(button);
    return () => button.remove();
  }, [tab]);

  async function saveTaxSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await authenticatedFetch(`${apiUrl}/admin/settings/taxes`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taxesEnabled: form.get('taxesEnabled') === 'on', ivaRate: Number(form.get('ivaRate')) }) });
      const result = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'No se pudo guardar la configuración.');
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Configuración de impuestos guardada', showConfirmButton: false, timer: 2400 });
      await onRefresh();
    } catch (requestError) {
      await Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo guardar', text: requestError instanceof Error ? requestError.message : 'Ocurrió un error inesperado.', showConfirmButton: false, timer: 4000 });
    }
  }

  if (tab === 'taxes') return <main className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div><p className="sidebar-caption">Centro de operación</p><nav className="main-nav"><button className="nav-item" type="button" onClick={onBack}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item" type="button" onClick={() => { void onSales(); }}><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item" type="button" onClick={() => { void onInventory(); }}><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item active admin-nav" type="button"><MenuIcon name="admin" /><span>06</span>Administración</button></nav><div className="sidebar-footer"><div className="user-chip"><span><strong>{user.firstName} {user.lastName}</strong><small>Administrador</small></span></div><button className="logout-button" type="button" onClick={onLogout}>Cerrar sesión</button></div></aside><section className="dashboard-content admin-content"><header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Configuración</p><h1>Administración</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header><div className="dashboard-rule" /><div className="admin-tabs"><button type="button" onClick={() => setTab('users')}>Usuarios <b>{data.users.length}</b></button><button type="button" onClick={() => setTab('roles')}>Roles <b>{data.roles.length}</b></button><button type="button" onClick={() => setTab('permissions')}>Permisos <b>{data.permissions.length}</b></button></div><section className="tax-settings"><div className="tax-settings-intro"><p className="eyebrow">Configuración fiscal</p><h2>Impuestos de venta</h2><p>Activa los impuestos cuando tu negocio esté listo para cobrarlos. Si están desactivados, las ventas no calcularán impuesto aunque el producto tenga una tasa asignada.</p></div><form className="tax-settings-form" onSubmit={saveTaxSettings}><label className="tax-toggle"><span><strong>Cobrar impuestos</strong><small>Aplicar impuestos en las nuevas ventas.</small></span><input name="taxesEnabled" type="checkbox" defaultChecked={data.business.taxesEnabled} /></label><label>Tasa general (%)<input name="ivaRate" type="number" min="0" max="100" step="0.01" required defaultValue={Number(data.business.ivaRate)} /></label><p className="tax-help">Esta tasa sirve como valor general. En Inventario puedes marcar cada producto como exento o asignarle una tasa específica.</p><button className="primary-action" type="submit">Guardar configuración</button></form></section></section></main>;

  return <main className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div><p className="sidebar-caption">Centro de operación</p><nav className="main-nav" aria-label="Navegación principal"><button className="nav-item" type="button" onClick={onBack}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item" type="button" onClick={() => { void onSales(); }}><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item" type="button" onClick={() => { void onInventory(); }}><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item" type="button" onClick={() => { void onCash(); }}><MenuIcon name="cash" /><span>04</span>Caja</button><button className="nav-item" type="button" onClick={onReports}><MenuIcon name="reports" /><span>05</span>Reportes</button><button className="nav-item active admin-nav" type="button"><MenuIcon name="admin" /><span>06</span>Administración</button></nav><div className="sidebar-footer"><div className="user-chip"><span><strong>{user.firstName} {user.lastName}</strong><small>Administrador</small></span></div><button className="logout-button" type="button" onClick={onLogout}><span className="logout-icon">↪</span>Cerrar sesión</button></div></aside><section className="dashboard-content admin-content"><header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Control de acceso</p><h1>Administración</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header><div className="dashboard-rule" /><div className="admin-tabs"><button className={tab === 'users' ? 'tab-active' : ''} type="button" onClick={() => setTab('users')}>Usuarios <b>{data.users.length}</b></button><button className={tab === 'roles' ? 'tab-active' : ''} type="button" onClick={() => setTab('roles')}>Roles <b>{data.roles.length}</b></button><button className={tab === 'permissions' ? 'tab-active' : ''} type="button" onClick={() => setTab('permissions')}>Permisos <b>{data.permissions.length}</b></button></div>{message && <p className="admin-message" role="status">{message}</p>}{loading ? <div className="catalog-empty"><span className="loading-spinner dark-spinner" /><p>Cargando administración...</p></div> : tab === 'users' ? <section className="admin-layout"><div className="admin-list"><div className="section-heading"><div><p className="eyebrow">Directorio</p><h2>Usuarios del negocio</h2></div></div>{data.users.map((item) => <div className="admin-user-row" key={item.id}><span className="user-initial">{item.firstName[0]}</span><span><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small></span><span>{item.roles.map(({ role }) => role.name).join(', ') || 'Sin rol'}</span><em className={item.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{item.status === 'ACTIVE' ? 'Activo' : item.status}</em></div>)}</div><form className="admin-form" onSubmit={createUser}><p className="eyebrow">Nuevo acceso</p><h2>Crear usuario</h2><input name="firstName" placeholder="Nombre" required /><input name="lastName" placeholder="Apellido" required /><input name="email" type="email" placeholder="Correo electrónico" required /><input name="password" type="password" minLength={12} placeholder="Contraseña (12+ caracteres)" required /><select name="roleId" defaultValue={data.roles[0]?.id}><option value="">Seleccionar rol</option>{data.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><select name="branchId" defaultValue={data.branches[0]?.id}><option value="">Seleccionar sucursal</option>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><button className="primary-action" type="submit">＋ Crear usuario</button></form></section> : tab === 'roles' ? <section className="admin-layout"><div className="admin-list"><div className="section-heading"><div><p className="eyebrow">Perfiles de acceso</p><h2>Roles existentes</h2></div></div>{data.roles.map((role) => <button className={`role-row ${role.id === roleId ? 'role-selected' : ''}`} key={role.id} type="button" onClick={() => { selectRole(role.id); setTab('permissions'); }}><span><strong>{role.name}</strong><small>{role.code} · {role.permissions.length} permisos</small></span><b>{role._count.users} usuarios →</b></button>)}</div><form className="admin-form" onSubmit={createRole}><p className="eyebrow">Nuevo perfil</p><h2>Crear rol</h2><input name="code" placeholder="Código, ej. SUPERVISOR" required /><input name="name" placeholder="Nombre del rol" required /><textarea name="description" placeholder="Descripción (opcional)" rows={4} /><button className="primary-action" type="submit">＋ Crear rol</button></form></section> : <section className="permissions-layout"><div className="role-picker"><p className="eyebrow">Selecciona un rol</p>{data.roles.map((role) => <button className={role.id === roleId ? 'role-picker-active' : ''} key={role.id} type="button" onClick={() => selectRole(role.id)}>{role.name}<span>{role.code}</span></button>)}</div><div className="permission-editor"><div className="section-heading"><div><p className="eyebrow">Autorizaciones</p><h2>Permisos del rol</h2></div><button className="primary-action" type="button" onClick={savePermissions}>Guardar cambios</button></div><div className="permission-grid">{data.permissions.map((permission) => <label className="permission-item" key={permission.id}><input type="checkbox" checked={selectedPermissions.includes(permission.id)} onChange={() => setSelectedPermissions((current) => current.includes(permission.id) ? current.filter((id) => id !== permission.id) : [...current, permission.id])} /><span><strong>{permission.name}</strong><small>{permission.code}</small></span></label>)}</div></div></section>}</section></main>;
}
