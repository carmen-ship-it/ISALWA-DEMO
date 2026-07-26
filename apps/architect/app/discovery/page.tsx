import { Suspense } from "react";
import { GuidedAssessment } from "@/components/discovery/guided/guided-assessment";
import { TypingIndicator } from "@/components/shared/typing-indicator";

export default function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <TypingIndicator />
        </div>
      }
    >
      <GuidedAssessment />
    </Suspense>
  );
}
