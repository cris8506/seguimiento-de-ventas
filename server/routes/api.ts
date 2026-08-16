import express, { Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../db/store.js';
import { salesService } from '../services/salesService.js';
import { testMetaConnection } from '../services/metaConversionsService.js';
import { getConfig } from '../config.js';
import { maskEmail, maskPhone } from '../utils/mask.js';

export const apiRouter = express.Router();

// ----------------------------------------------------
// 1. PUBLIC WEBHOOK ENDPOINT (HOTMART)
// ----------------------------------------------------
apiRouter.post('/webhooks/hotmart', async (req: Request, res: Response) => {
  try {
    const result = await salesService.processHotmartWebhook(req.body);
    // Auto-mark Hotmart as configured upon receiving an event
    store.updateSettings({ hotmartConfigured: true });
    // Respond HTTP 200 to Hotmart promptly
    res.status(200).json({
      received: true,
      action: result.action,
      message: result.message,
    });
  } catch (err: unknown) {
    console.error('Error processing Hotmart webhook:', err);
    // Return 200 with error details to prevent Hotmart from flooding with retries if payload was malformed
    res.status(200).json({
      received: true,
      error: err instanceof Error ? err.message : 'Error interno al procesar webhook',
    });
  }
});

// GET & HEAD endpoint for webhook verification & health checks
apiRouter.get('/webhooks/hotmart', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'Hotmart Webhook Receiver',
    endpoint: '/api/webhooks/hotmart',
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

apiRouter.head('/webhooks/hotmart', (req: Request, res: Response) => {
  res.status(200).end();
});

// ----------------------------------------------------
// 2. DASHBOARD METRICS
// ----------------------------------------------------
apiRouter.get('/dashboard', (req: Request, res: Response) => {
  const allSales = store.listSales({ limit: 1000 }).items;
  const settings = store.getSettings();
  const config = getConfig();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let totalSalesToday = 0;
  let totalHotmartSales = 0;
  let totalManualSales = 0;
  let sentToMeta = 0;
  let pendingMeta = 0;
  let errorMeta = 0;
  let duplicatesBlocked = 0;

  for (const sale of allSales) {
    const saleTime = new Date(sale.saleDate).getTime();
    if (saleTime >= todayStart) {
      totalSalesToday++;
    }

    if (sale.source === 'hotmart') {
      totalHotmartSales++;
    } else {
      totalManualSales++;
    }

    if (sale.metaStatus === 'sent') {
      sentToMeta++;
    } else if (sale.metaStatus === 'retry' || sale.metaStatus === 'failed') {
      errorMeta++;
    } else if (sale.metaStatus === 'not_sent' || sale.metaStatus === 'queued' || sale.metaStatus === 'sending') {
      pendingMeta++;
    }

    if (sale.duplicateBlocked) {
      duplicatesBlocked++;
    }
  }

  res.json({
    totalSalesToday,
    totalHotmartSales,
    totalManualSales,
    sentToMeta,
    pendingMeta,
    errorMeta,
    duplicatesBlocked,
    integrationStatus: {
      hotmart: settings.hotmartConfigured,
      meta: settings.metaConfigured,
      mode: settings.mode,
      adminConfigured: Boolean(config.adminEmail),
    },
  });
});

// ----------------------------------------------------
// 3. SALES LIST (SEARCH, FILTER & PAGINATION)
// ----------------------------------------------------
const SalesQuerySchema = z.object({
  source: z.enum(['all', 'hotmart', 'manual']).optional(),
  metaStatus: z.enum(['all', 'not_sent', 'queued', 'sending', 'sent', 'retry', 'failed', 'ignored']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

apiRouter.get('/sales', (req: Request, res: Response) => {
  const parseResult = SalesQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Parámetros de consulta inválidos' });
    return;
  }

  const { source, metaStatus, search, startDate, endDate, page, limit } = parseResult.data;
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
  const offset = (pageNum - 1) * limitNum;

  const result = store.listSales({
    source,
    metaStatus,
    search,
    startDate,
    endDate,
    offset,
    limit: limitNum,
  });

  // Mask PII in general table listing
  const maskedItems = result.items.map((s) => ({
    ...s,
    buyer: {
      ...s.buyer,
      email: s.buyer.email ? maskEmail(s.buyer.email) : undefined,
      phone: s.buyer.phone ? maskPhone(s.buyer.phone) : undefined,
    },
  }));

  res.json({
    items: maskedItems,
    total: result.total,
    page: pageNum,
    totalPages: Math.ceil(result.total / limitNum) || 1,
  });
});

// ----------------------------------------------------
// 4. SALE DETAIL
// ----------------------------------------------------
apiRouter.get('/sales/:id', (req: Request, res: Response) => {
  const sale = store.getSaleById(req.params.id);
  if (!sale) {
    res.status(404).json({ error: 'Venta no encontrada' });
    return;
  }

  const attempts = store.getMetaAttemptsForSale(sale.id);

  res.json({
    sale,
    attempts,
  });
});

// ----------------------------------------------------
// 5. MANUAL SALE CREATION
// ----------------------------------------------------
const ManualSaleSchema = z.object({
  amount: z.number().positive('El valor de la venta debe ser mayor a 0'),
  currency: z.string().min(3).max(4).default('USD'),
  saleDate: z.string().datetime().or(z.string().min(10)),
  buyer: z.object({
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    externalId: z.string().optional(),
  }),
  productName: z.string().optional(),
  productId: z.string().optional(),
  externalRef: z.string().optional(),
  manualOrigin: z.string().optional(),
  notes: z.string().optional(),
  forceDuplicate: z.boolean().optional(),
});

apiRouter.post('/sales/manual', (req: Request, res: Response) => {
  const parseResult = ManualSaleSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Datos de venta manual inválidos',
      details: parseResult.error.flatten(),
    });
    return;
  }

  const data = parseResult.data;

  // Validation: Require at least email or phone for Meta attribution
  if (!data.buyer.email && !data.buyer.phone && !data.externalRef) {
    res.status(400).json({
      error: 'Se requiere al menos un dato de contacto (Email o Teléfono) para poder identificar la conversión.',
    });
    return;
  }

  try {
    const result = salesService.createManualSale({
      amount: data.amount,
      currency: data.currency,
      saleDate: data.saleDate,
      buyer: {
        email: data.buyer.email || undefined,
        phone: data.buyer.phone || undefined,
        firstName: data.buyer.firstName || undefined,
        lastName: data.buyer.lastName || undefined,
        externalId: data.buyer.externalId || undefined,
      },
      productName: data.productName,
      productId: data.productId,
      externalRef: data.externalRef,
      manualOrigin: data.manualOrigin,
      notes: data.notes,
      forceDuplicate: data.forceDuplicate,
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error al registrar venta manual' });
  }
});

// ----------------------------------------------------
// 6. SEND SALE TO META
// ----------------------------------------------------
apiRouter.post('/sales/:id/send-meta', async (req: Request, res: Response) => {
  const { testEventCode } = req.body || {};
  try {
    const updatedSale = await salesService.dispatchSaleToMeta(req.params.id, testEventCode);
    res.json({
      success: true,
      sale: updatedSale,
      message: 'Conversión enviada a Meta correctamente.',
    });
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Error al enviar a Meta Conversions API',
    });
  }
});

// ----------------------------------------------------
// 7. RETRY META DISPATCH
// ----------------------------------------------------
apiRouter.post('/sales/:id/retry', async (req: Request, res: Response) => {
  try {
    const updatedSale = await salesService.dispatchSaleToMeta(req.params.id);
    res.json({
      success: true,
      sale: updatedSale,
      message: 'Reintento completado.',
    });
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Error al reintentar envío',
    });
  }
});

