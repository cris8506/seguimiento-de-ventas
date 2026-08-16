import { getConfig } from '../config.js';
import { HotmartStatus, BuyerInfo } from '../../src/types.js';

export interface HotmartWebhookParseResult {
  isValid: boolean;
  eventType: string;
  transactionId?: string;
  productId?: string;
  productName?: string;
  amount?: number;
  currency?: string;
  orderDate?: string;
  hotmartStatus?: HotmartStatus;
  buyer?: BuyerInfo;
  rawStatus?: string;
  errorMessage?: string;
  sanitizedPayload: Record<string, unknown>;
}

export interface HotmartSyncResult {
  success: boolean;
  message: string;
  totalConsulted: number;
  existingCount: number;
  newFoundCount: number;
  importedCount: number;
  errorsCount: number;
}

class HotmartService {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Retrieves OAuth 2.0 access token from Hotmart Developers API
   */
  async getAccessToken(): Promise<string | null> {
    const config = getConfig();
    if (!config.hotmartClientId || !config.hotmartClientSecret) {
      return null;
    }

    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    try {
      const authHeader = Buffer.from(`${config.hotmartClientId}:${config.hotmartClientSecret}`).toString('base64');
      const tokenUrl = 'https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials';

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Hotmart OAuth token request failed: HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as { access_token?: string; expires_in?: number };
      if (data.access_token) {
        this.cachedToken = data.access_token;
        const expiresInSec = data.expires_in || 3600;
        this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
        return this.cachedToken;
      }
      return null;
    } catch (err) {
      console.warn('Error fetching Hotmart OAuth token:', err);
      return null;
    }
  }

  /**
   * Parses and sanitizes incoming webhook payloads from Hotmart (both Webhook 2.0 and 1.0 standards)
   */
  parseWebhookPayload(body: any): HotmartWebhookParseResult {
    if (!body || typeof body !== 'object') {
      return {
        isValid: false,
        eventType: 'UNKNOWN',
        errorMessage: 'Payload vacío o inválido',
        sanitizedPayload: {},
      };
    }

    // Sanitize payload to strip sensitive passwords / documents
    const sanitized = this.sanitizePayload(body);

    // Check for Hotmart Webhook 2.0 standard
    if (body.event && body.data) {
      const eventType = String(body.event).toUpperCase().trim();
      const purchase = body.data.purchase || {};
      const product = body.data.product || {};
      const buyer = body.data.buyer || {};

      const transactionId = purchase.transaction || purchase.order_date_id || body.data.transaction;
      const rawStatus = (purchase.status || purchase.order_status || '').toUpperCase();
      const amount = Number(purchase.price?.value || purchase.original_offer_price?.value || purchase.price || 0);
      const currency = purchase.price?.currency_value || purchase.original_offer_price?.currency_value || 'USD';

      let orderDate: string;
      if (purchase.order_date) {
        const d = typeof purchase.order_date === 'number' ? new Date(purchase.order_date) : new Date(purchase.order_date);
        orderDate = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      } else if (purchase.approved_date) {
        const d = new Date(purchase.approved_date);
        orderDate = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      } else {
        orderDate = new Date().toISOString();
      }

      let hotmartStatus: HotmartStatus = 'other';
      if (eventType === 'PURCHASE_APPROVED' || rawStatus === 'APPROVED' || rawStatus === 'COMPLETE') {
        hotmartStatus = 'approved';
      } else if (eventType === 'PURCHASE_REFUNDED' || rawStatus === 'REFUNDED') {
        hotmartStatus = 'refunded';
      } else if (eventType === 'PURCHASE_CHARGEBACK' || rawStatus === 'CHARGEBACK' || rawStatus === 'DISPUTE') {
        hotmartStatus = 'chargeback';
      } else if (eventType === 'PURCHASE_CANCELED' || rawStatus === 'CANCELED') {
        hotmartStatus = 'canceled';
      } else if (rawStatus === 'WAITING_PAYMENT' || rawStatus === 'UNDER_ANALYSIS') {
        hotmartStatus = 'pending';
      }

      const buyerInfo: BuyerInfo = {
        email: buyer.email ? String(buyer.email).trim().toLowerCase() : undefined,
        phone: buyer.checkout_phone || buyer.phone || undefined,
        firstName: buyer.name ? String(buyer.name).split(' ')[0] : undefined,
        lastName: buyer.name ? String(buyer.name).split(' ').slice(1).join(' ') : undefined,
        externalId: buyer.ucode || undefined,
      };

      return {
        isValid: Boolean(transactionId),
        eventType,
        transactionId: transactionId ? String(transactionId).trim() : undefined,
        productId: product.id ? String(product.id) : undefined,
        productName: product.name ? String(product.name) : 'Producto Hotmart',
        amount,
        currency,
        orderDate,
        hotmartStatus,
        buyer: buyerInfo,
        rawStatus,
        sanitizedPayload: sanitized,
      };
    }

    // Support for 1.0 or flat webhook format
    const transactionId = body.transaction || body.transaction_id || body.hottok_transaction;
    const rawStatus = String(body.status || body.event || '').toUpperCase();
    const eventType = body.event ? String(body.event).toUpperCase() : rawStatus || 'PURCHASE';

    let hotmartStatus: HotmartStatus = 'other';
    if (rawStatus === 'APPROVED' || rawStatus === 'COMPLETED' || rawStatus === 'PURCHASE_APPROVED') {
      hotmartStatus = 'approved';
    } else if (rawStatus === 'REFUNDED' || rawStatus === 'PURCHASE_REFUNDED') {
      hotmartStatus = 'refunded';
    } else if (rawStatus === 'CHARGEBACK' || rawStatus === 'DISPUTE' || rawStatus === 'PURCHASE_CHARGEBACK') {
      hotmartStatus = 'chargeback';
    } else if (rawStatus === 'CANCELED' || rawStatus === 'PURCHASE_CANCELED') {
      hotmartStatus = 'canceled';
    } else if (rawStatus === 'WAITING_PAYMENT' || rawStatus === 'PRINTED_BILLET') {
      hotmartStatus = 'pending';
    }

    const amount = Number(body.price || body.prod_price || body.total || 0);
    const currency = body.currency || body.currency_code || 'USD';
    const orderDate = body.order_date ? new Date(body.order_date).toISOString() : new Date().toISOString();

    const buyerInfo: BuyerInfo = {
      email: body.email ? String(body.email).trim().toLowerCase() : undefined,
      phone: body.phone || body.phone_number || body.phone_checkout || undefined,
      firstName: body.first_name || (body.name ? String(body.name).split(' ')[0] : undefined),
      lastName: body.last_name || (body.name ? String(body.name).split(' ').slice(1).join(' ') : undefined),
    };

    return {
      isValid: Boolean(transactionId),
      eventType,
      transactionId: transactionId ? String(transactionId).trim() : undefined,
      productId: body.prod ? String(body.prod) : body.product_id ? String(body.product_id) : undefined,
      productName: body.prod_name || body.product_name || 'Producto Hotmart',
      amount,
      currency,
      orderDate,
      hotmartStatus,
      buyer: buyerInfo,
      rawStatus,
      sanitizedPayload: sanitized,
    };
  }

