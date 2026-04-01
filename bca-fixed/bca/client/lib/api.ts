import axios from 'axios';

// Token storage key
const TOKEN_KEY = 'bca_token';

export const saveToken  = (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch {} };
export const getToken   = (): string  => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const clearToken = ()          => { try { localStorage.removeItem(TOKEN_KEY); } catch {} };

const api = axios.create({
  baseURL:         '/api',
  withCredentials: true,   // still send cookie for same-origin
  timeout:         30000,
});

// ── Request: attach token + fix Content-Type for FormData ─────
api.interceptors.request.use((config) => {
  // Always send stored token as Authorization header
  // This works even through the Next.js reverse proxy
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Let browser set Content-Type for FormData (multipart boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// ── Response: redirect on 401 ────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const p = window.location.pathname;
      const pub = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
      if (!pub.some(pp => p.startsWith(pp)) && p !== '/') {
        clearToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
