import { Suspense } from "react";
import { PriceMonitorPage } from "@/features/price-monitor/price-monitor-page";

export default function PriceMonitorRoute() {
  return (
    <Suspense fallback={null}>
      <PriceMonitorPage />
    </Suspense>
  );
}
