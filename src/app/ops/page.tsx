import { Suspense } from "react";
import { OpsDashboardBoard } from "@/components/ops/ops-dashboard-board";
import { Spinner } from "@/components/ui/spinner";

function OpsDashboardFallback() {
  return (
    <div className="flex items-center justify-center gap-2 py-20">
      <Spinner />
      <span>Loading operations…</span>
    </div>
  );
}

export default function OpsPage() {
  return (
    <Suspense fallback={<OpsDashboardFallback />}>
      <OpsDashboardBoard />
    </Suspense>
  );
}
