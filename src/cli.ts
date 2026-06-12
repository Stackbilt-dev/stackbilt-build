#!/usr/bin/env node
import { createRequire } from 'node:module';
import { CLIError, EXIT_CODE } from './index.js';
import { loginCommand } from './commands/login.js';
import { architectCommand } from './commands/architect.js';
import { classifyCommand } from './commands/classify.js';
import { runCommand } from './commands/run.js';
import { scaffoldCommand } from './commands/scaffold.js';

// ============================================================================
// Version (read from package.json at runtime — single source of truth)
// ============================================================================

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    // Resolve relative to the package root (dist/../package.json)
    const pkg = require('../package.json') as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// ============================================================================
// Help text
// ============================================================================

const HELP = `
Usage: stackbilt <command> [options]

Commands:
  login       Authenticate with the Stackbilt engine
  architect   Generate governance docs (threat model + ADRs) for an intention
  classify    Classify an intention into a scaffold pattern
  run         Full scaffold pipeline — classify, build, write files
  scaffold    Write files from a cached build result

Global options:
  --format json   Emit structured JSON output instead of human-readable text
  --version       Print the CLI version and exit
  --help          Show this help message

Command help:
  stackbilt login --help
  stackbilt architect --help
  stackbilt classify --help
  stackbilt run --help
  stackbilt scaffold --help
`.trimStart();

const COMMAND_HELP: Record<string, string> = {
  login: `
Usage: stackbilt login [options]

Authenticate with the Stackbilt engine.

Options:
  --key <key>     API key (ea_xxx, sb_live_xxx, or sb_test_xxx)
  --url <url>     Override engine base URL
  --logout        Clear stored credentials
  --format json   Emit JSON output

Examples:
  stackbilt login --key sb_live_abc123
  stackbilt login --logout
`.trimStart(),

  architect: `
Usage: stackbilt architect <intention> [options]

Generate governance documents for a project intention.
Produces a threat model and ADR-001 (always), plus ADR-002 if compliance
domains (PCI, GDPR, HIPAA, SOC 2) are detected.

No network calls — pure heuristic, <1ms.

Options:
  --format json   Emit { threatModel, adr001, adr002, testPlan } as JSON

Examples:
  stackbilt architect "multi-tenant SaaS API with Stripe billing"
  stackbilt architect "GitHub webhook handler" --format json
`.trimStart(),

  classify: `
Usage: stackbilt classify <intention> [options]

Classify a plain-text intention into a scaffold pattern.
No network calls — pure heuristic, <1ms.

Options:
  --format json   Emit classification result as JSON

Examples:
  stackbilt classify "Discord bot with slash commands"
  stackbilt classify "Scheduled cron worker for daily digests" --format json
`.trimStart(),

  run: `
Usage: stackbilt run <description> [options]

Run the full scaffold pipeline: classify, build, and write project files.

Options:
  --file <path>       Read description from a file instead of inline argument
  --output <dir>      Output directory (default: ./<slugified-description>)
  --seed <n>          Deterministic seed for stack selection
  --url <url>         Override engine base URL
  --framework <name>  Constrain framework selection
  --database <name>   Constrain database selection
  --cloudflare-only   Only consider Cloudflare-native primitives
  --dry-run           Show what would be written, without writing files
  --format json       Emit scaffold result as JSON

Examples:
  stackbilt run "real-time chat app with Durable Objects"
  stackbilt run --file spec.md --output ./my-project
`.trimStart(),

  scaffold: `
Usage: stackbilt scaffold [options]

Write files from a cached build result (produced by \`stackbilt run\`).

Options:
  --output <dir>   Output directory (default: .)
  --dry-run        List files that would be written without writing them
  --format json    Emit file manifest as JSON

Examples:
  stackbilt scaffold
  stackbilt scaffold --output ./projects/my-app --dry-run
`.trimStart(),
};

// ============================================================================
// Global flag parsing
// ============================================================================

function parseGlobalFlags(rawArgs: string[]): { cmd: string | undefined; args: string[]; format: 'text' | 'json'; showHelp: boolean; showVersion: boolean } {
  const showVersion = rawArgs.includes('--version') || rawArgs.includes('-v');
  // --help at top level (no command) or as the only arg
  const showHelp = rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h';

  const [firstArg, ...rest] = rawArgs;
  const isCmd = firstArg && !firstArg.startsWith('-');

  const cmd = isCmd ? firstArg : undefined;
  const args = isCmd ? rest : rawArgs;

  const format = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json'
    ? 'json'
    : 'text';

  return { cmd, args, format, showHelp, showVersion };
}

// ============================================================================
// Entry point
// ============================================================================

async function run() {
  const rawArgs = process.argv.slice(2);
  const { cmd, args, format, showHelp, showVersion } = parseGlobalFlags(rawArgs);

  if (showVersion) {
    console.log(getVersion());
    process.exit(EXIT_CODE.SUCCESS);
  }

  if (showHelp && !cmd) {
    process.stdout.write(HELP);
    process.exit(EXIT_CODE.SUCCESS);
  }

  // Per-command --help
  if (cmd && (args.includes('--help') || args.includes('-h'))) {
    const helpText = COMMAND_HELP[cmd] ?? `No help available for '${cmd}'.\n`;
    process.stdout.write(helpText);
    process.exit(EXIT_CODE.SUCCESS);
  }

  const options = {
    configPath: '.charter',
    format: format,
    ciMode: args.includes('--ci'),
    yes: args.includes('--yes') || args.includes('-y'),
  };

  try {
    let code: number = EXIT_CODE.SUCCESS;

    if (cmd === 'login') code = await loginCommand(options, args);
    else if (cmd === 'architect') code = await architectCommand(options, args);
    else if (cmd === 'classify') code = await classifyCommand(options, args);
    else if (cmd === 'run') code = await runCommand(options, args);
    else if (cmd === 'scaffold') code = await scaffoldCommand(options, args);
    else if (!cmd) {
      // No command and no --help/--version: show help
      process.stdout.write(HELP);
      code = EXIT_CODE.SUCCESS;
    } else {
      console.error(`Unknown command: ${cmd}\nRun \`stackbilt --help\` for usage.`);
      code = EXIT_CODE.FAILURE;
    }

    process.exit(code);
  } catch (e) {
    if (e instanceof CLIError) {
      console.error(e.message);
      process.exit(EXIT_CODE.FAILURE);
    }
    throw e;
  }
}

run();
