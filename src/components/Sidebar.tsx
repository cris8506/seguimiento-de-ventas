import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PlusCircle,
  Activity,
  Stethoscope,
  Settings,
  RefreshCw,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export type NavigationTab = 'dashboard' | 'sales' | 'activity' | 'diagnostics' | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenAddManual: () => void;
  onOpenSync: () => void;
  onOpenSimulator: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddManual,
  onOpenSync,
  onOpenSimulator,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Ventas', icon: ReceiptText },
    { id: 'activity', label: 'Actividad', icon: Activity },
    { id: 'diagnostics', label: 'Diagnóstico', icon: Stethoscope },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-zinc-900/50 z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 shadow-sm font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-base tracking-tight text-white">Conversion Bridge</h1>
            <p className="text-xs text-slate-400">Hotmart → Meta CAPI</p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 space-y-2 border-b border-slate-800">
          <button
            id="btn-sidebar-add-manual"
            onClick={() => {
              onOpenAddManual();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-900" />
            <span>Agregar venta manual</span>
          </button>

          <button
            id="btn-sidebar-sync-hotmart"
            onClick={() => {
              onOpenSync();
              onCloseMobile();
            }}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Sincronizar Hotmart</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400 opacity-70'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Webhook Simulator Tool (Dev/Test) */}
        <div className="p-4 border-t border-slate-800">
          <button
            id="btn-sidebar-simulator"
            onClick={() => {
              onOpenSimulator();
              onCloseMobile();
            }}
            className="w-full py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulador Webhook</span>
            </div>
            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">TEST</span>
          </button>
        </div>

        {/* Footer badge */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400">
          <p className="truncate font-medium text-slate-300">Uso privado de administrador</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Idempotencia & Deduplicación</p>
        </div>
      </aside>
    </>
  );
};
