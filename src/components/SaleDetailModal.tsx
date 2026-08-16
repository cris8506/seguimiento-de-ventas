import React, { useState, useEffect } from 'react';
import { X, Send, RefreshCw, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, Clock, Ban } from 'lucide-react';
import { Sale, MetaAttempt } from '../types.js';
import { MetaStatusBadge, HotmartStatusBadge } from './StatusBadge.js';
import { apiFetch } from '../lib/apiClient.js';

interface SaleDetailModalProps {
  saleId: string | null;
  onClose: () => void;
  onSaleUpdated: (updated: Sale) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  saleId,
  onClose,
  onSaleUpdated,
}) => {
  const [sale, setSale] = useState<Sale | null>(null);
  const [attempts, setAttempts] = useState<MetaAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [revealPii, setRevealPii] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    apiFetch(`/api/sales/${saleId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.sale) {
          setSale(data.sale);
          setAttempts(data.attempts || []);
        }
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [saleId]);

  if (!saleId) return null;

  const handleSendToMeta = async () => {
    if (!sale) return;
    if (sale.metaStatus === 'sent') {
      setErrorMsg('Esta venta ya fue enviada a Meta. No se permite reenviar para evitar conversiones duplicadas.');
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch(`/api/sales/${sale.id}/send-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al enviar a Meta Conversions API');
      }

      setSale(data.sale);
      onSaleUpdated(data.sale);
      setSuccessMsg('¡Conversión Purchase enviada y recibida exitosamente por Meta!');

      // Refresh attempts
      const freshRes = await apiFetch(`/api/sales/${sale.id}`);
      const freshData = await freshRes.json();
      if (freshData.attempts) setAttempts(freshData.attempts);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!sale) return;
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch(`/api/sales/${sale.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al reintentar');
      }

      setSale(data.sale);
      onSaleUpdated(data.sale);
      setSuccessMsg('Reintento completado con el mismo event_id.');

      const freshRes = await apiFetch(`/api/sales/${sale.id}`);
      const freshData = await freshRes.json();
      if (freshData.attempts) setAttempts(freshData.attempts);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al reintentar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIgnore = async () => {
    if (!sale) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/${sale.id}/ignore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.sale) {
        setSale(data.sale);
        onSaleUpdated(data.sale);
        setSuccessMsg('Venta marcada como "No enviar".');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const maskEmailPreview = (email?: string) => {
    if (!email) return '-';
    if (revealPii) return email;
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    return `${parts[0][0]}***${parts[0].slice(-1)}@${parts[1]}`;
  };

  const maskPhonePreview = (phone?: string) => {
    if (!phone) return '-';
    if (revealPii) return phone;
    if (phone.length <= 4) return '***';
    return `${phone.slice(0, 3)} *** *** ${phone.slice(-4)}`;
  };

  return (
    <div
      id="modal-sale-detail-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-sale-detail"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-800">Detalle de Conversión</h2>
            {sale && <MetaStatusBadge status={sale.metaStatus} duplicateBlocked={sale.duplicateBlocked} />}
          </div>
          <button
            id="btn-detail-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Cargando detalles de la venta...</div>
        ) : !sale ? (
          <div className="p-8 text-center text-slate-500 text-xs">Venta no encontrada.</div>
        ) : (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Feedback messages */}
            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* General Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
              <div className="space-y-2.5">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Producto</span>
                  <span className="text-sm font-bold text-slate-900">{sale.productName || 'Producto no especificado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Monto y Moneda</span>
                  <span className="text-base font-bold text-emerald-600">
                    {sale.amount} {sale.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Fecha original de venta</span>
                  <span className="font-medium text-slate-800">{new Date(sale.saleDate).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Origen de la venta</span>
                  <span className="font-medium text-slate-800 capitalize">
                    {sale.source === 'hotmart' ? 'Hotmart Webhook / API' : `Manual (${sale.manualOrigin || 'Directo'})`}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Transaction ID</span>
                  <span className="font-mono text-slate-800 font-semibold">{sale.transactionId || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Meta event_id (Determinístico)</span>
                  <span className="font-mono text-slate-900 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {sale.metaEventId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Estado en Hotmart</span>
                  <div className="mt-1">
                    <HotmartStatusBadge status={sale.hotmartStatus} />
                    {sale.refundedAt && (
                      <span className="text-[11px] text-amber-700 ml-2">
                        Reembolsado en {new Date(sale.refundedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {sale.notes && (
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Notas internas</span>
                    <span className="text-slate-700 italic">{sale.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer Identification */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Datos de Identificación del Comprador
                </h3>
                <button
                  type="button"
                  onClick={() => setRevealPii(!revealPii)}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  {revealPii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{revealPii ? 'Ocultar PII' : 'Mostrar PII completa'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Email</span>
                  <span className="font-mono text-slate-800">{maskEmailPreview(sale.buyer.email)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Teléfono</span>
                  <span className="font-mono text-slate-800">{maskPhonePreview(sale.buyer.phone)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Nombre</span>
                  <span className="text-slate-800 font-medium">{sale.buyer.firstName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Apellido</span>
                  <span className="text-slate-800 font-medium">{sale.buyer.lastName || '-'}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Al enviar a Meta CAPI, los datos personales se normalizan y hashean con SHA-256 en el servidor.
              </p>
            </div>

            {/* Meta CAPI Delivery Status */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Estado y Trazabilidad en Meta Conversions API
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Estado Actual</span>
                  <div className="mt-1">
                    <MetaStatusBadge status={sale.metaStatus} duplicateBlocked={sale.duplicateBlocked} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Intentos de envío</span>
                  <span className="font-semibold text-slate-800 text-sm">{sale.sendAttempts || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Fecha de Envío</span>
                  <span className="font-medium text-slate-800">
                    {sale.sentAt ? new Date(sale.sentAt).toLocaleString() : 'No enviado aún'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">fbtrace_id</span>
                  <span className="font-mono text-slate-700 text-[11px]">
                    {sale.metaResponse?.fbtraceId || '-'}
                  </span>
                </div>
              </div>

              {sale.metaResponse?.message && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="text-slate-400 font-sans block text-[10px]">Última respuesta de Meta:</span>
                  {sale.metaResponse.message}
                </div>
              )}
            </div>

            {/* Audit Attempts History */}
            {attempts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Historial de Intentos de Envío ({attempts.length})
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Intento</th>
                        <th className="p-2.5">Fecha / Hora</th>
                        <th className="p-2.5">Resultado</th>
                        <th className="p-2.5">Detalle sanitizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attempts.map((att) => (
                        <tr key={att.id}>
                          <td className="p-2.5 font-mono">#{att.attempt}</td>
                          <td className="p-2.5 text-slate-600">{new Date(att.startedAt).toLocaleString()}</td>
                          <td className="p-2.5">
                            {att.success ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aceptado
                              </span>
                            ) : (
                              <span className="text-rose-700 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Error
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                            {JSON.stringify(att.responseSanitized || {})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                {sale.metaStatus === 'sent' && (
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Conversión confirmada en Meta. Bloqueada contra envíos duplicados.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {sale.metaStatus !== 'sent' && sale.metaStatus !== 'ignored' && (
                  <button
                    type="button"
                    onClick={handleIgnore}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    Marcar como no enviar
                  </button>
                )}

                {sale.metaStatus === 'retry' || sale.metaStatus === 'failed' ? (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>Reintentar envío a Meta</span>
                  </button>
                ) : sale.metaStatus !== 'sent' ? (
                  <button
                    type="button"
                    onClick={handleSendToMeta}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar a Meta</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
