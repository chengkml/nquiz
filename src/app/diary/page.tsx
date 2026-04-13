import { Suspense } from "react";
import { DiaryManagementPage } from "@/features/diary/diary-management-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DiaryManagementPage />
    </Suspense>
  );
}
