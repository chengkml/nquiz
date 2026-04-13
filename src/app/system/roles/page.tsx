import { Suspense } from "react";
import { RoleManagementPage } from "@/features/role/role-management-page";

export default function SystemRolesPage() {
  return (
    <Suspense fallback={null}>
      <RoleManagementPage />
    </Suspense>
  );
}
