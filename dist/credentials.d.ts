export interface Credentials {
    apiKey: string;
    baseUrl?: string;
}
declare const API_KEY_ENV_VAR = "STACKBILT_API_KEY";
declare const API_BASE_URL_ENV_VAR = "STACKBILT_API_BASE_URL";
export declare function loadCredentials(): Credentials | null;
export declare function saveCredentials(creds: Credentials): void;
export declare function clearCredentials(): void;
export interface ResolvedApiKey {
    apiKey: string;
    source: 'env' | 'credentials';
    baseUrl?: string;
}
export declare function resolveApiKey(): ResolvedApiKey | null;
export { API_KEY_ENV_VAR, API_BASE_URL_ENV_VAR };
//# sourceMappingURL=credentials.d.ts.map