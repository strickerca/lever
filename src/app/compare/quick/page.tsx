import { Suspense } from "react";
import QuickCompareClient from "./QuickComparePage";

export default function QuickComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="text-xl font-bold text-slate-400 animate-pulse">
            Loading Biomechanics Engine...
          </div>
        </div>
      }
    >
      <QuickCompareClient />
    </Suspense>
  );
}
