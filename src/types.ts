export type SaleSource = 'hotmart' | 'manual';

export type HotmartStatus =
  | 'approved'
  | 'refunded'
  | 'chargeback'
  | 'canceled'
  | 'pending'
  | 'other';

export type MetaStatus =
  | 'not_sent'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'retry'
  | 'failed'
  | 'ignored';

export type OperationMode = 'monitor' | 'active';

export interface BuyerInfo {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
}

export interface MetaResponseData {
  success?: boolean;
  eventsReceived?: number;
  message?: string;
  fbtraceId?: string;
  statusCode?: number;
}

export interface Sale {
  id: string;
  source: SaleSource;
  transactionId?: string;
  metaEventId: string;
  productId?: string;
  productName?: string;
  buyer: BuyerInfo;
  amount: number;
  currency: string;
  saleDate: string; // ISO string
  hotmartStatus?: HotmartStatus;
  metaStatus: MetaStatus;
  metaResponse?: MetaResponseData;
  sendAttempts: number;
  lastAttemptAt?: string;
  sentAt?: string;
  refundedAt?: string;
  chargebackAt?: string;
  processingLockUntil?: number; // timestamp ms for concurrency control
  notes?: string;
  manualOrigin?: string;
  duplicateBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: 'hotmart';
  eventType: string;
  transactionId?: string;
  receivedAt: string;
  processed: boolean;
  processingResult?: string;
  payloadSanitized: Record<string, unknown>;
  payloadHash?: string;
}

export interface MetaAttempt {
  id: string;
  saleId: string;
  eventId: string;
  attempt: number;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  httpStatus?: number;
  responseSanitized?: Record<string, unknown>;
  errorType?: string;
}

export interface AppSettings {
  mode: OperationMode;
  hotmartConfigured: boolean;
  metaConfigured: boolean;
  automaticRetry: boolean;
  timezone: string;
  updatedAt: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  type:
    | 'webhook_received'
    | 'sale_validated'
    | 'sale_imported'
    | 'meta_sent'
    | 'meta_accepted'
    | 'meta_rejected'
    | 'meta_retry'
    | 'refund_received'
    | 'chargeback_received'
    | 'manual_sale_created'
    | 'duplicate_blocked'
    | 'system_warning';
  message: string;
  details?: string;
  saleId?: string;
  metaEventId?: string;
  transactionId?: string;
}

export interface DashboardMetrics {
  totalSalesToday: number;
  totalHotmartSales: number;
  totalManualSales: number;
  sentToMeta: number;
  pendingMeta: number;
  errorMeta: number;
  duplicatesBlocked: number;
  integrationStatus: {
    hotmart: boolean;
    meta: boolean;
    mode: OperationMode;
    adminConfigured: boolean;
  };
}

export interface IntegrationStatus {
  hotmart: {
    configured: boolean;
    clientIdPresent: boolean;
    clientSecretPresent: boolean;
    lastSync?: string;
  };
  meta: {
    configured: boolean;
    datasetIdPresent: boolean;
    accessTokenPresent: boolean;
    graphApiVersion: string;
    lastSent?: string;
    lastAccepted?: string;
  };
  adminEmail: string;
  mode: OperationMode;
  webhookUrl: string;
}

export interface DiagnosticsData {
  hotmart: {
    webhookUrl: string;
    lastWebhookReceived?: string;
    lastApprovedEvent?: string;
    lastError?: string;
    credentialsPresent: boolean;
    lastSync?: string;
    syncStatus?: string;
  };
  meta: {
    configured: boolean;
    graphApiVersion: string;
    lastPurchaseSent?: string;
    lastPurchaseAccepted?: string;
    lastError?: string;
  };
  database: {
    totalSales: number;
    sent: number;
    pending: number;
    failed: number;
    duplicatesBlocked: number;
  };
}
