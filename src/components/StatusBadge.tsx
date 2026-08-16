import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, MinusCircle, ShieldCheck } from 'lucide-react';
import { MetaStatus, HotmartStatus } from '../types.js';

interface MetaStatusBadgeProps {
  status: MetaStatus;
  duplicateBlocked?: boolean;
}

export const MetaStatusBadge: React.FC<MetaStatusBadgeProps> = ({ status, duplicateBlocked }) => {
  if (duplicateBlocked) {
    return (
      <span
        id="badge-duplicate-blocked"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
        Duplicado bloqueado
      </span>
    );
  }

  switch (status) {
    case 'sent':
      return (
        <span
          id="badge-meta-sent"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Enviada a Meta
        </span>
      );
    case 'sending':
    case 'queued':
      return (
        <span
          id="badge-meta-sending"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 animate-pulse"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Enviando...
        </span>
      );
    case 'retry':
      return (
        <span
          id="badge-meta-retry"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Reintento pendiente
        </span>
      );
    case 'failed':
      return (
        <span
          id="badge-meta-failed"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Error de envío
        </span>
      );
    case 'ignored':
      return (
        <span
          id="badge-meta-ignored"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
        >
          <XCircle className="w-3.5 h-3.5 text-slate-400" />
          No enviar
        </span>
      );
    case 'not_sent':
    default:
      return (
        <span
          id="badge-meta-notsent"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
        >
          <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
          No enviada
        </span>
      );
  }
};

interface HotmartStatusBadgeProps {
  status?: HotmartStatus;
}

export const HotmartStatusBadge: React.FC<HotmartStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'approved':
      return (
        <span
          id="badge-hotmart-approved"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
        >
          Aprobada
        </span>
      );
    case 'refunded':
      return (
        <span
          id="badge-hotmart-refunded"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
        >
          Reembolsada
        </span>
      );
    case 'chargeback':
      return (
        <span
          id="badge-hotmart-chargeback"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
        >
          Chargeback
        </span>
      );
    case 'canceled':
      return (
        <span
          id="badge-hotmart-canceled"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
        >
          Cancelada
        </span>
      );
    case 'pending':
      return (
        <span
          id="badge-hotmart-pending"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
        >
          Pendiente pago
        </span>
      );
    default:
      return (
        <span
          id="badge-hotmart-default"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
        >
          {status || 'Manual'}
        </span>
      );
  }
};
