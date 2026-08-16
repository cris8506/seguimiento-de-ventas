import fs from 'fs';
import path from 'path';
import { Sale, WebhookEvent, MetaAttempt, AppSettings, ActivityLogItem, OperationMode } from '../../src/types.js';
import { getConfig } from '../config.js';

interface DatabaseSchema {
  sales: Record<string, Sale>;
  webhook_events: Record<string, WebhookEvent>;
  meta_attempts: Record<string, MetaAttempt>;
  activity_logs: ActivityLogItem[];
  settings: AppSettings;
}

const DB_FILE_PATH = path.join(process.cwd(), '.data_store.json');

class DataStore {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadInitialData();
    if (getConfig().devUseMockData && Object.keys(this.data.sales).length === 0) {
      this.seedMockData();
    }
  }

  private loadInitialData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read existing local data store, initializing fresh state:', err);
    }

    return {
      sales: {},
      webhook_events: {},
      meta_attempts: {},
      activity_logs: [],
      settings: {
        mode: 'monitor',
        hotmartConfigured: false,
        metaConfigured: false,
        automaticRetry: true,
        timezone: 'America/Bogota',
        updatedAt: new Date().toISOString(),
      },
    };
  }

  private persist() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Failed to write database file:', err);
      }
    }, 100);
  }

  // --- SETTINGS ---
  getSettings(): AppSettings {
    const config = getConfig();
    const hasWebhookEvents = Object.keys(this.data.webhook_events).length > 0;
    const hasHotmartSales = Object.values(this.data.sales).some((s) => s.source === 'hotmart');
    const hasOAuthCreds = Boolean(config.hotmartClientId && config.hotmartClientSecret);
    const hotmartConfigured = Boolean(this.data.settings.hotmartConfigured || hasWebhookEvents || hasHotmartSales || hasOAuthCreds);
    const metaConfigured = Boolean(config.metaAccessToken && config.metaDatasetId);

    return {
      ...this.data.settings,
      hotmartConfigured,
      metaConfigured,
    };
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.data.settings,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.getSettings();
  }

  // --- SALES ---
  getSaleById(id: string): Sale | undefined {
    return this.data.sales[id];
  }

  getSaleByTransactionId(transactionId: string): Sale | undefined {
    if (!transactionId) return undefined;
    return Object.values(this.data.sales).find((s) => s.transactionId === transactionId);
  }

  getSaleByMetaEventId(metaEventId: string): Sale | undefined {
    if (!metaEventId) return undefined;
    return Object.values(this.data.sales).find((s) => s.metaEventId === metaEventId);
  }

  listSales(filter?: {
    source?: string;
    metaStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { items: Sale[]; total: number } {
    let list = Object.values(this.data.sales);

    // Sort by saleDate / createdAt descending (newest first)
    list.sort((a, b) => new Date(b.saleDate || b.createdAt).getTime() - new Date(a.saleDate || a.createdAt).getTime());

    if (filter?.source && filter.source !== 'all') {
      list = list.filter((s) => s.source === filter.source);
    }

    if (filter?.metaStatus && filter.metaStatus !== 'all') {
      list = list.filter((s) => s.metaStatus === filter.metaStatus);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          (s.transactionId && s.transactionId.toLowerCase().includes(q)) ||
          (s.buyer.email && s.buyer.email.toLowerCase().includes(q)) ||
          (s.productName && s.productName.toLowerCase().includes(q)) ||
          (s.metaEventId && s.metaEventId.toLowerCase().includes(q))
      );
    }

    if (filter?.startDate) {
      const start = new Date(filter.startDate).getTime();
      list = list.filter((s) => new Date(s.saleDate).getTime() >= start);
    }

    if (filter?.endDate) {
      const end = new Date(filter.endDate).getTime();
      list = list.filter((s) => new Date(s.saleDate).getTime() <= end);
    }

    const total = list.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    return {
      items: list.slice(offset, offset + limit),
      total,
    };
  }

  createSale(sale: Sale): Sale {
    this.data.sales[sale.id] = sale;
    this.persist();
    return sale;
  }

  updateSale(id: string, partial: Partial<Sale>): Sale | undefined {
    const existing = this.data.sales[id];
    if (!existing) return undefined;

    const updated: Sale = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.data.sales[id] = updated;
    this.persist();
    return updated;
  }

  /**
   * Concurrency Lock: Atomically acquires lock for dispatching to Meta
   * Prevents race conditions and double sending.
   */
  acquireSaleLock(id: string, lockDurationMs = 30000): boolean {
    const sale = this.data.sales[id];
    if (!sale) return false;

    const now = Date.now();
    // If currently locked and lock has not expired yet
    if (sale.metaStatus === 'sending' && sale.processingLockUntil && sale.processingLockUntil > now) {
      return false;
    }

    // Acquire lock
    this.data.sales[id] = {
      ...sale,
      metaStatus: 'sending',
      processingLockUntil: now + lockDurationMs,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return true;
  }

  releaseSaleLock(id: string, newStatus: Sale['metaStatus'], partialUpdates?: Partial<Sale>) {
    const sale = this.data.sales[id];
    if (!sale) return;

    this.data.sales[id] = {
      ...sale,
      ...partialUpdates,
      metaStatus: newStatus,
      processingLockUntil: undefined,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
  }

  // --- DUPLICATE DETECTION FOR MANUAL SALES ---
  findPotentialManualDuplicates(criteria: {
    email?: string;
    amount: number;
    saleDate: string;
    externalRef?: string;
    excludeId?: string;
  }): Sale[] {
    const targetDate = new Date(criteria.saleDate).getTime();
    const timeWindowMs = 24 * 60 * 60 * 1000; // 24 hours window

    return Object.values(this.data.sales).filter((s) => {
      if (criteria.excludeId && s.id === criteria.excludeId) return false;

      // 1. Identical external reference / transactionId
      if (criteria.externalRef && s.transactionId && s.transactionId.toLowerCase() === criteria.externalRef.toLowerCase()) {
        return true;
      }

      // 2. Matching email AND matching amount within 24h
      if (criteria.email && s.buyer.email && s.buyer.email.toLowerCase() === criteria.email.toLowerCase()) {
        if (Math.abs(s.amount - criteria.amount) < 0.01) {
          const sDate = new Date(s.saleDate).getTime();
          if (Math.abs(sDate - targetDate) <= timeWindowMs) {
            return true;
          }
        }
      }

      return false;
    });
  }

  // --- WEBHOOK EVENTS ---
  saveWebhookEvent(event: WebhookEvent): WebhookEvent {
    this.data.webhook_events[event.id] = event;
    this.data.settings.hotmartConfigured = true;
    this.persist();
    return event;
  }

  getWebhookEvents(limit = 20): WebhookEvent[] {
    return Object.values(this.data.webhook_events)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit);
  }

  // --- META ATTEMPTS ---
  recordMetaAttempt(attempt: MetaAttempt) {
    this.data.meta_attempts[attempt.id] = attempt;
    this.persist();
  }

  getMetaAttemptsForSale(saleId: string): MetaAttempt[] {
    return Object.values(this.data.meta_attempts)
      .filter((a) => a.saleId === saleId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  // --- ACTIVITY LOGS ---
  logActivity(item: Omit<ActivityLogItem, 'id' | 'timestamp'>) {
    const entry: ActivityLogItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...item,
    };
    this.data.activity_logs.unshift(entry);
    // Keep max 200 activity logs
    if (this.data.activity_logs.length > 200) {
      this.data.activity_logs = this.data.activity_logs.slice(0, 200);
    }
    this.persist();
    return entry;
  }

  getActivityLogs(limit = 100): ActivityLogItem[] {
    return this.data.activity_logs.slice(0, limit);
  }

  // --- SEED MOCK DATA ---
  private seedMockData() {
    const now = Date.now();
    const demoSales: Sale[] = [
      {
        id: 'sale_demo_1',
        source: 'hotmart',
        transactionId: 'HP192837465',
        metaEventId: 'HOTMART_HP192837465',
        productId: 'PROD_001',
        productName: 'Masterclass en Marketing Digital 2026',
        buyer: {
          email: 'carlos.mendoza@example.com',
          phone: '+573001234567',
          firstName: 'Carlos',
          lastName: 'Mendoza',
        },
        amount: 97.0,
        currency: 'USD',
        saleDate: new Date(now - 1000 * 60 * 45).toISOString(), // 45 mins ago
        hotmartStatus: 'approved',
        metaStatus: 'sent',
        metaResponse: {
          success: true,
          eventsReceived: 1,
          message: 'Events received successfully',
          fbtraceId: 'E9F8A1B2C3D4',
          statusCode: 200,
        },
        sendAttempts: 1,
        lastAttemptAt: new Date(now - 1000 * 60 * 44).toISOString(),
        sentAt: new Date(now - 1000 * 60 * 44).toISOString(),
        createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 44).toISOString(),
      },
      {
        id: 'sale_demo_2',
        source: 'hotmart',
        transactionId: 'HP847362910',
        metaEventId: 'HOTMART_HP847362910',
        productId: 'PROD_002',
        productName: 'Curso Avanzado de Tráfico Pago y CAPI',
        buyer: {
          email: 'mariana.silva@example.com',
          phone: '+573109876543',
          firstName: 'Mariana',
          lastName: 'Silva',
        },
        amount: 147.0,
        currency: 'USD',
        saleDate: new Date(now - 1000 * 60 * 120).toISOString(),
        hotmartStatus: 'approved',
        metaStatus: 'not_sent',
        sendAttempts: 0,
        createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 120).toISOString(),
      },
      {
        id: 'sale_demo_3',
        source: 'manual',
        transactionId: 'REF_WSP_0912',
        metaEventId: 'MANUAL_3847291a-7b3f-42a1-8d21-998877665544',
        productId: 'MANUAL_01',
        productName: 'Asesoría 1 a 1 Estrategia de Conversión',
        buyer: {
          email: 'andres.gomez@example.com',
          phone: '+525512345678',
          firstName: 'Andrés',
          lastName: 'Gómez',
        },
        amount: 250.0,
        currency: 'USD',
        saleDate: new Date(now - 1000 * 60 * 300).toISOString(),
        manualOrigin: 'WhatsApp',
        notes: 'Venta cerrada por llamada de WhatsApp, pagado por transferencia bancaria.',
        metaStatus: 'sent',
        metaResponse: {
          success: true,
          eventsReceived: 1,
          message: 'Events received successfully',
          fbtraceId: 'A7B8C9D0E1F2',
          statusCode: 200,
        },
        sendAttempts: 1,
        sentAt: new Date(now - 1000 * 60 * 290).toISOString(),
        createdAt: new Date(now - 1000 * 60 * 300).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 290).toISOString(),
      },
      {
        id: 'sale_demo_4',
        source: 'hotmart',
        transactionId: 'HP556677889',
        metaEventId: 'HOTMART_HP556677889',
        productId: 'PROD_001',
        productName: 'Masterclass en Marketing Digital 2026',
        buyer: {
          email: 'lucia.torres@example.com',
          phone: '+5491122334455',
          firstName: 'Lucía',
          lastName: 'Torres',
        },
        amount: 97.0,
        currency: 'USD',
        saleDate: new Date(now - 1000 * 60 * 600).toISOString(),
        hotmartStatus: 'refunded',
        refundedAt: new Date(now - 1000 * 60 * 180).toISOString(),
        metaStatus: 'sent',
        metaResponse: {
          success: true,
          eventsReceived: 1,
          message: 'Events received successfully',
          fbtraceId: 'C3D4E5F6A7B8',
          statusCode: 200,
        },
        sendAttempts: 1,
        sentAt: new Date(now - 1000 * 60 * 595).toISOString(),
        createdAt: new Date(now - 1000 * 60 * 600).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 180).toISOString(),
      },
    ];

    demoSales.forEach((s) => {
      this.data.sales[s.id] = s;
    });

    this.logActivity({
      type: 'webhook_received',
      message: 'Webhook recibido de Hotmart para transacción HP192837465',
      transactionId: 'HP192837465',
    });
    this.logActivity({
      type: 'meta_accepted',
      message: 'Meta CAPI aceptó evento Purchase (HOTMART_HP192837465)',
      metaEventId: 'HOTMART_HP192837465',
    });
    this.logActivity({
      type: 'manual_sale_created',
      message: 'Venta manual registrada: Asesoría 1 a 1 ($250 USD)',
      metaEventId: 'MANUAL_3847291a-7b3f-42a1-8d21-998877665544',
    });
    this.logActivity({
      type: 'refund_received',
      message: 'Reembolso procesado para transacción HP556677889 (estado actualizado a refunded)',
      transactionId: 'HP556677889',
    });

    this.persist();
  }
}

export const store = new DataStore();
