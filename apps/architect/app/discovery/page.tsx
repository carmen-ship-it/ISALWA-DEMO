import { Suspense } from "react";
import { DiscoveryExperience } from "@/components/discovery/discovery-experience";
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
      <DiscoveryExperience />
    </Suspense>
  );
}
