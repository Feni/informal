export class SyntaxError extends Error {
    constructor(message) {
        super(message)
        this.name = "SyntaxError"
    }
}

export class RuntimeError extends Error {
    constructor(message) {
        super(message)
        this.name = "RuntimeError"
    }
}

export function syntaxError(message, index) {
    let err = new SyntaxError(message);
    err.index = index;
    throw err
}