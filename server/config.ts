import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  adminEmail: string;
  metaAccessToken?: string;
  metaDatasetId?: string;
  metaGraphApiVersion: string;
  hotmartClientId?: string;
  hotmartClientSecret?: string;
  appUrl: string;
  devUseMockData: boolean;
  isProduction: boolean;
}

export function getConfig(): ServerConfig {
  return {
    port: 3000,
    adminEmail: (process.env.ADMIN_EMAIL || 'mis.cursos.digitales1@gmail.com').trim().toLowerCase(),
    metaAccessToken: process.env.META_ACCESS_TOKEN?.trim() || undefined,
    metaDatasetId: process.env.META_DATASET_ID?.trim() || undefined,
    metaGraphApiVersion: process.env.META_GRAPH_API_VERSION?.trim() || 'v21.0',
    hotmartClientId: process.env.HOTMART_CLIENT_ID?.trim() || undefined,
    hotmartClientSecret: process.env.HOTMART_CLIENT_SECRET?.trim() || undefined,
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    devUseMockData: process.env.DEV_USE_MOCK_DATA === 'true',
    isProduction: process.env.NODE_ENV === 'production',
  };
}
