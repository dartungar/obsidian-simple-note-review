// TODO: frontmatter keys
// TODO: excluded tags, folders, frontmatter keys
export interface IQueue {
    id: number
    name: string
    tags: string[]
    folders: string[]
    dataviewQuery: string
}

export class EmptyQueue implements IQueue {
    id: number
    name: ""
    tags: []
    folders: []
    dataviewQuery: ""

    /**
     *
     */
    constructor(id: number) {    
        this.id = id;    
    }
}