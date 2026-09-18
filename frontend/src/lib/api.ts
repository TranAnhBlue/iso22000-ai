import axios from 'axios';
import { getToken } from './auth';

// Tự động chuẩn hóa Base URL nếu người dùng chỉ nhập domain trên Vercel
function resolveBaseUrl(): string {
  let url = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').trim();
  url = url.replace(/\/+$/, '');
  // Nếu url chưa có /api/v1 thì tự động gắn vào để đảm bảo gọi đúng endpoint
  if (!url.endsWith('/api/v1') && !url.includes('/api/')) {
    url = `${url}/api/v1`;
  }
  return url;
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 60000, // 60s timeout để chờ máy chủ Render thức dậy từ chế độ ngủ
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tự động thử lại 1 lần nếu gặp lỗi mạng (máy chủ Render đang khởi động)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (config && !config._isRetry && (error.code === 'ERR_NETWORK' || !error.response)) {
      config._isRetry = true;
      // Chờ 2.5s để server Render hoàn tất khởi động rồi thử lại
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return api(config);
    }
    return Promise.reject(error);
  }
);

export default api;