/**
 * API Client helper that resolves the backend base URL.
 * When running in Cloud Run / local dev, it uses relative '/api'.
 * When running on a static hosting provider (e.g. Vercel) without serverless functions,
 * it points to the live Cloud Run backend server.
 */

const DEFAULT_CLOUD_RUN_URL = 'https://ais-pre-r4l5kat4iomj5vyl4hvkey-455988317613.us-east1.run.app';

export function getApiBaseUrl(): string {
  // If explicitly configured in Vite env
  const envBackend = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_BACKEND_URL;
  if (envBackend) {
    return envBackend.replace(/\/$/, '');
  }

  // If running in browser on a third-party static host like vercel.app or netlify.app
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (
      hostname.includes('vercel.app') ||
      hostname.includes('netlify.app') ||
      hostname.includes('github.io')
    ) {
      return DEFAULT_CLOUD_RUN_URL;
    }
  }

  // Default: relative path for Cloud Run and local dev
  return '';
}

export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = base ? `${base}${cleanEndpoint}` : cleanEndpoint;
  return fetch(fullUrl, options);
}
