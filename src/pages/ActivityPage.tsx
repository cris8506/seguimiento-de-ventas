import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  PlusCircle,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ActivityLogItem } from '../types.js';
import { apiFetch } from '../lib/apiClient.js';

interface ActivityPageProps {
  onSelectSale?: (saleId: string) => void;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ onSelectSale }) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/activity?limit=100');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLogIcon = (type: ActivityLogItem['type']) => {
    switch (type) {
      case 'meta_accepted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'meta_rejected':
      case 'system_warning':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'webhook_received':
        return <Zap className="w-4 h-4 text-emerald-500" />;
      case 'manual_sale_created':
        return <PlusCircle className="w-4 h-4 text-slate-700" />;
      case 'duplicate_blocked':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'refund_received':
      case 'chargeback_received':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Registro Cronológico de Actividad</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auditoría de webhooks, validaciones, envíos a Meta CAPI y deduplicación
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">Eventos Recientes del Sistema</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Cargando eventos de actividad...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No hay actividad registrada aún.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-3.5 rounded-lg hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 text-xs"
              >
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                  {getLogIcon(item.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.message}</p>
                    <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {(item.metaEventId || item.transactionId) && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {item.metaEventId && (
                        <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-100 font-medium">
                          event_id: {item.metaEventId}
                        </span>
                      )}
                      {item.transactionId && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          trx: {item.transactionId}
                        </span>
                      )}
                    </div>
                  )}

                  {item.details && (
                    <p className="text-[11px] text-slate-500 font-mono truncate max-w-2xl bg-slate-50 p-1.5 rounded border border-slate-100">
                      {item.details}
                    </p>
                  )}
                </div>

                {item.saleId && onSelectSale && (
                  <button
                    onClick={() => onSelectSale(item.saleId!)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                    title="Ver detalle de la venta"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
