import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Zap,
} from 'lucide-react';
import { DiagnosticsData } from '../types.js';
import { copyToClipboard, getWebhookUrl } from '../lib/clipboard.js';

export const DiagnosticsPage: React.FC = () => {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const liveWebhookUrl = getWebhookUrl(data?.hotmart.webhookUrl);

  const handleCopyWebhook = async () => {
    const success = await copyToClipboard(liveWebhookUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Diagnóstico de Sistema e Integraciones</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo en tiempo real del Webhook de Hotmart, Meta CAPI y Base de Datos
          </p>
        </div>

        <button
          onClick={fetchDiagnostics}
          className="p-2 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
          Cargando diagnóstico...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Diagnostic 1: Hotmart Webhook & API */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                Hotmart Webhook y API
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">URL Pública del Webhook:</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveWebhookUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 font-semibold select-all"
                  />
                  <button
                    onClick={handleCopyWebhook}
                    className={`p-2 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer transition-all ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                    title="Copiar URL"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Último webhook recibido:</span>
                <span className="font-mono text-slate-900 font-medium">
                  {data?.hotmart.lastWebhookReceived
                    ? new Date(data.hotmart.lastWebhookReceived).toLocaleString()
                    : 'Ninguno todavía'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Última compra aprobada recibida:</span>
                <span className="font-mono text-slate-900 font-medium">
                  {data?.hotmart.lastApprovedEvent
                    ? new Date(data.hotmart.lastApprovedEvent).toLocaleString()
                    : 'Ninguna todavía'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Credenciales OAuth (Client ID/Secret):</span>
                {data?.hotmart.credentialsPresent ? (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Presentes en Secrets
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">
                    No configuradas (Opcional)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic 2: Meta Conversions API */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                Meta Conversions API (Graph API)
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Estado de configuración:</span>
                {data?.meta.configured ? (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Configurado
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Credenciales requeridas
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Versión Graph API centralizada:</span>
                <span className="font-mono text-slate-900 font-bold bg-white px-2.5 py-0.5 rounded border border-slate-200">
                  {data?.meta.graphApiVersion || 'v21.0'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Último Purchase enviado:</span>
                <span className="font-mono text-slate-900 font-medium">
                  {data?.meta.lastPurchaseSent
                    ? new Date(data.meta.lastPurchaseSent).toLocaleString()
                    : 'Sin envíos aún'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Último Purchase aceptado por Meta:</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {data?.meta.lastPurchaseAccepted
                    ? new Date(data.meta.lastPurchaseAccepted).toLocaleString()
                    : 'Sin confirmaciones aún'}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic 3: Base de Datos y Deduplicación */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Estado de la Base de Datos y Trazabilidad
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Ventas</p>
                <p className="text-2xl font-bold text-slate-900">{data?.database.totalSales ?? 0}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Enviadas a Meta</p>
                <p className="text-2xl font-bold text-emerald-600">{data?.database.sent ?? 0}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pendientes</p>
                <p className="text-2xl font-bold text-slate-900">{data?.database.pending ?? 0}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Con Error / Retry</p>
                <p className="text-2xl font-bold text-rose-600">{data?.database.failed ?? 0}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Duplicados</p>
                <p className="text-2xl font-bold text-emerald-600">{data?.database.duplicatesBlocked ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
