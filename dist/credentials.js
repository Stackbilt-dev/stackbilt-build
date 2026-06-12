import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
const CRED_DIR = path.join(os.homedir(), '.charter');
const CRED_FILE = path.join(CRED_DIR, 'credentials.json');
const API_KEY_ENV_VAR = 'STACKBILT_API_KEY';
const API_BASE_URL_ENV_VAR = 'STACKBILT_API_BASE_URL';
export function loadCredentials() {
    if (!fs.existsSync(CRED_FILE))
        return null;
    try {
        const raw = fs.readFileSync(CRED_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.apiKey || typeof parsed.apiKey !== 'string')
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
export function saveCredentials(creds) {
    if (!fs.existsSync(CRED_DIR)) {
        fs.mkdirSync(CRED_DIR, { recursive: true });
    }
    fs.writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}
export function clearCredentials() {
    if (fs.existsSync(CRED_FILE)) {
        fs.unlinkSync(CRED_FILE);
    }
}
export function resolveApiKey() {
    const fromEnv = process.env[API_KEY_ENV_VAR];
    if (fromEnv && fromEnv.trim().length > 0) {
        const baseUrlFromEnv = process.env[API_BASE_URL_ENV_VAR]?.trim();
        return {
            apiKey: fromEnv.trim(),
            source: 'env',
            baseUrl: baseUrlFromEnv && baseUrlFromEnv.length > 0 ? baseUrlFromEnv : undefined,
        };
    }
    const stored = loadCredentials();
    if (stored) {
        return { apiKey: stored.apiKey, source: 'credentials', baseUrl: stored.baseUrl };
    }
    return null;
}
export { API_KEY_ENV_VAR, API_BASE_URL_ENV_VAR };
//# sourceMappingURL=credentials.js.map