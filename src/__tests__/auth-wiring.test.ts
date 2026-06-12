import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  buildFn: vi.fn(),
  scaffoldFn: vi.fn(),
  constructorArgs: [] as Array<{ baseUrl?: string; apiKey?: string | null }>,
}));

vi.mock('../credentials.js', async () => {
  const actual = await vi.importActual<typeof import('../credentials.js')>('../credentials.js');
  return { ...actual, resolveApiKey: vi.fn() };
});

vi.mock('../http-client.js', () => {
  return {
    EngineClient: class {
      constructor(opts: { baseUrl?: string; apiKey?: string | null }) {
        hoisted.constructorArgs.push(opts);
      }
      build = hoisted.buildFn;
      scaffold = hoisted.scaffoldFn;
      health = vi.fn();
      catalog = vi.fn();
    },
  };
});

import { resolveApiKey } from '../credentials.js';
import { architectCommand } from '../commands/architect.js';
import { runCommand } from '../commands/run.js';
import type { CLIOptions } from '../index.js';

const mockedResolveApiKey = vi.mocked(resolveApiKey);

const options: CLIOptions = {
  format: 'json',
  configPath: '.charter',
  ciMode: false,
  yes: true,
};

function fakeBuildResult() {
  return {
    stack: [],
    compatibility: {
      pairs: [],
      totalScore: 0,
      normalizedScore: 0,
      dominant: '',
      tensions: [],
    },
    scaffold: {},
    seed: 1,
    receipt: 'receipt',
    requirements: {
      description: 'anything',
      keywords: [],
      constraints: {},
      complexity: 'moderate',
    },
  };
}

function fakeScaffoldResult() {
  return {
    files: [],
    fileSource: 'engine' as const,
    nextSteps: [],
  };
}

let tmpCwd: string;

beforeEach(() => {
  tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'charter-wiring-'));
  process.chdir(tmpCwd);
  fs.mkdirSync(path.join(tmpCwd, '.charter'), { recursive: true });
  hoisted.buildFn.mockReset().mockResolvedValue(fakeBuildResult());
  hoisted.scaffoldFn.mockReset().mockResolvedValue(fakeScaffoldResult());
  hoisted.constructorArgs.length = 0;
  mockedResolveApiKey.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.chdir(os.tmpdir());
  fs.rmSync(tmpCwd, { recursive: true, force: true });
});

describe('architect — governance-only (no network)', () => {
  // architect was rewritten in Issue #5 to be zero-network: it runs classify
  // heuristics locally and emits governance docs as markdown/JSON.
  // EngineClient is no longer instantiated by this command.

  it('returns SUCCESS and emits JSON governance docs without any network call', async () => {
    mockedResolveApiKey.mockReturnValue({
      apiKey: 'ea_env_wiring',
      source: 'env',
      baseUrl: 'https://engine.example',
    });

    const code = await architectCommand(options, ['multi-tenant SaaS API with Stripe billing']);

    expect(code).toBe(0);
    // EngineClient must NOT have been instantiated — architect is pure heuristic
    expect(hoisted.constructorArgs).toHaveLength(0);
  });

  it('returns SUCCESS with no API key — governance docs need no auth', async () => {
    mockedResolveApiKey.mockReturnValue(null);

    const code = await architectCommand(options, ['GitHub webhook handler']);

    expect(code).toBe(0);
    expect(hoisted.constructorArgs).toHaveLength(0);
    expect(hoisted.buildFn).not.toHaveBeenCalled();
  });
});

describe('run — gateway vs engine routing', () => {
  it('uses the gateway (scaffold) when the env var provides an API key', async () => {
    mockedResolveApiKey.mockReturnValue({ apiKey: 'ea_env_gateway', source: 'env' });

    await runCommand(options, ['a description', '--dry-run']);

    expect(hoisted.scaffoldFn).toHaveBeenCalledTimes(1);
    expect(hoisted.buildFn).not.toHaveBeenCalled();
  });

  it('falls back to engine /build when no API key is resolved', async () => {
    mockedResolveApiKey.mockReturnValue(null);

    await runCommand(options, ['a description', '--dry-run']);

    expect(hoisted.buildFn).toHaveBeenCalledTimes(1);
    expect(hoisted.scaffoldFn).not.toHaveBeenCalled();
  });

  it('uses the gateway when login-stored credentials are resolved (parity with env path)', async () => {
    mockedResolveApiKey.mockReturnValue({ apiKey: 'sb_live_stored', source: 'credentials' });

    await runCommand(options, ['a description', '--dry-run']);

    expect(hoisted.scaffoldFn).toHaveBeenCalledTimes(1);
    expect(hoisted.buildFn).not.toHaveBeenCalled();
  });
});
