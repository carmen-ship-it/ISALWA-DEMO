import { Suspense } from "react";
import { WorkspaceView } from "@/components/workspace/workspace-view";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    // WorkspaceView reads `useSearchParams()` (Mission 23 post-OAuth
    // redirect handling) — Next.js requires a Suspense boundary around any
    // client component that does, even though this route is dynamic.
    <Suspense fallback={null}>
      <WorkspaceView workspaceId={id} />
    </Suspense>
  );
}
