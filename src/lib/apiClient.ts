/**
 * Standard same-origin API client helper.
 * Uses relative paths (/api/...) ensuring full compatibility with Vite dev proxy and Cloud Run backend.
 */

export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const res = await fetch(cleanEndpoint, options);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')) {
      throw new Error('No fue posible conectar con el backend. Verifica que el servidor esté activo.');
    }
    throw err;
  }
}


