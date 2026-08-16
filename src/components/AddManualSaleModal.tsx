import React, { useState } from 'react';
import { X, ShieldAlert, Check, ArrowRight, ArrowLeft, Send, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Sale } from '../types.js';
import { apiFetch } from '../lib/apiClient.js';

interface AddManualSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated: (newSale: Sale) => void;
}

export const AddManualSaleModal: React.FC<AddManualSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleCreated,
}) => {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState<string>('97.00');
  const [currency, setCurrency] = useState<string>('USD');
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [productName, setProductName] = useState<string>('Curso Online');
  const [productId, setProductId] = useState<string>('MANUAL_01');
  const [externalRef, setExternalRef] = useState<string>('');
  const [manualOrigin, setManualOrigin] = useState<string>('WhatsApp');
  const [notes, setNotes] = useState<string>('');

  // Duplicate Check State
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);
  const [duplicateMatches, setDuplicateMatches] = useState<Sale[]>([]);
  const [forceDuplicateConsent, setForceDuplicateConsent] = useState<boolean>(false);

  // Temporary Preview ID
  const [previewEventId] = useState<string>(() => `MANUAL_${crypto.randomUUID()}`);

  if (!isOpen) return null;

  const maskPreviewEmail = (em: string) => {
    if (!em || !em.includes('@')) return '-';
    const [user, dom] = em.split('@');
    return `${user[0] || '*'}***${user[user.length - 1] || ''}@${dom}`;
  };

  const maskPreviewPhone = (ph: string) => {
    if (!ph || ph.length < 4) return '-';
    return `${ph.slice(0, 3)} *** *** ${ph.slice(-4)}`;
  };

  const handleProceedToPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('El valor de la venta debe ser un número positivo mayor a 0.');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setError('Debes ingresar al menos un dato de contacto (Email o Teléfono) para poder identificar la conversión.');
      return;
    }

    // Check potential duplicate against API
    try {
      setLoading(true);
      const res = await apiFetch('/api/sales?limit=50');
      if (res.ok) {
        const data = await res.json();
        const sales: Sale[] = data.items || [];
        const matches = sales.filter((s) => {
          if (externalRef && s.transactionId && s.transactionId.toLowerCase() === externalRef.toLowerCase().trim()) {
            return true;
          }
          if (email && s.buyer.email && s.buyer.email.toLowerCase().includes(email.toLowerCase().trim())) {
            if (Math.abs(s.amount - val) < 0.01) {
              return true;
            }
          }
          return false;
        });

        if (matches.length > 0 && !forceDuplicateConsent) {
          setDuplicateWarning(true);
          setDuplicateMatches(matches);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }

    setStep('preview');
  };

  const handleConfirmAndSave = async (sendImmediately: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        saleDate: new Date(saleDate).toISOString(),
        buyer: {
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        },
        productName: productName.trim() || undefined,
        productId: productId.trim() || undefined,
        externalRef: externalRef.trim() || undefined,
        manualOrigin,
        notes: notes.trim() || undefined,
        forceDuplicate: forceDuplicateConsent,
      };

      const res = await apiFetch('/api/sales/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar venta manual');
      }

      const createdSale: Sale = json.sale;

      // If user chose to send immediately to Meta
      if (sendImmediately && createdSale.id) {
        try {
          const metaRes = await apiFetch(`/api/sales/${createdSale.id}/send-meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const metaJson = await metaRes.json();
          if (metaRes.ok && metaJson.sale) {
            onSaleCreated(metaJson.sale);
            onClose();
            return;
          }
        } catch (mErr) {
          console.warn('Could not dispatch immediately, sale saved:', mErr);
        }
      }

      onSaleCreated(createdSale);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-add-manual-sale-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-add-manual-sale"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {step === 'form' ? 'Registrar Venta Manual' : 'Confirmación y Previsualización'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === 'form'
                ? 'Ingresa los datos reales de la venta fuera de Hotmart'
                : 'Revisa los datos antes de registrar o enviar a Meta'}
            </p>
          </div>
          <button
            id="btn-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 'form' && (
          <form onSubmit={handleProceedToPreview} className="p-6 space-y-4">
            {/* Duplicate Warning Dialog Box */}
            {duplicateWarning && (
              <div
                id="box-duplicate-warning"
                className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Posible venta duplicada detectada</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Existe en el sistema una venta con monto o contacto similar registrada recientemente:
                    </p>
                    <div className="mt-2 text-xs bg-white/80 p-2.5 rounded border border-amber-200 space-y-1">
                      {duplicateMatches.map((m) => (
                        <p key={m.id}>
                          • Transacción/Ref: <span className="font-mono font-medium">{m.transactionId || m.id}</span> — {m.amount} {m.currency} ({m.productName})
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateWarning(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar registro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForceDuplicateConsent(false);
                      setDuplicateWarning(false);
                      setStep('preview');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 cursor-pointer"
                  >
                    Guardar sin enviar a Meta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForceDuplicateConsent(true);
                      setDuplicateWarning(false);
                      setStep('preview');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 cursor-pointer"
                  >
                    Continuar bajo mi responsabilidad
                  </button>
                </div>
              </div>
            )}

            {/* Row 1: Valor y Moneda */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor de la venta <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-manual-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="97.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Moneda <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-manual-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                >
                  <option value="USD">USD ($)</option>
                  <option value="COP">COP ($)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="BRL">BRL (R$)</option>
                  <option value="CLP">CLP ($)</option>
                  <option value="PEN">PEN (S/)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Fecha y Hora */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha y Hora de la Venta <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-manual-date"
                type="datetime-local"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ingresa el momento real en que el cliente realizó el pago para una correcta atribución en Meta.
              </p>
            </div>

            {/* Row 3: Datos de Identificación (Email y Teléfono) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email del Comprador
                </label>
                <input
                  id="input-manual-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono (con código de país)
                </label>
                <input
                  id="input-manual-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="+573001234567"
                />
              </div>
            </div>

            {/* Row 4: Nombre y Apellido (Opcional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nombre (Opcional)
                </label>
                <input
                  id="input-manual-firstname"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="Juan"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Apellido (Opcional)
                </label>
                <input
                  id="input-manual-lastname"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="Pérez"
                />
              </div>
            </div>

            {/* Row 5: Producto y Referencia Externa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nombre del Producto
                </label>
                <input
                  id="input-manual-product"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="Asesoría personalizada"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Referencia / N° Transacción externa
                </label>
                <input
                  id="input-manual-ref"
                  type="text"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="TRX-102938"
                />
              </div>
            </div>

            {/* Row 6: Origen y Notas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Canal de Origen
                </label>
                <select
                  id="select-manual-origin"
                  value={manualOrigin}
                  onChange={(e) => setManualOrigin(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="Llamada">Llamada telefónica</option>
                  <option value="Instagram">Instagram DM</option>
                  <option value="Messenger">Messenger</option>
                  <option value="Tienda física">Tienda física</option>
                  <option value="Otro">Otro canal</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                  <span>Notas internas</span>
                  <span className="text-[10px] text-slate-400 font-normal">(No se envían a Meta)</span>
                </label>
                <input
                  id="input-manual-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  placeholder="Detalles sobre el acuerdo o cliente..."
                />
              </div>
            </div>

            {/* Form Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                id="btn-manual-cancel"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-manual-next"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                <span>Revisar y Previsualizar</span>
                <ArrowRight className="w-4 h-4 text-slate-900" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PREVIEW & CONFIRMATION */}
        {step === 'preview' && (
          <div className="p-6 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Resumen de Conversión a Registrar
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Producto</span>
                  <span className="font-semibold text-slate-800">{productName || 'Producto Manual'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Monto total</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {amount} {currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Fecha y Hora de Compra</span>
                  <span className="font-medium text-slate-800">{new Date(saleDate).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Canal de Venta</span>
                  <span className="font-medium text-slate-800">{manualOrigin}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Email del Cliente (Oculto)</span>
                  <span className="font-mono text-slate-700">{maskPreviewEmail(email)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Teléfono (Oculto)</span>
                  <span className="font-mono text-slate-700">{maskPreviewPhone(phone)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block text-[11px]">Identificador determinístico Meta (event_id):</span>
                <span className="font-mono text-xs text-slate-900 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-1">
                  {previewEventId}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Las ventas manuales se guardan con identificador permanente. Puedes registrarlas en la base de datos y enviarlas a Meta inmediatamente, o guardarlas primero para enviarlas después.
            </p>

            {/* Confirmation Buttons */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                id="btn-preview-back"
                onClick={() => setStep('form')}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Modificar datos</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  id="btn-preview-save-only"
                  disabled={loading}
                  onClick={() => handleConfirmAndSave(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Guardar sin enviar
                </button>
                <button
                  type="button"
                  id="btn-preview-confirm-and-send"
                  disabled={loading}
                  onClick={() => handleConfirmAndSave(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>Confirmar y Enviar a Meta</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
