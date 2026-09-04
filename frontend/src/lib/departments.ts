import { useState, useEffect } from "react";
import api from "@/lib/api";

// 7 Phòng ban Chuẩn hóa của Nhà máy chế biến thực phẩm ISO 22000:2018 (Khớp 100% với bảng departments trong CSDL)
export const DEFAULT_DEPARTMENTS: string[] = [
  "Ban Giám đốc",
  "Ban QLCL & ATTP",
  "Phòng Sản xuất",
  "Phòng Kinh doanh & Kho",
  "Phòng Thiết bị",
  "Phòng Hành chính - Kế toán",
  "Quản trị hệ thống",
];

export function useDepartments(): { departments: string[]; loading: boolean } {
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.get("/auth/departments")
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          const names: string[] = res.data
            .map((d: any) => d.role_name || d.name || (typeof d === "string" ? d : null))
            .filter(Boolean);
          if (names.length > 0) {
            // Lấy trực tiếp danh sách phòng ban từ CSDL, không chèn trùng lặp
            const uniqueNames = Array.from(new Set(names));
            setDepartments(uniqueNames);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch departments from DB, using canonical defaults:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { departments, loading };
}

