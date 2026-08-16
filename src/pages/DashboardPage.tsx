import React from 'react';
import {
  TrendingUp,
  Receipt,
  PlusCircle,
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DashboardMetrics, Sale, OperationMode } from '../types.js';
import { MetaStatusBadge, HotmartStatusBadge } from '../components/StatusBadge.js';

interface DashboardPageProps {
  metrics: DashboardMetrics | null;
  recentSales: Sale[];
  loading: boolean;
  onOpenAddManual: () => void;
  onOpenSync: () => void;
  onOpenSimulator: () => void;
  onOpenModeChange: () => void;
  onSelectSale: (saleId: string) => void;
  onNavigateToSales: () => void;
  onNavigateToSettings: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  recentSales,
  loading,
  onOpenAddManual,
  onOpenSync,
  onOpenSimulator,
  onOpenModeChange,
  onSelectSale,
  onNavigateToSales,
  onNavigateToSettings,
}) => {
  const mode: OperationMode = metrics?.integrationStatus.mode || 'monitor';
  const hotmartOk = metrics?.integrationStatus.hotmart || false;
  const metaOk = metrics?.integrationStatus.meta || false;

  return (
    <div className="space-y-6">
      {/* Mode Banner styled with Professional Polish advisory insight pattern */}
      <div
        id="banner-mode-alert"
        className={`rounded-xl p-6 shadow-sm border relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          mode === 'active'
            ? 'bg-emerald-950 text-white border-emerald-800'
            : 'bg-slate-900 text-white border-slate-800'
        }`}
      >
        <div className="relative z-10 space-y-1 max-w-3xl">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                mode === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}
            >
              {mode === 'active' ? 'Modo Activo' : 'Modo Monitor'}
            </span>
            <span className="text-xs text-slate-400 font-medium">Idempotencia de Conversiones</span>
          </div>

          <h2 className="text-lg font-semibold text-white pt-1">
            {mode === 'active'
              ? 'Envío automático a Meta Conversions API en tiempo real'
              : 'Auditoría y control de compras activados (Modo Seguro)'}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {mode === 'active'
              ? 'Toda compra aprobada recibida de Hotmart es validada, registrada y enviada automáticamente a Meta CAPI con SHA-256.'
              : 'Las ventas se guardan y validan de forma segura en la base de datos sin enviarse automáticamente a Meta. Puedes enviarlas individualmente para pruebas.'}
          </p>
        </div>

        <button
          id="btn-banner-change-mode"
          onClick={onOpenModeChange}
          className="relative z-10 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          Cambiar Modo de Operación
        </button>

        {/* Ambient background blur glow */}
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Ventas Hoy */}
        <div
          id="card-metric-today"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ventas Hoy</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {metrics?.totalSalesToday ?? '-'}
            </p>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-3">Registradas hoy</p>
        </div>

        {/* Card 2: Enviadas a Meta */}
        <div
          id="card-metric-sent-meta"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Enviadas a Meta</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {metrics?.sentToMeta ?? '-'}
            </p>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-3">↑ Conversiones Purchase</p>
        </div>

        {/* Card 3: Pendientes */}
        <div
          id="card-metric-pending-meta"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pendientes</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {metrics?.pendingMeta ?? '-'}
            </p>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-3">En cola de aprobación</p>
        </div>

        {/* Card 4: Duplicados Bloqueados */}
        <div
          id="card-metric-duplicates"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Duplicados Bloqueados</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {metrics?.duplicatesBlocked ?? '0'}
            </p>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-3">Protección de idempotencia</p>
        </div>
      </div>

      {/* Secondary Metrics & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Origin Split */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Distribución por Origen</h3>
          </div>

          <div className="p-5 space-y-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600">Ventas Hotmart</span>
                <span className="text-slate-900 font-bold">{metrics?.totalHotmartSales ?? 0}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 rounded-full"
                  style={{
                    width: `${
                      metrics && (metrics.totalHotmartSales + metrics.totalManualSales > 0)
                        ? Math.round((metrics.totalHotmartSales / (metrics.totalHotmartSales + metrics.totalManualSales)) * 100)
                        : 50
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600">Ventas Manuales (WhatsApp / Directo)</span>
                <span className="text-slate-900 font-bold">{metrics?.totalManualSales ?? 0}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${
                      metrics && (metrics.totalHotmartSales + metrics.totalManualSales > 0)
                        ? Math.round((metrics.totalManualSales / (metrics.totalHotmartSales + metrics.totalManualSales)) * 100)
                        : 50
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {metrics && metrics.errorMeta > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-between text-xs mt-2">
                <span className="text-rose-800 font-medium">Errores / Reintentos Meta</span>
                <span className="font-bold text-rose-700">{metrics.errorMeta}</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle: Integration Health Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Estado de Integraciones</h3>
            <button
              onClick={onNavigateToSettings}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
            >
              Configurar
            </button>
          </div>

          <div className="p-5 space-y-3 flex-1 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Hotmart Webhook & API</span>
              {hotmartOk ? (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conectado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">
                  Pendiente Secrets
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Meta Conversions API</span>
              {metaOk ? (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Configurado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">
                  Pendiente Secrets
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Deduplicación e Idempotencia</span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Nivel 3 Activo
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Toolbox */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Acciones Rápidas</h3>
          </div>

          <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-center">
            <button
              id="btn-dash-add-manual"
              onClick={onOpenAddManual}
              className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-900" />
              <span>+ Agregar venta manual</span>
            </button>

            <button
              id="btn-dash-sync"
              onClick={onOpenSync}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span>Sincronizar ventas Hotmart</span>
            </button>

            <button
              id="btn-dash-simulator"
              onClick={onOpenSimulator}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simular Webhook de prueba</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Sales Table Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Últimas Conversiones Registradas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Haz clic en cualquier fila para ver el detalle y trazabilidad</p>
          </div>
          <button
            id="btn-dash-view-all-sales"
            onClick={onNavigateToSales}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <span>Ver todas las ventas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Cargando conversiones recientes...</div>
        ) : recentSales.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-600">No hay ventas registradas todavía.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={onOpenAddManual}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-900 text-xs font-bold cursor-pointer"
              >
                Agregar venta manual
              </button>
              <button
                onClick={onOpenSimulator}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 cursor-pointer"
              >
                Probar simulación
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Fecha</th>
                  <th className="py-3.5 px-4">Transaction / Ref</th>
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4">Origen</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Monto</th>
                  <th className="py-3.5 px-6">Estado Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentSales.slice(0, 5).map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => onSelectSale(sale.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap font-medium">
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {sale.transactionId || sale.id.slice(0, 12)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[160px] truncate">
                      {sale.productName || 'Producto Digital'}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {sale.source === 'hotmart' ? 'Hotmart' : `Manual (${sale.manualOrigin || 'WSP'})`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {sale.buyer.email || sale.buyer.phone || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {sale.amount} {sale.currency}
                    </td>
                    <td className="py-3.5 px-6">
                      <MetaStatusBadge status={sale.metaStatus} duplicateBlocked={sale.duplicateBlocked} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
