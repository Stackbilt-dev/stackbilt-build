export interface CLIOptions {
  configPath: string;
  format: 'text' | 'json';
  ciMode: boolean;
  yes: boolean;
}

export const EXIT_CODE = { SUCCESS: 0, FAILURE: 1, VALIDATION_ERROR: 2 } as const;

export class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CLIError';
  }
}

export async function main(): Promise<void> {
}
