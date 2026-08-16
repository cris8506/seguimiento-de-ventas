import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { apiFetch } from '../lib/apiClient.js';

interface HotmartSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export const HotmartSyncModal: React.FC<HotmartSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const defaultEnd = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    totalConsulted: number;
    existingCount: number;
    newFoundCount: number;
    importedCount: number;
    errorsCount: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await apiFetch('/api/hotmart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + 'T23:59:59').toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || 'Error en sincronización con Hotmart');
      }

      setSummary(json);
      onSyncComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con la API de Hotmart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-sync-hotmart-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-sync-hotmart"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-800">Sincronizar Ventas con Hotmart</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSync} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Consulta las ventas aprobadas registradas en la API oficial de Hotmart dentro del rango seleccionado.
            Las ventas faltantes serán importadas automáticamente respetando la idempotencia (jamás duplicará ventas ya conocidas).
          </p>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {summary && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Resumen de sincronización</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>• Ventas consultadas: <span className="font-bold">{summary.totalConsulted}</span></div>
                <div>• Ya existentes en ledger: <span className="font-bold">{summary.existingCount}</span></div>
                <div>• Nuevas encontradas: <span className="font-bold">{summary.newFoundCount}</span></div>
                <div>• Importadas con éxito: <span className="font-bold text-emerald-700">{summary.importedCount}</span></div>
              </div>
              <p className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200">{summary.message}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Desde</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Hasta</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Consultando Hotmart...' : 'Iniciar Sincronización'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
