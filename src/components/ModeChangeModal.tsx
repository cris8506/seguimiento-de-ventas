import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { OperationMode } from '../types.js';

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

  if (!isOpen) return null;

  const handleSave = async () => {
    if (targetMode === 'active' && !acknowledged) {
      setError('Debes confirmar que entiendes el riesgo de duplicación antes de activar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar modo de operación');
      }

      onModeChanged(targetMode);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
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
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-semibold text-slate-800">Modo de Operación del Bridge</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* Option 1: Monitor Mode */}
            <label
              className={`block p-4 rounded-xl border-2 transition-all cursor-pointer ${
                targetMode === 'monitor'
                  ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20'
                  : 'border-slate-200 hover:border-slate-300'
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
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Modo Monitor (Recomendado para pruebas)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">
                      SEGURO
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Recibe y valida las ventas de Hotmart y ventas manuales, registrándolas en la base de datos sin enviarlas automáticamente a Meta. Permite enviar manualmente cada venta con un clic.
                  </p>
                </div>
              </div>
            </label>

            {/* Option 2: Active Mode */}
            <label
              className={`block p-4 rounded-xl border-2 transition-all cursor-pointer ${
                targetMode === 'active'
                  ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="operationMode"
                  value="active"
                  checked={targetMode === 'active'}
                  onChange={() => setTargetMode('active')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Modo Activo (Envío Automático)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">
                      PRODUCCIÓN
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Toda compra aprobada recibida desde el webhook de Hotmart se valida, registra y envía de forma inmediata y automática a Meta Conversions API.
                  </p>
                </div>
              </div>
            </label>
          </div>

          {/* Critical Warning when selecting Active mode */}
          {targetMode === 'active' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-semibold text-amber-950">Advertencia obligatoria de deduplicación:</p>
                  <p>
                    Antes de activar el envío automático de Purchase, verifica que no exista otra integración enviando las mismas compras a Meta con identificadores incompatibles. Mantener dos fuentes independientes puede producir eventos duplicados.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2 pt-2 border-t border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
                />
                <span className="text-xs font-semibold text-amber-950">
                  Entiendo el riesgo y deseo activar el envío automático
                </span>
              </label>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading || (targetMode === 'active' && !acknowledged)}
              onClick={handleSave}
              className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-colors ${
                targetMode === 'active'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
              }`}
            >
              {loading ? 'Guardando...' : targetMode === 'active' ? 'Entiendo el riesgo y activar' : 'Guardar Modo Monitor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
