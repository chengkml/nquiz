import { Suspense } from "react";
import { McpToolManagementPage } from "@/features/mcp-tool/mcp-tool-management-page";

export default function McpToolPage() {
  return (
    <Suspense fallback={null}>
      <McpToolManagementPage />
    </Suspense>
  );
}
