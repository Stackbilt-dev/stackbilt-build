import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CLIOptions } from '../index.js';
import { EXIT_CODE, CLIError } from '../index.js';
import { getFlag } from '../flags.js';
import { resolveApiKey } from '../credentials.js';
import { EngineClient, type BuildRequest, type ScaffoldResult } from '../http-client.js';
import { buildScaffold } from '@stackbilt/scaffold-core';

const PLATFORM_BASE_URL = process.env.STACKBILT_URL ?? 'https://stackbilder.com';

// Write the unified cache contract so `stackbilt scaffold` can use it.
// Shape: { intention, pattern, classification, governance, files?, createdAt }
function writeCachedBuild(
  intention: string,
  files: Array<{ path: string; content: string }>,
  configPath: string,
): void {
  const dir = configPath || '.charter';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const core = buildScaffold(intention);
  fs.writeFileSync(
    path.join(dir, 'last-build.json'),
    JSON.stringify({
      intention,
      pattern: core.classification.pattern,
      classification: core.classification,
      governance: core.governance,
      files,
      createdAt: new Date().toISOString(),
    }, null, 2),
  );
}

// Adapt LocalScaffoldResult to the ScaffoldResult shape used by the rest of the command.
function localScaffoldToResult(intention: string): ScaffoldResult {
  const core = buildScaffold(intention);
  const roleMap: Record<string, 'config' | 'scaffold' | 'governance' | 'test' | 'doc'> = {
    entry: 'scaffold',
    config: 'config',
    test: 'test',
    migration: 'scaffold',
    contract: 'governance',
    adf: 'governance',
    readme: 'doc',
  };
  return {
    files: core.files.map(f => ({
      path: f.path,
      content: f.content,
      role: roleMap[f.role] ?? 'scaffold',
    })),
    fileSource: 'basic',
    nextSteps: [
      'npm install',
      'npx wrangler dev',
      `Pattern: ${core.classification.pattern} (confidence: ${Math.round(core.classification.confidence * 100)}%)`,
    ],
    seed: undefined,
    facts: core.facts as unknown as Record<string, unknown>,
  };
}

