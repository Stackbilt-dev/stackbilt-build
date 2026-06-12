import type { ScaffoldFileType, GovernanceDocsType, PromptContextType } from './types/scaffold-contract-types.js';
export interface BuildRequest {
    description: string;
    constraints?: {
        cloudflareOnly?: boolean;
        framework?: string;
        database?: string;
        needsAuth?: boolean;
        needsRealtime?: boolean;
        needsQueue?: boolean;
        needsStorage?: boolean;
    };
    seed?: number;
    tier?: 'blessed' | 'all';
}
export interface DrawnTech {
    id: number;
    name: string;
    category: string;
    element: string;
    maturity: string;
    tier: string;
    cloudflareNative: boolean;
    traits: string[];
    keywords: {
        upright: string[];
        reversed: string[];
    };
    orientation: 'upright' | 'reversed';
    position: string;
}
export interface CompatPair {
    positions: [string, string];
    techs: [string, string];
    elements: [string, string];
    relationship: string;
    score: number;
    description: string;
}
export interface BuildResult {
    stack: DrawnTech[];
    compatibility: {
        pairs: CompatPair[];
        totalScore: number;
        normalizedScore: number;
        dominant: string;
        tensions: {
            elements: [string, string];
            description: string;
        }[];
    };
    scaffold: Record<string, string>;
    seed: number;
    receipt: string;
    requirements: {
        description: string;
        keywords: string[];
        constraints: Record<string, unknown>;
        complexity: string;
    };
}
export type ScaffoldFile = ScaffoldFileType;
export interface ScaffoldResult {
    files: ScaffoldFile[];
    fileSource: 'engine' | 'basic' | 'none';
    nextSteps: string[];
    seed?: number;
    receipt?: string;
    facts?: Record<string, unknown>;
    promptContext?: PromptContextType;
    governance?: GovernanceDocsType;
}
export interface HealthResponse {
    status: string;
    version: string;
    engine: string;
    catalog: number;
    positions: string[];
}
export declare class EngineClient {
    private baseUrl;
    private apiKey;
    constructor(options: {
        baseUrl?: string;
        apiKey?: string | null;
    });
    health(): Promise<HealthResponse>;
    build(request: BuildRequest): Promise<BuildResult>;
    scaffold(request: {
        description: string;
        project_type?: string;
        complexity?: string;
        seed?: number;
    }): Promise<ScaffoldResult>;
    catalog(category?: string): Promise<{
        primitives: DrawnTech[];
        total: number;
    }>;
}
//# sourceMappingURL=http-client.d.ts.map