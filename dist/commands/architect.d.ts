/**
 * stackbilt architect <intention>
 *
 * Zero-network governance document generator. Runs classify → knowledge → governance
 * via @stackbilt/scaffold-core and emits: threat model, ADR-001, ADR-002 (if compliance
 * domains detected), and test plan.
 *
 * Flags:
 *   --format json   emit { threatModel, adr001, adr002, testPlan } as JSON
 */
import type { CLIOptions } from '../index.js';
export declare function architectCommand(options: CLIOptions, args: string[]): Promise<number>;
//# sourceMappingURL=architect.d.ts.map