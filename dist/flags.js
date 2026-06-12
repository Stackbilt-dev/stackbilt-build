import * as fs from 'node:fs';
import { CLIError } from './index.js';
export function getFlag(args, flag) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
        return args[idx + 1];
    }
    return undefined;
}
export function readFlagFile(filePath, flagName) {
    if (!fs.existsSync(filePath)) {
        throw new CLIError(`File not found for ${flagName}: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}
export function tokenizeTask(task) {
    return task
        .split(/[\s,;:()[\]{}]+/)
        .filter(w => w.length > 1)
        .map(w => w.replace(/[^a-zA-Z0-9]/g, ''));
}
//# sourceMappingURL=flags.js.map