  /**
   * Sanitizes payload by stripping sensitive banking / password / secret fields
   */
  private sanitizePayload(data: Record<string, any>): Record<string, any> {
    const forbiddenKeys = ['password', 'secret', 'token', 'card', 'cvv', 'document', 'cpf', 'cnpj', 'bank_account'];
    const clean: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (forbiddenKeys.some((f) => key.toLowerCase().includes(f))) {
        continue; // skip sensitive data
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        clean[key] = this.sanitizePayload(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Validates a transaction directly against Hotmart Developers API if configured
   */
  async validateTransactionWithApi(transactionId: string): Promise<{
    verified: boolean;
    data?: any;
    error?: string;
  }> {
    const token = await this.getAccessToken();
    if (!token) {
      // If credentials not configured, we do not fail the flow completely,
      // but note that validation API is skipped
      return { verified: false, error: 'Hotmart API no configurada en variables de entorno' };
    }

    try {
      const url = `https://developers.hotmart.com/payments/api/v1/sales/history?transaction=${encodeURIComponent(transactionId)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        return { verified: false, error: `Hotmart API respondió con HTTP ${res.status}` };
      }

      const json = (await res.json()) as { items?: any[] };
      if (json.items && json.items.length > 0) {
        const item = json.items[0];
        return { verified: true, data: item };
      }
      return { verified: false, error: 'Transacción no encontrada en el historial de Hotmart' };
    } catch (err) {
      return { verified: false, error: err instanceof Error ? err.message : 'Error al conectar con Hotmart API' };
    }
  }

  /**
   * Syncs sales within a date range from Hotmart Payments API
   */
  async syncSales(startDateMs: number, endDateMs: number): Promise<{
    salesFound: Array<{
      transactionId: string;
      productId?: string;
      productName?: string;
      buyer: BuyerInfo;
      amount: number;
      currency: string;
      saleDate: string;
      status: HotmartStatus;
    }>;
    error?: string;
  }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { salesFound: [], error: 'Credenciales de Hotmart no configuradas en Secrets (HOTMART_CLIENT_ID / HOTMART_CLIENT_SECRET).' };
    }

    try {
      const url = `https://developers.hotmart.com/payments/api/v1/sales/history?start_date=${startDateMs}&end_date=${endDateMs}&transaction_status=APPROVED&max_results=100`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        return { salesFound: [], error: `Hotmart API retornó HTTP ${res.status}` };
      }

      const json = (await res.json()) as { items?: any[] };
      const items = json.items || [];
      const salesFound = items.map((item: any) => {
        const purchase = item.purchase || {};
        const product = item.product || {};
        const buyer = item.buyer || {};

        const transactionId = purchase.transaction || item.transaction;
        const amount = Number(purchase.price?.value || item.price || 0);
        const currency = purchase.price?.currency_value || item.currency || 'USD';
        const saleDate = purchase.order_date
          ? new Date(purchase.order_date).toISOString()
          : new Date().toISOString();

        return {
          transactionId,
          productId: product.id ? String(product.id) : undefined,
          productName: product.name || 'Producto Hotmart',
          buyer: {
            email: buyer.email ? String(buyer.email).trim().toLowerCase() : undefined,
            phone: buyer.phone || buyer.checkout_phone || undefined,
            firstName: buyer.name ? String(buyer.name).split(' ')[0] : undefined,
            lastName: buyer.name ? String(buyer.name).split(' ').slice(1).join(' ') : undefined,
          },
          amount,
          currency,
          saleDate,
          status: 'approved' as HotmartStatus,
        };
      });

      return { salesFound };
    } catch (err) {
      return { salesFound: [], error: err instanceof Error ? err.message : 'Error durante sincronización con Hotmart' };
    }
  }
}

export const hotmartService = new HotmartService();
