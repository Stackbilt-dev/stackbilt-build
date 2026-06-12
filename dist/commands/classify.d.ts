/**
 * stackbilt classify <intention>
 *
 * Zero-network, zero-inference intent classification. Pure heuristic, <1ms.
 * Delegates to @stackbilt/scaffold-core for the canonical classifier.
 */
export type { ClassifyResult, PatternName, QualityProfile } from '@stackbilt/scaffold-core';
import type { CLIOptions } from '../index.js';
export declare function classifyScaffoldIntention(intention: string): import("@stackbilt/scaffold-core").ClassifyResult;
export declare function classifyCommand(options: CLIOptions, args: string[]): Promise<number>;
//# sourceMappingURL=classify.d.ts.map