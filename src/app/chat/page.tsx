import { Suspense } from "react";
import { ChatWorkbenchPage } from "@/features/chat/chat-workbench-page";

export default function ChatRoutePage() {
  return (
    <Suspense fallback={null}>
      <ChatWorkbenchPage />
    </Suspense>
  );
}
