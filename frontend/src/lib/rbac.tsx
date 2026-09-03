import { createContext, useContext, type ReactNode } from "react";
import type { ModuleKey, Role } from "@/lib/auth";
import { accessFor, canView, canEdit as checkCanEdit } from "@/lib/auth";

export type Ctx = {
  role: Role | string | null;
  module: ModuleKey | null;
  canEdit: boolean;
  isAdmin: boolean;
  isManagement: boolean;
  isQA: boolean;
  isProduction: boolean;
  isMaintenance: boolean;
  isWarehouse: boolean;
  isHR: boolean;
  isStaff: boolean;
  hasRole: (...roles: string[]) => boolean;
  canViewModule: (m: ModuleKey) => boolean;
  canEditModule: (m: ModuleKey) => boolean;
};

const ModuleAccessContext = createContext<Ctx>({
  role: null,
  module: null,
  canEdit: false,
  isAdmin: false,
  isManagement: false,
  isQA: false,
  isProduction: false,
  isMaintenance: false,
  isWarehouse: false,
  isHR: false,
  isStaff: false,
  hasRole: () => false,
  canViewModule: () => false,
  canEditModule: () => false,
});

export function ModuleAccessProvider({
  role,
  module,
  children,
}: {
  role: Role | string | null;
  module: ModuleKey | null;
  children: ReactNode;
}) {
  const r = (role || "").toLowerCase();
  const canEdit = !!role && !!module && accessFor(role, module) === "edit";

  const isAdmin = r === "admin";
  const isManagement = ["management", "executive", "admin"].includes(r);
  const isQA = ["qa_qc_manager", "iso_manager", "admin"].includes(r);
  const isProduction = ["production", "admin"].includes(r);
  const isMaintenance = ["maintenance", "equipment", "admin"].includes(r);
  const isWarehouse = ["sales_logistics", "sales", "warehouse", "admin"].includes(r);
  const isHR = ["hr_accounting", "admin_acct", "admin"].includes(r);
  const isStaff = r === "staff" || r === "user";

  const hasRole = (...roles: string[]) => roles.map((x) => x.toLowerCase()).includes(r);
  const canViewModule = (m: ModuleKey) => canView(r, m);
  const canEditModule = (m: ModuleKey) => checkCanEdit(r, m);

  return (
    <ModuleAccessContext.Provider
      value={{
        role,
        module,
        canEdit,
        isAdmin,
        isManagement,
        isQA,
        isProduction,
        isMaintenance,
        isWarehouse,
        isHR,
        isStaff,
        hasRole,
        canViewModule,
        canEditModule,
      }}
    >
      {children}
    </ModuleAccessContext.Provider>
  );
}

export function useModuleAccess() {
  return useContext(ModuleAccessContext);
}

