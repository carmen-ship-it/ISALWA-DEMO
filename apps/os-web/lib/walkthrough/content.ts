import { registerChapter, registerWelcome } from '@/lib/walkthrough';
import { chapter as commercialChapter } from './chapters/commercial';
import { chapter as customerChapter } from './chapters/customer';
import { chapter as globalChapter, welcome } from './chapters/global';
import { chapter as knowledgeChapter } from './chapters/knowledge';
import { chapter as mapChapter } from './chapters/map-truth';
import { chapter as messagesChapter } from './chapters/whatsapp-ai';
import { chapter as workforceChapter } from './chapters/workforce';

/**
 * Integration point. This file must not contain chapter copy.
 *
 * Chapter modules expose tourId. registerChapter reads chapterId, id, or the
 * fallback id. map-truth and whatsapp-ai are the runner's route ids; the
 * chapter files keep tourId map and messages, and this file does not rewrite
 * their copy.
 *
 * knowledge.ts also exports learningMode and replay. The runner has no
 * register hook for those objects (the shell uses its own controls), so only
 * the knowledge chapter is registered here.
 */

export function loadWalkthroughContent(): void {
  registerWelcome(welcome);
  registerChapter(globalChapter, globalChapter.tourId);
  registerChapter(customerChapter, customerChapter.tourId);
  registerChapter(commercialChapter, commercialChapter.tourId);
  registerChapter(workforceChapter, workforceChapter.tourId);
  registerChapter(knowledgeChapter, knowledgeChapter.tourId);
  registerChapter(mapChapter, 'map-truth');
  registerChapter(messagesChapter, 'whatsapp-ai');
}
