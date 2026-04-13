import { Suspense } from "react";
import { McpServerManagementPage } from "@/features/mcp-server/mcp-server-management-page";

export default function McpServerPage() {
  return (
    <Suspense fallback={null}>
      <McpServerManagementPage />
    </Suspense>
  );
}
