import React, { useState } from 'react';
import { X, Zap, CheckCircle2, AlertCircle, Play, Code2 } from 'lucide-react';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventSimulated: () => void;
}

export const WebhookSimulatorModal: React.FC<WebhookSimulatorModalProps> = ({
  isOpen,
  onClose,
  onEventSimulated,
}) => {
  const [eventType, setEventType] = useState<'PURCHASE_APPROVED' | 'PURCHASE_REFUNDED' | 'PURCHASE_CHARGEBACK'>('PURCHASE_APPROVED');
  const [transactionId, setTransactionId] = useState<string>(() => `HP${Math.floor(100000000 + Math.random() * 900000000)}`);
  const [amount, setAmount] = useState<string>('97.00');
  const [currency, setCurrency] = useState<string>('USD');
  const [email, setEmail] = useState<string>('comprador.test@ejemplo.com');
  const [phone, setPhone] = useState<string>('+573001234567');
  const [name, setName] = useState<string>('Alejandro Morales');
  const [productName, setProductName] = useState<string>('Masterclass en Ventas Digitales');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/dev/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          transactionId: transactionId.trim(),
          amount: parseFloat(amount),
          currency,
          email: email.trim(),
          phone: phone.trim(),
          name: name.trim(),
          productName: productName.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al ejecutar simulación');
      }

      setResult(json);
      onEventSimulated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomTx = () => {
    setTransactionId(`HP${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  return (
    <div
      id="modal-webhook-simulator-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-webhook-simulator"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-base font-semibold text-slate-800">Simulador de Webhooks de Hotmart</h2>
              <p className="text-xs text-slate-500">Herramienta de desarrollo y pruebas internas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-slate-600 leading-relaxed">
            Envía una carga útil de prueba al endpoint <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">/api/webhooks/hotmart</code> para verificar la deduplicación, el registro y el comportamiento según el modo configurado.
          </p>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Simulación procesada correctamente</span>
              </div>
              <p>• Acción ejecutada: <span className="font-mono font-semibold">{result.simulationResult?.action}</span></p>
              <p>• Mensaje: {result.simulationResult?.message}</p>
              {result.simulationResult?.sale && (
                <p>• ID Venta / Meta Event ID: <span className="font-mono font-semibold">{result.simulationResult.sale.metaEventId}</span></p>
              )}
            </div>
          )}

          {/* Form controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Evento</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
              >
                <option value="PURCHASE_APPROVED">Compra aprobada (PURCHASE_APPROVED)</option>
                <option value="PURCHASE_REFUNDED">Reembolso (PURCHASE_REFUNDED)</option>
                <option value="PURCHASE_CHARGEBACK">Chargeback (PURCHASE_CHARGEBACK)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Transaction ID Hotmart</span>
                <button
                  type="button"
                  onClick={generateRandomTx}
                  className="text-[11px] text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Nuevo ID
                </button>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
              />
            </div>
          </div>

          {eventType === 'PURCHASE_APPROVED' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto de la Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  >
                    <option value="USD">USD</option>
                    <option value="COP">COP</option>
                    <option value="MXN">MXN</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Comprador</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                />
              </div>
            </>
          )}

          <div className="p-3.5 bg-slate-900 rounded-xl text-slate-300 font-mono text-[11px] space-y-1">
            <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800 text-[10px]">
              <span className="flex items-center gap-1"><Code2 className="w-3 h-3" /> Payload preview</span>
              <span>POST /api/webhooks/hotmart</span>
            </div>
            <p className="text-emerald-400 font-semibold">event: "{eventType}"</p>
            <p>transaction: "{transactionId}"</p>
            {eventType === 'PURCHASE_APPROVED' && (
              <>
                <p>amount: {amount} {currency}</p>
                <p>buyer: "{email}"</p>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSimulate}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Disparando...' : 'Ejecutar Webhook de Prueba'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
