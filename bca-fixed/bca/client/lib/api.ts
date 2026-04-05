import axios from 'axios';

// Token storage key
const TOKEN_KEY = 'bca_token';

export const saveToken = (t: string) => {
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
};

export const getToken = (): string => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};

export const clearToken = () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
};

// ✅ IMPORTANT: use backend URL (NOT /api)
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,  // 🔥 FIXED
  withCredentials: true,
  timeout: 30000,
});

// ── Request: attach token + fix Content-Type ─────
api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

// ── Response: redirect on 401 ─────
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
