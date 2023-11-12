
export interface INoteQueue {
    filenames: string[] // TODO
}

export class NoteQueue implements INoteQueue {
    filenames: string[]

    constructor(filePaths: string[]) {
        this.filenames = filePaths;
    }
}
