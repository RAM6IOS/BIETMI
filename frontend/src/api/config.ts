const envUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE = (envUrl || '/api/v1').replace(/\/+$/, '');