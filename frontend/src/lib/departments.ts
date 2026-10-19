import { useState, useEffect } from "react";
import api from "@/lib/api";

// 7 Phòng ban Chuẩn hóa của Nhà máy chế biến thực phẩm ISO 22000:2018 (Khớp 100% với bảng departments trong CSDL)
export const DEFAULT_DEPARTMENTS: string[] = [
  "Ban Giám Đốc",
  "Ban Quản lý Chất lượng (QA/QC)",
  "Phòng Sản xuất & Chế biến",
  "Phòng Cơ điện & Bảo trì",
  "Bộ phận Kho Vận & Logistics",
  "Phòng Mua Hàng & Cung Ứng",
  "Phòng Y tế & An toàn Lao động",
];

export interface OrgUser {
  id: string;
  name: string;
  username: string;
  dept: string;
  role: string;
  email?: string;
  phone?: string;
  status?: string;
}

// 8 Nhân sự Chủ chốt Chuẩn hóa Nhà máy ISO 22000 (khớp với bảng users trong CSDL)
export const DEFAULT_USERS: OrgUser[] = [
  {
    id: "u-1",
    name: "Trần Bảo Bối",
    username: "admin",
    dept: "Ban Giám Đốc",
    role: "Quản trị hệ thống & Giám đốc",
  },
  {
    id: "u-2",
    name: "Lê Hoàng Nam",
    username: "qa_manager",
    dept: "Ban Quản lý Chất lượng (QA/QC)",
    role: "Trưởng ban QA/QC",
  },
  {
    id: "u-3",
    name: "Nguyễn Văn An",
    username: "prod_lead",
    dept: "Phòng Sản xuất & Chế biến",
    role: "Trưởng ban HACCP / Trưởng ca SX",
  },
  {
    id: "u-4",
    name: "Phạm Hùng Cường",
    username: "maint_lead",
    dept: "Phòng Cơ điện & Bảo trì",
    role: "Trưởng phòng Kỹ thuật - Bảo trì",
  },
  {
    id: "u-5",
    name: "Trần Thị Mai",
    username: "qa_officer",
    dept: "Ban Quản lý Chất lượng (QA/QC)",
    role: "Kỹ sư Đảm bảo chất lượng (QA)",
  },
  {
    id: "u-6",
    name: "Nguyễn Văn Tài",
    username: "wh_lead",
    dept: "Bộ phận Kho Vận & Logistics",
    role: "Thủ kho & Trưởng bộ phận Kho",
  },
  {
    id: "u-7",
    name: "Vũ Thị Lan",
    username: "pur_lead",
    dept: "Phòng Mua Hàng & Cung Ứng",
    role: "Trưởng phòng Mua Hàng",
  },
  {
    id: "u-8",
    name: "Nguyễn Thị Hoa",
    username: "hse_officer",
    dept: "Phòng Y tế & An toàn Lao động",
    role: "Chuyên viên HSE & Y tế",
  },
];

export const DEFAULT_PRODUCT_LINES: string[] = [
  "Chế biến Thủy hải sản",
  "Dây chuyền Đồ hộp",
  "Dây chuyền Cấp đông IQF",
  "Dây chuyền Sơ chế & Đóng gói",
  "Dây chuyền Bánh kẹo & Bột",
  "Dây chuyền Nước giải khát & Nước mắm",
];

export function useDepartments(): { departments: string[]; loading: boolean } {
  const { departments, loading } = useOrgData();
  return { departments, loading };
}

export function useOrgData(): {
  departments: string[];
  users: OrgUser[];
  userNames: string[];
  productLines: string[];
  loading: boolean;
} {
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [users, setUsers] = useState<OrgUser[]>(DEFAULT_USERS);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      api.get("/auth/departments"),
      api.get("/organization/users"),
      api.get("/organization/departments"),
    ])
      .then(([authDeptRes, usersRes, orgDeptRes]) => {
        if (!isMounted) return;

        // Xử lý danh sách Phòng ban từ DB
        let loadedDepts: string[] = [];
        if (
          authDeptRes.status === "fulfilled" &&
          Array.isArray(authDeptRes.value.data) &&
          authDeptRes.value.data.length > 0
        ) {
          loadedDepts = authDeptRes.value.data
            .map((d: any) => d.role_name || d.name || (typeof d === "string" ? d : null))
            .filter(Boolean);
        } else if (
          orgDeptRes.status === "fulfilled" &&
          Array.isArray(orgDeptRes.value.data) &&
          orgDeptRes.value.data.length > 0
        ) {
          loadedDepts = orgDeptRes.value.data
            .map((d: any) => d.name || d.dept_name || (typeof d === "string" ? d : null))
            .filter(Boolean);
        }

        if (loadedDepts.length > 0) {
          const merged = Array.from(new Set([...loadedDepts, ...DEFAULT_DEPARTMENTS]));
          setDepartments(merged);
        }

        // Xử lý danh sách Người dùng / Nhân sự từ DB
        if (
          usersRes.status === "fulfilled" &&
          Array.isArray(usersRes.value.data) &&
          usersRes.value.data.length > 0
        ) {
          const loadedUsers: OrgUser[] = usersRes.value.data.map((u: any) => ({
            id: String(u.id || u.user_id),
            name: String(u.name || u.full_name || u.username),
            username: String(u.username || ""),
            dept: String(u.dept || u.department || "Chưa phân bổ"),
            role: String(u.role || "Nhân viên"),
            email: u.email,
            phone: u.phone,
            status: u.status,
          }));
          if (loadedUsers.length > 0) {
            setUsers(loadedUsers);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch org data from DB, using canonical defaults:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const userNames = Array.from(new Set(users.map((u) => u.name)));

  return {
    departments,
    users,
    userNames,
    productLines: DEFAULT_PRODUCT_LINES,
    loading,
  };
}
