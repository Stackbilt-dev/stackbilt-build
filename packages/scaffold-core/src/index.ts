/**
 * @stackbilt/scaffold-core
 *
 * Local shim pending charter#220 publication to npm.
 * Exports the canonical inference-free scaffold API surface:
 *   - classify()       — zero-cost intent classification
 *   - buildGovernance() — threat model + ADR generation
 *   - buildScaffold()   — file set generation
 *
 * Replace `"@stackbilt/scaffold-core": "file:packages/scaffold-core"` in
 * package.json with `"@stackbilt/scaffold-core": "^1.0.0"` once charter#220 lands.
 */

export { classify } from './classify.js';
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
} from './classify.js';

export { buildGovernance, detectComplianceDomains, hasComplianceDomain } from './governance.js';
export type { ComplianceDomains, GovernanceDocs } from './governance.js';

export { buildScaffold } from './scaffold.js';
export type { FileRole, ScaffoldFile, ScaffoldOutput } from './scaffold.js';
