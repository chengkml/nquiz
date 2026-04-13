import { Suspense } from "react";
import { WxAppManagerPage } from "@/features/wxapp/wx-app-manager-page";

export default function WxAppPage() {
  return (
    <Suspense fallback={null}>
      <WxAppManagerPage />
    </Suspense>
  );
}
