import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  KeyRound,
  Globe,
  RefreshCw,
  Zap,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { IntegrationStatus, OperationMode } from '../types.js';
import { copyToClipboard, getWebhookUrl } from '../lib/clipboard.js';

interface SettingsPageProps {
  currentMode?: OperationMode;
  onOpenModeChange: () => void;
  onRefreshData?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentMode,
  onOpenModeChange,
  onRefreshData,
}) => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Timezone state
  const [timezone, setTimezone] = useState('America/Bogota');
  const [savingTz, setSavingTz] = useState(false);
  const [tzSuccess, setTzSuccess] = useState(false);

  // Meta Test Connection state
  const [testingMeta, setTestingMeta] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{
    success: boolean;
    message: string;
    datasetName?: string;
  } | null>(null);

  // Derive immediate live webhook URL so it's NEVER blank or empty
  const liveWebhookUrl = getWebhookUrl(status?.webhookUrl);

  const activeMode: OperationMode = currentMode || status?.mode || 'monitor';

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const json = await res.json();
        setStatus(json);
        if (json.timezone) setTimezone(json.timezone);
      }
    } catch (e) {
      console.warn('Error fetching status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [currentMode]);

  const handleCopyWebhook = async () => {
    const success = await copyToClipboard(liveWebhookUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveTimezone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTz(true);
    setTzSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });
      if (res.ok) {
        setTzSuccess(true);
        setTimeout(() => setTzSuccess(false), 2500);
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setSavingTz(false);
    }
  };

  const handleTestMeta = async () => {
    setTestingMeta(true);
    setMetaTestResult(null);

    try {
      const res = await fetch('/api/integrations/meta/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      setMetaTestResult(json);
    } catch (err: unknown) {
      setMetaTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error al verificar conexión con Meta',
      });
    } finally {
      setTestingMeta(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Configuración del Bridge</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajustes de operación, variables de integración y guías de conexión para Hotmart y Meta Conversions API
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="p-2 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* 1. OPERATION MODE SELECTOR */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">Modo de Operación</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  activeMode === 'active'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {activeMode === 'active' ? 'MODO ACTIVO' : 'MODO MONITOR'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Controla si las compras aprobadas se envían automáticamente a Meta CAPI o requieren confirmación manual
            </p>
          </div>

          <button
            id="btn-settings-change-mode"
            onClick={onOpenModeChange}
            className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeMode === 'active'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Cambiar Modo ({activeMode === 'active' ? 'Activo' : 'Monitor'})</span>
          </button>
        </div>

        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 transition-colors ${
            activeMode === 'active'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {activeMode === 'active' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Modo Activo Habilitado — Envío en Tiempo Real</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Modo Monitor Habilitado — Modo Seguro de Auditoría</span>
              </>
            )}
          </div>
          <p>
            {activeMode === 'active'
              ? 'Todas las compras aprobadas recibidas a través del Webhook se procesan, deduplican y envían de forma automática e inmediata a Meta Conversions API.'
              : 'Las compras de Hotmart se reciben y guardan con total seguridad en la base de datos, pero NO se envían automáticamente a Meta. Puedes usar el botón "Enviar a Meta" en cualquier venta para realizar pruebas controladas.'}
          </p>
        </div>
      </div>

      {/* 2. HOTMART CONFIGURATION & WEBHOOK URL */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">Webhook de Hotmart (Recepción de Ventas)</h3>
          </div>

          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Endpoint Listo
          </span>
        </div>

        {/* Webhook URL configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              URL Pública del Webhook para copiar en Hotmart:
            </label>
            {copied && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 animate-pulse">
                <Check className="w-3.5 h-3.5" /> ¡URL Copiada al portapapeles!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="input-webhook-url"
              type="text"
              readOnly
              value={liveWebhookUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-emerald-500 rounded-lg font-mono text-xs text-slate-900 font-semibold select-all"
            />
            <button
              id="btn-copy-webhook"
              onClick={handleCopyWebhook}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer shrink-0 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title="Copiar URL del Webhook"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar URL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Esta es la dirección pública HTTPS donde Hotmart enviará las notificaciones de compras en tiempo real.
          </p>
        </div>

        {/* Hotmart Setup Instructions */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>Pasos para configurar el Webhook en tu cuenta de Hotmart:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
            <li>Ingresa a tu cuenta de <strong>Hotmart</strong>.</li>
            <li>Ve a <strong>Herramientas</strong> → <strong>Webhook (API y notificaciones)</strong>.</li>
            <li>Crea una nueva configuración y pega la URL del Webhook copiada arriba.</li>
            <li>
              Selecciona como mínimo los eventos: <strong>Compra aprobada</strong>, <strong>Compra reembolsada</strong>, <strong>Chargeback</strong> y <strong>Compra cancelada</strong>.
            </li>
            <li>Guarda la configuración y ejecuta una prueba de webhook desde Hotmart.</li>
          </ol>
        </div>

        {/* Credentials Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-slate-600 font-medium">HOTMART_CLIENT_ID (Opcional):</span>
            <span className={`font-semibold ${status?.hotmart.clientIdPresent ? 'text-emerald-700' : 'text-slate-500'}`}>
              {status?.hotmart.clientIdPresent ? 'Presente' : 'No configurado'}
            </span>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-slate-600 font-medium">HOTMART_CLIENT_SECRET (Opcional):</span>
            <span className={`font-semibold ${status?.hotmart.clientSecretPresent ? 'text-emerald-700' : 'text-slate-500'}`}>
              {status?.hotmart.clientSecretPresent ? 'Presente' : 'No configurado'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. META CONVERSIONS API CONFIGURATION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">Integración con Meta Conversions API</h3>
          </div>

          {status?.meta.configured ? (
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Configurado
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Credenciales requeridas
            </span>
          )}
        </div>

        {/* Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-slate-600 font-medium">META_DATASET_ID:</span>
            <span className={`font-semibold ${status?.meta.datasetIdPresent ? 'text-emerald-700' : 'text-amber-700'}`}>
              {status?.meta.datasetIdPresent ? 'Configurado' : 'Pendiente'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-slate-600 font-medium">META_ACCESS_TOKEN:</span>
            <span className={`font-semibold ${status?.meta.accessTokenPresent ? 'text-emerald-700' : 'text-amber-700'}`}>
              {status?.meta.accessTokenPresent ? 'Configurado' : 'Pendiente'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Versión Graph API:</span>
            <span className="font-mono text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
              {status?.meta.graphApiVersion || 'v21.0'}
            </span>
          </div>
        </div>

        {/* Test Connection Button & Result */}
        <div className="pt-2">
          <button
            id="btn-test-meta-connection"
            disabled={testingMeta || !status?.meta.configured}
            onClick={handleTestMeta}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${testingMeta ? 'animate-spin' : 'fill-current'}`} />
            <span>{testingMeta ? 'Verificando con Meta...' : 'Probar conexión con Meta (Sin costo)'}</span>
          </button>

          {metaTestResult && (
            <div
              className={`mt-3 p-4 rounded-xl border text-xs flex items-start gap-3 ${
                metaTestResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {metaTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{metaTestResult.message}</p>
                {metaTestResult.datasetName && (
                  <p className="text-[11px] text-slate-600 mt-0.5">Dataset verificado: {metaTestResult.datasetName}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. TIMEZONE SETTINGS */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Globe className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-800">Zona Horaria Predeterminada</h3>
        </div>

        <form onSubmit={handleSaveTimezone} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
          >
            <option value="America/Bogota">America/Bogota (Colombia / Perú / Ecuador / Panamá)</option>
            <option value="America/Mexico_City">America/Mexico_City (México Central)</option>
            <option value="America/Lima">America/Lima (Perú)</option>
            <option value="America/Santiago">America/Santiago (Chile)</option>
            <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (Argentina)</option>
            <option value="America/New_York">America/New_York (EST / Miami)</option>
            <option value="Europe/Madrid">Europe/Madrid (España)</option>
            <option value="UTC">UTC (Universal)</option>
          </select>

          <button
            type="submit"
            disabled={savingTz}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
          >
            {savingTz ? 'Guardando...' : 'Guardar zona horaria'}
          </button>

          {tzSuccess && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" /> Guardado
            </span>
          )}
        </form>
      </div>

      {/* 5. SECRETS GUIDE */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-sm space-y-3 text-xs relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <KeyRound className="w-4 h-4" />
            <span>Configuración Segura de Variables de Entorno (Secrets)</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Para conectar tus credenciales de Meta y Hotmart de forma segura sin exponer tokens en el navegador, ingresa en el menú <strong>Settings / Secrets</strong> de Google AI Studio los siguientes nombres:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px] pt-1">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-emerald-400 font-bold block">ADMIN_EMAIL</span>
              <span className="text-slate-400 font-sans text-[11px]">Email de Google autorizado para acceder (ej: tu correo)</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-emerald-400 font-bold block">META_ACCESS_TOKEN</span>
              <span className="text-slate-400 font-sans text-[11px]">Token de acceso permanente de Meta Conversions API</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-emerald-400 font-bold block">META_DATASET_ID</span>
              <span className="text-slate-400 font-sans text-[11px]">ID del Dataset / Pixel en Meta Events Manager</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-emerald-400 font-bold block">HOTMART_CLIENT_ID / SECRET</span>
              <span className="text-slate-400 font-sans text-[11px]">Credenciales de API Developers Hotmart (Opcional)</span>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};
