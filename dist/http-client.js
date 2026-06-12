const DEFAULT_BASE_URL = process.env.STACKBILT_ENGINE_URL ?? 'https://api.stackbilt.dev/engine';
const GATEWAY_BASE_URL = 'https://mcp.stackbilt.dev';
export class EngineClient {
    baseUrl;
    apiKey;
    constructor(options) {
        this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
        this.apiKey = options.apiKey ?? null;
    }
    async health() {
        const res = await fetch(`${this.baseUrl}/health`);
        if (!res.ok)
            throw new Error(`Engine health check failed: ${res.status}`);
        return res.json();
    }
    async build(request) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey)
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        const res = await fetch(`${this.baseUrl}/build`, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Engine build failed (${res.status}): ${text}`);
        }
        return res.json();
    }
    async scaffold(request) {
        if (!this.apiKey) {
            throw new Error('API key required for scaffold. Set STACKBILT_API_KEY in the environment, ' +
                'or (deprecated) run `stackbilt login --key sb_live_xxx`.');
        }
        const res = await fetch(`${GATEWAY_BASE_URL}/api/scaffold`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(request),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Scaffold failed (${res.status}): ${text}`);
        }
        return res.json();
    }
    async catalog(category) {
        const url = new URL(`${this.baseUrl}/catalog`);
        if (category)
            url.searchParams.set('category', category);
        const res = await fetch(url.toString());
        if (!res.ok)
            throw new Error(`Engine catalog failed: ${res.status}`);
        return res.json();
    }
}
//# sourceMappingURL=http-client.js.map