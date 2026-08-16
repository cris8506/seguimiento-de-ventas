import crypto from 'crypto';
import { Sale, AppSettings, HotmartStatus, MetaStatus } from '../../src/types.js';
import { store } from '../db/store.js';
import { hotmartService } from './hotmartService.js';
import { sendPurchaseToMeta } from './metaConversionsService.js';

export class SalesService {
  /**
   * Fundamental Rule 51: Centralized decision function for auto-sending conversions to Meta.
   */
  shouldSendPurchase(sale: Sale, settings: AppSettings): boolean {
    // 1. Must be in ACTIVE mode
    if (settings.mode !== 'active') {
      return false;
    }

    // 2. Must come from Hotmart approved purchase
    if (sale.source !== 'hotmart') {
      return false;
    }

    // 3. Must be APPROVED status (Never send for awaiting, refunded, chargeback, canceled)
    if (sale.hotmartStatus !== 'approved') {
      return false;
    }

    // 4. Meta must be configured
    if (!settings.metaConfigured) {
      return false;
    }

    // 5. Must NOT be already sent
    if (sale.metaStatus === 'sent') {
      return false;
    }

    // 6. Must not be currently locked in sending
    if (sale.metaStatus === 'sending' && sale.processingLockUntil && sale.processingLockUntil > Date.now()) {
      return false;
    }

    // 7. Must have minimal required buyer identification or value
    const hasBuyerData = Boolean(sale.buyer?.email || sale.buyer?.phone || sale.buyer?.externalId || sale.transactionId);
    if (!hasBuyerData || sale.amount <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Processes an incoming Hotmart Webhook with complete idempotency and state management.
   */
  async processHotmartWebhook(rawBody: any): Promise<{
    processed: boolean;
    action: string;
    sale?: Sale;
    message: string;
  }> {
    const parsed = hotmartService.parseWebhookPayload(rawBody);
    const settings = store.getSettings();

    // 1. Audit log raw webhook event
    const webhookEventId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(parsed.sanitizedPayload)).digest('hex');

    store.saveWebhookEvent({
      id: webhookEventId,
      provider: 'hotmart',
      eventType: parsed.eventType,
      transactionId: parsed.transactionId,
      receivedAt: new Date().toISOString(),
      processed: false,
      payloadSanitized: parsed.sanitizedPayload,
      payloadHash,
    });

    if (!parsed.isValid || !parsed.transactionId) {
      store.logActivity({
        type: 'system_warning',
        message: `Webhook de Hotmart rechazado: ${parsed.errorMessage || 'Transacción inválida'}`,
        details: JSON.stringify(parsed.sanitizedPayload),
      });

      return {
        processed: false,
        action: 'rejected_invalid',
        message: parsed.errorMessage || 'Payload no contiene transaction ID válido',
      };
    }

    const transactionId = parsed.transactionId;
    const existingSale = store.getSaleByTransactionId(transactionId);

    // 2. Handle Status Updates for Existing Transactions (Refund, Chargeback, Cancel)
    if (existingSale) {
      if (parsed.hotmartStatus === 'refunded') {
        const updated = store.updateSale(existingSale.id, {
          hotmartStatus: 'refunded',
          refundedAt: new Date().toISOString(),
        });
        store.logActivity({
          type: 'refund_received',
          message: `Reembolso registrado para transacción ${transactionId}`,
          transactionId,
          saleId: existingSale.id,
        });
        return {
          processed: true,
          action: 'updated_refund',
          sale: updated,
          message: `Venta ${transactionId} actualizada a reembolsada`,
        };
      }

      if (parsed.hotmartStatus === 'chargeback') {
        const updated = store.updateSale(existingSale.id, {
          hotmartStatus: 'chargeback',
          chargebackAt: new Date().toISOString(),
        });
        store.logActivity({
          type: 'chargeback_received',
          message: `Chargeback registrado para transacción ${transactionId}`,
          transactionId,
          saleId: existingSale.id,
        });
        return {
          processed: true,
          action: 'updated_chargeback',
          sale: updated,
          message: `Venta ${transactionId} actualizada a chargeback`,
        };
      }

      if (parsed.hotmartStatus === 'canceled') {
        const updated = store.updateSale(existingSale.id, {
          hotmartStatus: 'canceled',
        });
        return {
          processed: true,
          action: 'updated_canceled',
          sale: updated,
          message: `Venta ${transactionId} actualizada a cancelada`,
        };
      }

      // If existing sale is already approved and sent to Meta: IDEMPOTENCY SAFETY
      store.logActivity({
        type: 'duplicate_blocked',
        message: `Webhook duplicado ignorado para transacción ${transactionId} (Estado Meta actual: ${existingSale.metaStatus})`,
        transactionId,
        saleId: existingSale.id,
      });

      return {
        processed: true,
        action: 'idempotent_duplicate_ignored',
        sale: existingSale,
        message: `Transacción ${transactionId} ya existe en el sistema. No se duplicó.`,
      };
    }

    // 3. New Transaction Creation
    // Deterministic Meta Event ID: HOTMART_<transaction_id>
    const metaEventId = `HOTMART_${transactionId}`;

    const newSale: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      source: 'hotmart',
      transactionId,
      metaEventId,
      productId: parsed.productId,
      productName: parsed.productName || 'Producto Hotmart',
      buyer: parsed.buyer || {},
      amount: parsed.amount || 0,
      currency: (parsed.currency || 'USD').toUpperCase(),
      saleDate: parsed.orderDate || new Date().toISOString(),
      hotmartStatus: parsed.hotmartStatus || 'approved',
      metaStatus: 'not_sent',
      sendAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.createSale(newSale);

    store.logActivity({
      type: 'webhook_received',
      message: `Nueva venta registrada de Hotmart: ${transactionId} (${newSale.amount} ${newSale.currency})`,
      transactionId,
      saleId: newSale.id,
      metaEventId,
    });

    // 4. If MODO ACTIVO and should send, dispatch immediately
    if (this.shouldSendPurchase(newSale, settings)) {
      const dispatched = await this.dispatchSaleToMeta(newSale.id);
      return {
        processed: true,
        action: 'created_and_sent_to_meta',
        sale: dispatched,
        message: `Venta ${transactionId} registrada y enviada a Meta`,
      };
    }

    return {
      processed: true,
      action: 'created_in_monitor_mode',
      sale: newSale,
      message: `Venta ${transactionId} registrada en Modo Monitor (no enviada automáticamente)`,
    };
  }

  /**
   * Registers a manual sale with deterministic event ID and duplicate validation.
   */
  createManualSale(data: {
    amount: number;
    currency: string;
    saleDate: string;
    buyer: Sale['buyer'];
    productName?: string;
    productId?: string;
    externalRef?: string;
    manualOrigin?: string;
    notes?: string;
    forceDuplicate?: boolean;
  }): { sale: Sale; isDuplicate: boolean; duplicateWarnings: Sale[] } {
    // 1. Check for duplicates
    const potentialDuplicates = store.findPotentialManualDuplicates({
      email: data.buyer.email,
      amount: data.amount,
      saleDate: data.saleDate,
      externalRef: data.externalRef,
    });

    const isDuplicate = potentialDuplicates.length > 0;

    // 2. Generate deterministic Meta Event ID for manual sales: MANUAL_<uuid>
    const manualUuid = crypto.randomUUID();
    const metaEventId = `MANUAL_${manualUuid}`;

    const newSale: Sale = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      source: 'manual',
      transactionId: data.externalRef?.trim() || undefined,
      metaEventId,
      productId: data.productId?.trim() || 'MANUAL_SALE',
      productName: data.productName?.trim() || 'Venta Manual Directa',
      buyer: {
        email: data.buyer.email?.trim().toLowerCase() || undefined,
        phone: data.buyer.phone?.trim() || undefined,
        firstName: data.buyer.firstName?.trim() || undefined,
        lastName: data.buyer.lastName?.trim() || undefined,
        externalId: data.buyer.externalId?.trim() || undefined,
      },
      amount: Number(data.amount),
      currency: (data.currency || 'USD').toUpperCase().trim(),
      saleDate: data.saleDate,
      manualOrigin: data.manualOrigin || 'WhatsApp',
      notes: data.notes?.trim() || undefined,
      metaStatus: 'not_sent', // MANUAL SALES ARE SAVED FIRST, NEVER AUTO-SENT
      sendAttempts: 0,
      duplicateBlocked: isDuplicate && !data.forceDuplicate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.createSale(newSale);

    store.logActivity({
      type: 'manual_sale_created',
      message: `Venta manual creada: ${newSale.productName} (${newSale.amount} ${newSale.currency}) - Origen: ${newSale.manualOrigin}`,
      saleId: newSale.id,
      metaEventId,
    });

    return {
      sale: newSale,
      isDuplicate,
      duplicateWarnings: potentialDuplicates,
    };
  }

  /**
   * Dispatches a specific sale to Meta Conversions API with atomic lock and deduplication guard.
   */
  async dispatchSaleToMeta(saleId: string, testEventCode?: string): Promise<Sale> {
    const sale = store.getSaleById(saleId);
    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    // Protection: never send if already sent
    if (sale.metaStatus === 'sent') {
      throw new Error(`Esta venta ya fue enviada a Meta exitosamente en ${sale.sentAt || 'sesión anterior'}. No se enviará de nuevo.`);
    }

    // Concurrency Lock
    const locked = store.acquireSaleLock(saleId);
    if (!locked) {
      throw new Error('La venta está siendo procesada en este momento por otra solicitud.');
    }

    try {
      const result = await sendPurchaseToMeta(sale, testEventCode);

      if (result.success) {
        const now = new Date().toISOString();
        store.releaseSaleLock(saleId, 'sent', {
          sentAt: now,
          lastAttemptAt: now,
          sendAttempts: (sale.sendAttempts || 0) + 1,
          metaResponse: {
            success: true,
            eventsReceived: result.eventsReceived || 1,
            message: result.message,
            fbtraceId: result.fbtraceId,
            statusCode: result.statusCode,
          },
        });

        store.logActivity({
          type: 'meta_accepted',
          message: `Meta CAPI aceptó conversión Purchase para evento ${sale.metaEventId}`,
          saleId: sale.id,
          metaEventId: sale.metaEventId,
          transactionId: sale.transactionId,
        });
      } else {
        const now = new Date().toISOString();
        const nextAttempts = (sale.sendAttempts || 0) + 1;
        const newStatus: MetaStatus = nextAttempts >= 4 ? 'failed' : 'retry';

        store.releaseSaleLock(saleId, newStatus, {
          lastAttemptAt: now,
          sendAttempts: nextAttempts,
          metaResponse: {
            success: false,
            message: result.message,
            fbtraceId: result.fbtraceId,
            statusCode: result.statusCode,
          },
        });

        store.logActivity({
          type: 'meta_rejected',
          message: `Meta CAPI rechazó conversión (${result.message}) - Estado: ${newStatus}`,
          saleId: sale.id,
          metaEventId: sale.metaEventId,
          details: result.message,
        });
      }

      return store.getSaleById(saleId)!;
    } catch (err: unknown) {
      const now = new Date().toISOString();
      const message = err instanceof Error ? err.message : 'Error inesperado al enviar a Meta';
      store.releaseSaleLock(saleId, 'failed', {
        lastAttemptAt: now,
        sendAttempts: (sale.sendAttempts || 0) + 1,
        metaResponse: {
          success: false,
          message,
        },
      });
      throw err;
    }
  }

  /**
   * Syncs sales from Hotmart API within a date range
   */
  async syncHotmartSales(startDate: string, endDate: string): Promise<{
    totalConsulted: number;
    existingCount: number;
    newFoundCount: number;
    importedCount: number;
    errorsCount: number;
    importedSales: Sale[];
    message: string;
  }> {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const settings = store.getSettings();

    const { salesFound, error } = await hotmartService.syncSales(startMs, endMs);
    if (error) {
      return {
        totalConsulted: 0,
        existingCount: 0,
        newFoundCount: 0,
        importedCount: 0,
        errorsCount: 1,
        importedSales: [],
        message: error,
      };
    }

    let existingCount = 0;
    let importedCount = 0;
    let errorsCount = 0;
    const importedSales: Sale[] = [];

    for (const item of salesFound) {
      if (!item.transactionId) continue;
      const existing = store.getSaleByTransactionId(item.transactionId);
      if (existing) {
        existingCount++;
        continue;
      }

      try {
        const metaEventId = `HOTMART_${item.transactionId}`;
        const newSale: Sale = {
          id: `sale_sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          source: 'hotmart',
          transactionId: item.transactionId,
          metaEventId,
          productId: item.productId,
          productName: item.productName || 'Producto Hotmart',
          buyer: item.buyer,
          amount: item.amount,
          currency: item.currency,
          saleDate: item.saleDate,
          hotmartStatus: 'approved',
          metaStatus: 'not_sent',
          sendAttempts: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        store.createSale(newSale);
        importedCount++;
        importedSales.push(newSale);

        store.logActivity({
          type: 'sale_imported',
          message: `Venta importada mediante sincronización Hotmart: ${item.transactionId}`,
          saleId: newSale.id,
          transactionId: item.transactionId,
          metaEventId,
        });

        // If in active mode, send automatically if applicable
        if (this.shouldSendPurchase(newSale, settings)) {
          await this.dispatchSaleToMeta(newSale.id);
        }
      } catch (e) {
        errorsCount++;
      }
    }

    return {
      totalConsulted: salesFound.length,
      existingCount,
      newFoundCount: salesFound.length - existingCount,
      importedCount,
      errorsCount,
      importedSales,
      message: `Sincronización completada: ${salesFound.length} consultadas, ${existingCount} ya existentes, ${importedCount} importadas.`,
    };
  }
}

export const salesService = new SalesService();
