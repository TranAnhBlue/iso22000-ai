import { createContext, useContext, type ReactNode } from "react";
import type { ModuleKey, Role } from "@/lib/auth";
import { accessFor } from "@/lib/auth";

type Ctx = { role: Role | string | null; module: ModuleKey | null; canEdit: boolean };

const ModuleAccessContext = createContext<Ctx>({ role: null, module: null, canEdit: false });

export function ModuleAccessProvider({
  role,
  module,
  children,
}: {
  role: Role | string | null;
  module: ModuleKey | null;
  children: ReactNode;
}) {
  const canEdit = !!role && !!module && accessFor(role, module) === "edit";
  return (
    <ModuleAccessContext.Provider value={{ role, module, canEdit }}>
      {children}
    </ModuleAccessContext.Provider>
  );
}

export function useModuleAccess() {
  return useContext(ModuleAccessContext);
}
