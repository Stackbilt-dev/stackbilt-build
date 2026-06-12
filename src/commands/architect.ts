/**
 * stackbilt architect <intention>
 *
 * Zero-network governance document generator. Runs classify → knowledge → governance
 * via @stackbilt/scaffold-core and emits: threat model, ADR-001, ADR-002 (if compliance
 * domains detected), and test plan.
 *
 * Flags:
 *   --format json   emit { threatModel, adr001, adr002, testPlan } as JSON
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { sanitizeInput } from '@stackbilt/core';
import { buildScaffold } from '@stackbilt/scaffold-core';
import type { CLIOptions } from '../index.js';
import { EXIT_CODE, CLIError } from '../index.js';

export async function architectCommand(options: CLIOptions, args: string[]): Promise<number> {
  const positional = args.filter(a => !a.startsWith('-'));
  const intention = positional.join(' ').trim();

  if (!intention) {
    throw new CLIError(
      'Provide an intention:\n  stackbilt architect "multi-tenant SaaS API with Stripe billing"',
    );
  }

  const sanitized = sanitizeInput(intention);
  const result = buildScaffold(sanitized);
  const { governance: docs } = result;

  // Write unified cache so `stackbilt scaffold` can generate files without re-running.
  const cacheDir = options.configPath || '.charter';
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'last-build.json'), JSON.stringify({
    intention: sanitized,
    pattern: result.classification.pattern,
    classification: result.classification,
    governance: result.governance,
    createdAt: new Date().toISOString(),
  }, null, 2));

  if (options.format === 'json') {
    console.log(JSON.stringify({
      threatModel: docs.threatModel,
      adr001: docs.adr001,
      adr002: docs.adr002 ?? null,
      testPlan: docs.testPlan,
    }, null, 2));
    return EXIT_CODE.SUCCESS;
  }

  console.log(docs.threatModel);
  console.log('\n---\n');
  console.log(docs.adr001);

  if (docs.adr002) {
    console.log('\n---\n');
    console.log(docs.adr002);
  }

  return EXIT_CODE.SUCCESS;
}
