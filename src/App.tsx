import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Sidebar, NavigationTab } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { AddManualSaleModal } from './components/AddManualSaleModal.js';
import { SaleDetailModal } from './components/SaleDetailModal.js';
import { HotmartSyncModal } from './components/HotmartSyncModal.js';
import { ModeChangeModal } from './components/ModeChangeModal.js';
import { WebhookSimulatorModal } from './components/WebhookSimulatorModal.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { SalesPage } from './pages/SalesPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { DiagnosticsPage } from './pages/DiagnosticsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { DashboardMetrics, Sale, OperationMode } from './types.js';
import { ShieldCheck, LogIn, Lock, AlertTriangle, ShieldAlert } from 'lucide-react';

function MainAppContent() {
  const { user, adminEmail, isAuthorized, loading: authLoading, signInWithGoogle, devBypassLogin, logout } = useAuth();

  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [addManualOpen, setAddManualOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [modeChangeOpen, setModeChangeOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // App Global Data
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [dashRes, salesRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/sales?limit=10'),
      ]);

      if (dashRes.ok) {
        const dJson = await dashRes.json();
        setMetrics(dJson);
      }

      if (salesRes.ok) {
        const sJson = await salesRes.json();
        setRecentSales(sJson.items || []);
      }
    } catch (err) {
      console.warn('Error fetching dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchDashboardData();
    }
  }, [isAuthorized, fetchDashboardData]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p>Verificando credenciales de acceso seguro...</p>
      </div>
    );
  }

  // 1. UNLOGGED SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 shadow-2xl space-y-6 text-center backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Conversion Bridge</h1>
            <p className="text-xs text-slate-400">
              Capa privada de control de conversiones Hotmart → Meta CAPI
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 text-xs text-slate-400 text-left space-y-2">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acceso Privado Exclusivo</span>
            </div>
            <p>
              Esta aplicación está restringida al administrador configurado en <code className="text-emerald-300 font-mono">ADMIN_EMAIL</code>:
            </p>
            <p className="font-mono text-slate-200 text-[11px] truncate bg-slate-950 p-2 rounded-lg border border-slate-800">
              {adminEmail}
            </p>
          </div>

          <div className="space-y-3">
            <button
              id="btn-login-google"
              onClick={signInWithGoogle}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-950" />
              <span>Iniciar sesión con Google</span>
            </button>

            {/* Quick dev shortcut for iframe preview testing */}
            <button
              id="btn-login-admin-quick"
              onClick={() => devBypassLogin(adminEmail)}
              className="w-full py-2.5 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer border border-slate-600/60"
            >
              Acceder como Administrador ({adminEmail})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNAUTHORIZED USER SCREEN
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 shadow-2xl space-y-6 text-center backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Acceso No Autorizado</h1>
            <p className="text-xs text-slate-400">
              Tu cuenta de Google no tiene permisos para acceder a este panel privado.
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700 text-xs text-left space-y-2">
            <div>
              <span className="text-slate-500 block">Cuenta con la que iniciaste sesión:</span>
              <span className="font-mono text-rose-400 font-medium truncate block">{user.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Administrador autorizado requerido:</span>
              <span className="font-mono text-emerald-400 font-medium truncate block">{adminEmail}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Cerrar sesión e intentar con otra cuenta
          </button>
        </div>
      </div>
    );
  }

  // 3. AUTHORIZED DASHBOARD LAYOUT
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Persistent Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAddManual={() => setAddManualOpen(true)}
        onOpenSync={() => setSyncOpen(true)}
        onOpenSimulator={() => setSimulatorOpen(true)}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          mode={metrics?.integrationStatus.mode || 'monitor'}
          hotmartConfigured={metrics?.integrationStatus.hotmart || false}
          metaConfigured={metrics?.integrationStatus.meta || false}
          onOpenModeChange={() => setModeChangeOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              metrics={metrics}
              recentSales={recentSales}
              loading={dataLoading}
              onOpenAddManual={() => setAddManualOpen(true)}
              onOpenSync={() => setSyncOpen(true)}
              onOpenSimulator={() => setSimulatorOpen(true)}
              onOpenModeChange={() => setModeChangeOpen(true)}
              onSelectSale={(id) => setSelectedSaleId(id)}
              onNavigateToSales={() => setCurrentTab('sales')}
              onNavigateToSettings={() => setCurrentTab('settings')}
            />
          )}

          {currentTab === 'sales' && (
            <SalesPage
              onSelectSale={(id) => setSelectedSaleId(id)}
              onOpenAddManual={() => setAddManualOpen(true)}
              onOpenSync={() => setSyncOpen(true)}
            />
          )}

          {currentTab === 'activity' && (
            <ActivityPage onSelectSale={(id) => setSelectedSaleId(id)} />
          )}

          {currentTab === 'diagnostics' && <DiagnosticsPage />}

          {currentTab === 'settings' && (
            <SettingsPage onOpenModeChange={() => setModeChangeOpen(true)} />
          )}
        </main>
      </div>

      {/* Modals */}
      <AddManualSaleModal
        isOpen={addManualOpen}
        onClose={() => setAddManualOpen(false)}
        onSaleCreated={(newSale) => {
          fetchDashboardData();
          setSelectedSaleId(newSale.id);
        }}
      />

      <SaleDetailModal
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        onSaleUpdated={() => fetchDashboardData()}
      />

      <HotmartSyncModal
        isOpen={syncOpen}
        onClose={() => setSyncOpen(false)}
        onSyncComplete={() => fetchDashboardData()}
      />

      <ModeChangeModal
        isOpen={modeChangeOpen}
        currentMode={metrics?.integrationStatus.mode || 'monitor'}
        onClose={() => setModeChangeOpen(false)}
        onModeChanged={(newMode) => {
          if (metrics) {
            setMetrics({
              ...metrics,
              integrationStatus: {
                ...metrics.integrationStatus,
                mode: newMode,
              },
            });
          }
          fetchDashboardData();
        }}
      />

      <WebhookSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onEventSimulated={() => fetchDashboardData()}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