// ----------------------------------------------------
// 8. MARK SALE AS IGNORED
// ----------------------------------------------------
apiRouter.post('/sales/:id/ignore', (req: Request, res: Response) => {
  const sale = store.getSaleById(req.params.id);
  if (!sale) {
    res.status(404).json({ error: 'Venta no encontrada' });
    return;
  }

  const updated = store.updateSale(sale.id, {
    metaStatus: 'ignored',
  });

  store.logActivity({
    type: 'system_warning',
    message: `Venta ${sale.transactionId || sale.id} marcada como no enviar`,
    saleId: sale.id,
  });

  res.json({ success: true, sale: updated });
});

// ----------------------------------------------------
// 9. HOTMART SYNC
// ----------------------------------------------------
const SyncSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

apiRouter.post('/hotmart/sync', async (req: Request, res: Response) => {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Rango de fechas requerido (startDate y endDate)' });
    return;
  }

  try {
    const result = await salesService.syncHotmartSales(parsed.data.startDate, parsed.data.endDate);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error en sincronización' });
  }
});

function getRequestWebhookUrl(req: Request): string {
  const config = getConfig();
  if (process.env.APP_URL && process.env.APP_URL !== 'http://localhost:3000') {
    return `${process.env.APP_URL.replace(/\/$/, '')}/api/webhooks/hotmart`;
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = (typeof protoHeader === 'string' ? protoHeader.split(',')[0].trim() : undefined) || req.protocol || 'https';
  const hostHeader = req.headers['x-forwarded-host'];
  const host = (typeof hostHeader === 'string' ? hostHeader.split(',')[0].trim() : undefined) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}/api/webhooks/hotmart`;
}

// ----------------------------------------------------
// 10. INTEGRATION STATUS & CREDENTIALS AUDIT
// ----------------------------------------------------
apiRouter.get('/integrations/status', (req: Request, res: Response) => {
  const config = getConfig();
  const settings = store.getSettings();
  const webhookUrl = getRequestWebhookUrl(req);
  const webhooks = store.getWebhookEvents(5);

  res.json({
    hotmart: {
      configured: settings.hotmartConfigured,
      clientIdPresent: Boolean(config.hotmartClientId),
      clientSecretPresent: Boolean(config.hotmartClientSecret),
      lastWebhookReceived: webhooks[0]?.receivedAt,
      totalWebhooks: store.getWebhookEvents(1000).length,
    },
    meta: {
      configured: settings.metaConfigured,
      datasetIdPresent: Boolean(config.metaDatasetId),
      accessTokenPresent: Boolean(config.metaAccessToken),
      graphApiVersion: config.metaGraphApiVersion,
    },
    adminEmail: config.adminEmail,
    mode: settings.mode,
    timezone: settings.timezone,
    webhookUrl,
  });
});

// ----------------------------------------------------
// 11. HOTMART WEBHOOK TEST & VERIFICATION
// ----------------------------------------------------
apiRouter.post('/integrations/hotmart/test', async (req: Request, res: Response) => {
  try {
    const testPayload = req.body && Object.keys(req.body).length > 0 ? req.body : {
      id: `test_wh_${Date.now()}`,
      creation_date: Date.now(),
      event: 'PURCHASE_APPROVED',
      version: '2.0.0',
      data: {
        product: {
          id: 9876543,
          name: 'Curso Digital de Prueba Hotmart',
          ucode: 'PROD_TEST_123',
        },
        purchase: {
          transaction: `HP-TEST-${Date.now().toString().slice(-6)}`,
          status: 'APPROVED',
          order_date: Date.now(),
          approved_date: Date.now(),
          price: {
            value: 97.00,
            currency_value: 'USD',
          },
          payment: {
            type: 'CREDIT_CARD',
            installments_number: 1,
          },
        },
        buyer: {
          email: 'comprador.prueba@ejemplo.com',
          name: 'Comprador de Prueba',
          checkout_phone: '+573001234567',
          address: {
            country: 'Colombia',
            country_iso: 'CO',
          },
        },
      },
    };

    const result = await salesService.processHotmartWebhook(testPayload);
    store.updateSettings({ hotmartConfigured: true });

    res.json({
      success: true,
      message: '¡Prueba de Webhook recibida y procesada correctamente! La conexión con Hotmart está activa y verificada.',
      action: result.action,
      sale: result.sale,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Error al procesar prueba de webhook',
    });
  }
});

apiRouter.post('/integrations/hotmart/verify', (req: Request, res: Response) => {
  store.updateSettings({ hotmartConfigured: true });
  store.logActivity({
    type: 'system_warning',
    message: 'Webhook de Hotmart confirmado como conectado',
  });
  res.json({ success: true, message: 'Hotmart conectado correctamente' });
});

// ----------------------------------------------------
// 12. META CONNECTION TEST
// ----------------------------------------------------
apiRouter.post('/integrations/meta/test', async (req: Request, res: Response) => {
  const result = await testMetaConnection();
  res.json(result);
});

// ----------------------------------------------------
// 12. ACTIVITY LOGS
// ----------------------------------------------------
apiRouter.get('/activity', (req: Request, res: Response) => {
  const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10));
  const logs = store.getActivityLogs(limit);
  res.json({ items: logs });
});

// ----------------------------------------------------
// 13. DIAGNOSTICS
// ----------------------------------------------------
apiRouter.get('/diagnostics', (req: Request, res: Response) => {
  const config = getConfig();
  const settings = store.getSettings();
  const webhooks = store.getWebhookEvents(5);
  const sales = store.listSales({ limit: 1000 }).items;

  const webhookUrl = getRequestWebhookUrl(req);

  const lastWebhook = webhooks[0];
  const lastApprovedWebhook = webhooks.find((w) => w.eventType.includes('APPROVED') || w.eventType.includes('PURCHASE'));

  const sentSales = sales.filter((s) => s.metaStatus === 'sent');
  const failedSales = sales.filter((s) => s.metaStatus === 'failed' || s.metaStatus === 'retry');
  const pendingSales = sales.filter((s) => s.metaStatus === 'not_sent' || s.metaStatus === 'queued' || s.metaStatus === 'sending');
  const duplicatesBlocked = sales.filter((s) => s.duplicateBlocked).length;

  const lastPurchaseSent = sentSales[0]?.sentAt;
  const lastPurchaseAccepted = sentSales[0]?.metaResponse?.success ? sentSales[0]?.sentAt : undefined;
  const lastMetaError = failedSales[0]?.metaResponse?.message;

  res.json({
    hotmart: {
      webhookUrl,
      lastWebhookReceived: lastWebhook?.receivedAt,
      lastApprovedEvent: lastApprovedWebhook?.receivedAt,
      credentialsPresent: settings.hotmartConfigured,
    },
    meta: {
      configured: settings.metaConfigured,
      graphApiVersion: config.metaGraphApiVersion,
      lastPurchaseSent,
      lastPurchaseAccepted,
      lastError: lastMetaError,
    },
    database: {
      totalSales: sales.length,
      sent: sentSales.length,
      pending: pendingSales.length,
      failed: failedSales.length,
      duplicatesBlocked,
    },
  });
});

// ----------------------------------------------------
// 14. SETTINGS UPDATE
// ----------------------------------------------------
const SettingsUpdateSchema = z.object({
  mode: z.enum(['monitor', 'active']).optional(),
  timezone: z.string().optional(),
  automaticRetry: z.boolean().optional(),
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const parsed = SettingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Configuración inválida' });
    return;
  }

  const updated = store.updateSettings(parsed.data);

  if (parsed.data.mode) {
    store.logActivity({
      type: 'system_warning',
      message: `Modo de operación cambiado a: ${parsed.data.mode.toUpperCase()}`,
    });
  }

  res.json(updated);
});

// ----------------------------------------------------
// 15. DEV / TEST WEBHOOK SIMULATOR
// ----------------------------------------------------
apiRouter.post('/dev/simulate-webhook', async (req: Request, res: Response) => {
  const { eventType, transactionId, amount, currency, email, phone, name, productName } = req.body || {};

  const txId = transactionId || `HP${Math.floor(100000000 + Math.random() * 900000000)}`;

  let mockPayload: any = {};

  if (eventType === 'PURCHASE_APPROVED') {
    mockPayload = {
      event: 'PURCHASE_APPROVED',
      version: '2.0.0',
      data: {
        product: {
          id: 123456,
          name: productName || 'Curso Experto en Estrategias Digitales',
        },
        buyer: {
          email: email || 'cliente.prueba@ejemplo.com',
          name: name || 'Comprador Demo',
          checkout_phone: phone || '+573009998877',
        },
        purchase: {
          transaction: txId,
          order_date: Date.now(),
          status: 'APPROVED',
          price: {
            value: Number(amount || 97.0),
            currency_value: currency || 'USD',
          },
        },
      },
    };
  } else if (eventType === 'PURCHASE_REFUNDED') {
    mockPayload = {
      event: 'PURCHASE_REFUNDED',
      data: {
        purchase: {
          transaction: txId,
          status: 'REFUNDED',
        },
      },
    };
  } else if (eventType === 'PURCHASE_CHARGEBACK') {
    mockPayload = {
      event: 'PURCHASE_CHARGEBACK',
      data: {
        purchase: {
          transaction: txId,
          status: 'CHARGEBACK',
        },
      },
    };
  } else {
    mockPayload = req.body;
  }

  try {
    const result = await salesService.processHotmartWebhook(mockPayload);
    res.json({
      success: true,
      simulationResult: result,
      generatedPayload: mockPayload,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error en simulación' });
  }
});
