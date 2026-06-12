/**
 * stackbilt architect <intention>
 *
 * Zero-network, zero-inference governance document generator. Pure heuristic, <1ms.
 * Consumes the same classifyScaffoldIntention output as the `classify` command and
 * emits three governance artefacts as markdown:
 *   - Threat Model (STRIDE-shaped, pattern-specific)
 *   - ADR-001 (pattern + bindings rationale)
 *   - ADR-002 (compliance domains — only emitted when detected)
 *
 * NOTE(build#4): Inline governance templates replaced by `buildGovernance()` from
 * @stackbilt/scaffold-core. ComplianceDomains detection and all template functions
 * now live in the shared package. Once charter#220 lands the file: reference becomes
 * the published npm package.
 *
 * Flags:
 *   --format json   emit { threatModel, adr001, adr002, testPlan } as JSON
 */

import { sanitizeInput } from '@stackbilt/core';
import {
  buildGovernance,
  detectComplianceDomains,
  hasComplianceDomain,
} from '@stackbilt/scaffold-core';
import type { ComplianceDomains } from '@stackbilt/scaffold-core';
import type { CLIOptions } from '../index.js';
import { EXIT_CODE, CLIError } from '../index.js';
import { classifyScaffoldIntention } from './classify.js';

// Re-export ComplianceDomains so any existing imports of architect.ts keep working.
export type { ComplianceDomains };

// Re-export detection helpers for backward compatibility.
export { detectComplianceDomains, hasComplianceDomain };

// ============================================================================
// Command
// ============================================================================

export async function architectCommand(options: CLIOptions, args: string[]): Promise<number> {
  const positional = args.filter(a => !a.startsWith('-'));
  const intention = positional.join(' ').trim();

  if (!intention) {
    throw new CLIError(
      'Provide an intention:\n  stackbilt architect "multi-tenant SaaS API with Stripe billing"',
    );
  }

  const sanitized = sanitizeInput(intention);
  const result = classifyScaffoldIntention(sanitized);
  const docs = buildGovernance(sanitized, result);

  if (options.format === 'json') {
    const output: Record<string, string | null> = {
      threatModel: docs.threatModel,
      adr001: docs.adr001,
      adr002: docs.adr002,
      testPlan: docs.testPlan,
    };
    console.log(JSON.stringify(output, null, 2));
    return EXIT_CODE.SUCCESS;
  }

  console.log(docs.threatModel);
  console.log('---');
  console.log('');
  console.log(docs.adr001);

  if (docs.adr002) {
    console.log('---');
    console.log('');
    console.log(docs.adr002);
  }

  return EXIT_CODE.SUCCESS;
}
