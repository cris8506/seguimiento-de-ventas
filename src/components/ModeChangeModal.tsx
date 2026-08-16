import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import { OperationMode } from '../types.js';
import { apiFetch } from '../lib/apiClient.js';

interface ModeChangeModalProps {
  isOpen: boolean;
  currentMode: OperationMode;
  onClose: () => void;
  onModeChanged: (newMode: OperationMode) => void;
}

export const ModeChangeModal: React.FC<ModeChangeModalProps> = ({
  isOpen,
  currentMode,
  onClose,
  onModeChanged,
}) => {
  const [targetMode, setTargetMode] = useState<OperationMode>(currentMode);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or currentMode changes
  useEffect(() => {
    if (isOpen) {
      setTargetMode(currentMode);
      setAcknowledged(currentMode === 'active');
      setError(null);
    }
  }, [isOpen, currentMode]);

  if (!isOpen) return null;

  const handleSave = async (overrideTarget?: OperationMode) => {
    const modeToSave = overrideTarget || targetMode;

    if (modeToSave === 'active' && !acknowledged && targetMode !== 'active') {
      // Auto acknowledge if user explicitly triggered the active button
      setAcknowledged(true);
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeToSave }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar modo de operación');
      }

      onModeChanged(modeToSave);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-mode-change-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-mode-change"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Modo de Operación del Bridge</h2>
            <p className="text-xs text-slate-500 mt-0.5">Control de envío a Meta Conversions API</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Option 1: Monitor Mode */}
            <div
              onClick={() => {
                setTargetMode('monitor');
                setAcknowledged(false);
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                targetMode === 'monitor'
                  ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="operationMode"
                  value="monitor"
                  checked={targetMode === 'monitor'}
                  onChange={() => {
                    setTargetMode('monitor');
                    setAcknowledged(false);
                  }}
                  className="mt-1 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Modo Monitor (Auditoría / Pruebas)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      SEGURO
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Las compras aprobadas se reciben, validan y guardan en el historial local <strong>sin enviarse automáticamente a Meta</strong>. Puedes enviar manualmente cualquier venta con un solo clic.
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Active Mode */}
            <div
              onClick={() => {
                setTargetMode('active');
                setAcknowledged(true);
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                targetMode === 'active'
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="operationMode"
                  value="active"
                  checked={targetMode === 'active'}
                  onChange={() => {
                    setTargetMode('active');
                    setAcknowledged(true);
                  }}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Modo Activo (Envío Automático)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      PRODUCCIÓN
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Toda compra recibida desde el Webhook de Hotmart se procesa, deduplica y <strong>se envía inmediatamente a Meta Conversions API</strong> en tiempo real con cifrado SHA-256.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Deduplication Advisory for Active Mode */}
          {targetMode === 'active' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-bold text-amber-950">Recordatorio de Deduplicación:</p>
                  <p className="text-amber-900">
                    Asegúrate de que no haya otros plugins o servidores enviando las mismas ventas simultáneamente a Meta sin deduplicación compartida.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-amber-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-amber-950">
                  Deseo activar el envío automático de conversiones en tiempo real
                </span>
              </label>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave()}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2 ${
                targetMode === 'active'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
              <span>
                {targetMode === 'active'
                  ? 'Guardar y Activar Envío Automático'
                  : 'Guardar Modo Monitor (Seguro)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
