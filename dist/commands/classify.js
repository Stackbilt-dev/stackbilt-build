/**
 * stackbilt classify <intention>
 *
 * Zero-network, zero-inference intent classification. Pure heuristic, <1ms.
 * Delegates to @stackbilt/scaffold-core for the canonical classifier.
 */
import { classify } from '@stackbilt/scaffold-core';
import { EXIT_CODE, CLIError } from '../index.js';
export function classifyScaffoldIntention(intention) {
    return classify(intention);
}
export async function classifyCommand(options, args) {
    const positional = args.filter(a => !a.startsWith('-'));
    const intention = positional.join(' ').trim();
    if (!intention) {
        throw new CLIError('Provide an intention to classify:\n  stackbilt classify "multi-tenant SaaS API with Stripe billing"');
    }
    const result = classifyScaffoldIntention(intention);
    if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return EXIT_CODE.SUCCESS;
    }
    const pct = Math.round(result.confidence * 100);
    const qp = result.qualityProfile;
    const flags = [
        qp.authentication && 'auth',
        qp.rateLimiting && 'rate-limit',
        qp.observability && 'observability',
        qp.piiHandling && 'pii',
        ...qp.complianceDomains,
    ].filter(Boolean).join(', ');
    console.log('');
    console.log(`  Pattern:    ${result.pattern}`);
    console.log(`  Confidence: ${pct}%`);
    if (result.traits.length > 0) {
        console.log(`  Traits:     ${result.traits.join(', ')}`);
    }
    if (flags) {
        console.log(`  Quality:    ${flags}`);
    }
    console.log(`  Testing:    ${qp.testingLevel}`);
    console.log('');
    return EXIT_CODE.SUCCESS;
}
//# sourceMappingURL=classify.js.map