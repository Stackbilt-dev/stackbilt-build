/**
 * @stackbilt/scaffold-core — buildScaffold
 *
 * Generates a minimal scaffold file set from a ClassifyResult without network
 * calls or inference. Produces wrangler.toml, src/index.ts, package.json, and
 * tsconfig.json tuned to the detected pattern and bindings.
 *
 * Once charter#220 lands this will be replaced by the real npm package export.
 */
import type { ClassifyResult, ScaffoldPattern } from './classify.js';
export type FileRole = 'config' | 'scaffold' | 'governance' | 'test' | 'doc';
export interface ScaffoldFile {
    path: string;
    content: string;
    role: FileRole;
}
export interface ScaffoldOutput {
    files: ScaffoldFile[];
    pattern: ScaffoldPattern;
    tier: number;
    nextSteps: string[];
}
/**
 * buildScaffold — generate a minimal file set for an intention without inference.
 *
 * Takes a ClassifyResult (from `classify()`) and returns a ScaffoldOutput with
 * wrangler.toml, src/index.ts, package.json, tsconfig.json, and a test stub.
 * All files are pattern and binding-aware. No network calls. <1ms.
 */
export declare function buildScaffold(intention: string, result: ClassifyResult): ScaffoldOutput;
//# sourceMappingURL=scaffold.d.ts.map