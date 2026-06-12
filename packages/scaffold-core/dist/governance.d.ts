/**
 * @stackbilt/scaffold-core — governance sub-export
 *
 * Inference-free governance document generation (Threat Model, ADR-001, ADR-002, Test Plan).
 * Extracted from @stackbilt/build's architect.ts heuristics (build#4).
 *
 * Once charter#220 lands this file will be replaced by the real npm package.
 */
import type { ClassifyResult } from './classify.js';
export interface ComplianceDomains {
    pci: boolean;
    gdpr: boolean;
    hipaa: boolean;
    soc2: boolean;
}
export interface GovernanceDocs {
    threatModel: string;
    adr001: string;
    adr002: string | null;
    testPlan: string;
}
export declare function detectComplianceDomains(intention: string): ComplianceDomains;
export declare function hasComplianceDomain(domains: ComplianceDomains): boolean;
/**
 * buildGovernance — generate all governance documents for a classified intention.
 *
 * Returns GovernanceDocs with threatModel, adr001, adr002 (null if no compliance
 * domains detected), and testPlan. No network calls. <1ms.
 */
export declare function buildGovernance(intention: string, result: ClassifyResult): GovernanceDocs;
//# sourceMappingURL=governance.d.ts.map