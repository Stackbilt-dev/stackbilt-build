export const EXIT_CODE = { SUCCESS: 0, FAILURE: 1, VALIDATION_ERROR: 2 };
export class CLIError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CLIError';
    }
}
export async function main() {
}
//# sourceMappingURL=index.js.map