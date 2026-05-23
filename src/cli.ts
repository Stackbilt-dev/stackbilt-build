#!/usr/bin/env node
import { CLIError, EXIT_CODE } from './index.js';
import { loginCommand } from './commands/login.js';
import { architectCommand } from './commands/architect.js';
import { runCommand } from './commands/run.js';
import { scaffoldCommand } from './commands/scaffold.js';

const [,, cmd, ...args] = process.argv;
const options = { configPath: '.charter', format: 'text' as const, ciMode: false, yes: false };

async function run() {
  try {
    let code = EXIT_CODE.SUCCESS;
    if (cmd === 'login') code = await loginCommand(options, args);
    else if (cmd === 'architect') code = await architectCommand(options, args);
    else if (cmd === 'run') code = await runCommand(options, args);
    else if (cmd === 'scaffold') code = await scaffoldCommand(options, args);
    else { console.error(`Unknown command: ${cmd}`); code = EXIT_CODE.FAILURE; }
    process.exit(code);
  } catch (e) {
    if (e instanceof CLIError) { console.error(e.message); process.exit(EXIT_CODE.FAILURE); }
    throw e;
  }
}

run();
