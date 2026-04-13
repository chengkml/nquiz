import { ChatWorkbenchPage } from "@/features/chat/chat-workbench-page";

export default async function ChatSessionRoutePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ChatWorkbenchPage sessionId={sessionId} />;
}
