/**
 * @stackbilt/scaffold-core — governance sub-export
 *
 * Inference-free governance document generation (Threat Model, ADR-001, ADR-002, Test Plan).
 * Extracted from @stackbilt/build's architect.ts heuristics (build#4).
 *
 * Once charter#220 lands this file will be replaced by the real npm package.
 */
// ============================================================================
// Compliance domain detection
// ============================================================================
export function detectComplianceDomains(intention) {
    const i = intention.toLowerCase();
    return {
        pci: /\b(stripe|payment|card|billing|checkout|invoice|pci)\b/.test(i),
        gdpr: /\b(gdpr|personal.?data|pii|data.?subject|consent|erasure|eu.?user)\b/.test(i),
        hipaa: /\b(hipaa|health|medical|patient|phi|ehr|clinic)\b/.test(i),
        soc2: /\b(soc.?2|audit.?log|compliance|audit|rbac)\b/.test(i),
    };
}
export function hasComplianceDomain(domains) {
    return domains.pci || domains.gdpr || domains.hipaa || domains.soc2;
}
// ============================================================================
// Threat model template
// ============================================================================
const PATTERN_THREATS = {
    'workers-saas': [
        'Tenant isolation failure — cross-tenant data leak via missing org_id scope on every query',
        'Privilege escalation — role checks missing on admin endpoints',
        'Billing manipulation — quota bypass by replaying API calls before rate-limit window resets',
        'Mass assignment — unguarded PATCH merging user-supplied fields onto restricted columns',
    ],
    'workers-api': [
        'Unauthenticated endpoint exposure — routes reachable without bearer token',
        'Input injection — unsanitized path parameters passed to D1 queries',
        'SSRF via fetch — user-supplied URLs forwarded without allowlist validation',
        'Credential leakage — API keys logged in error responses',
    ],
    'discord-bot': [
        'Interaction replay — missing interaction token expiry check (15-minute window)',
        'Slash command injection — user-supplied option values interpolated into messages',
        'Guild escalation — bot responds to guilds it was not explicitly added to',
        'Rate-limit DoS — no per-user debounce on expensive slash commands',
    ],
    'stripe-webhook': [
        'Signature bypass — HMAC verification skipped in test/dev mode leaking to production',
        'Event replay — missing idempotency key check allows duplicate billing side-effects',
        'Webhook flooding — no request volume cap on the ingestion endpoint',
        'Data exfiltration — raw Stripe event objects logged in full (contains PII)',
    ],
    'github-webhook': [
        'Signature bypass — `X-Hub-Signature-256` verification absent or timing-unsafe',
        'Event replay — duplicate delivery (GitHub retries) triggers duplicate side-effects',
        'Scope creep — handler acts on repos outside expected org without allowlist',
        'Payload injection — branch/commit message content unsafely interpolated into downstream calls',
    ],
    'mcp-server': [
        'Tool injection — user-controlled arguments reach shell exec or file system without sanitization',
        'Capability leakage — tools expose internal filesystem paths or env vars in error messages',
        'Prompt injection — LLM-generated tool arguments passed back unvalidated',
        'Runaway tool invocation — no per-session tool-call rate limit',
    ],
    'queue-consumer': [
        'Poison message DoS — malformed payload causes tight retry loop exhausting queue retries',
        'Idempotency failure — non-idempotent handler triggered twice on redelivery',
        'Payload deserialization — untrusted queue message shapes cause runtime exceptions',
        'DLQ silent drain — dead-letter queue never alarmed, failures silently accumulate',
    ],
    'cron-worker': [
        'Runaway execution — scheduled handler lacks timeout, holds resources across runs',
        'Overlapping runs — no distributed lock; concurrent invocations corrupt shared state',
        'Silent failure — handler exceptions swallowed; cron appears healthy but does nothing',
        'Scope creep — cron accesses production data in non-production environments',
    ],
    'rest-api': [
        'Unauthenticated routes — endpoints reachable without authentication header',
        'Input injection — path and query parameters passed to downstream systems unsanitized',
        'CORS misconfiguration — wildcard origin permits cross-site credential access',
        'Error verbosity — stack traces exposed in 5xx responses',
    ],
};
function bindingThreats(bindings) {
    const threats = [];
    if (bindings.includes('d1'))
        threats.push('SQL injection via raw D1 query string interpolation — use prepared statements exclusively');
    if (bindings.includes('kv'))
        threats.push('KV namespace pollution — user-controlled key prefix allows overwriting sibling keys');
    if (bindings.includes('r2'))
        threats.push('Object path traversal — user-supplied filenames must be normalised before R2 put/get');
    if (bindings.includes('do'))
        threats.push('Durable Object state leak — state persists across requests; must be explicitly cleared per-session');
    if (bindings.includes('queues'))
        threats.push('Queue backpressure — unchecked producer rate can exhaust queue capacity limits');
    if (bindings.includes('ai'))
        threats.push('Model output injection — LLM responses rendered as HTML without escaping enables XSS');
    return threats;
}
function buildThreatModel(intention, result, domains) {
    const patternThreats = PATTERN_THREATS[result.pattern] ?? [];
    const bThreats = bindingThreats(result.bindings);
    const complianceNotes = [];
    if (domains.pci)
        complianceNotes.push('PCI DSS — card data must never transit this service; delegate to Stripe Elements');
    if (domains.gdpr)
        complianceNotes.push('GDPR — implement right-to-erasure endpoint; log consent events; restrict PII to EU region');
    if (domains.hipaa)
        complianceNotes.push('HIPAA — PHI at rest must be encrypted; audit log every access event to D1');
    if (domains.soc2)
        complianceNotes.push('SOC 2 — immutable audit trail required; RBAC on all admin operations');
    const threatLines = patternThreats
        .concat(bThreats)
        .map((t, i) => `| T${String(i + 1).padStart(2, '0')} | ${t} | Medium | Validate & sanitize at boundary |`)
        .join('\n');
    const complianceSection = complianceNotes.length > 0
        ? `\n## Compliance Notes\n\n${complianceNotes.map(n => `- ${n}`).join('\n')}\n`
        : '';
    return `# Threat Model

**Intention:** ${intention}
**Pattern:** \`${result.pattern}\`
**Confidence:** ${result.confidence}
**Bindings:** ${result.bindings.length > 0 ? result.bindings.join(', ') : 'none'}

## STRIDE Surface

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
${threatLines}
${complianceSection}
## Out of Scope

- Infrastructure-layer threats (Cloudflare DDoS mitigation, TLS termination)
- Supply-chain attacks on npm dependencies
- Physical / social-engineering vectors
`;
}
// ============================================================================
// ADR templates
// ============================================================================
const PATTERN_RATIONALE = {
    'workers-saas': 'Cloudflare Workers + D1 provides edge-native multi-tenancy with row-level isolation, eliminating cold-start latency for subscription-tier enforcement.',
    'workers-api': 'Cloudflare Workers delivers sub-millisecond globally-distributed API routing with zero server management overhead.',
    'discord-bot': 'Workers-based interaction endpoint satisfies the 3-second Discord response deadline without provisioning persistent servers.',
    'stripe-webhook': 'Edge-native webhook ingestion minimises end-to-end latency from Stripe delivery to business-logic execution, with HMAC verification at the boundary.',
    'github-webhook': 'Stateless Workers handler provides reliable, low-latency GitHub event ingestion with automatic horizontal scaling during push storms.',
    'mcp-server': 'Workers runtime exposes MCP-compatible tool endpoints at the edge, enabling LLM agents to invoke tools with <100ms RTT from any region.',
    'queue-consumer': 'Cloudflare Queues with Workers consumer provides at-least-once delivery with configurable retry and dead-letter semantics without managing broker infrastructure.',
    'cron-worker': 'Workers Cron Triggers provide globally-consistent scheduled execution with second-level granularity and automatic retries on failure.',
    'rest-api': 'Standard REST API pattern with Hono router provides familiar request/response semantics with strong TypeScript ergonomics.',
};
function buildADR001(intention, result) {
    const rationale = PATTERN_RATIONALE[result.pattern] ?? 'Pattern selected based on heuristic intent classification.';
    const bindingList = result.bindings.length > 0
        ? result.bindings.map(b => `- \`${b}\`: included based on detected intent signals`).join('\n')
        : '- No platform bindings detected; add as requirements crystallise';
    const traitLines = [
        `- **Route shape**: \`${result.traits.route_shape}\``,
        `- **Verification**: \`${result.traits.verification}\``,
        `- **Dispatch**: \`${result.traits.dispatch}\``,
    ].join('\n');
    return `# ADR-001: Scaffold Pattern Selection

**Status:** Proposed
**Date:** ${new Date().toISOString().slice(0, 10)}

## Context

${intention}

## Decision

Classify as **\`${result.pattern}\`** (confidence: ${result.confidence}, tier ${result.tier}).

${rationale}

## Traits

${traitLines}

## Bindings

${bindingList}

## Consequences

- Scaffold generates files optimised for \`${result.pattern}\` conventions
- Team should validate bindings list against actual infrastructure requirements before provisioning
- Confidence is **${result.confidence}** — ${result.confidence === 'low' ? 'expand the intention description for a more accurate classification' : 'proceed with scaffold'}
`;
}
function buildADR002(intention, domains) {
    const active = [];
    if (domains.pci)
        active.push('PCI DSS');
    if (domains.gdpr)
        active.push('GDPR');
    if (domains.hipaa)
        active.push('HIPAA');
    if (domains.soc2)
        active.push('SOC 2');
    const requirements = [];
    if (domains.pci)
        requirements.push('- Never store, log, or transit raw card numbers; delegate capture to Stripe.js / Stripe Elements\n- Restrict network access to Stripe API IPs only\n- Enable Radar fraud rules before go-live');
    if (domains.gdpr)
        requirements.push('- Implement `DELETE /users/:id` with cascading erasure across all tables\n- Collect and store explicit consent events with timestamp\n- Restrict PII storage to EU-region D1 databases');
    if (domains.hipaa)
        requirements.push('- Encrypt PHI at rest (D1 column-level encryption or separate encrypted KV namespace)\n- Emit immutable audit log entry for every PHI read/write event\n- BAA required with Cloudflare before handling real patient data');
    if (domains.soc2)
        requirements.push('- Append-only audit log table (`audit_events`) with actor, action, resource, timestamp\n- RBAC: every admin operation guarded by role assertion before execution\n- Automated alerting on privilege escalation attempts');
    return `# ADR-002: Compliance Domain Requirements

**Status:** Proposed
**Date:** ${new Date().toISOString().slice(0, 10)}

## Context

Intention analysis detected the following compliance domains: **${active.join(', ')}**.

## Decision

Implement the domain-specific requirements below before handling production data.

${requirements.join('\n\n')}

## Consequences

- Additional development time required for compliance controls
- Security review gate recommended before first production deployment
- Consider engaging a compliance consultant for ${active.join(' / ')} audit if data volume exceeds MVP scale
`;
}
// ============================================================================
// Test plan template
// ============================================================================
function buildTestPlan(result, domains) {
    const cases = [
        `- [ ] Happy path: valid ${result.traits.verification !== 'none' ? 'authenticated ' : ''}request returns expected response`,
        `- [ ] Missing auth: request without ${result.traits.verification !== 'none' ? result.traits.verification + ' credentials' : 'required headers'} returns 401`,
        `- [ ] Input validation: malformed payload returns 400 with structured error`,
        `- [ ] Idempotency: duplicate ${result.traits.dispatch === 'event-handler' ? 'event delivery' : 'request'} produces no side-effects`,
    ];
    if (result.bindings.includes('d1'))
        cases.push('- [ ] DB boundary: prepared statement path exercised for every parameterised query');
    if (result.bindings.includes('queues'))
        cases.push('- [ ] Poison message: malformed queue payload triggers DLQ rather than crash loop');
    if (domains.pci)
        cases.push('- [ ] PCI: no card number appears in logs, error responses, or D1 rows');
    if (domains.gdpr)
        cases.push('- [ ] GDPR: erasure endpoint removes all PII records for a test subject');
    return `# Test Plan

**Pattern:** \`${result.pattern}\` | **Tier:** ${result.tier}

## Required Cases

${cases.join('\n')}

## Coverage Targets

- Unit: pure functions (validation, transformation, classification)
- Integration: binding interactions (D1 queries, KV reads, queue publish)
- E2E: at least one happy-path flow exercised against a staging environment
`;
}
// ============================================================================
// Public API
// ============================================================================
/**
 * buildGovernance — generate all governance documents for a classified intention.
 *
 * Returns GovernanceDocs with threatModel, adr001, adr002 (null if no compliance
 * domains detected), and testPlan. No network calls. <1ms.
 */
export function buildGovernance(intention, result) {
    const domains = detectComplianceDomains(intention);
    return {
        threatModel: buildThreatModel(intention, result, domains),
        adr001: buildADR001(intention, result),
        adr002: hasComplianceDomain(domains) ? buildADR002(intention, domains) : null,
        testPlan: buildTestPlan(result, domains),
    };
}
//# sourceMappingURL=governance.js.map