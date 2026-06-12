import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CLIOptions } from '../index.js';
import { EXIT_CODE, CLIError } from '../index.js';
import { getFlag } from '../flags.js';
import { buildScaffold } from '@stackbilt/scaffold-core';

// Cache shapes written by `run` and `architect`.
// New shape (>= this PR): { intention, pattern, classification, governance, files?, createdAt }
// Old shape (legacy BuildResult): { scaffold: Record<string,string>, stack, seed, ... }
type CachedBuild = {
  intention?: string;
  files?: Array<{ path: string; content: string }>;
  scaffold?: Record<string, string>;
};

export async function scaffoldCommand(options: CLIOptions, args: string[]): Promise<number> {
  const configPath = options.configPath || '.charter';
  const cachePath = path.join(configPath, 'last-build.json');

  // ---- Determine file source: cache (engine/run path) or local scaffold-core ----

  const positional = args.filter(a => !a.startsWith('-') && a !== getFlag(args, '--output') && a !== getFlag(args, '--intention'));
  const intentionFlag = getFlag(args, '--intention');

  // If there's a cached build from `stackbilt run` or `stackbilt architect`, use it.
  if (fs.existsSync(cachePath)) {
    let cached: CachedBuild;
    try {
      cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch {
      throw new CLIError('Could not parse cached build. Run `stackbilt architect "..."` again.');
    }

    // Resolve files from either new shape (files[]) or old shape (scaffold dict)
    let resolvedFiles: Array<[string, string]>;
    if (cached.files && cached.files.length > 0) {
      // New unified shape: files[] from run — or generate from cached intention (architect path)
      resolvedFiles = cached.files.map(f => [f.path, f.content] as [string, string]);
    } else if (!cached.files && cached.intention) {
      // Architect cache: no files yet — generate them now
      const generated = buildScaffold(cached.intention).files;
      resolvedFiles = generated.map(f => [f.path, f.content] as [string, string]);
    } else if (cached.scaffold && Object.keys(cached.scaffold).length > 0) {
      // Legacy BuildResult shape
      resolvedFiles = Object.entries(cached.scaffold) as [string, string][];
    } else {
      throw new CLIError('Cached build has no scaffold files. Run `stackbilt run "..."` first.');
    }

    const outputDir = getFlag(args, '--output') ?? '.';
    const dryRun = args.includes('--dry-run');

    const files = resolvedFiles.sort(([a], [b]) => a.localeCompare(b));

    if (options.format === 'json') {
      const manifest = files.map(([name, content]) => ({
        path: path.join(outputDir, name),
        lines: content.split('\n').length,
      }));
      console.log(JSON.stringify({ outputDir, dryRun, files: manifest }, null, 2));
      if (!dryRun) writeFiles(outputDir, files);
      return EXIT_CODE.SUCCESS;
    }

    console.log('');
    console.log(`  Scaffold from build`);
    console.log(`  Output: ${path.resolve(outputDir)}`);
    console.log('');

    for (const [name, content] of files) {
      const lines = content.split('\n').length;
      const target = path.join(outputDir, name);
      const exists = fs.existsSync(target);
      const marker = exists ? ' (exists, will overwrite)' : '';
      console.log(`    ${name} (${lines} lines)${marker}`);
    }

    if (dryRun) {
      console.log('');
      console.log('  (dry run — no files written)');
      return EXIT_CODE.SUCCESS;
    }

    writeFiles(outputDir, files);

    console.log('');
    console.log(`  ${files.length} files written.`);
    return EXIT_CODE.SUCCESS;
  }

  // ---- No cache: fall back to buildScaffold() from @stackbilt/scaffold-core ----
  // Requires an intention passed as a positional arg or --intention flag.

  const intention = intentionFlag ?? positional.join(' ').trim();

  if (!intention) {
    throw new CLIError(
      'No cached build found and no intention provided.\n' +
      '  Option 1: Run `stackbilt run "..."` first to cache a build, then re-run scaffold.\n' +
      '  Option 2: Provide an intention directly:\n' +
      '    stackbilt scaffold "multi-tenant SaaS API with Stripe billing"',
    );
  }

  const scaffoldOutput = buildScaffold(intention);

  const outputDir = getFlag(args, '--output') ?? '.';
  const dryRun = args.includes('--dry-run');

  if (options.format === 'json') {
    const manifest = scaffoldOutput.files.map(f => ({
      path: path.join(outputDir, f.path),
      lines: f.content.split('\n').length,
      role: f.role,
    }));
    console.log(JSON.stringify({
      outputDir,
      dryRun,
      pattern: scaffoldOutput.classification.pattern,
      files: manifest,
    }, null, 2));
    if (!dryRun) {
      writeScaffoldFiles(outputDir, scaffoldOutput.files);
    }
    return EXIT_CODE.SUCCESS;
  }

  console.log('');
  console.log(`  Local scaffold (inference-free · @stackbilt/scaffold-core)`);
  console.log(`  Pattern: ${scaffoldOutput.classification.pattern}`);
  console.log(`  Output: ${path.resolve(outputDir)}`);
  console.log('');

  for (const f of scaffoldOutput.files) {
    const lines = f.content.split('\n').length;
    const target = path.join(outputDir, f.path);
    const exists = fs.existsSync(target);
    const marker = exists ? ' (exists, will overwrite)' : '';
    console.log(`    ${f.path} (${lines} lines)${marker}`);
  }

  if (dryRun) {
    console.log('');
    console.log('  (dry run — no files written)');
    return EXIT_CODE.SUCCESS;
  }

  writeScaffoldFiles(outputDir, scaffoldOutput.files);

  console.log('');
  console.log(`  ${scaffoldOutput.files.length} files written.`);
  return EXIT_CODE.SUCCESS;
}

function writeFiles(outputDir: string, files: [string, string][]): void {
  for (const [name, content] of files) {
    const target = path.join(outputDir, name);
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target, content);
  }
}

function writeScaffoldFiles(outputDir: string, files: Array<{ path: string; content: string }>): void {
  for (const { path: name, content } of files) {
    const target = path.join(outputDir, name);
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target, content);
  }
}