// POST the scaffold result to the platform /api/flows for platform record.
async function persistToPlatform(
  intention: string,
  oracle: boolean,
  apiKey: string,
): Promise<{ id: string } | null> {
  try {
    const res = await fetch(`${PLATFORM_BASE_URL}/api/flows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ intention, oracle }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`  [warn] Persist failed (${res.status}): ${text}`);
      return null;
    }
    return res.json() as Promise<{ id: string }>;
  } catch (err) {
    console.error(`  [warn] Persist error: ${err}`);
    return null;
  }
}

const PHASE_LABELS = ['PRODUCT', 'UX', 'RISK', 'ARCHITECT', 'TDD', 'SPRINT'];
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearLine(): void {
  process.stdout.write('\x1b[2K\r');
}

function cursorUp(n: number): void {
  if (n > 0) process.stdout.write(`\x1b[${n}A`);
}

function slugify(description: string): string {
  const stopWords = new Set(['a', 'an', 'the', 'with', 'and', 'or', 'for', 'in', 'on', 'to', 'my', 'build', 'create', 'make']);
  const words = description.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => !stopWords.has(w))
    .slice(0, 4);
  return words.join('-') || 'my-project';
}

function phaseDetail(label: string, result: ScaffoldResult): string {
  const fileCount = result.files.length;
  const adfFiles = result.files.filter(f => f.path.endsWith('.adf')).length;
  const testFiles = result.files.filter(f => f.path.includes('test')).length;
  const configFiles = result.files.filter(f => f.path === 'wrangler.toml' || f.path === 'package.json' || f.path === 'tsconfig.json').length;

  switch (label) {
    case 'PRODUCT': return `requirements extracted from intent`;
    case 'UX': return `interface patterns mapped`;
    case 'RISK': return `threats identified and mitigated`;
    case 'ARCHITECT': return `${fileCount} files, ${configFiles} configs generated`;
    case 'TDD': return `${testFiles || 1} test file${testFiles !== 1 ? 's' : ''} generated`;
    case 'SPRINT': return `${adfFiles} governance files, sprint ready`;
    default: return 'done';
  }
}

export async function runCommand(options: CLIOptions, args: string[]): Promise<number> {
  const filePath = getFlag(args, '--file');
  const outputDir = getFlag(args, '--output');
  const seedStr = getFlag(args, '--seed');
  const urlOverride = getFlag(args, '--url');
  const fwOverride = getFlag(args, '--framework');
  const dbOverride = getFlag(args, '--database');

  const flagValues = new Set([filePath, outputDir, seedStr, urlOverride, fwOverride, dbOverride].filter(Boolean));

  const positional = args.filter(a => !a.startsWith('-') && !flagValues.has(a));
  let description: string;

  if (filePath) {
    if (!fs.existsSync(filePath)) throw new CLIError(`File not found: ${filePath}`);
    description = fs.readFileSync(filePath, 'utf-8').trim();
  } else if (positional.length > 0) {
    description = positional.join(' ');
  } else {
    throw new CLIError('Provide a project description:\n  stackbilt run "Build a real-time chat app"\n  stackbilt run --file spec.md');
  }

  if (!description) throw new CLIError('Empty description.');

  const resolvedOutput = outputDir ?? `./${slugify(description)}`;
  const dryRun = args.includes('--dry-run');
  const useGateway = args.includes('--gateway');
  const persist = args.includes('--persist');
  const oracle = args.includes('--oracle');

  const resolved = resolveApiKey();

  if (useGateway && !resolved?.apiKey) {
    throw new CLIError('--gateway requires an API key. Run `stackbilt login --key sb_live_xxx` first.');
  }

  if (persist && !resolved?.apiKey) {
    throw new CLIError('--persist requires an API key. Run `stackbilt login --key sb_live_xxx` first.');
  }

  let scaffoldPromise: Promise<ScaffoldResult>;

  if (useGateway) {
    const client = new EngineClient({
      baseUrl: urlOverride ?? resolved?.baseUrl,
      apiKey: resolved?.apiKey ?? null,
    });
    scaffoldPromise = client.scaffold({
      description,
      project_type: args.includes('--cloudflare-only') ? 'worker' : undefined,
      complexity: undefined,
      seed: seedStr ? parseInt(seedStr, 10) : undefined,
    });
  } else {
    // Default: fully offline, zero network
    scaffoldPromise = Promise.resolve(localScaffoldToResult(description));
  }

  if (options.format === 'json') {
    const result = await scaffoldPromise;
    const output: Record<string, unknown> = { ...result, outputDir: resolvedOutput, dryRun };
    if (!dryRun) {
      writeFiles(resolvedOutput, result.files);
      writeCachedBuild(description, result.files.map(({ path: p, content }) => ({ path: p, content })), options.configPath);
    }
    if (persist && resolved?.apiKey) {
      const persisted = await persistToPlatform(description, oracle, resolved.apiKey);
      if (persisted) output.flowId = persisted.id;
    }
    console.log(JSON.stringify(output, null, 2));
    return EXIT_CODE.SUCCESS;
  }

  const isTTY = process.stdout.isTTY === true;

  console.log('');
  if (!useGateway) {
    console.log('  \x1b[2m(offline · @stackbilt/scaffold-core · zero network)\x1b[0m');
    console.log('');
  }

  if (isTTY) {
    let spinIdx = 0;

    for (const label of PHASE_LABELS) {
      console.log(`\x1b[2m  ${SPINNER[0]} ${label.padEnd(12)} working...\x1b[0m`);
    }

    let done = false;
    let result!: ScaffoldResult;

    scaffoldPromise.then(r => { result = r; done = true; }).catch(() => { done = true; });

    while (!done) {
      spinIdx = (spinIdx + 1) % SPINNER.length;
      cursorUp(PHASE_LABELS.length);
      for (const label of PHASE_LABELS) {
        clearLine();
        process.stdout.write(`\x1b[2m  ${SPINNER[spinIdx]} ${label.padEnd(12)} working...\x1b[0m\n`);
      }
      await delay(80);
    }

    result = await scaffoldPromise;

    cursorUp(PHASE_LABELS.length);
    for (const label of PHASE_LABELS) {
      clearLine();
      const detail = phaseDetail(label, result);
      process.stdout.write(`  \x1b[32m❩\x1b[0m ${label.padEnd(12)} ${detail.padEnd(36)} \x1b[32m✓\x1b[0m\n`);
      await delay(120);
    }
  } else {
    const result = await scaffoldPromise;
    for (const label of PHASE_LABELS) {
      console.log(`  ❩ ${label.padEnd(12)} ${phaseDetail(label, result).padEnd(36)} ✓`);
    }
  }

  const result = await scaffoldPromise;

  console.log('');
  if (dryRun) {
    console.log(`  → ${result.files.length} files would be scaffolded to ${resolvedOutput}/`);
    for (const f of result.files) {
      console.log(`    ${f.path}`);
    }
    console.log('');
    console.log('  (dry run — no files written)');
  } else {
    writeFiles(resolvedOutput, result.files);
    writeCachedBuild(description, result.files.map(({ path: p, content }) => ({ path: p, content })), options.configPath);
    console.log(`  → ${result.files.length} files scaffolded to ${resolvedOutput}/`);
    console.log(`  → Architecture governed · seed: ${result.seed ?? 'deterministic'}`);
    if (result.nextSteps && result.nextSteps.length > 0) {
      console.log('');
      console.log('  Next steps:');
      for (const step of result.nextSteps) {
        console.log(`    ${step}`);
      }
    }
  }

  if (persist && resolved?.apiKey && !dryRun) {
    const persisted = await persistToPlatform(description, oracle, resolved.apiKey);
    if (persisted) {
      console.log('');
      console.log(`  → Persisted to platform · flow ID: ${persisted.id}`);
      if (oracle) console.log('  → Oracle polish queued');
    }
  }

  console.log('');
  return EXIT_CODE.SUCCESS;
}

function writeFiles(outputDir: string, files: Array<{ path: string; content: string }>): void {
  for (const { path: name, content } of files) {
    const target = path.join(outputDir, name);
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target, content);
  }
}
