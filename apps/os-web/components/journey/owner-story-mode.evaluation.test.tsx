import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  EVALUATION_OPERATIONAL_BUILT_NOTICE,
  EVALUATION_WALKTHROUGH_NOTICE,
  EVALUATION_WALKTHROUGH_TITLE,
} from '@/lib/evaluation/walkthrough-config';
import { STORY_MODE_STEPS, STORY_PROPOSAL_NOTICE } from '@/lib/journey/story-steps';

describe('OwnerStoryMode evaluation-page presentation', () => {
  it('keeps canonical steps and suppresses operational CTAs in evaluation presentation', () => {
    assert.equal(STORY_MODE_STEPS.length, 20);
    const overlay = readFileSync(join(process.cwd(), 'components/journey/owner-story-mode.tsx'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'app/evaluacion/page.tsx'), 'utf8');

    assert.match(overlay, /presentation === 'evaluation-page'/);
    assert.match(overlay, /EVALUATION_WALKTHROUGH_TITLE/);
    assert.match(overlay, /EVALUATION_WALKTHROUGH_INTRO/);
    assert.match(overlay, /EVALUATION_WALKTHROUGH_NOTICE/);
    assert.match(overlay, /EVALUATION_OPERATIONAL_BUILT_NOTICE/);
    assert.match(overlay, /!walkthroughOnly && step\.href && step\.workingActionLabel/);
    assert.match(overlay, /STORY_MODE_STEPS/);
    assert.match(overlay, /Escape/);
    assert.match(overlay, /p-3 sm:p-6|min-h-\[70vh\]/);
    assert.match(page, /presentation="evaluation-page"/);
    assert.match(page, /resolveWalkthroughAccess/);
    assert.doesNotMatch(page, /loadShellContext|createOsApiClient|listSessionOrganizations/);

    assert.equal(EVALUATION_WALKTHROUGH_TITLE, 'Evaluación guiada de ISALWA');
    assert.match(EVALUATION_WALKTHROUGH_NOTICE, /No crea ni modifica/);
    assert.match(EVALUATION_OPERATIONAL_BUILT_NOTICE, /versión operativa local/);
    assert.equal(
      STORY_PROPOSAL_NOTICE,
      'Vista de propuesta · Esta etapa todavía no guarda cambios ni envía información.',
    );
  });
});
