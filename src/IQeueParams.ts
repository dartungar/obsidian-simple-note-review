// TODO: frontmatter keys
// TODO: excluded tags, folders, frontmatter keys
export interface IQueueParams {
    id: number
    name: string
    tags: string[]
    folders: string[]
    dataviewQuery: string
}

export class EmptyQueueParams implements IQueueParams {
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