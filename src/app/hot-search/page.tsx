import { Suspense } from "react";
import { HotSearchPage } from "@/features/hot-search/hot-search-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HotSearchPage />
    </Suspense>
  );
}
