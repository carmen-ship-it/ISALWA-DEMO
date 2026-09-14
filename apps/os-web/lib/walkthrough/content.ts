/**
 * Integration point. This file must not contain chapter copy.
 *
 * Until chapter modules exist, this registers nothing and the runner uses the
 * local fallback welcome. Integration should call registerChapter and
 * registerWelcome from `@/lib/walkthrough` once these modules exist:
 *
 *   apps/os-web/lib/walkthrough/chapters/global.ts — chapter + welcome
 *   apps/os-web/lib/walkthrough/chapters/customer.ts — chapter
 *   apps/os-web/lib/walkthrough/chapters/commercial.ts — chapter
 *   apps/os-web/lib/walkthrough/chapters/workforce.ts — chapter
 *   apps/os-web/lib/walkthrough/chapters/knowledge.ts — chapter
 *   apps/os-web/lib/walkthrough/chapters/map-truth.ts — chapter
 *   apps/os-web/lib/walkthrough/chapters/whatsapp-ai.ts — chapter
 *
 * Do not add those imports until the files exist. A static import of a missing
 * module fails the build.
 */
export function loadWalkthroughContent(): void {
  // Empty until integration registers chapter modules.
}
