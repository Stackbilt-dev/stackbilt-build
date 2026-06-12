export interface CLIOptions {
    configPath: string;
    format: 'text' | 'json';
    ciMode: boolean;
    yes: boolean;
}
export declare const EXIT_CODE: {
    readonly SUCCESS: 0;
    readonly FAILURE: 1;
    readonly VALIDATION_ERROR: 2;
};
export declare class CLIError extends Error {
    constructor(message: string);
}
export declare function main(): Promise<void>;
//# sourceMappingURL=index.d.ts.map