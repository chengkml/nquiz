import { Suspense } from "react";
import { AgentManagementPage } from "@/features/agent/agent-management-page";

export default function AgentPage() {
  return (
    <Suspense fallback={null}>
      <AgentManagementPage />
    </Suspense>
  );
}
