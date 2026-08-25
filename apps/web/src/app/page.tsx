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

type AdminData = {
  users: Array<{ id: string; email: string; firstName: string; lastName: string; status: string; roles: Array<{ role: { id: string; name: string } }>; branches: Array<{ branch: { id: string; name: string } }> }>;
  roles: Array<{ id: string; code: string; name: string; description?: string | null; permissions: Array<{ permission: { id: string; code: string; name: string } }>; _count: { users: number } }>;
  permissions: Array<{ id: string; code: string; name: string; description?: string | null }>;
  branches: Array<{ id: string; name: string; code: string }>;
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
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

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
    try {
      const response = await authenticatedFetch(`${apiUrl}/admin/access`);
      if (response.ok) setAdminData((await response.json()) as AdminData);
    } finally {
      setAdminLoading(false);
    }
  }

  if (user) {
    if (activeView === 'admin' && adminData) return <AdminView user={user} data={adminData} loading={adminLoading} onBack={() => setActiveView('dashboard')} onInventory={openCatalog} onRefresh={openAdmin} onLogout={handleLogout} />;
    if (activeView === 'inventory') {
      return <InventoryView user={user} products={products} categories={categories} movements={inventoryMovements} entries={inventoryEntries} counts={inventoryCounts} loading={catalogLoading} onRefresh={openCatalog} onBack={() => setActiveView('dashboard')} onAdmin={openAdmin} onLogout={handleLogout} />;
    }

    return (
      <main className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div>
          <p className="sidebar-caption">Centro de operación</p>
          <nav className="main-nav" aria-label="Navegación principal">
            <button className="nav-item active" type="button" onClick={() => setActiveView('dashboard')}><MenuIcon name="home" /><span>01</span>Resumen</button>
            <button className="nav-item" type="button"><MenuIcon name="sales" /><span>02</span>Ventas</button>
            <button className="nav-item" type="button" onClick={openCatalog}><MenuIcon name="inventory" /><span>03</span>Inventario</button>
            <button className="nav-item" type="button"><MenuIcon name="cash" /><span>04</span>Caja</button>
            <button className="nav-item" type="button"><MenuIcon name="reports" /><span>05</span>Reportes</button>
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

function InventoryView({ user, products, categories, movements, entries, counts, loading, onRefresh, onBack, onAdmin, onLogout }: { user: AuthUser; products: CatalogProduct[]; categories: CatalogCategory[]; movements: InventoryMovement[]; entries: InventoryEntry[]; counts: InventoryCount[]; loading: boolean; onRefresh: () => Promise<void>; onBack: () => void; onAdmin: () => Promise<void>; onLogout: () => void }) {
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
        <nav className="main-nav" aria-label="Navegación principal"><button className="nav-item" type="button" onClick={onBack}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item" type="button"><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item active" type="button"><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item" type="button"><MenuIcon name="cash" /><span>04</span>Caja</button><button className="nav-item" type="button"><MenuIcon name="reports" /><span>05</span>Reportes</button><button className="nav-item admin-nav" type="button" onClick={() => { void onAdmin(); }}><MenuIcon name="admin" /><span>06</span>Administración</button></nav>
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

function AdminView({ user, data, loading, onBack, onInventory, onRefresh, onLogout }: { user: AuthUser; data: AdminData; loading: boolean; onBack: () => void; onInventory: () => Promise<void>; onRefresh: () => Promise<void>; onLogout: () => void }) {
  const [tab, setTab] = useState<'users' | 'roles' | 'permissions'>('users');
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

  return <main className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NexoPOS</span></div><p className="sidebar-caption">Centro de operación</p><nav className="main-nav" aria-label="Navegación principal"><button className="nav-item" type="button" onClick={onBack}><MenuIcon name="home" /><span>01</span>Resumen</button><button className="nav-item" type="button"><MenuIcon name="sales" /><span>02</span>Ventas</button><button className="nav-item" type="button" onClick={() => { void onInventory(); }}><MenuIcon name="inventory" /><span>03</span>Inventario</button><button className="nav-item" type="button"><MenuIcon name="cash" /><span>04</span>Caja</button><button className="nav-item" type="button"><MenuIcon name="reports" /><span>05</span>Reportes</button><button className="nav-item active admin-nav" type="button"><MenuIcon name="admin" /><span>06</span>Administración</button></nav><div className="sidebar-footer"><div className="user-chip"><span><strong>{user.firstName} {user.lastName}</strong><small>Administrador</small></span></div><button className="logout-button" type="button" onClick={onLogout}><span className="logout-icon">↪</span>Cerrar sesión</button></div></aside><section className="dashboard-content admin-content"><header className="dashboard-header"><div><button className="back-action" type="button" onClick={onBack}>← Volver al resumen</button><p className="eyebrow">Control de acceso</p><h1>Administración</h1></div><div className="branch-selector"><span className="live-dot" />{user.branches[0]?.name ?? 'Sin sucursal'}</div></header><div className="dashboard-rule" /><div className="admin-tabs"><button className={tab === 'users' ? 'tab-active' : ''} type="button" onClick={() => setTab('users')}>Usuarios <b>{data.users.length}</b></button><button className={tab === 'roles' ? 'tab-active' : ''} type="button" onClick={() => setTab('roles')}>Roles <b>{data.roles.length}</b></button><button className={tab === 'permissions' ? 'tab-active' : ''} type="button" onClick={() => setTab('permissions')}>Permisos <b>{data.permissions.length}</b></button></div>{message && <p className="admin-message" role="status">{message}</p>}{loading ? <div className="catalog-empty"><span className="loading-spinner dark-spinner" /><p>Cargando administración...</p></div> : tab === 'users' ? <section className="admin-layout"><div className="admin-list"><div className="section-heading"><div><p className="eyebrow">Directorio</p><h2>Usuarios del negocio</h2></div></div>{data.users.map((item) => <div className="admin-user-row" key={item.id}><span className="user-initial">{item.firstName[0]}</span><span><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small></span><span>{item.roles.map(({ role }) => role.name).join(', ') || 'Sin rol'}</span><em className={item.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{item.status === 'ACTIVE' ? 'Activo' : item.status}</em></div>)}</div><form className="admin-form" onSubmit={createUser}><p className="eyebrow">Nuevo acceso</p><h2>Crear usuario</h2><input name="firstName" placeholder="Nombre" required /><input name="lastName" placeholder="Apellido" required /><input name="email" type="email" placeholder="Correo electrónico" required /><input name="password" type="password" minLength={12} placeholder="Contraseña (12+ caracteres)" required /><select name="roleId" defaultValue={data.roles[0]?.id}><option value="">Seleccionar rol</option>{data.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><select name="branchId" defaultValue={data.branches[0]?.id}><option value="">Seleccionar sucursal</option>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><button className="primary-action" type="submit">＋ Crear usuario</button></form></section> : tab === 'roles' ? <section className="admin-layout"><div className="admin-list"><div className="section-heading"><div><p className="eyebrow">Perfiles de acceso</p><h2>Roles existentes</h2></div></div>{data.roles.map((role) => <button className={`role-row ${role.id === roleId ? 'role-selected' : ''}`} key={role.id} type="button" onClick={() => { selectRole(role.id); setTab('permissions'); }}><span><strong>{role.name}</strong><small>{role.code} · {role.permissions.length} permisos</small></span><b>{role._count.users} usuarios →</b></button>)}</div><form className="admin-form" onSubmit={createRole}><p className="eyebrow">Nuevo perfil</p><h2>Crear rol</h2><input name="code" placeholder="Código, ej. SUPERVISOR" required /><input name="name" placeholder="Nombre del rol" required /><textarea name="description" placeholder="Descripción (opcional)" rows={4} /><button className="primary-action" type="submit">＋ Crear rol</button></form></section> : <section className="permissions-layout"><div className="role-picker"><p className="eyebrow">Selecciona un rol</p>{data.roles.map((role) => <button className={role.id === roleId ? 'role-picker-active' : ''} key={role.id} type="button" onClick={() => selectRole(role.id)}>{role.name}<span>{role.code}</span></button>)}</div><div className="permission-editor"><div className="section-heading"><div><p className="eyebrow">Autorizaciones</p><h2>Permisos del rol</h2></div><button className="primary-action" type="button" onClick={savePermissions}>Guardar cambios</button></div><div className="permission-grid">{data.permissions.map((permission) => <label className="permission-item" key={permission.id}><input type="checkbox" checked={selectedPermissions.includes(permission.id)} onChange={() => setSelectedPermissions((current) => current.includes(permission.id) ? current.filter((id) => id !== permission.id) : [...current, permission.id])} /><span><strong>{permission.name}</strong><small>{permission.code}</small></span></label>)}</div></div></section>}</section></main>;
}
