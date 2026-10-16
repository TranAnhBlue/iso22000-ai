/**
 * Global In-Memory API Cache & Pre-warmer for FSMS
 *
 * Cung cấp cơ chế lưu đệm bộ nhớ (in-memory SWR cache) cho toàn bộ ứng dụng:
 * 1. Lưu kết quả các lệnh GET trong bộ nhớ RAM client.
 * 2. Khởi tạo state tức thì (0ms) khi người dùng chuyển trang -> Không còn hiện tượng chớp/giật "Chưa có dữ liệu".
 * 3. Tự động vô hiệu hóa cache (invalidation) khi có thao tác POST/PUT/DELETE/PATCH.
 * 4. Tự động làm ấm bộ nhớ đệm (pre-warm) ngầm các phân hệ chính sau khi đăng nhập.
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Thời gian sống tính bằng ms (mặc định 5 phút)
}

const memoryCache = new Map<string, CacheItem<any>>();

export function getCacheKey(url: string, params?: Record<string, any>): string {
  const cleanUrl = url.trim();
  if (!params || Object.keys(params).length === 0) {
    return cleanUrl;
  }
  const cleanParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      cleanParams[k] = String(v);
    }
  }
  if (Object.keys(cleanParams).length === 0) return cleanUrl;
  const search = new URLSearchParams(cleanParams).toString();
  return `${cleanUrl}?${search}`;
}

/**
 * Lấy dữ liệu từ cache nếu có
 */
export function getCachedApi<T>(url: string, params?: Record<string, any>): T | undefined {
  const key = getCacheKey(url, params);
  const item = memoryCache.get(key);
  if (!item) return undefined;
  return item.data as T;
}

/**
 * Kiểm tra xem endpoint đã có dữ liệu cache chưa
 */
export function hasCachedApi(url: string, params?: Record<string, any>): boolean {
  const key = getCacheKey(url, params);
  return memoryCache.has(key);
}

/**
 * Lưu dữ liệu vào cache
 */
export function setCachedApi<T>(
  url: string,
  data: T,
  params?: Record<string, any>,
  ttl = 300_000,
): void {
  if (data === undefined || data === null) return;
  const key = getCacheKey(url, params);
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Khởi tạo dữ liệu ban đầu cho useState từ cache hoặc trả về giá trị mặc định.
 * Giúp React render ngay lập tức dữ liệu thật ở frame đầu tiên thay vì mảng rỗng [].
 */
export function initCached<T>(url: string, defaultValue: T, params?: Record<string, any>): T {
  const cached = getCachedApi<T>(url, params);
  return cached !== undefined ? cached : defaultValue;
}

/**
 * Kiểm tra nhanh trạng thái cache để thiết lập cờ loading ban đầu
 */
export function isCached(url: string, params?: Record<string, any>): boolean {
  return hasCachedApi(url, params);
}

/**
 * Vô hiệu hóa cache theo tiền tố url (ví dụ: "/documents", "/haccp", "/organization")
 */
export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  const cleanPrefix = prefix.trim();
  for (const key of memoryCache.keys()) {
    if (key.startsWith(cleanPrefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Xóa sạch toàn bộ bộ nhớ đệm (dùng khi Đăng xuất)
 */
export function clearApiCache(): void {
  memoryCache.clear();
}

let warmPromise: Promise<void> | null = null;

/**
 * Làm ấm bộ nhớ đệm (Pre-warm) ngầm các phân hệ chính sau khi ứng dụng tải.
 * Chạy không đồng bộ ngầm (background non-blocking), chỉ tốn vài chục ms trên local.
 */
export async function warmFSMSCache(apiInstance: any): Promise<void> {
  if (warmPromise) return warmPromise;

  warmPromise = (async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token") || sessionStorage.getItem("token")
          : null;
      if (!token) return;

      const priorityEndpoints = [
        "/dashboard/overview-stats",
        "/dashboard/executive-alerts",
        "/dashboard/quality-objectives",
        "/dashboard/management-reviews",
        "/documents",
        "/organization/departments",
        "/organization/users",
        "/organization/interested-parties",
        "/organization/context-risks",
        "/organization/context-stats",
        "/organization/communications",
        "/organization/food-safety-team",
        "/haccp/plans",
        "/haccp/steps",
        "/haccp/hazard-analyses",
        "/haccp/ccp-list",
        "/haccp/ccp-logs",
        "/haccp/in-process-qc-logs",
        "/haccp/metal-detector-logs",
        "/haccp/verification-activities",
        "/prp/programs",
        "/inventory/materials",
        "/purchasing/suppliers",
        "/equipment/devices",
        "/audits/plans",
        "/capa/non-conformities",
        "/traceability/backward?query_code=LOT-202608-B01",
        "/traceability/mock-drills",
        "/emergency/stats",
        "/emergency/contacts",
        "/emergency/procedures",
        "/emergency/drills",
        "/change-management/requests",
        "/change-management/stats",
        "/builders/forms",
        "/builders/workflows",
        "/builders/submissions",
        "/builders/instances",
      ];

      // Gửi theo từng batch 6 request song song để không nghẽn đường truyền
      const batchSize = 6;
      for (let i = 0; i < priorityEndpoints.length; i += batchSize) {
        const batch = priorityEndpoints.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (url) => {
            if (!hasCachedApi(url)) {
              try {
                const res = await apiInstance.get(url);
                if (res && res.data) {
                  setCachedApi(url, res.data);
                }
              } catch {
                // Bỏ qua lỗi ngầm nếu endpoint đó yêu cầu quyền đặc biệt hoặc chưa có data
              }
            }
          }),
        );
      }
    } catch (e) {
      console.warn("FSMS Cache Pre-warm completed with notices:", e);
    }
  })();

  return warmPromise;
}
