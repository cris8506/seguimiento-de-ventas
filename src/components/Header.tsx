import React from 'react';
import { Menu, LogOut, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { OperationMode } from '../types.js';
import { useAuth } from '../context/AuthContext.js';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  mode: OperationMode;
  hotmartConfigured: boolean;
  metaConfigured: boolean;
  onOpenModeChange: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  mode,
  hotmartConfigured,
  metaConfigured,
  onOpenModeChange,
}) => {
  const { user, logout } = useAuth();

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs"
    >
      {/* Mobile Toggle & App Title */}
      <div className="flex items-center gap-4">
        <button
          id="btn-mobile-sidebar-toggle"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800 text-base">Conversion Bridge</span>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Hotmart → Meta CAPI</span>
          </div>
        </div>
      </div>

      {/* Integration Badges & Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Hotmart Status */}
        <div
          id="status-header-hotmart"
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700"
          title={hotmartConfigured ? 'API de Hotmart configurada' : 'Faltan credenciales de Hotmart API'}
        >
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Hotmart:</span>
          {hotmartConfigured ? (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> No configurado
            </span>
          )}
        </div>

        {/* Meta Status */}
        <div
          id="status-header-meta"
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700"
          title={metaConfigured ? 'Meta Conversions API configurada' : 'Falta META_ACCESS_TOKEN o DATASET_ID'}
        >
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Meta CAPI:</span>
          {metaConfigured ? (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> No configurado
            </span>
          )}
        </div>

        {/* Mode Selector Button */}
        <button
          id="btn-header-mode-toggle"
          onClick={onOpenModeChange}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
            mode === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title="Haz clic para cambiar entre Modo Monitor y Modo Activo"
        >
          {mode === 'active' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MODO ACTIVO</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>MODO MONITOR</span>
            </>
          )}
        </button>

        {/* User Account / Logout */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
          <div className="hidden xl:block text-right">
            <p className="text-xs font-semibold text-slate-800 max-w-[150px] truncate">{user?.email}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Admin</p>
          </div>
          <button
            id="btn-header-logout"
            onClick={logout}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
