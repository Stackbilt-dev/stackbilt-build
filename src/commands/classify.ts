/**
 * stackbilt classify <intention>
 *
 * Zero-network, zero-inference intent classification. Pure heuristic, <1ms.
 *
 * NOTE(build#4): Local heuristic classifier replaced by `classify()` from
 * @stackbilt/scaffold-core. The full implementation now lives in the shared
 * package so all scaffold-core consumers use the same canonical classifier.
 * Once charter#220 lands the file: reference becomes the published npm package.
 */

// Re-export types from the package so existing imports of classify.ts keep working.
export type {
  ScaffoldPattern,
  Confidence,
  RouteShape,
  Verification,
  Dispatch,
  ClassifyTraits,
  Binding,
  Tier,
  ClassifyResult,
} from '@stackbilt/scaffold-core';

import { classify } from '@stackbilt/scaffold-core';
import type { CLIOptions } from '../index.js';
import { EXIT_CODE, CLIError } from '../index.js';

// ============================================================================
// Public classify function — delegates to @stackbilt/scaffold-core
// ============================================================================

/**
 * classifyScaffoldIntention — thin wrapper around classify() from
 * @stackbilt/scaffold-core that preserves the existing call signature used
 * by architect.ts and the test suite.
 */
export function classifyScaffoldIntention(intention: string) {
  return classify(intention);
}

// ============================================================================
// Command
// ============================================================================

export async function classifyCommand(options: CLIOptions, args: string[]): Promise<number> {
  const positional = args.filter(a => !a.startsWith('-'));
  const intention = positional.join(' ').trim();

  if (!intention) {
    throw new CLIError(
      'Provide an intention to classify:\n  stackbilt classify "multi-tenant SaaS API with Stripe billing"',
    );
  }

  const result = classifyScaffoldIntention(intention);

  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return EXIT_CODE.SUCCESS;
  }

  const tierLabel = result.tier === 1 ? 'basic' : result.tier === 2 ? 'recommended' : 'advanced';

  console.log('');
  console.log(`  Pattern:     ${result.pattern}`);
  console.log(`  Confidence:  ${result.confidence}`);
  console.log(`  Traits:      ${[
    `route_shape=${result.traits.route_shape}`,
    `verification=${result.traits.verification}`,
    `dispatch=${result.traits.dispatch}`,
  ].join(', ')}`);

  if (result.qualityProfile.length > 0) {
    console.log(`  Quality:     ${result.qualityProfile.join(', ')}`);
  }

  if (result.bindings.length > 0) {
    console.log(`  Bindings:    ${result.bindings.join(', ')}`);
  }

  console.log(`  Tier ${result.tier}:      ${tierLabel}`);
  console.log('');

  return EXIT_CODE.SUCCESS;
}
