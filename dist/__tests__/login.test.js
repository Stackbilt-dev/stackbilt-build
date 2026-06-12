import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginCommand } from '../commands/login.js';
import { API_KEY_ENV_VAR } from '../credentials.js';
const options = {
    format: 'text',
    configPath: '.charter',
    ciMode: false,
    yes: false,
};
describe('stackbilt login', () => {
    const originalEnv = process.env[API_KEY_ENV_VAR];
    beforeEach(() => {
        delete process.env[API_KEY_ENV_VAR];
    });
    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env[API_KEY_ENV_VAR];
        }
        else {
            process.env[API_KEY_ENV_VAR] = originalEnv;
        }
        vi.restoreAllMocks();
    });
    it('reports env-var usage when STACKBILT_API_KEY is set and no --key flag', async () => {
        process.env[API_KEY_ENV_VAR] = 'ea_login_test_key';
        vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const log = vi.spyOn(console, 'log').mockImplementation(() => { });
        await loginCommand(options, []);
        const stdoutOutput = log.mock.calls.map((c) => String(c[0])).join('\n');
        expect(stdoutOutput).toMatch(new RegExp(`Using ${API_KEY_ENV_VAR} from environment`));
    });
});
//# sourceMappingURL=login.test.js.map