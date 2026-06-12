/**
 * stackbilt classify <intention>
 *
 * Zero-network, zero-inference intent classification. Pure heuristic, <1ms.
 * Produces the same shape as @stackbilt/scaffold-core/classify will export
 * once charter#213 lands — swap to that import in build#4.
 */

import { sanitizeInput } from '@stackbilt/core';
import type { CLIOptions } from '../index.js';
import { EXIT_CODE, CLIError } from '../index.js';

// ============================================================================
// Types (forward-compatible with @stackbilt/scaffold-core/classify)
// ============================================================================

export type ScaffoldPattern =
  | 'workers-saas'
  | 'workers-api'
  | 'discord-bot'
  | 'stripe-webhook'
  | 'github-webhook'
  | 'mcp-server'
  | 'queue-consumer'
  | 'cron-worker'
  | 'rest-api';

export type Confidence = 'high' | 'medium' | 'low';

export type RouteShape = 'rest' | 'rpc' | 'event' | 'stream';
export type Verification = 'jwt-auth' | 'hmac' | 'ed25519' | 'oauth' | 'api-key' | 'none';
export type Dispatch =
  | 'resource-router'
  | 'event-handler'
  | 'queue-consumer'
  | 'cron';

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

// ============================================================================
// Heuristics
// ============================================================================

const QUALITY_TERMS: string[] = [
  'tenant', 'payments', 'billing', 'rate-limit', 'rate limit', 'audit', 'analytics',
  'notifications', 'search', 'caching', 'versioning', 'pagination',
  'webhooks', 'export', 'import', 'reporting', 'rbac', 'roles',
  'media', 'video', 'image', 'upload', 'download',
];

interface PatternRule {
  pattern: ScaffoldPattern;
  // score weight per signal hit
  signals: Array<{ terms: RegExp; weight: number }>;
}

const PATTERN_RULES: PatternRule[] = [
  {
    pattern: 'workers-saas',
    signals: [
      { terms: /\b(saas|multi.?tenant|subscription|billing|stripe|tier|plan|quota|usage)\b/i, weight: 3 },
      { terms: /\b(onboarding|dashboard|customer|organization|workspace|team)\b/i, weight: 1 },
    ],
  },
  {
    pattern: 'discord-bot',
    signals: [
      { terms: /\b(discord|slash.?command|bot.?(command|response)|interaction)\b/i, weight: 5 },
    ],
  },
  {
    pattern: 'stripe-webhook',
    signals: [
      { terms: /\b(stripe|payment|checkout|invoice|subscription)\b/i, weight: 3 },
      { terms: /\b(webhook|event|hook)\b/i, weight: 2 },
    ],
  },
  {
    pattern: 'github-webhook',
    signals: [
      { terms: /\b(github|pull.?request|issue|repository|commit|push.?event)\b/i, weight: 5 },
      { terms: /\b(webhook|event|hook)\b/i, weight: 1 },
    ],
  },
  {
    pattern: 'mcp-server',
    signals: [
      { terms: /\b(mcp|model.?context.?protocol|tool.?server|agent.?server|llm.?tool)\b/i, weight: 5 },
    ],
  },
  {
    pattern: 'queue-consumer',
    signals: [
      { terms: /\b(queue|job.?(worker|processor)|background.?(job|task)|async.?processing|worker.?queue)\b/i, weight: 4 },
    ],
  },
  {
    pattern: 'cron-worker',
    signals: [
      { terms: /\b(cron|scheduled|daily|hourly|weekly|periodic|interval|timer)\b/i, weight: 4 },
    ],
  },
  {
    pattern: 'workers-api',
    signals: [
      { terms: /\b(api|rest|endpoint|route|crud|resource)\b/i, weight: 2 },
      { terms: /\b(cloudflare.?worker|edge.?api|worker)\b/i, weight: 1 },
    ],
  },
  // rest-api: intentionally last — only reached when no Workers-specific keyword matches
  {
    pattern: 'rest-api',
    signals: [
      { terms: /\b(http.?server|express|fastify|hono)\b/i, weight: 2 },
      { terms: /\b(server|listener|port)\b/i, weight: 1 },
    ],
  },
];

