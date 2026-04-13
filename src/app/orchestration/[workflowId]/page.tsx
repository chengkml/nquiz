import { WorkflowEditorPage } from "@/features/orchestration/workflow-editor-page";

export default async function OrchestrationWorkflowEditorPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return <WorkflowEditorPage workflowId={workflowId} />;
}
