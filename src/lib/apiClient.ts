/**
 * API Client helper that resolves the backend base URL.
 */

export const OFFICIAL_APP_URL = 'https://ais-dev-r4l5kat4iomj5vyl4hvkey-455988317613.us-east1.run.app';
export const SHARED_APP_URL = 'https://ais-pre-r4l5kat4iomj5vyl4hvkey-455988317613.us-east1.run.app';

export function isExternalStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app') ||
    hostname.includes('github.io')
  );
}

export function getApiBaseUrl(): string {
  const envBackend = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_BACKEND_URL;
  if (envBackend) {
    return envBackend.replace(/\/$/, '');
  }
  return '';
}

export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = base ? `${base}${cleanEndpoint}` : cleanEndpoint;
  
  try {
    const res = await fetch(fullUrl, options);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      if (isExternalStaticHost()) {
        throw new Error(
          'No se pudo conectar con el servidor backend desde Vercel (el backend Express completo corre en Cloud Run). Abre la app en el servidor oficial para funcionalidad completa.'
        );
      }
    }
    throw err;
  }
}

