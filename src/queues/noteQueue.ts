
export interface INoteQueue {
    filenames: string[]
    createdAt?: string
    sourceFileCount?: number
    rulesHash?: string
}

export class NoteQueue implements INoteQueue {
    filenames: string[]
    createdAt: string
    sourceFileCount: number
    rulesHash?: string

    constructor(filePaths: string[], rulesHash?: string) {
        this.filenames = filePaths;
        this.createdAt = new Date().toISOString();
        this.sourceFileCount = filePaths.length;
        this.rulesHash = rulesHash;
    }
}
