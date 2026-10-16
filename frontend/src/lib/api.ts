import axios from "axios";
import { clearSession, getToken } from "./auth";
import { setCachedApi, invalidateApiCache, clearApiCache } from "./apiCache";

// Tự động chuẩn hóa Base URL nếu người dùng chỉ nhập domain trên Vercel
function resolveBaseUrl(): string {
  let url = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1").trim();
  url = url.replace(/\/+$/, "");
  // Nếu url chưa có /api/v1 thì tự động gắn vào để đảm bảo gọi đúng endpoint
  if (!url.endsWith("/api/v1") && !url.includes("/api/")) {
    url = `${url}/api/v1`;
  }
  return url;
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 60000, // 60s timeout để chờ máy chủ Render thức dậy từ chế độ ngủ
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tự động lưu cache GET và vô hiệu hóa cache khi có thao tác POST/PUT/DELETE/PATCH
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    const method = (config.method || "get").toLowerCase();
    const url = config.url || "";

    if (method === "get" && response.status === 200 && response.data !== undefined) {
      // Lưu vào in-memory cache
      setCachedApi(url, response.data, config.params);
    } else if (["post", "put", "delete", "patch"].includes(method) && response.status >= 200 && response.status < 300) {
      // Khi có mutation thành công, tự động xóa cache của module liên quan
      const prefixMatch = url.match(/^\/([a-z0-9_-]+)/i);
      if (prefixMatch) {
        invalidateApiCache(`/${prefixMatch[1]}`);
      }
    }

    return response;
  },
  async (error) => {
    const config = error.config;
    // Phiên hết hạn/không hợp lệ: xoá JWT cũ để các tác vụ nền không tiếp tục gửi request 401
    if (error.response?.status === 401 && !String(config?.url || "").includes("/auth/login")) {
      clearSession();
      clearApiCache();
    }
    if (config && !config._isRetry && (error.code === "ERR_NETWORK" || !error.response)) {
      config._isRetry = true;
      // Chờ 2.5s để server Render hoàn tất khởi động rồi thử lại
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return api(config);
    }
    return Promise.reject(error);
  },
);

export default api;

