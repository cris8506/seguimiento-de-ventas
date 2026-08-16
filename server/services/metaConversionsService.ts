import { Sale, MetaResponseData } from '../../src/types.js';
import { getConfig } from '../config.js';
import { normalizeEmail, normalizePhone, normalizeName, sha256 } from '../utils/hash.js';
import { store } from '../db/store.js';

export interface MetaDispatchResult {
  success: boolean;
  eventsReceived?: number;
  message: string;
  fbtraceId?: string;
  statusCode?: number;
  rawResponse?: Record<string, unknown>;
  errorType?: string;
}

export async function sendPurchaseToMeta(sale: Sale, testEventCode?: string): Promise<MetaDispatchResult> {
  const config = getConfig();
  const startedAt = new Date().toISOString();
  const attemptNumber = (sale.sendAttempts || 0) + 1;

  if (!config.metaAccessToken || !config.metaDatasetId) {
    const errorMsg = 'Meta Conversions API no está configurada (Falta META_ACCESS_TOKEN o META_DATASET_ID en Secrets).';
    const finishedAt = new Date().toISOString();

    store.recordMetaAttempt({
      id: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      saleId: sale.id,
      eventId: sale.metaEventId,
      attempt: attemptNumber,
      startedAt,
      finishedAt,
      success: false,
      errorType: 'MISSING_CONFIGURATION',
      responseSanitized: { message: errorMsg },
    });

    return {
      success: false,
      message: errorMsg,
      errorType: 'MISSING_CONFIGURATION',
    };
  }

  // 1. Construct user_data according to Meta CAPI specification
  const userData: Record<string, unknown> = {};

  const normEmail = normalizeEmail(sale.buyer?.email);
  if (normEmail) {
    userData.em = [sha256(normEmail)];
  }

  const normPhone = normalizePhone(sale.buyer?.phone);
  if (normPhone) {
    userData.ph = [sha256(normPhone)];
  }

  const normFn = normalizeName(sale.buyer?.firstName);
  if (normFn) {
    userData.fn = [sha256(normFn)];
  }

  const normLn = normalizeName(sale.buyer?.lastName);
  if (normLn) {
    userData.ln = [sha256(normLn)];
  }

  const externalId = sale.buyer?.externalId || sale.transactionId;
  if (externalId) {
    userData.external_id = [sha256(externalId.trim())];
  }

  // Calculate event_time in UNIX epoch seconds (must be integer)
  const eventTimeSeconds = Math.floor(new Date(sale.saleDate).getTime() / 1000);

  // 2. Construct official event payload
  const eventPayload: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: eventTimeSeconds,
    event_id: sale.metaEventId, // CRITICAL: deterministic ID for deduplication
    action_source: sale.source === 'hotmart' ? 'other' : 'other',
    user_data: userData,
    custom_data: {
      currency: (sale.currency || 'USD').toUpperCase().trim(),
      value: Number(Number(sale.amount).toFixed(2)),
      content_name: sale.productName || 'Producto Digital',
      content_type: 'product',
    },
  };

  const payload: Record<string, unknown> = {
    data: [eventPayload],
  };

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  const graphVersion = config.metaGraphApiVersion || 'v21.0';
  const url = `https://graph.facebook.com/${graphVersion}/${config.metaDatasetId}/events`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.metaAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const finishedAt = new Date().toISOString();
    const status = response.status;
    let json: Record<string, unknown> = {};

    try {
      json = await response.json();
    } catch {
      json = { raw: 'Non-JSON response received' };
    }

    if (response.ok) {
      const eventsReceived = typeof json.events_received === 'number' ? json.events_received : 1;
      const fbtraceId = typeof json.fbtrace_id === 'string' ? json.fbtrace_id : undefined;

      store.recordMetaAttempt({
        id: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        saleId: sale.id,
        eventId: sale.metaEventId,
        attempt: attemptNumber,
        startedAt,
        finishedAt,
        success: true,
        httpStatus: status,
        responseSanitized: {
          eventsReceived,
          fbtraceId,
          messages: json.messages || [],
        },
      });

      return {
        success: true,
        eventsReceived,
        fbtraceId,
        message: 'Evento Purchase enviado y recibido exitosamente por Meta Conversions API',
        statusCode: status,
        rawResponse: json,
      };
    } else {
      const errObj = (json.error as Record<string, unknown>) || {};
      const errorMessage = typeof errObj.message === 'string' ? errObj.message : `HTTP ${status}: Error al enviar a Meta`;
      const fbtraceId = typeof errObj.fbtrace_id === 'string' ? errObj.fbtrace_id : undefined;
      const errorType = typeof errObj.type === 'string' ? errObj.type : 'META_API_ERROR';

      store.recordMetaAttempt({
        id: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        saleId: sale.id,
        eventId: sale.metaEventId,
        attempt: attemptNumber,
        startedAt,
        finishedAt,
        success: false,
        httpStatus: status,
        errorType,
        responseSanitized: {
          message: errorMessage,
          code: errObj.code,
          error_subcode: errObj.error_subcode,
          fbtraceId,
        },
      });

      return {
        success: false,
        message: errorMessage,
        fbtraceId,
        statusCode: status,
        errorType,
        rawResponse: json,
      };
    }
  } catch (err: unknown) {
    const finishedAt = new Date().toISOString();
    const message = err instanceof Error ? err.message : 'Error de red al conectar con Meta Graph API';

    store.recordMetaAttempt({
      id: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      saleId: sale.id,
      eventId: sale.metaEventId,
      attempt: attemptNumber,
      startedAt,
      finishedAt,
      success: false,
      errorType: 'NETWORK_ERROR',
      responseSanitized: { message },
    });

    return {
      success: false,
      message,
      errorType: 'NETWORK_ERROR',
    };
  }
}

/**
 * Tests connection with Meta Graph API dataset without generating a charge
 */
export async function testMetaConnection(): Promise<{
  success: boolean;
  message: string;
  datasetName?: string;
  statusCode?: number;
}> {
  const config = getConfig();
  if (!config.metaAccessToken || !config.metaDatasetId) {
    return {
      success: false,
      message: 'Faltan credenciales de Meta (META_ACCESS_TOKEN o META_DATASET_ID en Secrets).',
    };
  }

  const graphVersion = config.metaGraphApiVersion || 'v21.0';
  // Query dataset basic metadata via Graph API
  const url = `https://graph.facebook.com/${graphVersion}/${config.metaDatasetId}?fields=id,name&access_token=${encodeURIComponent(config.metaAccessToken)}`;

  try {
    const res = await fetch(url);
    const json = (await res.json()) as Record<string, unknown>;

    if (res.ok && json.id) {
      return {
        success: true,
        message: `Conexión exitosa con el Dataset de Meta: ${json.name || json.id}`,
        datasetName: typeof json.name === 'string' ? json.name : String(json.id),
        statusCode: res.status,
      };
    } else {
      const errObj = (json.error as Record<string, unknown>) || {};
      const errMsg = typeof errObj.message === 'string' ? errObj.message : 'Error verificando el Dataset de Meta.';
      return {
        success: false,
        message: errMsg,
        statusCode: res.status,
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'No fue posible conectar con los servidores de Meta.',
    };
  }
}
