/**
 * @stackbilt/scaffold-core — buildScaffold
 *
 * Generates a minimal scaffold file set from a ClassifyResult without network
 * calls or inference. Produces wrangler.toml, src/index.ts, package.json, and
 * tsconfig.json tuned to the detected pattern and bindings.
 *
 * Once charter#220 lands this will be replaced by the real npm package export.
 */

import type { ClassifyResult, ScaffoldPattern, Binding } from './classify.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Template helpers
// ============================================================================

function workerName(pattern: ScaffoldPattern): string {
  return pattern.replace(/-/g, '_');
}

function bindingToml(bindings: Binding[]): string {
  const lines: string[] = [];
  if (bindings.includes('d1')) {
    lines.push('[[d1_databases]]');
    lines.push('binding = "DB"');
    lines.push('database_name = "my-db"');
    lines.push('database_id = "TODO"');
  }
  if (bindings.includes('kv')) {
    lines.push('[[kv_namespaces]]');
    lines.push('binding = "KV"');
    lines.push('id = "TODO"');
  }
  if (bindings.includes('r2')) {
    lines.push('[[r2_buckets]]');
    lines.push('binding = "BUCKET"');
    lines.push('bucket_name = "my-bucket"');
  }
  if (bindings.includes('queues')) {
    lines.push('[[queues.consumers]]');
    lines.push('queue = "my-queue"');
    lines.push('max_batch_size = 10');
  }
  if (bindings.includes('do')) {
    lines.push('[[durable_objects.bindings]]');
    lines.push('name = "DO"');
    lines.push('class_name = "MyDurableObject"');
  }
  if (bindings.includes('ai')) {
    lines.push('[ai]');
    lines.push('binding = "AI"');
  }
  return lines.join('\n');
}

function buildEnvInterface(bindings: Binding[]): string {
  const fields: string[] = [];
  if (bindings.includes('d1')) fields.push('  DB: D1Database;');
  if (bindings.includes('kv')) fields.push('  KV: KVNamespace;');
  if (bindings.includes('r2')) fields.push('  BUCKET: R2Bucket;');
  if (bindings.includes('queues')) fields.push('  QUEUE: Queue;');
  if (bindings.includes('do')) fields.push('  DO: DurableObjectNamespace;');
  if (bindings.includes('ai')) fields.push('  AI: Ai;');
  return fields.join('\n') || '  // No bindings detected';
}

function buildMainHandler(pattern: ScaffoldPattern, bindings: Binding[]): string {
  const envInterface = buildEnvInterface(bindings);

  if (pattern === 'queue-consumer') {
    return `export interface Env {
${envInterface}
}

export default {
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        // TODO: process message.body
        console.log('Processing message:', message.id);
        message.ack();
      } catch (err) {
        console.error('Failed to process message:', err);
        message.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;
`;
  }

  if (pattern === 'cron-worker') {
    return `export interface Env {
${envInterface}
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledTask(env));
  },
} satisfies ExportedHandler<Env>;

async function runScheduledTask(env: Env): Promise<void> {
  // TODO: implement scheduled logic
  console.log('Scheduled task running at', new Date().toISOString());
}
`;
  }

  if (pattern === 'discord-bot') {
    return `export interface Env {
${envInterface}
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // TODO: verify Ed25519 signature
    // TODO: handle PING and APPLICATION_COMMAND interaction types
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
} satisfies ExportedHandler<Env>;
`;
  }

  if (pattern === 'stripe-webhook' || pattern === 'github-webhook') {
    const secretVar = pattern === 'stripe-webhook' ? 'STRIPE_WEBHOOK_SECRET' : 'GITHUB_WEBHOOK_SECRET';
    return `export interface Env {
${envInterface}
  ${secretVar}: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // TODO: verify HMAC signature before processing
    const body = await request.text();

    try {
      const event = JSON.parse(body) as Record<string, unknown>;
      // TODO: handle event types
      console.log('Received event:', event);
      return new Response('OK', { status: 200 });
    } catch {
      return new Response('Bad request', { status: 400 });
    }
  },
} satisfies ExportedHandler<Env>;
`;
  }

  // Default: REST/API/SaaS/MCP patterns
  return `export interface Env {
${envInterface}
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }

    // TODO: implement route handlers
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * buildScaffold — generate a minimal file set for an intention without inference.
 *
 * Takes a ClassifyResult (from `classify()`) and returns a ScaffoldOutput with
 * wrangler.toml, src/index.ts, package.json, tsconfig.json, and a test stub.
 * All files are pattern and binding-aware. No network calls. <1ms.
 */
export function buildScaffold(intention: string, result: ClassifyResult): ScaffoldOutput {
  const name = workerName(result.pattern);
  const tomlBindings = bindingToml(result.bindings);

  const wranglerToml = [
    `name = "${name}"`,
    `main = "src/index.ts"`,
    `compatibility_date = "${new Date().toISOString().slice(0, 10)}"`,
    tomlBindings,
  ].filter(Boolean).join('\n') + '\n';

  const packageJson = JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'wrangler dev',
      deploy: 'wrangler deploy',
      typecheck: 'tsc --noEmit',
      test: 'vitest run',
    },
    devDependencies: {
      '@cloudflare/workers-types': '^4.0.0',
      typescript: '^5.0.0',
      wrangler: '^3.0.0',
      vitest: '^2.0.0',
    },
  }, null, 2) + '\n';

  const tsConfig = JSON.stringify({
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ESNext'],
      types: ['@cloudflare/workers-types'],
      strict: true,
      noEmit: true,
    },
    include: ['src/**/*.ts'],
  }, null, 2) + '\n';

  const mainContent = buildMainHandler(result.pattern, result.bindings);

  const testContent = `import { describe, it, expect } from 'vitest';
// TODO: add integration tests for ${result.pattern} handlers
describe('${name}', () => {
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});
`;

  const files: ScaffoldFile[] = [
    { path: 'wrangler.toml', content: wranglerToml, role: 'config' },
    { path: 'package.json', content: packageJson, role: 'config' },
    { path: 'tsconfig.json', content: tsConfig, role: 'config' },
    { path: 'src/index.ts', content: mainContent, role: 'scaffold' },
    { path: 'src/index.test.ts', content: testContent, role: 'test' },
  ];

  const nextSteps = [
    'npm install',
    'Update wrangler.toml with real binding IDs',
    result.bindings.includes('d1') ? 'npx wrangler d1 create my-db' : null,
    result.bindings.includes('r2') ? 'npx wrangler r2 bucket create my-bucket' : null,
    'npm run dev',
  ].filter(Boolean) as string[];

  return {
    files,
    pattern: result.pattern,
    tier: result.tier,
    nextSteps,
  };
}
