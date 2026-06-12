/**
 * @stackbilt/scaffold-core — classify sub-export
 *
 * Inference-free, zero-network intent classification.
 * Originally implemented as local heuristics in @stackbilt/build's classify.ts (build#4).
 * Extracted here so all scaffold-core consumers share one canonical classifier.
 *
 * Once charter#220 lands this file will be replaced by the real npm package.
 */
export type ScaffoldPattern = 'workers-saas' | 'workers-api' | 'discord-bot' | 'stripe-webhook' | 'github-webhook' | 'mcp-server' | 'queue-consumer' | 'cron-worker' | 'rest-api';
export type Confidence = 'high' | 'medium' | 'low';
export type RouteShape = 'rest' | 'rpc' | 'event' | 'stream';
export type Verification = 'jwt-auth' | 'hmac' | 'ed25519' | 'oauth' | 'api-key' | 'none';
export type Dispatch = 'resource-router' | 'event-handler' | 'queue-consumer' | 'cron';
export interface ClassifyTraits {
    route_shape: RouteShape;
    verification: Verification;
    dispatch: Dispatch;
}
export type Binding = 'd1' | 'kv' | 'r2' | 'queues' | 'do' | 'ai';
export type Tier = 1 | 2 | 3;
export interface ClassifyResult {
    pattern: ScaffoldPattern;
    confidence: Confidence;
    traits: ClassifyTraits;
    qualityProfile: string[];
    bindings: Binding[];
    tier: Tier;
}
/**
 * classify — inference-free intent classification.
 *
 * Takes a free-text intention string and returns a ClassifyResult with pattern,
 * confidence, traits, bindings, qualityProfile, and tier. No network calls. <1ms.
 */
export declare function classify(intention: string): ClassifyResult;
//# sourceMappingURL=classify.d.ts.map