function detectPattern(intention: string): { pattern: ScaffoldPattern; score: number } {
  let best: ScaffoldPattern = 'rest-api';
  let bestScore = 0;

  for (const rule of PATTERN_RULES) {
    let score = 0;
    for (const { terms, weight } of rule.signals) {
      if (terms.test(intention)) score += weight;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.pattern;
    }
  }

  return { pattern: best, score: bestScore };
}

function detectConfidence(score: number, intention: string): Confidence {
  const wordCount = intention.trim().split(/\s+/).length;
  if (score >= 3) return 'high';
  if (score >= 2 && wordCount >= 3) return 'medium';
  return 'low';
}

function detectVerification(intention: string): Verification {
  if (/\b(jwt|json.?web.?token)\b/i.test(intention)) return 'jwt-auth';
  if (/\b(oauth|oauth2)\b/i.test(intention)) return 'oauth';
  if (/\b(hmac|webhook.?secret)\b/i.test(intention)) return 'hmac';
  if (/\b(ed25519|signature)\b/i.test(intention)) return 'ed25519';
  if (/\b(api.?key|bearer)\b/i.test(intention)) return 'api-key';
  if (/\b(auth|login|session|token|secure)\b/i.test(intention)) return 'jwt-auth';
  return 'none';
}

function detectRouteShape(pattern: ScaffoldPattern, intention: string): RouteShape {
  if (pattern === 'queue-consumer') return 'event';
  if (pattern === 'cron-worker') return 'event';
  if (/\b(websocket|stream|realtime|live)\b/i.test(intention)) return 'stream';
  if (/\b(rpc|procedure|call)\b/i.test(intention)) return 'rpc';
  if (/\b(webhook|event|hook|push)\b/i.test(intention)) return 'event';
  return 'rest';
}

function detectDispatch(pattern: ScaffoldPattern): Dispatch {
  if (pattern === 'queue-consumer') return 'queue-consumer';
  if (pattern === 'cron-worker') return 'cron';
  if (pattern === 'discord-bot' || pattern === 'stripe-webhook' || pattern === 'github-webhook') return 'event-handler';
  return 'resource-router';
}

function detectBindings(intention: string): Binding[] {
  const bindings = new Set<Binding>();

  if (/\b(d1|sql|database|sqlite|table|migration|schema|entity|record)\b/i.test(intention)) bindings.add('d1');
  if (/\b(kv|cache|session|fast.?read|key.?value|config)\b/i.test(intention)) bindings.add('kv');
  if (/\b(r2|storage|file|image|video|upload|download|attachment|asset|bucket)\b/i.test(intention)) bindings.add('r2');
  if (/\b(queue|job|background|async.?process|worker.?queue)\b/i.test(intention)) bindings.add('queues');
  if (/\b(durable.?objects?|realtime|websocket|live|collaborative)\b/i.test(intention)) bindings.add('do');
  if (/\b(ai|llm|inference|embeddings?|vector|model|openai|anthropic|cerebras)\b/i.test(intention)) bindings.add('ai');

  return Array.from(bindings);
}

function detectQualityProfile(intention: string): string[] {
  const lower = intention.toLowerCase();
  return QUALITY_TERMS.filter(t => lower.includes(t.toLowerCase()));
}

function detectTier(bindings: Binding[], qualityProfile: string[], confidence: Confidence): Tier {
  const complexity = bindings.length + qualityProfile.length;
  if (complexity >= 5 || bindings.length >= 4) return 3;
  if (complexity >= 2 || confidence === 'high') return 2;
  return 1;
}

// ============================================================================
// Public classify function (same shape scaffold-core will export)
// ============================================================================

export function classifyScaffoldIntention(intention: string): ClassifyResult {
  const { pattern, score } = detectPattern(intention);
  const confidence = detectConfidence(score, intention);
  const verification = detectVerification(intention);
  const routeShape = detectRouteShape(pattern, intention);
  const dispatch = detectDispatch(pattern);
  const bindings = detectBindings(intention);
  const qualityProfile = detectQualityProfile(intention);
  const tier = detectTier(bindings, qualityProfile, confidence);

  return {
    pattern,
    confidence,
    traits: { route_shape: routeShape, verification, dispatch },
    qualityProfile,
    bindings,
    tier,
  };
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
